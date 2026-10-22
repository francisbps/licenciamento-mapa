"""Descarrega as condicionantes dos serviços WFS oficiais e guarda-as no Supabase (PostGIS).

Uso: SUPABASE_DB_URL=postgresql://... python carregar/carregar.py [FONTE ...]
Cada fonte é substituída de uma vez: se o descarregamento falhar, fica a versão anterior.
"""
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import psycopg
import requests

AQUI = Path(__file__).parent
WFS_DGT = "https://servicos.dgterritorio.pt/SDISNITWFSSRUP_{}_PT1/WFService.aspx"
PAGINA = 1000
ESPERA = 180  # segundos por pedido: a DGT é lenta
CAMPOS_NOME = ("nome", "designa", "denomina", "name", "titulo")

sessao = requests.Session()
sessao.headers["User-Agent"] = "licenciamento-mapa (github.com/francisbps/licenciamento-mapa)"


def pedir(url, params, tentativas=3):
    for i in range(tentativas):
        try:
            r = sessao.get(url, params=params, timeout=ESPERA)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if i == tentativas - 1:
                raise
            time.sleep(10 * (i + 1))


def camadas(url):
    r = pedir(url, {"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"})
    raiz = ET.fromstring(r.content)
    return [e.text for e in raiz.iter() if e.tag.endswith("}Name") and e.text and ":" in e.text]


def elementos(url, camada):
    inicio = 0
    while True:
        r = pedir(url, {
            "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": camada,
            "outputFormat": "application/vnd.geo+json", "count": PAGINA, "startIndex": inicio,
        })
        lote = r.json().get("features") or []
        yield from lote
        if len(lote) < PAGINA:
            return
        inicio += PAGINA


def nome_de(props):
    for k, v in props.items():
        if v and any(c in k.lower() for c in CAMPOS_NOME):
            return str(v)
    return None


def carregar(con, f):
    url = WFS_DGT.format(f["codigo"])
    total = 0
    with con.transaction():
        con.execute("delete from condicionantes where fonte = %s", (f["fonte"],))
        for camada in camadas(url):
            for el in elementos(url, camada):
                if not el.get("geometry"):
                    continue
                props = el.get("properties") or {}
                # Os serviços da DGT devolvem PT-TM06 (EPSG:3763); simplifica a 1 m e passa a WGS84.
                con.execute(
                    """insert into condicionantes (fonte, camada, app, entidade, nome, atributos, geom)
                       values (%s, %s, %s, %s, %s, %s,
                         st_transform(st_simplifypreservetopology(st_makevalid(
                           st_setsrid(st_geomfromgeojson(%s), 3763)), 1), 4326))""",
                    (f["fonte"], camada.split(":")[-1].replace("_", " "), f["app"], f["entidade"],
                     nome_de(props), json.dumps(props, ensure_ascii=False), json.dumps(el["geometry"])),
                )
                total += 1
        if total == 0:
            raise RuntimeError("serviço sem elementos")
    return url, total


def main():
    fontes = json.loads((AQUI / "fontes.json").read_text())
    if len(sys.argv) > 1:
        fontes = [f for f in fontes if f["fonte"] in sys.argv[1:]]
    falhas = 0
    with psycopg.connect(os.environ["SUPABASE_DB_URL"], autocommit=True) as con:
        for f in fontes:
            t = time.time()
            try:
                url, n = carregar(con, f)
                con.execute(
                    """insert into fontes (fonte, descricao, url, ok, elementos, ultima_tentativa, ultimo_sucesso, erro)
                       values (%s, %s, %s, true, %s, now(), now(), null)
                       on conflict (fonte) do update set ok = true, elementos = excluded.elementos,
                         ultima_tentativa = now(), ultimo_sucesso = now(), erro = null""",
                    (f["fonte"], f["descricao"], url, n))
                print(f"OK    {f['fonte']:10} {n:7} elementos  {time.time() - t:5.0f} s")
            except Exception as e:  # uma fonte em baixo não pára as outras
                falhas += 1
                con.execute(
                    """insert into fontes (fonte, descricao, ok, ultima_tentativa, erro)
                       values (%s, %s, false, now(), %s)
                       on conflict (fonte) do update set ok = false, ultima_tentativa = now(), erro = excluded.erro""",
                    (f["fonte"], f["descricao"], str(e)[:500]))
                print(f"FALHA {f['fonte']:10} {e}")
        tam = con.execute("select pg_size_pretty(pg_total_relation_size('condicionantes')), "
                          "pg_size_pretty(pg_database_size(current_database()))").fetchone()
        print(f"Espaço: tabela {tam[0]}, base de dados {tam[1]}")
    sys.exit(1 if falhas == len(fontes) else 0)


if __name__ == "__main__":
    main()

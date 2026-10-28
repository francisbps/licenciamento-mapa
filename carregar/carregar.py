"""Descarrega as condicionantes de um concelho e guarda-as como ficheiros GeoJSON no próprio site.

Uso: python carregar/carregar.py [concelho ...]       (sem argumentos: todos os de fontes.json)

Para cada concelho junta três origens, todas recortadas pelo limite oficial do concelho (CAOP):
- cartas nacionais da DGT (serviços WFS SRUP);
- planta de condicionantes da câmara, quando tem serviço (camadas em dados/municipios.json);
- ficheiros carregados à mão em dados/condicionantes/manual/<concelho>/ (respostas escritas de entidades).
Se uma fonte falhar, fica o ficheiro da semana anterior e o erro fica registado no índice.
"""
import json
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import box, mapping, shape
from shapely.ops import transform

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados" / "condicionantes"
WFS_DGT = "https://servicos.dgterritorio.pt/SDISNITWFSSRUP_{}_PT1/WFService.aspx"
CAOP = "https://ogcapi.dgterritorio.gov.pt/collections/municipios/items/{}?f=json"
PAGINA = 1000
ESPERA = 90  # segundos por pedido: a DGT é lenta
TEMPO_FONTE = 600  # uma fonte que passe disto é dada como falhada nesta semana
SIMPLIFICAR = 0.000005  # cerca de 0,5 m
CAMPOS_NOME = ("nome", "designa", "denomina", "name", "titulo", "tipo")

sessao = requests.Session()
sessao.headers["User-Agent"] = "licenciamento-mapa (github.com/francisbps/licenciamento-mapa)"
de_pttm = Transformer.from_crs(3763, 4326, always_xy=True).transform
para_pttm = Transformer.from_crs(4326, 3763, always_xy=True).transform


def pedir(url, params=None, tentativas=2):
    for i in range(tentativas):
        try:
            r = sessao.get(url, params=params, timeout=ESPERA)
            r.raise_for_status()
            return r
        except requests.RequestException:
            if i == tentativas - 1:
                raise
            time.sleep(10 * (i + 1))


def nome_de(props):
    for campo in CAMPOS_NOME:
        for k, v in props.items():
            if v and campo in k.lower():
                return str(v)
    return None


def elemento(geom, limite, props, **extra):
    """Recorta pelo concelho e devolve um elemento GeoJSON, ou None se ficar fora."""
    g = make_valid(geom).intersection(limite)
    if g.is_empty:
        return None
    g = g.simplify(SIMPLIFICAR, preserve_topology=True)
    return {"type": "Feature", "geometry": mapping(g),
            "properties": {**extra, "nome": nome_de(props) or extra.get("camada"), "atributos": props}}


def wfs_dgt(f, limite):
    url = WFS_DGT.format(f["codigo"])
    caps = ET.fromstring(pedir(url, {"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"}).content)
    nomes = [e.text for e in caps.iter() if e.tag.endswith("}Name") and e.text and ":" in e.text]
    x0, y0, x1, y1 = transform(para_pttm, limite).bounds
    for camada in nomes:
        inicio = 0
        while True:
            lote = pedir(url, {
                "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": camada,
                "outputFormat": "application/vnd.geo+json", "count": PAGINA, "startIndex": inicio,
                "bbox": f"{x0},{y0},{x1},{y1},urn:ogc:def:crs:EPSG::3763",
            }).json().get("features") or []
            for el in lote:
                if el.get("geometry"):
                    geom = transform(de_pttm, shape(el["geometry"]))  # a DGT responde em PT-TM06
                    yield elemento(geom, limite, el.get("properties") or {},
                                   camada=camada.split(":")[-1].replace("_", " "))
            if not lote or len(lote) < PAGINA:
                break
            inicio += len(lote)


def ags_camara(servico, camada, limite):
    url = f"{servico['url']}/{camada['id']}/query"
    x0, y0, x1, y1 = limite.bounds
    inicio = 0
    while True:
        j = pedir(url, {
            "where": "1=1", "geometry": f"{x0},{y0},{x1},{y1}", "geometryType": "esriGeometryEnvelope",
            "inSR": 4326, "spatialRel": "esriSpatialRelIntersects", "outFields": "*", "outSR": 4326,
            "f": "geojson", "resultOffset": inicio, "resultRecordCount": PAGINA,
        }).json()
        if "error" in j:
            raise RuntimeError(j["error"].get("message", "erro do serviço"))
        lote = j.get("features") or []
        for el in lote:
            if el.get("geometry"):
                yield elemento(shape(el["geometry"]), limite, el.get("properties") or {}, camada=camada["nome"])
        # O limite por pedido de cada servidor pode ser menor que PAGINA: segue enquanto houver mais.
        mais = j.get("exceededTransferLimit") or (j.get("properties") or {}).get("exceededTransferLimit")
        if not lote or not mais:
            return
        inicio += len(lote)


def gravar(pasta, fonte, gerador, meta, indice):
    """Grava só se correr bem; em caso de falha mantém o ficheiro anterior."""
    t = time.time()
    try:
        els = []
        for e in gerador:
            if time.time() - t > TEMPO_FONTE:
                raise TimeoutError(f"mais de {TEMPO_FONTE // 60} min sem terminar")
            if e:
                els.append(e)
        for e in els:
            e["properties"].update(fonte=fonte, app=meta.get("app"), entidade=meta.get("entidade"))
        (pasta / f"{fonte}.geojson").write_text(
            json.dumps({"type": "FeatureCollection", "features": els}, ensure_ascii=False, separators=(",", ":")))
        indice[fonte] = {**meta, "ficheiro": f"{fonte}.geojson", "ok": True, "elementos": len(els),
                         "atualizado": agora(), "erro": None}
        print(f"OK    {fonte:28} {len(els):6} elementos  {time.time() - t:5.0f} s")
    except Exception as e:  # uma fonte em baixo não pára as outras
        anterior = indice.get(fonte, {})
        indice[fonte] = {**anterior, **meta, "ok": False, "tentativa": agora(), "erro": str(e)[:300]}
        print(f"FALHA {fonte:28} {e}")
    gravar_indice(pasta, indice)


def gravar_indice(pasta, indice):
    # Gravado depois de cada fonte, para não se perder o trabalho se a execução for interrompida.
    (pasta / "indice.json").write_text(json.dumps(
        {"concelho": pasta.name, "gerado": agora(), "fontes": indice}, ensure_ascii=False, indent=1))


def agora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def carregar(chave, cfg, municipios):
    pasta = DADOS / chave
    pasta.mkdir(parents=True, exist_ok=True)
    ficheiro_indice = pasta / "indice.json"
    indice = json.loads(ficheiro_indice.read_text())["fontes"] if ficheiro_indice.exists() else {}

    limite = shape(pedir(CAOP.format(cfg["dico"])).json()["geometry"])
    folga = limite.buffer(0.002)  # cerca de 200 m, para servidões que entram a partir do concelho vizinho
    (pasta / "limite.geojson").write_text(json.dumps({"type": "Feature", "geometry": mapping(
        limite.simplify(0.0001)), "properties": {"nome": cfg["nome"], "dico": cfg["dico"]}}))

    if cfg.get("camara"):
        for s in municipios[chave].get("servicos", []):
            if s.get("tipo") != "ags-query":
                continue
            for c in s["camadas"]:
                gravar(pasta, f"CM_{c['id']}", ags_camara(s, c, folga),
                       {"origem": f"Câmara Municipal de {cfg['nome']} (planta de condicionantes)",
                        "descricao": c["nome"], "app": c.get("k") or None, "entidade": "Câmara municipal"}, indice)

    for f in cfg.get("nacionais", []):
        gravar(pasta, f["fonte"], wfs_dgt(f, folga),
               {"origem": "DGT (SNIT, SRUP)", "descricao": f["codigo"], "app": f["app"], "entidade": f["entidade"]}, indice)

    manual = DADOS / "manual" / chave
    for fich in sorted(manual.glob("*.geojson")) if manual.exists() else []:
        j = json.loads(fich.read_text())
        meta = j.get("metadados", {})
        gravar(pasta, f"MANUAL_{fich.stem}",
               (elemento(shape(e["geometry"]), folga, e.get("properties") or {}, camada=meta.get("descricao", fich.stem))
                for e in j.get("features", []) if e.get("geometry")),
               {"origem": "Carregado à mão", **meta}, indice)

    gravar_indice(pasta, indice)
    tam = sum(p.stat().st_size for p in pasta.glob("*.geojson"))
    print(f"{cfg['nome']}: {sum(1 for v in indice.values() if v.get('ok'))}/{len(indice)} fontes, {tam / 1e6:.1f} MB")
    return all(not v.get("ok") for v in indice.values())


def main():
    cfgs = json.loads((RAIZ / "carregar" / "fontes.json").read_text())
    municipios = json.loads((RAIZ / "dados" / "municipios.json").read_text())
    escolhidos = sys.argv[1:] or list(cfgs)
    tudo_falhou = [carregar(c, cfgs[c], municipios) for c in escolhidos]
    sys.exit(1 if all(tudo_falhou) else 0)


if __name__ == "__main__":
    main()

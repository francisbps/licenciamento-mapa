"""Descarrega as condicionantes de um concelho e guarda-as como ficheiros GeoJSON no próprio site.

Uso: python carregar/carregar.py [concelho ...]       (sem argumentos: todos os de fontes.json)

Para cada concelho junta três origens, todas recortadas pelo limite oficial do concelho (CAOP):
- cartas nacionais da DGT (serviços WFS SRUP);
- planta de condicionantes da câmara, quando tem serviço aberto (dados/municipios.json): ArcGIS ou GeoServer;
- ficheiros carregados à mão em dados/condicionantes/manual/<concelho>/ (respostas escritas de entidades).
Se uma fonte falhar, fica o ficheiro da semana anterior e o erro fica registado no índice.
"""
import json
import math
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests
import shapely
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import (LinearRing, box, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon,
                              mapping, shape)
from shapely.ops import transform

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados" / "condicionantes"
WFS_DGT = "https://servicos.dgterritorio.pt/SDISNITWFSSRUP_{}_PT1/WFService.aspx"
CAOP = "https://ogcapi.dgterritorio.gov.pt/collections/municipios/items/{}?f=json"
PAGINA_DGT = 200  # páginas pequenas: a REN e o domínio hídrico esgotavam o tempo com 1000
LOTE_IDS = 200  # elementos por pedido à câmara (o servidor não pagina)
ESPERA = 150  # segundos por pedido: a DGT é lenta
TEMPO_FONTE = 1200  # uma fonte que passe disto é dada como falhada nesta semana
SIMPLIFICAR = 0.000005  # cerca de 0,5 m
CASAS = 6  # casas decimais das coordenadas (cerca de 10 cm)
LADRILHO = 0.05  # graus (cerca de 5 km): fontes grandes são partidas em ladrilhos
MAX_FICHEIRO = 8e6  # bytes; acima disto a fonte é partida, para o browser só descarregar a zona do ponto
CAMPOS_FORA = ("objectid", "shape", "globalid", "fid", "st_area", "st_length", "gml_id")
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
    g = shapely.transform(g.simplify(SIMPLIFICAR, preserve_topology=True), lambda c: c.round(CASAS))
    props = {k: v for k, v in props.items()
             if v not in (None, "", " ") and not k.lower().startswith(CAMPOS_FORA)}
    return {"type": "Feature", "geometry": mapping(g),
            "properties": {"nome": nome_de(props) or extra.get("camada"), "atributos": props}}


def json_ou_erro(r):
    """Devolve o JSON da resposta; se o serviço respondeu outra coisa, o erro mostra o início da resposta."""
    try:
        return r.json()
    except ValueError:
        texto = " ".join(r.text.split())[:200]
        raise RuntimeError(f"resposta não é JSON ({r.headers.get('content-type', '?')}): {texto}") from None


def de_pttm_certo(g, perto):
    """Passa de PT-TM06 para graus. Alguns serviços trocam a ordem dos eixos (norte, este):
    fica a leitura que cai perto do concelho."""
    a = transform(de_pttm, g)
    if a.intersects(perto):
        return a
    b = transform(de_pttm, transform(lambda x, y, z=None: (y, x), g))
    return b if b.intersects(perto) else a


def wfs_dgt(f, limite):
    url = f.get("url") or WFS_DGT.format(f["codigo"])
    caps = ET.fromstring(pedir(url, {"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"}).content)
    nomes = [e.text for e in caps.iter() if e.tag.endswith("}Name") and e.text and ":" in e.text]
    x0, y0, x1, y1 = transform(para_pttm, limite).bounds
    perto = limite.envelope.buffer(0.05)
    vistos = set()
    # A ordem dos eixos da caixa não é igual em todos os serviços: pede-se nas duas ordens
    # (o que cair fora do concelho é cortado depois) e junta-se sem repetidos.
    for caixa in (f"{x0},{y0},{x1},{y1}", f"{y0},{x0},{y1},{x1}"):
        # Nem todos os serviços aceitam o mesmo pedido: experimenta variantes e fica com a primeira que der JSON.
        variantes = [
            {"outputFormat": "application/vnd.geo+json", "bbox": f"{caixa},urn:ogc:def:crs:EPSG::3763"},
            {"outputFormat": "application/vnd.geo+json", "bbox": caixa},
            {"outputFormat": "application/json", "bbox": caixa},
        ]
        for camada in nomes:
            inicio, erro = 0, None
            while True:
                for v in list(variantes):
                    try:
                        lote = json_ou_erro(pedir(url, {
                            "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": camada,
                            "count": PAGINA_DGT, "startIndex": inicio, **v})).get("features") or []
                        variantes.remove(v)
                        variantes.insert(0, v)
                        break
                    except RuntimeError as e:
                        erro = e
                else:
                    raise erro
                for el in lote:
                    if not el.get("geometry"):
                        continue
                    chave = (camada, el.get("id") or json.dumps(el["geometry"])[:500])
                    if chave in vistos:
                        continue
                    vistos.add(chave)
                    yield elemento(de_pttm_certo(shape(el["geometry"]), perto), limite, el.get("properties") or {},
                                   camada=camada.split(":")[-1].replace("_", " "))
                if not lote or len(lote) < PAGINA_DGT:
                    break
                inicio += len(lote)


def esri_para_shape(g):
    """Converte uma geometria Esri JSON (pontos, linhas ou polígonos) numa geometria shapely."""
    if "x" in g:
        return Point(g["x"], g["y"])
    if "points" in g:
        return MultiPoint(g["points"])
    if "paths" in g:
        return MultiLineString(g["paths"])
    # Nos polígonos Esri os anéis exteriores andam no sentido dos ponteiros do relógio e os buracos ao contrário.
    exteriores, buracos = [], []
    for anel in g.get("rings", []):
        if len(anel) < 4:
            continue
        (buracos if LinearRing(anel).is_ccw else exteriores).append(anel)
    polis = [Polygon(e, [b for b in buracos if Polygon(e).contains(Point(b[0]))]) for e in exteriores]
    return MultiPolygon(polis) if len(polis) > 1 else polis[0]


def ags_camara(servico, camada, limite):
    """O servidor da Câmara não pagina: pede primeiro os identificadores e depois os elementos em lotes."""
    url = f"{servico['url']}/{camada['id']}/query"
    x0, y0, x1, y1 = limite.bounds
    zona = {"geometry": f"{x0},{y0},{x1},{y1}", "geometryType": "esriGeometryEnvelope", "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects", "f": "json"}
    j = json_ou_erro(pedir(url, {**zona, "where": "1=1", "returnIdsOnly": "true"}))
    if "error" in j:
        raise RuntimeError(j["error"].get("message", "erro do serviço"))
    ids = sorted(j.get("objectIds") or [])
    for i in range(0, len(ids), LOTE_IDS):
        j = json_ou_erro(pedir(url, {"objectIds": ",".join(map(str, ids[i:i + LOTE_IDS])),
                                     "outFields": "*", "outSR": 4326, "f": "json"}))
        if "error" in j:
            raise RuntimeError(j["error"].get("message", "erro do serviço"))
        for el in j.get("features") or []:
            if el.get("geometry"):
                yield elemento(esri_para_shape(el["geometry"]), limite, el.get("attributes") or {},
                               camada=camada["nome"])


def camadas_mapserver(servico):
    """Lista as camadas com elementos de um MapServer (sem os grupos); respeita os ids indicados, se houver."""
    j = json_ou_erro(pedir(servico["url"], {"f": "json"}))
    if "error" in j:
        raise RuntimeError(j["error"].get("message", "erro do serviço"))
    so = {int(i) for i in str(servico.get("ids") or "").split(",") if i.strip()}
    return [{"id": c["id"], "nome": c["name"]} for c in j.get("layers") or []
            if not c.get("subLayerIds") and (not so or c["id"] in so)]


def lonlat(g):
    """Algumas respostas em EPSG:4326 vêm em latitude, longitude: em Portugal a longitude é negativa."""
    x, y = g.representative_point().coords[0]
    return transform(lambda a, b, z=None: (b, a), g) if x > 0 and y < 0 else g


def wfs_geoserver(servico, camada, limite):
    """Camada de um GeoServer municipal, pedida por WFS em páginas."""
    url, inicio = servico["url"], 0
    while True:
        lote = json_ou_erro(pedir(url, {
            "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": camada,
            "outputFormat": "application/json", "srsName": "EPSG:4326", "count": 1000, "startIndex": inicio}))
        if "features" not in lote:
            raise RuntimeError(str(lote)[:200])
        els = lote["features"]
        for el in els:
            if el.get("geometry"):
                yield elemento(lonlat(shape(el["geometry"])), limite, el.get("properties") or {},
                               camada=servico.get("nome") or camada)
        if len(els) < 1000:
            break
        inicio += len(els)


def camadas_geoserver(servico):
    caps = ET.fromstring(pedir(servico["url"], {"service": "WFS", "version": "2.0.0",
                                                "request": "GetCapabilities"}).content)
    local = lambda e: e.tag.split("}")[-1]  # nome da etiqueta sem o espaço de nomes
    nomes = [e.text for t in caps.iter() if local(t) == "FeatureType"
             for e in t if local(e) == "Name" and e.text]
    pedidas = [n.strip() for n in str(servico.get("layers") or "").split(",") if n.strip()]
    if not pedidas:
        return nomes
    escolhidas = [n for n in nomes if n.split(":")[-1] in pedidas or n in pedidas]
    if not escolhidas:
        # Um nome do WMS pode ser um grupo de camadas: o GeoServer diz quais são as camadas WFS por baixo.
        try:
            j = json_ou_erro(pedir(servico["url"], {"service": "WMS", "version": "1.1.1", "request": "DescribeLayer",
                                                    "layers": ",".join(pedidas), "outputFormat": "application/json"}))
            tipos = {d.get("typeName") for d in j.get("layerDescriptions") or []}
            escolhidas = [n for n in nomes if n in tipos or n.split(":")[-1] in {str(t).split(":")[-1] for t in tipos}]
        except Exception:
            pass
    if not escolhidas:
        # Ou então a lista do grupo no GetCapabilities do WMS.
        try:
            wms = ET.fromstring(pedir(servico["url"], {"service": "WMS", "version": "1.3.0",
                                                       "request": "GetCapabilities"}).content)
            for camada in wms.iter():
                if local(camada) != "Layer":
                    continue
                nome = next((e.text for e in camada if local(e) == "Name"), None)
                if nome and nome.split(":")[-1] in pedidas:
                    filhos = {e.text.split(":")[-1] for c in camada.iter() if local(c) == "Layer" and c is not camada
                              for e in c if local(e) == "Name" and e.text}
                    escolhidas = [n for n in nomes if n.split(":")[-1] in filhos]
                    break
        except Exception:
            pass
    if not escolhidas:
        raise RuntimeError(f"camada {', '.join(pedidas)} não existe no WFS (há: {', '.join(n.split(':')[-1] for n in nomes)})"[:1000])
    return escolhidas


def colecao(els):
    return json.dumps({"type": "FeatureCollection", "features": els}, ensure_ascii=False, separators=(",", ":"))


def escrever(pasta, fonte, els):
    """Grava a fonte num ficheiro; se for grande, parte-a em ladrilhos numa pasta com o nome da fonte."""
    texto = colecao(els)
    pasta_l = pasta / fonte
    for velho in pasta_l.glob("*.geojson") if pasta_l.exists() else []:
        velho.unlink()
    if len(texto.encode()) <= MAX_FICHEIRO:
        (pasta / f"{fonte}.geojson").write_text(texto)
        return {"ladrilhos": None}
    (pasta / f"{fonte}.geojson").unlink(missing_ok=True)
    pasta_l.mkdir(exist_ok=True)
    grupos = {}
    for e in els:
        g = shape(e["geometry"])
        x0, y0, x1, y1 = g.bounds
        for ix in range(math.floor(x0 / LADRILHO), math.floor(x1 / LADRILHO) + 1):
            for iy in range(math.floor(y0 / LADRILHO), math.floor(y1 / LADRILHO) + 1):
                if g.geom_type.endswith("Polygon") and (x1 - x0 > LADRILHO or y1 - y0 > LADRILHO):
                    # Elementos grandes: só o pedaço dentro do ladrilho (com 20 m de folga).
                    caixa = box(ix * LADRILHO, iy * LADRILHO, (ix + 1) * LADRILHO, (iy + 1) * LADRILHO).buffer(0.0002)
                    parte = g.intersection(caixa)
                    if parte.is_empty:
                        continue
                    e2 = {**e, "geometry": mapping(shapely.transform(parte, lambda c: c.round(CASAS)))}
                else:
                    e2 = e
                grupos.setdefault(f"{ix}_{iy}", []).append(e2)
    for nome, lista in grupos.items():
        (pasta_l / f"{nome}.geojson").write_text(colecao(lista))
    return {"ladrilhos": {"tamanho": LADRILHO, "lista": sorted(grupos)}}


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
        extra = escrever(pasta, fonte, els)
        indice[fonte] = {**meta, "ficheiro": f"{fonte}.geojson", "ok": True, "elementos": len(els),
                         "atualizado": agora(), "erro": None, **extra}
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


def limite_caop(cfg):
    """Limite do concelho na CAOP. O identificador do elemento nem sempre é o código DICO:
    se não der, procura pelo código e depois pelo nome."""
    try:
        return pedir(CAOP.format(cfg["dico"]), tentativas=1).json()
    except requests.HTTPError:
        pass
    base = CAOP.split("/items/")[0] + "/items"
    nome = cfg["nome"].upper()
    for filtro in ({"dico": cfg["dico"]}, {"dtmn": cfg["dico"]}, {"municipio": nome}, {"concelho": nome}):
        try:
            els = pedir(base, {"f": "json", "limit": 5, **filtro}, tentativas=1).json().get("features") or []
        except requests.RequestException:
            continue
        for el in els:
            props = " ".join(str(v) for v in (el.get("properties") or {}).values()).upper()
            if cfg["dico"] in props or nome in props:
                return el
    raise RuntimeError(f"limite de {cfg['nome']} ({cfg['dico']}) não encontrado na CAOP")


def carregar(chave, cfg, municipios, cfgs):
    pasta = DADOS / chave
    pasta.mkdir(parents=True, exist_ok=True)
    ficheiro_indice = pasta / "indice.json"
    indice = json.loads(ficheiro_indice.read_text())["fontes"] if ficheiro_indice.exists() else {}

    caop = limite_caop(cfg)
    limite = shape(caop["geometry"])
    print(f"== {cfg['nome']} (CAOP {cfg['dico']}: {(caop.get('properties') or {}).get('municipio', '?')})")
    folga = limite.buffer(0.002)  # cerca de 200 m, para servidões que entram a partir do concelho vizinho
    (pasta / "limite.geojson").write_text(json.dumps({"type": "Feature", "geometry": mapping(
        limite.simplify(0.0001)), "properties": {"nome": cfg["nome"], "dico": cfg["dico"]}}))

    if cfg.get("camara"):
        origem = f"Câmara Municipal de {cfg['nome']} (planta de condicionantes)"
        m = municipios.get(chave) or municipios.get(chave.replace("-", " ")) or {}
        servicos = m.get("servicos", [])
        for n, s in enumerate(servicos, 1):
            pre = "CM_" if len(servicos) == 1 else f"CM_{n}_"
            try:
                if s.get("tipo") == "ags-query":
                    camadas = s["camadas"]
                elif s.get("tipo") == "ags-identify":
                    camadas = camadas_mapserver(s)
                elif s.get("tipo") == "wms":
                    camadas = camadas_geoserver(s)
                else:
                    continue
            except Exception as e:
                indice[f"{pre}servico"] = {"origem": origem, "descricao": s["url"], "ok": False,
                                           "tentativa": agora(), "erro": str(e)[:1000]}
                print(f"FALHA {pre}servico {e}")
                continue
            indice.pop(f"{pre}servico", None)
            for c in camadas:
                if s.get("tipo") == "wms":
                    # Uma só camada com todas as condicionantes: o nome de cada uma vem do próprio elemento.
                    curto = c.split(":")[-1]
                    rotulo = (s.get("nome") or curto) if len(camadas) == 1 else \
                        re.sub(r"^(PDM)?\d{4}_", "", curto).replace("_", " ")
                    gravar(pasta, pre + curto, wfs_geoserver({**s, "nome": rotulo}, c, folga),
                           {"origem": origem, "descricao": rotulo, "app": None,
                            "entidade": "Câmara municipal", "por_elemento": True}, indice)
                else:
                    gravar(pasta, f"{pre}{c['id']}", ags_camara(s, c, folga),
                           {"origem": origem, "descricao": c["nome"], "app": c.get("k") or None,
                            "entidade": "Câmara municipal"}, indice)

    nacionais = cfg.get("nacionais")
    if nacionais is None:  # cartas nacionais comuns, com a REN da região do concelho
        ren = cfg.get("ren")
        nacionais = ([{"fonte": "DGT_REN", "codigo": "REN", "app": "ren", "entidade": cfgs["_ren"][ren],
                       "url": f"https://servicos.dgterritorio.pt/SDISNITWFSSRUP_REN_{ren}/WFService.aspx"}]
                     if ren else []) + cfgs["_nacionais"]
    for f in nacionais:
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
    escolhidos = sys.argv[1:] or [c for c in cfgs if not c.startswith("_")]
    tudo_falhou = [carregar(c, cfgs[c], municipios, cfgs) for c in escolhidos]
    sys.exit(1 if all(tudo_falhou) else 0)


if __name__ == "__main__":
    main()

"""Exploração (temporária), 2.ª ronda: amostras das coleções SRUP da OGC API, tamanhos dos zips da APA, WFS ARU/ICNF."""
import json
import re
from pathlib import Path

import requests

S = requests.Session()
S.headers["User-Agent"] = "licenciamento-mapa (carregador de condicionantes)"
out = {}
BB = "-9.23,38.69,-9.09,38.80"  # Lisboa


def guardar(k, v):
    out[k] = v
    Path("dados/condicionantes/_explorar.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


for c in ["srup_ren_areal", "srup_ren_linear", "sgifr_areas", "sgifr_linhas", "sgifr_pontos", "srup_ran",
          "srup_areas_protegidas", "srup_arvores_areal", "srup_arvores_point", "srup_marcos_geod", "srup_aeronautica",
          "srup_albufeiras", "srup_aquiferos", "srup_defesa_militar", "srup_defesa_militar_zonas", "srup_zpe", "srup_zec",
          "srup_perigosidade_inc_rural", "srup_rede_viaria", "srup_rede_ferroviaria", "srup_rede_ferroviaria_estacoes",
          "srup_rede_eletrica"]:
    try:
        r = S.get(f"https://ogcapi.dgterritorio.gov.pt/collections/{c}/items", params={"f": "json", "limit": 3, "bbox": BB}, timeout=90)
        j = r.json()
        fs = j.get("features") or []
        guardar(c, {"status": r.status_code, "s": round(r.elapsed.total_seconds(), 1), "matched": j.get("numberMatched"),
                    "n": len(fs), "tipos": [f["geometry"]["type"] for f in fs if f.get("geometry")],
                    "props": [f.get("properties") for f in fs[:2]], "links": [l.get("rel") for l in j.get("links", [])]})
    except Exception as e:
        guardar(c, str(e)[:300])
# valores distintos da perigosidade
try:
    r = S.get("https://ogcapi.dgterritorio.gov.pt/collections/srup_perigosidade_inc_rural/items", params={"f": "json", "limit": 200, "bbox": "-9.4,38.7,-9.1,38.9"}, timeout=120)
    vals = {}
    for f in r.json().get("features", []):
        for k, v in (f.get("properties") or {}).items():
            if isinstance(v, (str, int)) and len(vals.setdefault(k, [])) < 12 and v not in vals[k]:
                vals[k].append(v)
    guardar("cpir_valores", vals)
except Exception as e:
    guardar("cpir_valores", str(e)[:300])

for u in ["https://sniambgeoviewer.apambiente.pt/Geodocs/shpzips/D312_APA_AI_T020_Limite_PC.zip",
          "https://sniambgeoviewer.apambiente.pt/Geodocs/shpzips/D312_APA_AI_T100_Limite_PC.zip",
          "https://sniambgeoviewer.apambiente.pt/GeoDocs/shpzips/D312_APA_POC_FxSalvLitArenGalg_PC.zip",
          "https://sniambgeoviewer.apambiente.pt/GeoDocs/shpzips/D312_APA_POC_FxSalvLitArenEros_PC.zip",
          "https://snit-mais.dgterritorio.gov.pt/SNIT/DOWNLOAD/SRUP/CARTA_PERIGOSIDADE_INCENDIO_RURAL/PERIGOSIDADE_INCENDIO_RURAL.zip",
          "https://snit-mais.dgterritorio.gov.pt/SNIT/DOWNLOAD/SRUP/"]:
    try:
        r = S.head(u, timeout=60, allow_redirects=True)
        guardar(u, [r.status_code, r.headers.get("content-length"), r.headers.get("content-type")])
    except Exception as e:
        guardar(u, str(e)[:200])

for nome, u in [("aru", "https://servicos.dgterritorio.pt/SDISNITWFSARU/WFService.aspx"),
                ("icnf_inspire", "https://si.icnf.pt/geoserver/INSPIRE/wfs"),
                ("icnf_ows", "https://si.icnf.pt/geoserver/ows")]:
    try:
        r = S.get(u, params={"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"}, timeout=90)
        nomes = re.findall(r"<(?:wfs:)?Name>([^<]+)</(?:wfs:)?Name>", r.text)
        guardar(nome, [r.status_code, [n for n in nomes if re.search(r"aru|flor|rf|regime|refloa|ardid|perim", n, re.I)][:40], len(nomes)])
    except Exception as e:
        guardar(nome, str(e)[:200])
print(json.dumps(out, ensure_ascii=False)[:2000])

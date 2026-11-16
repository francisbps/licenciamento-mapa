"""Exploração (temporária): que descarregamentos em ficheiro existem para as cartas da DGT e outras."""
import json
import re
from pathlib import Path

import requests

S = requests.Session()
S.headers["User-Agent"] = "licenciamento-mapa (carregador de condicionantes)"
out = {}


def get(url, **kw):
    try:
        r = S.get(url, timeout=60, **kw)
        return r.status_code, r.headers.get("content-type", ""), r
    except Exception as e:
        return None, str(e)[:200], None


def guardar(k, v):
    out[k] = v
    Path("dados/condicionantes/_explorar.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


# 1. OGC API da DGT: coleções
st, ct, r = get("https://ogcapi.dgterritorio.gov.pt/collections?f=json")
try:
    guardar("ogcapi", [(c["id"], c.get("title")) for c in r.json()["collections"]])
except Exception as e:
    guardar("ogcapi", [st, ct, str(e)[:200]])

# 2. dados.gov.pt: conjuntos SRUP e recursos
res = []
for q in ("srup", "reserva ecologica nacional", "reserva agricola nacional", "carta de perigosidade de incendio",
          "zonas inundaveis", "regime florestal", "area de reabilitacao urbana", "faixas de gestao de combustivel",
          "imoveis classificados", "orla costeira"):
    st, ct, r = get("https://dados.gov.pt/api/1/datasets/", params={"q": q, "page_size": 40})
    try:
        for d in r.json()["data"]:
            res.append({"q": q, "titulo": d["title"], "org": (d.get("organization") or {}).get("name"),
                        "rec": [(x.get("format"), x.get("title"), x["url"]) for x in d.get("resources", [])][:8]})
    except Exception as e:
        res.append({"q": q, "erro": [st, ct, str(e)[:200]]})
guardar("dados_gov", res)

# 3. SNIG: registo de metadados da REN (CSW) e pesquisa de serviços de descarregamento
st, ct, r = get("https://snig.dgterritorio.gov.pt/rndg/srv/api/records/ad95b02a-fbd2-4b8e-89b6-f699a9ff3c0d/formatters/xml")
guardar("snig_ren", [st, ct, sorted(set(re.findall(r"https?://[^<\"' ]+", r.text)))[:80] if r is not None else None])

# 4. WFS da DGT: quanto tempo demora o GetCapabilities de algumas cartas, e se há outputFormat de ficheiro
for c in ("REN_LVT", "RAN", "IC", "MG", "CPIR"):
    st, ct, r = get(f"https://servicos.dgterritorio.pt/SDISNITWFSSRUP_{c}_PT1/WFService.aspx",
                    params={"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"})
    fmts = sorted(set(re.findall(r"<ows:Value>([^<]+)</ows:Value>", r.text)))[:40] if r is not None else None
    guardar(f"wfs_{c}", [st, ct, fmts, r.elapsed.total_seconds() if r is not None else None])
print(json.dumps(out, ensure_ascii=False)[:3000])

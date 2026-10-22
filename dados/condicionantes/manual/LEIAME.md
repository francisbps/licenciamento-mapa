# Condicionantes carregadas à mão

Para informação que a câmara ou a entidade não publica e que foi pedida por escrito.

1. Criar a pasta do concelho, por exemplo `lisboa/`.
2. Pôr lá um ficheiro `.geojson` (em WGS84, como sai do geojson.io ou do QGIS) com as áreas desenhadas a partir da resposta. Um ficheiro por resposta.
3. Juntar ao ficheiro um bloco `metadados`:

```json
{
  "type": "FeatureCollection",
  "metadados": {
    "descricao": "Zona de proteção do Aqueduto das Águas Livres",
    "app": "aqueduto",
    "entidade": "EPAL",
    "documento": "Ofício n.º 123/2026, de 15-11-2026",
    "pedido": "2026-10-30",
    "resposta": "2026-11-15"
  },
  "features": [ ... ]
}
```

`app` é a chave da condicionante na app (a mesma lista do mapa: aero, aqueduto, gas, pat, ren, hidrico...).
O carregamento semanal junta estes ficheiros aos restantes, recorta-os pelo concelho e mostra a origem "Carregado à mão" com o documento.
Para correr logo: GitHub → Actions → Carregar condicionantes → Run workflow.

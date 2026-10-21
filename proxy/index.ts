// Intermediário para o mapa: pede aos serviços oficiais (WMS e ArcGIS) o que o browser não pode ler por CORS.
// Supabase Edge Function "mapa-proxy", sem verificação de JWT. Uso: GET ?url=<endereço do serviço>
const ORIGENS = ["https://francisbps.github.io", "http://localhost:8765"];
// Só servidores públicos portugueses e só pedidos de mapa (WMS, WFS, ArcGIS).
const HOST_OK = /(^|\.)(gov\.pt|apambiente\.pt|icnf\.pt|amcb\.pt|oestedigital\.pt|city-platform\.com|agol\.pt|(cm|mun)-[a-z-]+\.pt|[a-z-]+\.pt)$/i;
const PEDIDO_OK = /(service=wm[st]|service=wfs|\/mapserver\/|\/featureserver\/|\/rest\/services\/)/i;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGENS.includes(origin) ? origin : ORIGENS[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "GET") return new Response("Só GET", { status: 405, headers: h });
  let alvo: URL;
  try { alvo = new URL(new URL(req.url).searchParams.get("url") ?? ""); } catch { return new Response("url inválido", { status: 400, headers: h }); }
  if (!/^https?:$/.test(alvo.protocol) || !HOST_OK.test(alvo.hostname) || !PEDIDO_OK.test(alvo.pathname + alvo.search)) {
    return new Response("Serviço não permitido", { status: 403, headers: h });
  }
  try {
    // A DGT demora por vezes mais de 30 s a responder (sobretudo ao GetCapabilities).
    const lento = /getcapabilities/i.test(alvo.search);
    const r = await fetch(alvo, { signal: AbortSignal.timeout(lento ? 60000 : 50000), headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      "Accept": "*/*", "Accept-Language": "pt-PT,pt;q=0.9", "Referer": "https://francisbps.github.io/",
    } });
    const corpo = await r.arrayBuffer();
    if (!r.ok) console.log("falhou", r.status, alvo.hostname, new TextDecoder().decode(corpo.slice(0, 300)));
    if (corpo.byteLength > 5_000_000) return new Response("Resposta grande demais", { status: 502, headers: h });
    return new Response(corpo, {
      status: r.status,
      headers: { ...h, "Content-Type": r.headers.get("content-type") ?? "text/plain", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return new Response("Serviço não respondeu: " + (e as Error).message, { status: 504, headers: h });
  }
});

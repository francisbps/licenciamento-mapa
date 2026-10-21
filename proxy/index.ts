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
    const r = await fetch(alvo, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "licenciamento-mapa (francisbps.github.io)" } });
    const corpo = await r.arrayBuffer();
    if (corpo.byteLength > 5_000_000) return new Response("Resposta grande demais", { status: 502, headers: h });
    return new Response(corpo, {
      status: r.status,
      headers: { ...h, "Content-Type": r.headers.get("content-type") ?? "text/plain", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return new Response("Serviço não respondeu: " + (e as Error).message, { status: 504, headers: h });
  }
});

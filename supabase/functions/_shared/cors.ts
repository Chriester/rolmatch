// CORS para las funciones invocadas desde el navegador (supabase.functions
// .invoke desde la web). withCors contesta el preflight OPTIONS, estampa
// las cabeceras en TODAS las respuestas — incluidas las de un throw no
// capturado, que sin esto llegan al navegador como error CORS opaco (el
// síntoma exacto que se depuró en el canje de códigos, PR #186).

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function withCors(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    try {
      const response = await handler(req);
      // asegura las cabeceras aunque el handler construyera la Response a mano
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      console.error(`error no capturado: ${error instanceof Error ? error.stack : error}`);
      return json({ error: 'Error interno' }, 500);
    }
  };
}

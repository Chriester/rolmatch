// Vista previa OG por mesa (Vercel Function, free tier).
//
// La web es una SPA (`expo export -p web` + rewrite a index.html), así que
// los crawlers de WhatsApp/Discord/Telegram veían la tarjeta genérica del
// sitio en CUALQUIER enlace: compartir una mesa —el motor de crecimiento
// nº 1— salía sin nombre, sin imagen y sin plazas. vercel.json manda aquí
// solo a los bots (rewrite condicionado por user-agent); las personas
// siguen yendo a la SPA.
//
// Los datos salen del RPC public_group_card (migr. 00046): lo mismo que ve
// un anónimo en la ficha de invitación, ni un campo más.

const APP_URL = 'https://rolmatch.vercel.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Etiquetas duplicadas de src/lib/groups.ts a propósito: esta función corre
// en Node (Vercel), no puede importar del bundle de la app.
const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const SLOTS = ['por la mañana', 'por la tarde', 'por la noche', 'de madrugada'];
const FORMATS: Record<string, string> = { campaign: 'Campaña', oneshot: 'One-shot' };

type GroupCard = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  format: string;
  session_weekday: number | null;
  session_slot: number | null;
  system_name: string | null;
  max_players: number;
  taken_seats: number;
};

// Firma mínima de la función Node de Vercel, sin depender de @vercel/node.
type OgRequest = { query: Record<string, string | string[] | undefined> };
type OgResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function fetchCard(groupId: string): Promise<GroupCard | null> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const response = await fetch(`${url}/rest/v1/rpc/public_group_card`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_group_id: groupId }),
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as GroupCard[];
  return rows[0] ?? null;
}

function page(title: string, description: string, image: string, url: string): string {
  const [t, d, i, u] = [title, description, image, url].map(escapeHtml);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="rolder">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="summary_large_image">
<meta name="description" content="${d}">
</head>
<body><p><a href="${u}">${t}</a> — ${d}</p></body>
</html>`;
}

export default async function handler(req: OgRequest, res: OgResponse) {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // los crawlers reconsultan solos; 5 min de CDN evita machacar el RPC
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const fallback = page(
    'rolder — encuentra tu mesa de rol',
    'Swipe entre mesas y jugadores de rol online en español. Encuentra grupo para tu próxima campaña.',
    `${APP_URL}/icon-1024.png`,
    APP_URL
  );

  if (!id || !UUID_RE.test(id)) {
    res.status(200).send(fallback);
    return;
  }

  const card = await fetchCard(id).catch(() => null);
  if (!card) {
    // mesa disuelta, id inventado o migración sin aplicar: genérica y a otra cosa
    res.status(200).send(fallback);
    return;
  }

  const seats = Math.max(0, card.max_players - card.taken_seats);
  const when =
    card.session_weekday !== null && card.session_slot !== null
      ? `${WEEKDAYS[card.session_weekday] ?? ''} ${SLOTS[card.session_slot] ?? ''}`.trim()
      : null;
  const details = [
    card.system_name,
    FORMATS[card.format] ?? null,
    when,
    seats === 1 ? '1 plaza libre' : `${seats} plazas libres`,
  ].filter(Boolean);

  // lo operativo (sistema, día, plazas) siempre delante: es lo que decide
  // si el enlace interesa; la descripción va detrás, recortada
  const blurb = card.description?.trim()
    ? ` — ${card.description.trim().slice(0, 160)}`
    : '. Únete desde la app.';

  res.status(200).send(
    page(
      `«${card.name}» en rolder`,
      `${details.join(' · ')}${blurb}`,
      card.image_url ?? `${APP_URL}/icon-1024.png`,
      `${APP_URL}/groups/${card.id}`
    )
  );
}

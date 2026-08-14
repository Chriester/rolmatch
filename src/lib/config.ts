// Interruptores de features para la alpha.

/**
 * URL pública de la app: la única copia en el cliente. Cuando la marca
 * traiga dominio propio, se cambia aquí (y en api/og.ts, que corre en
 * Vercel y no puede importar de src/).
 */
export const APP_URL = 'https://rolmatch.vercel.app';

/**
 * Integración con Discord (bot de canales, unión al servidor, invitaciones
 * y enlaces a canales). DESACTIVADA POR COMPLETO hasta nuevo aviso
 * (decisión de Chris, 2026-08-12: no se usará de la forma planeada en un
 * futuro cercano). El login OAuth con Discord sigue activo — es solo un
 * proveedor de identidad. OJO: los webhooks de la base (on-match-created,
 * cleanup) y el cron de recordatorios se pausan a mano en el dashboard de
 * Supabase; esto solo apaga el lado del cliente.
 */
export const DISCORD_ENABLED = false;

/**
 * Página de apoyo voluntario (Ko-fi/BuyMeACoffee). Con null, el botón
 * «Apóyanos» de Opciones no se pinta — pegar aquí la URL cuando Chris cree
 * la página (plan de monetización: medir intención de pago en la beta).
 */
export const SUPPORT_URL: string | null = null;

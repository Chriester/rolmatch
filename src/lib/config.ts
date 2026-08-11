// Interruptores de features para la alpha.

/**
 * URL pública de la app: la única copia en el cliente. Cuando la marca
 * traiga dominio propio, se cambia aquí (y en api/og.ts, que corre en
 * Vercel y no puede importar de src/).
 */
export const APP_URL = 'https://rolmatch.vercel.app';

/**
 * Integración con Discord (bot de canales, unión al servidor, invitaciones
 * y enlaces a canales). DESACTIVADA temporalmente mientras Chris retoca el
 * servidor — poner a true para reactivarla. OJO: los webhooks de la base
 * (on-match-created, cleanup) y el cron de recordatorios se pausan a mano
 * en el dashboard de Supabase; esto solo apaga el lado del cliente.
 */
export const DISCORD_ENABLED = false;

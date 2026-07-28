// Interruptores de features para la alpha.

/**
 * Integración con Discord (bot de canales, unión al servidor, invitaciones
 * y enlaces a canales). DESACTIVADA temporalmente mientras Chris retoca el
 * servidor — poner a true para reactivarla. OJO: los webhooks de la base
 * (on-match-created, cleanup) y el cron de recordatorios se pausan a mano
 * en el dashboard de Supabase; esto solo apaga el lado del cliente.
 */
export const DISCORD_ENABLED = false;

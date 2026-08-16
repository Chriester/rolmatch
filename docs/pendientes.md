# Pendientes — decisiones aplazadas a propósito

Cosas identificadas en barridos de mejoras que se decidió NO hacer todavía,
con el porqué y la señal que indicaría que ha llegado su momento. Antes de
proponer una mejora, mirar aquí: si ya está listada, no es un hallazgo nuevo.

Última revisión: 2026-08-11.

## Operativo (bloquea funcionalidad ya mergeada)

- ✔ Migraciones al día (verificado por REST el 2026-08-16): las 00044 y
  00055–00060 están APLICADAS — bucket `chat-media` existe y las columnas de
  la tanda de retención responden 200. (Nota histórica: los «redespliega la
  función» de los PRs ya no son tarea — desde el PR #114 Actions despliega
  las 7 Edge Functions en cada merge.)
- **Migrar las fotos de chat viejas** del bucket público `avatars` a
  `chat-media` (privado). No se puede desde SQL: script contra la API de
  Storage, objeto a objeto. El cliente ya distingue ambas formas (URL completa
  = vieja/pública; ruta = nueva/firmada), así que no corre prisa funcional —
  es un tema de privacidad retroactiva. Sube de prioridad al publicar la
  política de privacidad de Play (barrido 2026-08-16).

## Aplazado con motivo (del barrido de 2026-08)

- **Clave de KLIPY expuesta** (gifs). Es `EXPO_PUBLIC_*`: va inlineada en el
  bundle web, rotarla no cambia nada. Opciones reales: restricción por
  dominio/referrer en KLIPY o proxy vía Edge Function. Decisión de Chris:
  fase más avanzada, solo afecta a gifs.
- **A2 — Onboarding en dos fases.** Cuatro pasos con foto obligatoria antes
  de ver una tarjeta. Esperar a que `onboarding_step` (analítica 00043) diga
  en qué paso se cae la gente antes de rediseñar.
- **A4 — Medir el recorrido de alta.** Ya se registra desde la PR #140;
  falta sentarse a mirar los datos cuando haya dos semanas de eventos.
- **B1 — Los filtros duros vacían el feed.** Relajarlos (p. ej. enseñar
  «mesas fuera de tu horario» al final) cuando `feed_empty` confirme la
  frecuencia real del problema.
- **B3 — Explorar (búsqueda/listado).** Sin masa crítica una pantalla de
  exploración enseña estanterías vacías. Señal: >50 mesas activas.
- **B4 — One-shots como vía de entrada.** Filtro «juega algo esta semana».
  Depende de que haya inventario de one-shots.
- **C1 — Bucle diario de XP.** Las misiones repetibles dependen de jugar
  (cada 1-2 semanas). Nada de rachas artificiales; pensar qué acción diaria
  tiene valor real antes de premiarla.
- **C3 — La pestaña de encuentros difumina nombres salvo premium.** Decisión
  de producto pendiente: el contador que no puedes abrir frustra más de lo
  que convierte.
- **Filtro de idioma inerte.** `profiles.languages` y `groups.language`
  existen con default `'es'` y el matching los aplica, pero ninguna UI los
  edita: hoy es un filtro que nunca filtra. Activarlo cuando haya usuarios
  no hispanohablantes… o quitarlo del scoring.
- **Reglas de negocio solo en el cliente.** Límites (mensajes, tamaños,
  frecuencia) viven en el cliente; un cliente modificado se los salta.
  Primera pieza cuando toque: rate limiting por trigger en las tablas
  calientes (messages, reports, swipes — cada mensaje dispara un webhook de
  push, así que hoy una cuenta hostil puede inundar de notificaciones a una
  mesa). Señal: primer episodio de spam o abuso real.
- **Crashes sin lector.** `client_errors` (00037) se inserta desde el
  ErrorBoundary y no se lee desde la app: los pantallazos de los testers
  solo se ven en el SQL Editor. Salida natural: sección «Crashes» en
  `/moderation` (la pantalla y el gate ya existen). Señal: al aplicar la
  00045 y empezar a usar la bandeja de verdad.
- **Silenciar chats.** No existe mute: cada mensaje de cada mesa dispara
  push, y la defensa del usuario será desactivar las notificaciones del
  sistema entero (perdemos el canal completo). Tabla `chat_mutes` + toggle
  en la cabecera del chat + check en push-notify. Señal: primera mesa
  charlatana de verdad o primera queja de exceso de avisos.
- **Moderar no tiene dientes.** La bandeja (00045) marca reportes pero no
  hay acción real: no existe `is_suspended` ni forma de apartar a un usuario
  tóxico sin SQL Editor. Flag de suspensión + excluir del feed + pantalla de
  «cuenta suspendida». Señal: el primer reporte que requiera actuar.

## Restos del rediseño de mesas (entregable aplicado en PRs #159-#164)

- **Editar mesa como acordeón con resumen** (entregable 3a, mitad edición).
  Crear ya va en 3 pasos; editar sigue en un scroll. El acordeón (secciones
  plegadas con el valor actual de resumen) es su propia PR. Señal: al
  retomar pulido, o si los testers editan mucho.

## Discord: integración desactivada por completo (decisión de 2026-08-12)

No se va a usar de la forma planeada en un futuro cercano. `DISCORD_ENABLED
= false` en el cliente, webhooks y cron pausados en el dashboard; el login
OAuth con Discord sigue activo como simple proveedor de identidad. La skill
**bot-discord** lleva el aviso. Señal de reactivación: decisión explícita
de Chris (si llega, revisar antes el rol de Administrador del bot — sigue
sin rebajarse a permisos mínimos).

## Esperando a la estrategia de marca (decisión de 2026-08)

Los tres van juntos: hasta que la encargada de marketing fije nombre final
y estrategia, no se toca. Señal de activación común: marca decidida
(previsiblemente antes de la beta).

- **Actualizar el PRD y AGENTS.md a la marca final.** El PRD aún dice
  «RolMatch (nombre provisional)» y AGENTS.md no menciona Google ni que el
  email es magic link. Se actualiza todo junto cuando haya nombre.
- **Dominio propio.** Rompe coste 0 (~10-15 €/año): decisión explícita de
  Chris pospuesta a la marca. Cuando llegue: cambiar `APP_URL` en
  `src/lib/config.ts` y en `api/og.ts` (las dos únicas copias), configurar
  el dominio en Vercel, y **autenticarlo en Brevo** (SPF/DKIM): eso quita la
  reescritura del remitente de los emails de login (hoy salen como
  `...@NNN.brevosend.com` — política DMARC de Brevo para dominios públicos,
  no un fallo de config).

Hecho por el camino (2026-08-11): **SMTP propio vía Brevo** — remitente
verificado, plantillas de Magic Link y Confirm signup en español, límite de
emails/hora subido. El muro de ~2-4 emails/hora del SMTP integrado ya no
existe.

## Cómo mantener esto

Al aplazar algo en un barrido: entrada nueva aquí con el motivo y la señal de
activación. Al hacerlo de verdad: borrar la entrada en la misma PR.

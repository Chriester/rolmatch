# Pendientes — decisiones aplazadas a propósito

Cosas identificadas en barridos de mejoras que se decidió NO hacer todavía,
con el porqué y la señal que indicaría que ha llegado su momento. Antes de
proponer una mejora, mirar aquí: si ya está listada, no es un hallazgo nuevo.

Última revisión: 2026-08-10.

## Operativo (bloquea funcionalidad ya mergeada)

- **Aplicar migraciones 00044, 00045, 00047 y 00048** en el SQL Editor.
  Verificado por REST: el bucket `chat-media` no existe (00044) y
  `reports.message_excerpt` / `is_moderator()` dan 400/404 (00045). La 00046
  SÍ está aplicada. Hasta entonces: las fotos de chat siguen yendo al bucket
  público `avatars`, la bandeja de moderación (`/moderation`) sale vacía con
  aviso, las vistas `kpi_*` no existen (00047) y el toggle de pausar la
  búsqueda no aparece en Opciones (00048).
- **Migrar las fotos de chat viejas** del bucket público `avatars` a
  `chat-media` (privado). No se puede desde SQL: script contra la API de
  Storage, objeto a objeto. El cliente ya distingue ambas formas (URL completa
  = vieja/pública; ruta = nueva/firmada), así que no corre prisa funcional —
  es un tema de privacidad retroactiva.

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
- **C4 — Las mesas muertas no caducan.** `is_active` es manual. Idea: aviso
  al GM tras N semanas sin actividad y auto-archivado con un clic de rescate.
- **Filtro de idioma inerte.** `profiles.languages` y `groups.language`
  existen con default `'es'` y el matching los aplica, pero ninguna UI los
  edita: hoy es un filtro que nunca filtra. Activarlo cuando haya usuarios
  no hispanohablantes… o quitarlo del scoring.
- **Reglas de negocio solo en el cliente.** Límites (mensajes, swipes/día si
  se añade, tamaños) viven en el cliente; un cliente modificado se los salta.
  Endurecer en RLS/triggers cuando haya señales de abuso.

## Cómo mantener esto

Al aplazar algo en un barrido: entrada nueva aquí con el motivo y la señal de
activación. Al hacerlo de verdad: borrar la entrada en la misma PR.

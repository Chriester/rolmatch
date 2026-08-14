-- Push post-sesión: unas horas después de la hora de inicio, push-reminders
-- pregunta "¿qué tal fue?" a toda la mesa — cierra el bucle de después de
-- jugar (confirmar que se jugó, valorar compañeros, escribir el histórico),
-- que hasta ahora dependía de que alguien abriera la app por su cuenta.
-- El umbral de horas vive en la Edge Function (POST_SESSION_HOURS).

alter table sessions add column push_reminded_post boolean not null default false;

-- Las sesiones ya empezadas quedan marcadas: el aviso estrena solo hacia
-- delante, sin ráfaga retroactiva al aplicar la migración.
update sessions set push_reminded_post = true where starts_at < now();

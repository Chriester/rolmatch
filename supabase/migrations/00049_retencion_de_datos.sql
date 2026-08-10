-- Retención: analytics_events y client_errors dejan de crecer para siempre.
--
-- Las dos tablas solo insertan (el cliente escribe y se olvida) y nada las
-- limpiaba: a ritmo de beta se comen los 500 MB del free tier sin aportar —
-- las cohortes de retención se consolidan en semanas y un crash de hace un
-- mes o está arreglado o está en el tablero.
--
-- 90 días de eventos (las vistas kpi_* miran como mucho cohortes de ese
-- rango) y 30 de errores de cliente. Un job diario de pg_cron, a las 04:17
-- UTC para no coincidir con el cuarto de hora de push-reminders.

create extension if not exists pg_cron;

select cron.schedule(
  'retencion-analitica-diaria',
  '17 4 * * *',
  $$
  delete from analytics_events where created_at < now() - interval '90 days';
  delete from client_errors where created_at < now() - interval '30 days';
  $$
);

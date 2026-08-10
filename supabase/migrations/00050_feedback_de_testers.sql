-- Canal de feedback in-app: los testers cuentan lo que falla DENTRO de la app.
--
-- Con ~15 testers activos no existía forma de mandar una sugerencia o un
-- problema desde la propia app: llegaban por capturas de WhatsApp o no
-- llegaban. Cada fricción que no se cuenta es un usuario que se pierde en
-- silencio — y de camino a la beta esto es oro.
--
-- Mismo patrón que reports (00045): cualquiera inserta lo suyo, los
-- moderadores leen la cola y la marcan. Se reutiliza el enum report_status
-- y el helper is_moderator(). El user_id es `set null` a propósito: el
-- feedback sobrevive a que su autor borre la cuenta (sigue siendo útil).
--
-- Sin push por ahora: la bandeja de moderación es la salida. Si hiciera
-- falta avisar al momento, es un caso más en push-notify (como reports).

create type feedback_kind as enum ('idea', 'problema', 'otro');

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  kind feedback_kind not null default 'otro',
  body text not null check (char_length(body) between 3 and 2000),
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "feedback: enviar lo propio" on feedback
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "feedback: los moderadores ven la cola" on feedback
  for select to authenticated
  using (is_moderator());

create policy "feedback: los moderadores lo marcan" on feedback
  for update to authenticated
  using (is_moderator())
  with check (is_moderator());

create index feedback_status_created_idx on feedback (status, created_at desc);

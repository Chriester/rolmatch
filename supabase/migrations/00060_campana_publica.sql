-- Página pública de campaña (opt-in del GM): el histórico de la mesa como
-- crónica legible por cualquiera con el enlace, sin cuenta. Es el único
-- artefacto que sale de la app hacia fuera: retención (la mesa tiene una
-- historia que enseñar) y adquisición (el enlace trae gente).
--
-- Exposición mínima vía vistas con derechos del dueño (patrón profile_xp):
-- SOLO mesas con journal_public activo, y solo identidad básica + entradas
-- del histórico con el alias del autor. Nada de miembros, chat ni agenda.

alter table groups add column journal_public boolean not null default false;

create view campaign_pages as
select g.id, g.name, g.description, g.image_url, g.format, g.created_at,
       s.name as system_name
from groups g
left join systems s on s.id = g.system_id
where g.journal_public and g.is_active;

grant select on campaign_pages to anon, authenticated;

create view campaign_journal as
select e.id, e.group_id, e.body, e.image_url, e.session_id, e.is_system, e.created_at,
       p.alias as author_alias
from group_journal_entries e
join groups g on g.id = e.group_id and g.journal_public and g.is_active
left join profiles p on p.id = e.author_id;

grant select on campaign_journal to anon, authenticated;

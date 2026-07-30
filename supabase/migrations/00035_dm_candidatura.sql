-- Negociación GM↔candidato: el GM puede abrir un chat 1-a-1 con quien ha
-- dado like a una de sus mesas (y viceversa) ANTES del match — para hablar
-- antes de aceptar, especialmente cuando la mesa está llena y alguien pide
-- sitio. Se añade a la regla existente de compartir mesa; los bloqueos
-- siguen mandando.

drop policy "dm_threads: crear si compartes mesa" on dm_threads;
create policy "dm_threads: crear si compartes mesa o candidatura" on dm_threads
  for insert to authenticated
  with check (
    auth.uid() in (user_lo, user_hi)
    and not is_blocked_between(user_lo, user_hi)
    and (
      shares_group_with(user_lo, user_hi)
      or exists (
        select 1
        from swipes s
        join groups g on g.id = s.group_id
        where s.origin = 'user'
          and s.direction = 'like'
          and (
            (g.owner_id = user_lo and s.user_id = user_hi)
            or (g.owner_id = user_hi and s.user_id = user_lo)
          )
      )
    )
  );

-- Editar un recuerdo del histórico (antes solo se podía borrar, migr.
-- 00015). El botón de borrar ahora vive tras una pulsación larga en vez de
-- un icono de basura siempre visible (se borró uno sin querer) y de paso se
-- ofrece "editar" al lado. El autor no puede tocar la cabecera de sistema
-- ("🎲 Partida del <dia>", is_system) — esa nunca se edita ni se borra desde
-- aquí, la pone el propio histórico.

create policy "group_journal_entries: el autor edita su entrada" on group_journal_entries
  for update to authenticated
  using (author_id = auth.uid() and not is_system)
  with check (author_id = auth.uid() and not is_system);

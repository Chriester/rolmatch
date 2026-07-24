-- Premium (docs/monetizacion.md): entitlements desacoplados del proveedor de
-- pago + soporte de las tres primeras features (rewind, likes recibidos,
-- boost de mesa).
--
-- Para dar premium a los testers de la alpha (solo service role/SQL Editor):
--   update profiles set premium_until = 'infinity', premium_source = 'granted'
--   where id in ('<uuid>', ...);

alter table profiles add column premium_until timestamptz;  -- null = sin premium
alter table profiles add column premium_source text;        -- 'granted' | 'stripe' | 'iap' | 'promo'

alter table groups add column boosted_until timestamptz;    -- mesa destacada hasta

-- Nadie puede autoconcederse premium: los campos solo los escribe el
-- service role (webhooks de pago / SQL Editor). El trigger corta cualquier
-- intento desde una sesión autenticada.
create or replace function protect_premium_columns()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (
    new.premium_until is distinct from old.premium_until
    or new.premium_source is distinct from old.premium_source
  ) then
    raise exception 'premium_until/premium_source solo se gestionan por el sistema';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_premium before update on profiles
  for each row execute function protect_premium_columns();

-- El boost sí lo activa el usuario, pero solo si es dueño premium y con un
-- máximo de 7 días por delante.
create or replace function validate_group_boost()
returns trigger language plpgsql as $$
begin
  if new.boosted_until is distinct from old.boosted_until and auth.uid() is not null then
    if auth.uid() <> new.owner_id then
      raise exception 'solo el dueño puede destacar su mesa';
    end if;
    if not exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.premium_until > now()
    ) then
      raise exception 'destacar la mesa es una función premium';
    end if;
    if new.boosted_until > now() + interval '7 days' then
      raise exception 'el boost máximo es de 7 días';
    end if;
  end if;
  return new;
end;
$$;

create trigger groups_validate_boost before update on groups
  for each row execute function validate_group_boost();

-- Rewind: deshacer el último swipe requiere poder borrarlo
create policy "swipes: deshacer el propio (jugador)" on swipes
  for delete to authenticated
  using (origin = 'user' and auth.uid() = user_id);

create policy "swipes: deshacer el propio (mesa)" on swipes
  for delete to authenticated
  using (
    origin = 'group'
    and exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

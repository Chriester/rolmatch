-- Códigos promocionales de premium: los testers los canjean desde la app
-- (Edge Function redeem-promo), sin tocar SQL por persona.
--
-- Crear un código (SQL Editor):
--   insert into promo_codes (code, premium_days, max_uses)
--   values ('ALPHA', null, 100);          -- null = premium sin caducidad
--   -- premium_days = 90 daría 90 días de premium

create table promo_codes (
  code text primary key,                       -- se canjea en MAYÚSCULAS
  premium_days int,                            -- null = 'infinity'
  max_uses int not null default 100,
  uses int not null default 0,
  expires_at timestamptz,                      -- null = no caduca el código
  created_at timestamptz not null default now()
);

create table promo_redemptions (
  code text not null references promo_codes (code) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)                  -- un canje por usuario y código
);

-- Sin políticas para authenticated: los códigos NO son legibles ni canjeables
-- directamente desde el cliente — solo la Edge Function (service role) los ve.
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;

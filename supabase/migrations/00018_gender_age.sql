-- Género y edad, opcionales, en perfiles y personajes.
-- En el perfil se guarda el año de nacimiento (la edad mostrada se calcula
-- y no caduca); en los personajes la edad es texto libre porque es ficción
-- ("234", "joven eterno"…).

alter table profiles
  add column gender text check (gender in ('male', 'female', 'other')),
  add column birth_year smallint check (birth_year between 1900 and 2100);

alter table characters
  add column gender text check (gender in ('male', 'female', 'other')),
  add column age text check (char_length(age) <= 20);

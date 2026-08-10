-- Pausar la búsqueda: dejar de salir en el feed de los GMs sin borrar nada.
--
-- Las mesas tienen is_active, pero un jugador no tenía equivalente: quien ya
-- encontró mesa (nuestro caso de ÉXITO) seguía saliendo como candidato para
-- siempre, quemando tarjetas del poco inventario y generando likes que va a
-- ignorar. La única salida era borrar la cuenta.
--
-- El filtro se aplica solo al descubrimiento (el pool general del feed):
-- quien pidió sitio en una mesa ANTES de pausarse sigue visible para ese GM
-- en su bandeja de candidatos — pidió sitio, la decisión ya está en marcha.
--
-- La edita su dueño vía la política de update de profiles que ya existe.

alter table profiles
  add column if not exists is_searching boolean not null default true;

-- El pool del feed filtra por esta columna en cada carga.
create index if not exists profiles_is_searching_idx
  on profiles (is_searching) where not is_searching;

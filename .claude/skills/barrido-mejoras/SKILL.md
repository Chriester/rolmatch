---
name: barrido-mejoras
description: Repaso sistemático del producto en busca de mejoras, huecos y correcciones pendientes, con lista priorizada por dificultad y tiempo
---

# Barrido de mejoras

Cuando Chris pida "un repaso de mejoras y features que falten": no es una
lluvia de ideas, es una auditoría con método. Cada afirmación de la lista
tiene que estar verificada en el código o contra la base de datos real.

## 0. Antes de empezar

Leer [docs/pendientes.md](../../../docs/pendientes.md). Lo que esté ahí ya
se evaluó y se aplazó con motivo: **no volver a listarlo como hallazgo**.
La excepción: si su señal de activación ya se ha cumplido, sí se lista —
diciendo que es un pendiente cuya hora ha llegado, no un descubrimiento.

## 1. Núcleo (en TODOS los barridos, en este orden)

1. **Estado real de la DB** — qué migraciones están aplicadas de verdad:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/<tabla>?select=<col>&limit=1" -H "apikey: $ANON"
   ```
   (200 = existe; 400/404 = falta). RPCs: POST a `/rest/v1/rpc/<fn>`.
   Buckets: GET `/storage/v1/bucket/<id>`. $URL/$ANON salen de `.env`.
   Una migración mergeada sin aplicar es SIEMPRE el primer punto del informe.
2. **PRD vs realidad** — `docs/PRD-rolmatch.md` §5 (fases) y §11 (métricas):
   qué promete cada fase que aún no existe, y si cada KPI se puede medir hoy.
3. **Los datos que ya recogemos** — `client_errors` y las vistas `kpi_*`
   solo se leen desde el SQL Editor (sin select para la API): pedirle a
   Chris que las mire o proponer consultas concretas. Un crash recurrente o
   un KPI bajo objetivo es una corrección con evidencia, no una opinión.
4. **Tuberías con entrada y sin salida** — el patrón de fallo más repetido
   del proyecto (reports sin bandeja, client_errors sin lector, analítica
   sin vistas): para cada tabla en la que el cliente INSERTA, buscar dónde
   se LEE. Sin lectura = hallazgo.
5. **Simetrías rotas** — si una entidad tiene un estado/acción, ¿la tienen
   sus gemelas? (mesas con `is_active` → jugadores con `is_searching`; se
   puede bloquear → se puede desbloquear; hay push → ¿hay silenciar?; se
   puede crear → ¿se puede editar/borrar/deshacer?).
6. **Grep de deuda** — `TODO|FIXME|HACK|de momento|por ahora` en `src/`,
   y los comentarios de migraciones que digan "se puede hacer luego".
7. **Recorridos de usuario con fricción** — alta, primer match, volver al
   día siguiente, compartir un enlace, irse de la app. Recorrerlos en el
   código, no de memoria.
8. **Lo que trae el compañero** — `gh issue list` y `gh pr list` (también
   cerradas recientes): features a medias, peticiones del tablero y trabajo
   del otro que abre huecos nuevos o cierra los que ibas a proponer.

## 2. Lentes ampliadas (elegir 2-3 por barrido, rotando)

Anotar en el informe qué lentes se usaron, para que el siguiente barrido
coja otras. Si un barrido de núcleo sale corto, tirar de más lentes.

- **Paridad web/nativo** — grep de `Platform.OS` nuevo desde el último
  barrido: cada rama es un posible hueco en la otra plataforma (el clásico:
  `Alert.alert` es no-op en web → `showAlert`). Web push vs Expo push,
  portapapeles, Share, teclado.
- **Estados no felices** — por pantalla tocada recientemente: ¿hay estado de
  carga, vacío y error? Grep de `catch(() => {})` que traga errores sin
  contárselo al usuario ni a client_errors.
- **Consultas que no escalan** — `.select(` sin `.limit(` ni paginación
  sobre tablas que crecen (messages, swipes, analytics_events); bucles de
  consultas por item (N+1); filtros calientes sin índice en las migraciones.
- **Seguridad y RLS** — tablas o vistas nuevas expuestas por PostgREST que
  no deberían (¿revoke a anon/authenticated?); `security definer` sin
  `set search_path`; políticas de storage; datos de más en RPCs públicos.
- **Accesibilidad** — controles interactivos nuevos sin `accessibilityLabel`
  (grep de `Pressable`/`Switch` recientes); tamaños táctiles; contraste.
- **Instrumentación** — features nuevas que tocan un KPI y no dejan evento
  en `analytics.ts` (regla de la 00043: solo si alguien lo va a mirar).
- **Coste y límites de free tier** — qué pieza se acerca a un límite
  (Storage, Realtime concurrente, Edge Function invocations, Vercel
  Functions) y cuál sería la primera en romper si la app crece x10.
- **Deriva de docs y skills** — ¿el PRD, AGENTS.md o alguna skill afirman
  algo que ya no es verdad? (rutas, helpers, flujos). Actualizarlos es un
  hallazgo válido: los agentes trabajan con lo que dicen.

## 3. Reglas del informe

- **Hasta 15 puntos, ordenados por dificultad y tiempo ascendente.** Cada
  punto: qué pasa hoy (con fichero:línea), por qué importa, y la solución
  propuesta en una frase.
- Verificado o fuera: nada de "probablemente no haya X" — grep antes de
  afirmar. Los barridos anteriores han pillado subagentes exagerando
  (la "clave crítica expuesta" que era `EXPO_PUBLIC_*` por diseño) y al
  propio barrido equivocándose (los `Share` de chat eran copiar mensaje,
  no compartir enlace): verificar también las soluciones propuestas.
- Marcar lo que necesita migración (y por tanto a Chris aplicándola) y lo
  que rompe coste 0 (descartarlo o preguntarlo).
- Distinguir **corrección** (algo funciona mal hoy) de **mejora** (algo
  podría funcionar mejor): las correcciones van primero a igual dificultad.

## 4. Al cerrar el barrido

- Lo que Chris decida aplazar → entrada en `docs/pendientes.md` con motivo
  y señal de activación, en la misma sesión.
- Lo que se haga → skill **nueva-feature** (rama→PR→merge), y borrar su
  entrada de pendientes si la tenía.
- Actualizar la fecha de "Última revisión" de pendientes.md.

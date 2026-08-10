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
se evaluó y se aplazó con motivo: **no volver a listarlo como hallazgo**
(sí se puede mencionar si su señal de activación ya se ha cumplido).

## 1. Fuentes a barrer (en este orden)

1. **Estado real de la DB** — qué migraciones están aplicadas de verdad:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/<tabla>?select=<col>&limit=1" -H "apikey: $ANON"
   ```
   (200 = existe; 400/404 = falta). RPCs: POST a `/rest/v1/rpc/<fn>`.
   Buckets: GET `/storage/v1/bucket/<id>`. $URL/$ANON salen de `.env`.
   Una migración mergeada sin aplicar es SIEMPRE el primer punto del informe.
2. **PRD vs realidad** — `docs/PRD-rolmatch.md` §5 (fases) y §11 (métricas):
   qué promete cada fase que aún no existe, y si cada KPI se puede medir hoy.
3. **Tuberías con entrada y sin salida** — el patrón de fallo más repetido
   del proyecto (reports sin bandeja, client_errors sin lector, analítica
   sin vistas): para cada tabla en la que el cliente INSERTA, buscar dónde
   se LEE. Sin lectura = hallazgo.
4. **Simetrías rotas** — si una entidad tiene un estado/acción, ¿la tienen
   sus gemelas? (mesas tienen `is_active`, ¿los jugadores pueden pausarse?;
   se puede bloquear, ¿se puede desbloquear?; hay push, ¿hay silenciar?).
5. **Grep de deuda** — `TODO|FIXME|HACK|de momento|por ahora` en `src/`,
   y los comentarios de migraciones que digan "se puede hacer luego".
6. **Recorridos de usuario con fricción** — alta, primer match, volver al
   día siguiente, compartir un enlace, irse de la app. Recorrerlos en el
   código, no de memoria.

## 2. Reglas del informe

- **Hasta 15 puntos, ordenados por dificultad y tiempo ascendente.** Cada
  punto: qué pasa hoy (con fichero:línea), por qué importa, y la solución
  propuesta en una frase.
- Verificado o fuera: nada de "probablemente no haya X" — grep antes de
  afirmar. Los barridos anteriores han pillado subagentes exagerando
  (la "clave crítica expuesta" que era `EXPO_PUBLIC_*` por diseño).
- Marcar lo que necesita migración (y por tanto a Chris aplicándola) y lo
  que rompe coste 0 (descartarlo o preguntarlo).
- Distinguir **corrección** (algo funciona mal hoy) de **mejora** (algo
  podría funcionar mejor): las correcciones van primero a igual dificultad.

## 3. Al cerrar el barrido

- Lo que Chris decida aplazar → entrada en `docs/pendientes.md` con motivo
  y señal de activación, en la misma sesión.
- Lo que se haga → skill **nueva-feature** (rama→PR→merge), y borrar su
  entrada de pendientes si la tenía.

---
name: matching
description: Reglas para tocar el algoritmo de matching de RolMatch (src/lib/matching.ts) — la pieza más delicada del producto según el PRD. Usar ante cualquier cambio en scoring, filtros o feeds.
---

# Algoritmo de matching v1

Fuente de verdad: PRD §7 (docs/PRD-rolmatch.md). Implementación:
`src/lib/matching.ts` — módulo **puro y sin dependencias** (portable tal cual
a Edge Function cuando haya volumen; en el MVP corre en cliente vía
`src/lib/feed.ts`).

## Contrato (no romper sin acordarlo con el usuario)
- Filtros duros excluyentes: solape horario convertido a UTC
  (mínimo `MIN_OVERLAP_HOURS = 3`), idioma, sistema en común (o open_to_any).
- Score 0-100: solape 35 % · estilo 25 % · sistema/experiencia 20 % ·
  técnica 10 % · fiabilidad 10 % (hoy proxy de completitud; en fase 3 pasará
  a usar `ratings` reales).
- Rejilla de **celdas de 15 min sobre la semana UTC** (exacta para offsets
  :30/:45); franjas de 6 h con la noche cruzando medianoche (20–02);
  weekday 0 = lunes, igual que la DB.

## Regla de oro: tests
Cualquier cambio en matching.ts EXIGE actualizar
`src/lib/__tests__/matching.test.ts` en la misma PR. Los tests son
deterministas a propósito: zonas SIN DST (Tokyo, Buenos_Aires, Kolkata, UTC)
y fecha fija — mantener esa disciplina. Casos que no pueden perderse:
offsets de media hora, wrap semanal, noche cruzando medianoche, umbral
mínimo, monotonía de experiencia, cotas 0-100.

## Feed unificado
`fetchUnifiedFeed` mezcla por rol del perfil: mesas (player), candidatos a
MIS mesas (gm), ambos (both). Likes recibidos primero, luego score. Un
candidato que encaja en varias mesas mías aparece una vez (mejor combinación).
Exclusiones: ya swipeado, miembro, bloqueado en cualquier dirección.

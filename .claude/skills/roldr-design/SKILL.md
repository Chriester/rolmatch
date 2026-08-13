---
name: roldr-design
description: Marca y sistema de diseño Roldr (nombre final confirmado) — tokens, guías, componentes de referencia y assets de logo. Usar para generar material de marca (fichas de store, Ko-fi, mocks, páginas) y como autoridad visual al adoptar Roldr en la app.
---

# Sistema de diseño Roldr

Todo vive en `docs/Roldr Design System/` (entregado por la diseñadora; Roldr es
el nombre FINAL de la marca, confirmado por Chris el 2026-08-13).

**Lee primero** `docs/Roldr Design System/readme.md` — contiene los fundamentos
completos: color, gradientes (100°, un CTA por pantalla), tipografía
(Outfit/Manrope/JetBrains Mono, sustituciones), espaciado, radios, sombras,
motion, estados, iconografía (Lucide, cero emoji en la UI) y la guía de copy en
español (tuteo, botones en infinitivo, una sola exclamación en el producto).

- `tokens/*.css` — los valores; `tokens/colors.css` es la autoridad de color
  (consumir los roles semánticos `--bg`, `--surface`, `--link`…, nunca las
  escalas crudas).
- `assets/` — logos PNG (en superficies oscuras usar `logo-mark`, `logo-d20` o
  el wordmark; los lockups con órbita llevan estrellas casi negras).
- `components/` — referencia JSX **web** (en la app RN se traduce, no se copia).
- `ui_kits/roldr-app/` — prototipo navegable 390×844.
- `guidelines/source-Roldr-app-aesthetic-exploration.pdf` — el handoff original.

## Cómo usarla

- **Material de marca** (fichas de store, Ko-fi, mocks, artifacts): copiar
  assets y tokens de aquí; para HTML sueltos se pueden usar los componentes web
  tal cual.
- **Código de producto**: la adopción va por fases —
  [docs/plan-adopcion-roldr.md](../../../docs/plan-adopcion-roldr.md) es el
  plan con problemas y decisiones por fase. En la app los tokens viven
  traducidos en `src/constants/theme.ts`; ante conflicto entre app y sistema,
  el sistema manda y la app se corrige en su fase.
- La skill **ui-rolder** describe el design system TÉCNICO actual de la app
  (primitivas, dónde vive cada cosa); esta skill es la marca destino. Conviven
  hasta terminar la migración.

// Tokens de motion Roldr (F4) — traducción RN de docs/Roldr Design System/
// tokens (--duration-* y --ease-*). Módulo PURO (sin reanimated) para que
// cualquier lib lo importe sin arrastrar dependencias nativas a Jest.
//
// Uso con Reanimated:  withTiming(v, { duration: MotionDur.md,
//   easing: Easing.bezier(...MotionEase.standard) })
// El easing `dice` (rebote con overshoot) está RESERVADO al dado y al pop
// del match — no usarlo en fades/sheets/chips (ahí, standard/out).

export const MotionDur = {
  /** micro-feedback: press, hover */
  xs: 90,
  /** chips, toggles, cambios de estado pequeños */
  sm: 140,
  /** fades de ruta, sheets, banners */
  md: 220,
  /** overlays grandes, celebraciones */
  lg: 320,
  /** entradas de pantalla completa */
  xl: 420,
} as const;

/** Curvas cubic-bezier como tuplas [x1, y1, x2, y2] */
export const MotionEase = {
  standard: [0.2, 0.8, 0.2, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
  /** SOLO dado y match pop (overshoot) */
  dice: [0.34, 1.4, 0.64, 1],
} as const;

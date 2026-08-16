// Ajustes DOM solo-web. El arrastre nativo de <img> del navegador
// secuestra el gesto de swipe con ratón (arrastra la imagen fantasma en
// vez de la tarjeta); lo desactivamos para todas las imágenes de la app.
// Y el documento se pinta del color de página: que nunca asome el blanco
// por defecto (fundidos de ruta, rebote del scroll, arranque).
// F4: focus ring lila del sistema (--focus-ring) solo para teclado
// (:focus-visible), sin ensuciar el tap/click.

import { Platform } from 'react-native';

import { Rolder } from '@/constants/theme';

export function setupWebTweaks() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('rolder-web-tweaks')) return;

  const style = document.createElement('style');
  style.id = 'rolder-web-tweaks';
  style.textContent =
    `img{-webkit-user-drag:none;user-drag:none}html,body{background:${Rolder.page}}` +
    `:focus{outline:none}:focus-visible{outline:2px solid rgba(199,125,255,0.55);outline-offset:2px;border-radius:4px}`;
  document.head.appendChild(style);

  // Firefox ignora user-drag: cancelamos el dragstart de imágenes a mano
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
}

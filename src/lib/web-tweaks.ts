// Ajustes DOM solo-web. El arrastre nativo de <img> del navegador
// secuestra el gesto de swipe con ratón (arrastra la imagen fantasma en
// vez de la tarjeta); lo desactivamos para todas las imágenes de la app.

import { Platform } from 'react-native';

export function setupWebTweaks() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('rolder-web-tweaks')) return;

  const style = document.createElement('style');
  style.id = 'rolder-web-tweaks';
  style.textContent = 'img{-webkit-user-drag:none;user-drag:none}';
  document.head.appendChild(style);

  // Firefox ignora user-drag: cancelamos el dragstart de imágenes a mano
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
}

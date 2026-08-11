// Compartir un enlace por el canal que haya: hoja nativa (share sheet de
// Web Share API o de React Native) o, si no existe, portapapeles. Devuelve
// por dónde salió — es lo que viaja en la analítica — o null si el usuario
// canceló (cancelar no se registra: no se compartió nada).

import { Platform, Share } from 'react-native';

export type ShareChannel = 'web-share' | 'clipboard' | 'native';

export async function shareLink(options: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareChannel | null> {
  const { title, text, url } = options;
  try {
    if (Platform.OS === 'web') {
      const nav = navigator as {
        share?: (data: object) => Promise<void>;
        clipboard?: { writeText: (t: string) => Promise<void> };
      };
      if (nav.share) {
        // texto SIN la URL: con ella en ambos campos muchos destinos
        // (WhatsApp incluido) pegaban el enlace dos veces
        await nav.share({ title, text, url });
        return 'web-share';
      }
      await nav.clipboard?.writeText(url);
      return 'clipboard';
    }
    const result = await Share.share({ message: `${text} ${url}` });
    // en iOS cerrar la hoja también resuelve; solo cuenta si se compartió
    return result.action === Share.sharedAction ? 'native' : null;
  } catch {
    // compartir cancelado por el usuario
    return null;
  }
}

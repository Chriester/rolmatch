// Foto de chat. Las nuevas son rutas de un bucket privado y hay que firmarlas
// para pintarlas; las de antes de la migración 00044 ya son URLs públicas.
// Aquí está esa decisión una sola vez, para el chat de mesa y para el 1-a-1.

import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ImageStyle } from 'react-native';

import { Rolder } from '@/constants/theme';
import { chatMediaUrl, isPublicMedia } from '@/lib/chat-media';

/**
 * Resuelve la URL con la que pintar; null mientras firma o si no puede.
 * Lo público sale derivado (sin estado ni parpadeo) y solo se guarda la firma,
 * atada a su ruta para no pintar la de la foto anterior al cambiar de mensaje.
 */
export function useChatMediaUri(mediaUrl: string | null | undefined): string | null {
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!mediaUrl || isPublicMedia(mediaUrl)) return;
    let alive = true;
    chatMediaUrl(mediaUrl)
      .then((url) => {
        if (alive && url) setSigned({ path: mediaUrl, url });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mediaUrl]);

  if (!mediaUrl) return null;
  if (isPublicMedia(mediaUrl)) return mediaUrl;
  return signed?.path === mediaUrl ? signed.url : null;
}

export function ChatImage({
  mediaUrl,
  style,
  contentFit = 'cover',
}: {
  mediaUrl: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
}) {
  const uri = useChatMediaUri(mediaUrl);

  if (!uri) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color={Rolder.violetSoft} />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit={contentFit} transition={120} />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Rolder.surface,
  },
});

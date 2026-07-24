// Cara de descripción de la tira (segunda altura de la tarjeta alargada).
// Contenido compacto y sin scroll: si algo es largo, se recorta con
// numberOfLines — la tira debe poder cerrarse arrastrando hacia abajo.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type DetailsFaceProps = {
  title: string;
  children: ReactNode;
};

export function DetailsFace({ title, children }: DetailsFaceProps) {
  return (
    <View style={styles.face}>
      <View style={styles.grabber} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.content}>{children}</View>
      <Text style={styles.hint}>Desliza hacia abajo para volver</Text>
    </View>
  );
}

export const sheetText = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
  },
  body: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 21,
  },
  link: {
    color: '#F3485B',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    backgroundColor: '#16171f',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    gap: 4,
    overflow: 'hidden',
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

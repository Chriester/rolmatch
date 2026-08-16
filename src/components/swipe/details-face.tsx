// Cara de descripción de la tira (segunda altura de la tarjeta alargada).
// Contenido compacto y sin scroll: si algo es largo, se recorta con
// numberOfLines — la tira debe poder cerrarse arrastrando hacia abajo.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, RolderRadius } from '@/constants/theme';

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
    color: Rolder.violet,
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: 10,
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13.5,
    fontFamily: RolderFonts.regular,
    lineHeight: 19,
  },
  link: {
    color: Rolder.pass,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    backgroundColor: Rolder.sheet,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: RolderRadius.xl,
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
    fontSize: 20,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    gap: 4,
    overflow: 'hidden',
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: 8,
  },
});

// Cabecera persistente de la app: la marca rolder siempre visible y
// clicable (vuelve al feed), y el avatar en la esquina como atajo al tab
// Perfil (la navegación principal vive en la barra de pestañas inferior).

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RolderBrand } from '@/components/brand';
import { Rolder, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { hasUnseenActivityCached, newsDot } from '@/lib/activity';
import { fetchUnreadTotal } from '@/lib/messages';
import { onUnreadChanged } from '@/lib/unread-events';
import { fetchProfileData } from '@/lib/profile';

type AppHeaderProps = {
  /** flecha de volver opcional (pantallas con padre directo) */
  onBack?: () => void;
  /** sustituye el hueco derecho (por defecto: avatar que abre el menú) */
  right?: ReactNode;
  /** se añade a la izquierda del avatar, sin quitarlo */
  extra?: ReactNode;
};

export function AppHeader({ onBack, right, extra }: AppHeaderProps) {
  const session = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  /** enciende el punto de la campana: hay novedades sin ver */
  const [hasNews, setHasNews] = useState(false);

  // El punto de la campana se mira en cada focus, pero contra la versión
  // cacheada (la tubería real de consultas corre como mucho una vez por
  // minuto, no en cada pantalla); markActivitySeen invalida y emite newsDot
  // para que se apague al instante al salir de Novedades.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let alive = true;
      const refresh = () => {
        hasUnseenActivityCached(session.user.id)
          .then((value) => {
            if (alive) setHasNews(value);
          })
          .catch(() => {});
      };
      refresh();
      const off = newsDot.on(refresh);
      return () => {
        alive = false;
        off();
      };
    }, [session])
  );

  useEffect(() => {
    if (!session) return;
    fetchProfileData(session.user.id)
      .then((p) => setAvatarUrl(p.avatar_url))
      .catch(() => {});
    const refreshUnread = () => fetchUnreadTotal(session.user.id).then(setUnread);
    refreshUnread();
    // el punto de no-leídos se apaga al momento al leer un chat
    return onUnreadChanged(refreshUnread);
  }, [session]);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Volver">
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.navigate('/')} accessibilityLabel="Ir al feed">
          <RolderBrand logoWidth={24} wordmarkSize={21} />
        </Pressable>
      </View>

      <View style={styles.right}>
        {/* la campana de novedades vive en la cabecera compartida: visible
            en todas las pantallas, no solo en el feed */}
        {session && (
          <Pressable
            accessibilityLabel="Novedades"
            // navigate, no push: desde la propia Novedades (o a doble toque)
            // no debe apilarse otra copia de la pantalla
            onPress={() => router.navigate('/novedades')}
            style={({ pressed }) => pressed && styles.bellPressed}>
            <Text style={styles.bell}>🔔</Text>
            {hasNews && <View style={styles.bellDot} />}
          </Pressable>
        )}
        {/* el hueco extra NO pisa al avatar: es la navegación principal */}
        {extra}
        {right ??
          (session ? (
            <Pressable
              onPress={() => router.push('/profile')}
              accessibilityLabel="Ir a mi perfil"
              style={styles.menuButton}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarGlyph}>👤</Text>
                </View>
              )}
              {unread > 0 && <View style={styles.unreadDot} />}
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    width: 28,
  },
  backGlyph: {
    color: Rolder.violetSoft,
    fontSize: 20,
  },
  menuButton: {
    width: 44,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(199,125,255,0.7)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(199,125,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    color: '#fff',
    fontSize: 17,
  },
  spacer: {
    width: 44,
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Rolder.coral,
    borderWidth: 2,
    borderColor: Rolder.page,
  },
  bell: {
    fontSize: 20,
  },
  bellPressed: {
    opacity: 0.6,
  },
  // mismo lenguaje que el punto de no-leídos del avatar
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Rolder.coral,
    borderWidth: 2,
    borderColor: Rolder.page,
  },
});

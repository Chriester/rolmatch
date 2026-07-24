// Cabecera persistente de la app: la marca rolder siempre visible y
// clicable (vuelve al feed), y el avatar con el menú principal SIEMPRE
// disponible en la esquina, en todas las pantallas.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMenu } from '@/components/app-menu';
import { RolderBrand } from '@/components/brand';
import { Rolder, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchProfileData } from '@/lib/profile';

type AppHeaderProps = {
  /** flecha de volver opcional (pantallas con padre directo) */
  onBack?: () => void;
  /** sustituye el hueco derecho (por defecto: avatar que abre el menú) */
  right?: ReactNode;
};

export function AppHeader({ onBack, right }: AppHeaderProps) {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [alias, setAlias] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchProfileData(session.user.id)
      .then((p) => {
        setAvatarUrl(p.avatar_url);
        setAlias(p.alias);
      })
      .catch(() => {});
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

      {right ??
        (session ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Abrir menú"
            style={styles.menuButton}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarGlyph}>☰</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        ))}

      <AppMenu
        visible={menuOpen}
        alias={alias}
        avatarUrl={avatarUrl}
        onClose={() => setMenuOpen(false)}
      />
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
    borderColor: 'rgba(123,92,255,0.7)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.25)',
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
});

// Menú principal de la app: se abre desde el avatar de la cabecera del feed.
// Panel desplegable con las secciones y cerrar sesión.

import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { signOut } from '@/lib/auth';

type AppMenuProps = {
  visible: boolean;
  alias: string | null;
  avatarUrl: string | null;
  onClose: () => void;
};

const ITEMS: { icon: string; label: string; href: Href }[] = [
  { icon: '💬', label: 'Mis chats', href: '/chats' },
  { icon: '💘', label: 'Te han dado like', href: '/likes' },
  { icon: '🛡️', label: 'Mis mesas', href: '/groups' },
  { icon: '🤝', label: 'Mis matches', href: '/matches' },
  { icon: '🧙', label: 'Mis personajes', href: '/characters' },
  { icon: '👤', label: 'Editar perfil', href: '/onboarding' },
  { icon: '✨', label: 'Canjear código', href: '/promo' },
];

export function AppMenu({ visible, alias, avatarUrl, onClose }: AppMenuProps) {
  if (!visible) return null;
  return (
    // Modal: el menú se superpone a CUALQUIER pantalla (la cabecera lo abre
    // desde todas), sin depender del layout del padre.
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
      <Animated.View
        entering={FadeIn.duration(150).reduceMotion(ReduceMotion.Never)}
        style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.Never)}
        style={styles.panel}>
        <View style={styles.userRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarEmoji}>🧙</Text>
            </View>
          )}
          <Text style={styles.alias} numberOfLines={1}>
            {alias ?? 'Aventurero/a'}
          </Text>
        </View>

        <View style={styles.divider} />

        {ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => {
              onClose();
              router.push(item.href);
            }}>
            <Text style={styles.itemIcon}>{item.icon}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          onPress={() => {
            onClose();
            signOut();
          }}>
          <Text style={styles.itemIcon}>🚪</Text>
          <Text style={[styles.itemLabel, styles.signOut]}>Cerrar sesión</Text>
        </Pressable>
      </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    top: 60,
    right: 12,
    width: 280,
    backgroundColor: '#16171F',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    elevation: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: 'rgba(88,101,242,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  alias: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Sora_700Bold',
    fontWeight: '700',
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  itemIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  itemLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },
  signOut: {
    color: '#F3485B',
  },
});

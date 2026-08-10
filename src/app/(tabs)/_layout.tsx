// Barra de pestañas inferior: botones circulares independientes (sin
// etiquetas) sobre el fondo de página, con el Feed en el centro, más
// grande y con el gradiente de marca — es la función principal.
// Las pantallas de detalle se apilan desde el Stack raíz y la ocultan.

import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rolder, RolderFonts } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { hapticTap } from '@/lib/haptics';
import { setAppBadge } from '@/lib/badge';
import { fetchUnreadTotal } from '@/lib/messages';
import { onUnreadChanged } from '@/lib/unread-events';

// Sin ripple de Android (el círculo se recortaba contra el borde de la
// barra): el círculo del botón solo aparece MIENTRAS se presiona, con un
// toque háptico — en reposo solo se ven los iconos sobre el fondo.
type BarButtonProps = {
  children: React.ReactNode;
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
  accessibilityState?: PressableProps['accessibilityState'];
  style?: StyleProp<ViewStyle>;
};

function BarButton({ children, onPress, onLongPress, accessibilityState, style }: BarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => hapticTap()}
      accessibilityState={accessibilityState}
      style={[style as object, styles.itemCenter]}>
      {({ pressed }) => (
        <View style={[styles.halo, pressed && styles.haloPressed]}>{children}</View>
      )}
    </Pressable>
  );
}

function TabButton({
  emoji,
  focused,
  badge = 0,
}: {
  emoji: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.button}>
      <Text style={[styles.buttonEmoji, !focused && styles.buttonEmojiInactive]}>{emoji}</Text>
      {focused && <View style={styles.activeDot} />}
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge >= 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

/** El botón central del Feed: mayor, elevado y con el gradiente rolder */
function FeedButton({ focused }: { focused: boolean }) {
  return (
    <LinearGradient
      colors={Rolder.brandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.feedButton, focused && styles.feedButtonActive]}>
      <Text style={styles.feedEmoji}>🎲</Text>
    </LinearGradient>
  );
}

export default function TabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);

  // Badge de chats: al montar, refresco suave cada minuto y AL INSTANTE
  // cuando se marca un chat como leído (emitUnreadChanged)
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const refresh = () => {
      fetchUnreadTotal(session.user.id).then((n) => {
        if (alive) setUnread(n);
        setAppBadge(n); // número en el icono (Android/PWA)
      });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    const offUnread = onUnreadChanged(refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      offUnread();
    };
  }, [session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // altura fija en tabBarStyle: la libreria NO le suma el inset
        // inferior sola (solo lo hace si la altura queda "auto"), así que
        // en Android con gestos lo sumamos a mano o la pill del sistema
        // tapa la barra.
        tabBarStyle: [styles.bar, { height: 74 + insets.bottom, paddingBottom: 12 + insets.bottom }],
        tabBarItemStyle: styles.item,
        tabBarButton: BarButton,
      }}>
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Encuentros',
          tabBarIcon: ({ focused }) => <TabButton emoji="🔭" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Mesas',
          tabBarIcon: ({ focused }) => <TabButton emoji="🛡️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <FeedButton focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => (
            <TabButton emoji="💬" focused={focused} badge={unread} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabButton emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 10,
  },
  item: {
    overflow: 'visible',
  },
  itemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloPressed: {
    backgroundColor: 'rgba(139,108,255,0.22)',
    transform: [{ scale: 0.94 }],
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEmoji: {
    fontSize: 22,
  },
  buttonEmojiInactive: {
    opacity: 0.4,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Rolder.violetSoft,
  },
  feedButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    boxShadow: '0 6px 20px rgba(139,108,255,0.45)',
  },
  feedButtonActive: {
    borderColor: 'rgba(255,255,255,0.85)',
    boxShadow: '0 6px 26px rgba(255,90,95,0.55)',
  },
  feedEmoji: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Rolder.violet,
    borderWidth: 2,
    borderColor: Rolder.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: '#fff',
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
});

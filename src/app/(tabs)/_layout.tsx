// Barra de pestañas inferior: botones circulares independientes (sin
// etiquetas) sobre el fondo de página, con el Feed en el centro, más
// grande y con el gradiente de marca — es la función principal.
// Las pantallas de detalle se apilan desde el Stack raíz y la ocultan.

import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchUnreadTotal } from '@/lib/messages';

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
    <View style={[styles.button, focused && styles.buttonActive]}>
      <Text style={[styles.buttonEmoji, !focused && styles.buttonEmojiInactive]}>{emoji}</Text>
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
  const [unread, setUnread] = useState(0);

  // Badge de chats: al montar y refresco suave cada minuto (el contador
  // fino ya lo pinta la propia lista de chats al entrar)
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const refresh = () => {
      fetchUnreadTotal(session.user.id).then((n) => {
        if (alive) setUnread(n);
      });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}>
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused }) => <TabButton emoji="💘" focused={focused} />,
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
    height: 74,
    paddingTop: 10,
    paddingBottom: 12,
  },
  item: {
    overflow: 'visible',
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(139,108,255,0.3)',
    borderColor: 'rgba(139,108,255,0.9)',
  },
  buttonEmoji: {
    fontSize: 21,
  },
  buttonEmojiInactive: {
    opacity: 0.55,
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

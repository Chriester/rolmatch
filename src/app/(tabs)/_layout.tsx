// Barra de pestañas inferior (patrón Tinder): las 5 áreas principales
// siempre a un toque. Las pantallas de detalle (mesa, chat, perfiles…)
// se apilan por encima desde el Stack raíz y ocultan la barra.

import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchUnreadTotal } from '@/lib/messages';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[styles.icon, !focused && styles.iconInactive]}>{emoji}</Text>;
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
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: Rolder.violetSoft,
        tabBarInactiveTintColor: Rolder.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarBadgeStyle: styles.badge,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎲" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💘" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Mesas',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
          tabBarBadge: unread > 0 ? (unread >= 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Rolder.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  label: {
    fontSize: 10.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  icon: {
    fontSize: 21,
  },
  iconInactive: {
    opacity: 0.55,
  },
  badge: {
    backgroundColor: Rolder.violet,
    color: '#fff',
    fontSize: 10,
    fontFamily: RolderFonts.bold,
  },
});

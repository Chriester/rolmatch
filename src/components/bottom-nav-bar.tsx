// Barra de navegación inferior persistente. Antes vivía solo dentro del
// grupo (tabs) (vía <Tabs>) y desaparecía en cualquier pantalla de detalle
// (mesa, chat, jugador, ajustes…) — el AppHeader llevaba una nota diciendo
// "la navegación principal vive en la barra de pestañas inferior" que dejó
// de ser cierto en cuanto entrabas a cualquier sitio. El escudo, el dado y
// el chat son el gesto de movimiento más usado de la app, así que ahora
// esta barra se monta UNA vez en la raíz (ver _layout.tsx) y ocupa espacio
// real (no position:absolute) para que cada pantalla se encoja sola, tal
// y como ya hacía <Tabs> puertas adentro.
//
// (tabs)/_layout.tsx sigue existiendo para el enrutado interno de las 5
// secciones (mantiene el estado/scroll de cada una), pero su barra visual
// está apagada (tabBarStyle: display none) para no duplicar esta.

import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rolder, RolderFonts } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { setAppBadge } from '@/lib/badge';
import { emitFeedRefresh } from '@/lib/feed-events';
import { hapticTap } from '@/lib/haptics';
import { onLikesSeenChanged } from '@/lib/likes-events';
import { getLastSeenLikesAt } from '@/lib/likes-seen';
import { fetchUnreadTotal } from '@/lib/messages';
import { countLikesSince, fetchReceivedLikes } from '@/lib/premium';
import { onUnreadChanged } from '@/lib/unread-events';

type TabKey = 'likes' | 'groups' | 'index' | 'chats' | 'profile';

const TAB_PATH: Record<TabKey, string> = {
  likes: '/likes',
  groups: '/groups',
  index: '/',
  chats: '/chats',
  profile: '/profile',
};

// Pantallas sin barra: sin sesión (no hay nada a lo que "moverse" aún) y el
// onboarding, un asistente que hay que terminar del tirón antes de poder
// navegar libremente.
const HIDDEN_ON = ['/login', '/onboarding'];

function resolveActiveTab(pathname: string): TabKey | null {
  if (pathname === '/') return 'index';
  if (pathname === '/likes') return 'likes';
  if (pathname === '/profile') return 'profile';
  if (pathname === '/chats' || pathname.startsWith('/dm/') || pathname.includes('/chat')) {
    return 'chats';
  }
  if (pathname.startsWith('/players/')) return 'likes';
  if (pathname.startsWith('/groups')) return 'groups';
  return null;
}

function TabIcon({
  emoji,
  active,
  badge = 0,
}: {
  emoji: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.button}>
      <Text style={[styles.buttonEmoji, !active && styles.buttonEmojiInactive]}>{emoji}</Text>
      {active && <View style={styles.activeDot} />}
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge >= 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

// El arte original de marca (logoicon a 256px), tal cual — no se recrea
// en SVG: es un diseño entregado y no se toca.
const DIE_ART = require('../../assets/logoicon-ui.png');

function FeedIcon({ active }: { active: boolean }) {
  return (
    <View style={styles.feedButton}>
      {/* halo violeta cuando el feed es la pestaña activa */}
      {active && <View style={styles.feedGlow} />}
      <Image source={DIE_ART} style={styles.feedDie} resizeMode="contain" />
    </View>
  );
}

export function BottomNavBar() {
  const session = useSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);
  const [newLikes, setNewLikes] = useState(0);

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

  // Badge de "Encuentros": mismo patrón, comparando contra la marca local
  // de "vistos hasta" (se actualiza al abrir la pestaña, ver likes.tsx)
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const refresh = () => {
      Promise.all([fetchReceivedLikes(session.user.id), getLastSeenLikesAt()])
        .then(([likes, seenAt]) => {
          if (alive) setNewLikes(countLikesSince(likes, seenAt));
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    const offSeen = onLikesSeenChanged(refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      offSeen();
    };
  }, [session]);

  if (!session || HIDDEN_ON.includes(pathname)) return null;

  const active = resolveActiveTab(pathname);

  const go = (tab: TabKey) => {
    if (TAB_PATH[tab] === pathname) {
      // volver a tocar el dado estando ya en el feed = recargarlo (el ↻ de
      // la cabecera se retiró; esta es ahora la recarga manual principal)
      if (tab === 'index') emitFeedRefresh();
      return;
    }
    router.navigate(TAB_PATH[tab] as never);
  };

  return (
    <View style={[styles.bar, { height: 74 + insets.bottom, paddingBottom: 12 + insets.bottom }]}>
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPressIn={() => hapticTap()}
        onPress={() => go('likes')}
        accessibilityRole="button"
        accessibilityLabel={newLikes > 0 ? `Encuentros, ${newLikes} nuevos` : 'Encuentros'}>
        <TabIcon emoji="🔭" active={active === 'likes'} badge={newLikes} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPressIn={() => hapticTap()}
        onPress={() => go('groups')}
        accessibilityRole="button"
        accessibilityLabel="Mis mesas">
        <TabIcon emoji="🛡️" active={active === 'groups'} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPressIn={() => hapticTap()}
        onPress={() => go('index')}
        accessibilityRole="button"
        accessibilityLabel="Feed de mesas y jugadores">
        <FeedIcon active={active === 'index'} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPressIn={() => hapticTap()}
        onPress={() => go('chats')}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Chats, ${unread} sin leer` : 'Chats'}>
        <TabIcon emoji="💬" active={active === 'chats'} badge={unread} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        onPressIn={() => hapticTap()}
        onPress={() => go('profile')}
        accessibilityRole="button"
        accessibilityLabel="Mi perfil">
        <TabIcon emoji="👤" active={active === 'profile'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Rolder.page,
    paddingTop: 10,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
  },
  itemPressed: {
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
    width: 92,
    height: 84,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // el canvas del arte trae ~20% de margen transparente: se pinta a 78px
  // para que el dado visible quede en torno a 60px
  feedDie: {
    width: 78,
    height: 78,
  },
  feedGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,108,255,0.3)',
    boxShadow: '0 0 26px 10px rgba(139,108,255,0.4)',
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

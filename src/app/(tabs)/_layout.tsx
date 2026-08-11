// Enruta las 5 secciones principales (mantiene el estado/scroll de cada
// una al cambiar entre ellas, como cualquier <Tabs>), pero SIN pintar su
// propia barra: el botón visual vive ahora en BottomNavBar, montado una
// sola vez en la raíz de la app (src/app/_layout.tsx) para que se vea en
// todas las pantallas, no solo aquí dentro. Ver bottom-nav-bar.tsx.
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="likes" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// Entorno mínimo para poder testear módulos de src/lib.
//
// Casi todo src/lib importa (aunque sea de rebote) src/lib/supabase.ts, que
// necesita dos cosas del entorno real: el módulo nativo de AsyncStorage y las
// claves del proyecto. Aquí se falsean las dos para que un test de lógica
// pura no arrastre media app. Las claves son de mentira a propósito: ningún
// test debe salir a la red.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'clave-de-test';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Declaraciones para imports de CSS (las genera expo-env.d.ts en dev,
// pero ese archivo está gitignoreado y la CI ejecuta tsc sin arrancar Expo).
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';

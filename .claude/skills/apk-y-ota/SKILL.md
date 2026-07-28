---
name: apk-y-ota
description: Cómo llegan los cambios a los usuarios — OTA vs build de APK en EAS, runtime versions, FCM y gotchas de builds. Usar al tocar dependencias nativas, app.json o preparar releases.
---

# APK y OTA

## Regla de oro
- **Solo JS/assets** → llega por OTA: cada merge a main publica `eas update
  --branch production` (deploy.yml). La app comprueba al arrancar y se
  recarga sola con overlay (`useOtaUpdates` + UpdateOverlay). NO hace falta build.
- **Nativo** (paquete con módulo nativo, plugins, `android.*` de app.json,
  google-services) → build nuevo: `npx eas-cli build -p android --profile preview`.

## Runtime versions (¡decisión consciente!
- Política `appVersion`: subir `version` en app.json = runtime nuevo = **los
  APK viejos dejan de recibir OTA para siempre** (deben reinstalar). Subir
  versión SOLO al añadir nativo, junto con `android.versionCode` +1.
- Si se añade un módulo nativo SIN subir versión, el OTA llevaría JS que llama
  a un módulo inexistente en APKs viejos → todo uso de módulos nativos nuevos
  va con import dinámico + try/catch (patrón de lib/haptics.ts).

## EAS
- projectId d0a442fb, owner captain-games, keystore en la nube. Perfil
  `preview` = APK, canal production. Las EXPO_PUBLIC_* van en `build.base.env`
  de eas.json (EAS no sube .env). Tier gratis: cola larga a veces, 30/mes —
  sobra porque los builds son raros; si duele, plan B: workflow de Actions.
- **Gotcha lockfile**: EAS corre `npm ci` estricto. Los paquetes de Expo a
  veces exigen peers (p. ej. typescript ^5) que desincronizan el lock →
  tras `npx expo install X`, verificar localmente que el árbol queda plano;
  la CI del repo corre npm ci y es el canario.
- FCM: google-services.json commiteado (config de cliente; clave restringida
  por SHA-1), la clave de servicio vive SOLO en credenciales EAS.

## Al usuario (Chris)
Tras un merge con nativo: `git pull` antes de `eas build`. El APK se instala
encima del anterior (versionCode creciente). Avisar a testers de reinstalar
cuando cambie el runtime.

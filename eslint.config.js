// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions es código Deno (globals propios), fuera del lint de la app
    ignores: ["dist/*", "supabase/functions/*"],
  }
]);

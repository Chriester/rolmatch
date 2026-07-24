// rolder es dark-only por diseño: el tema es siempre la paleta oscura,
// da igual la preferencia del sistema.

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}

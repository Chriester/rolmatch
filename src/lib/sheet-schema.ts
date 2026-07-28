// Esquemas de mini-hoja por sistema de juego (el asistente los usa para
// generar el formulario y la vista de hoja). Solo TERMINOLOGÍA mecánica
// (raza, clan, clase…) con texto libre: sin listas de contenido de juegos
// cerrados, que es donde vive el problema de IP.
//
// También los diseños visuales de hoja (temas): cada sistema tiene el suyo
// por defecto y la infraestructura soporta diseños premium o desbloqueados
// por nivel de experiencia (campo unlock).

export type SheetFieldType = 'text' | 'multiline' | 'number';

export type SheetField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: SheetFieldType;
};

const COMMON_TAIL: SheetField[] = [
  { key: 'rasgo', label: 'Rasgo distintivo', placeholder: 'Lo que nadie olvida tras conocerle' },
];

/** Campos de la mini-hoja por slug de sistema (systems.slug). */
export const SYSTEM_FIELDS: Record<string, SheetField[]> = {
  dnd5e: [
    { key: 'raza', label: 'Raza / linaje', placeholder: 'Tiefling, enana de las colinas…' },
    { key: 'clase', label: 'Clase', placeholder: 'Pícara, paladín de la venganza…' },
    { key: 'alineamiento', label: 'Alineamiento', placeholder: 'Caótica buena' },
    { key: 'trasfondo', label: 'Trasfondo', placeholder: 'Charlatana, ermitaño…' },
    ...COMMON_TAIL,
  ],
  pathfinder2e: [
    { key: 'ascendencia', label: 'Ascendencia', placeholder: 'Goblin, humana varisia…' },
    { key: 'clase', label: 'Clase', placeholder: 'Alquimista, campeona…' },
    { key: 'trasfondo', label: 'Trasfondo', placeholder: 'Erudito, marinera…' },
    ...COMMON_TAIL,
  ],
  cthulhu: [
    { key: 'ocupacion', label: 'Ocupación', placeholder: 'Anticuaria, periodista…' },
    { key: 'epoca', label: 'Época', placeholder: 'Años 20, actual…' },
    { key: 'cordura', label: 'Cordura', placeholder: '65… de momento', type: 'text' },
    { key: 'contactos', label: 'Contactos', placeholder: 'La bibliotecaria de Arkham…' },
    ...COMMON_TAIL,
  ],
  vampire: [
    { key: 'clan', label: 'Clan', placeholder: 'El linaje de tu sangre' },
    { key: 'generacion', label: 'Generación', placeholder: '12ª' },
    { key: 'sire', label: 'Sire', placeholder: 'Quién te abrazó' },
    { key: 'mascara', label: 'Naturaleza / máscara', placeholder: 'Lo que eres vs. lo que aparentas' },
    ...COMMON_TAIL,
  ],
  'savage-worlds': [
    { key: 'raza', label: 'Raza', placeholder: 'Humano, androide…' },
    { key: 'ventajas', label: 'Ventajas', placeholder: 'Ambidiestro, nervios de acero…' },
    { key: 'desventaja', label: 'Desventaja mayor', placeholder: 'Leal, código de honor…' },
    ...COMMON_TAIL,
  ],
  fate: [
    { key: 'concepto_principal', label: 'Concepto principal', placeholder: 'Detective maldita del puerto' },
    { key: 'complicacion', label: 'Complicación', placeholder: 'Le debo dinero a quien no debería' },
    { key: 'aspectos', label: 'Otros aspectos', placeholder: 'Separados por comas', type: 'multiline' },
    ...COMMON_TAIL,
  ],
  pbta: [
    { key: 'libreto', label: 'Libreto / arquetipo', placeholder: 'El Corazón, la Elegida…' },
    { key: 'movimientos', label: 'Movimientos favoritos', placeholder: 'Los que definen su forma de jugar', type: 'multiline' },
    { key: 'vinculos', label: 'Vínculos', placeholder: 'Con quién y por qué', type: 'multiline' },
    ...COMMON_TAIL,
  ],
};

/** Campos genéricos cuando el sistema no tiene esquema propio (u «Otro»). */
export const DEFAULT_FIELDS: SheetField[] = [
  { key: 'arquetipo_hoja', label: 'Arquetipo / rol', placeholder: 'Tanque, cara, apoyo…' },
  { key: 'origen', label: 'Origen', placeholder: 'De dónde viene' },
  ...COMMON_TAIL,
];

export function fieldsForSystem(slug: string | null | undefined): SheetField[] {
  return (slug && SYSTEM_FIELDS[slug]) || DEFAULT_FIELDS;
}

// ============================================================
// Diseños visuales de hoja (temas)
// ============================================================

export type SheetUnlock = 'free' | 'premium' | { level: number };

export type SheetTheme = {
  id: string;
  name: string;
  emblem: string;
  /** gradiente de fondo de la hoja */
  colors: [string, string];
  accent: string;
  border: string;
  unlock: SheetUnlock;
};

export const SHEET_THEMES: SheetTheme[] = [
  { id: 'rolder', name: 'rolder', emblem: '🎲', colors: ['#1B1B2E', '#241B3A'], accent: '#B9A6FF', border: 'rgba(139,108,255,0.55)', unlock: 'free' },
  { id: 'dnd5e', name: 'Mazmorra', emblem: '🐉', colors: ['#2A1616', '#3A1C10'], accent: '#F0A860', border: 'rgba(240,168,96,0.5)', unlock: 'free' },
  { id: 'pathfinder2e', name: 'Sendero', emblem: '🧭', colors: ['#241A10', '#33230F'], accent: '#E8B54D', border: 'rgba(232,181,77,0.5)', unlock: 'free' },
  { id: 'cthulhu', name: 'Abismo', emblem: '🐙', colors: ['#0E1F1B', '#122A1E'], accent: '#7FD9A8', border: 'rgba(127,217,168,0.45)', unlock: 'free' },
  { id: 'vampire', name: 'Estirpe', emblem: '🩸', colors: ['#260E14', '#3A0F1A'], accent: '#F0708A', border: 'rgba(240,112,138,0.5)', unlock: 'free' },
  { id: 'savage-worlds', name: 'Salvaje', emblem: '🌪️', colors: ['#101C26', '#14263A'], accent: '#7FBBF2', border: 'rgba(127,187,242,0.5)', unlock: 'free' },
  { id: 'fate', name: 'Destino', emblem: '🔮', colors: ['#141B2E', '#1B2440'], accent: '#8FA8F5', border: 'rgba(143,168,245,0.5)', unlock: 'free' },
  { id: 'pbta', name: 'Apocalipsis', emblem: '🔥', colors: ['#26140E', '#38180C'], accent: '#F2925C', border: 'rgba(242,146,92,0.5)', unlock: 'free' },
  // Aspiracionales: enseñan el sistema de desbloqueo (monetización / XP)
  { id: 'dorado', name: 'Dorado', emblem: '👑', colors: ['#251E0C', '#3A2E0E'], accent: '#F5C34D', border: 'rgba(245,195,77,0.7)', unlock: 'premium' },
  { id: 'mitico', name: 'Mítico', emblem: '⚡', colors: ['#1C0E2E', '#320E3A'], accent: '#E08FF5', border: 'rgba(224,143,245,0.7)', unlock: { level: 10 } },
];

export function themeById(id: string | null | undefined): SheetTheme | undefined {
  return SHEET_THEMES.find((t) => t.id === id);
}

/** Tema efectivo de un personaje: el elegido, o el del sistema, o rolder. */
export function themeForCharacter(
  sheetTheme: string | null | undefined,
  systemSlug: string | null | undefined
): SheetTheme {
  return themeById(sheetTheme) ?? themeById(systemSlug ?? undefined) ?? SHEET_THEMES[0];
}

/** ¿Puede este usuario usar el tema? (infra premium / recompensa de nivel) */
export function canUseTheme(
  theme: SheetTheme,
  status: { isPremium: boolean; level: number }
): boolean {
  if (theme.unlock === 'free') return true;
  if (theme.unlock === 'premium') return status.isPremium;
  return status.level >= theme.unlock.level;
}

export function unlockLabel(theme: SheetTheme): string | null {
  if (theme.unlock === 'free') return null;
  if (theme.unlock === 'premium') return '✨ Premium';
  return `⚔️ Nv. ${theme.unlock.level}`;
}

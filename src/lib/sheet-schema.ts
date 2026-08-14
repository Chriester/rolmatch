// Esquemas de hoja de personaje por sistema, según el handoff
// «Hojas de Personaje Rolder» (carpeta App de rol…-handoff): cada hoja es
// una lista de SECCIONES tipadas que el editor rellena y la vista pinta
// con el lenguaje visual del diseño. Los valores viven en characters.traits
// (jsonb plano clave→texto; las secciones de líneas usan una clave única).
//
// IP: terminología mecánica y listas cortas de nombres genéricos; el modo
// homebrew permite texto libre en cualquier campo con desplegable.

export type SheetField = {
  key: string;
  label: string;
  placeholder?: string;
  /** con opciones se rellena por chips; homebrew desbloquea texto libre */
  options?: string[];
};

export type SheetSection =
  /** chips etiqueta+valor (identidad, combate…) */
  | { kind: 'fields'; title?: string; fields: SheetField[] }
  /** rejilla de números grandes (características, salud…) */
  | { kind: 'stats'; title: string; cols: number; fields: SheetField[] }
  /** valoraciones con puntos: valor "3" → ●●●○○ */
  | { kind: 'dots'; title: string; max?: number; fields: SheetField[] }
  /** contadores de casillas: valor "4/9" → ■■■■□… */
  | { kind: 'track'; title: string; fields: SheetField[] }
  /** una línea por entrada: "Nombre · +7 · COMP" */
  | { kind: 'list'; title: string; key: string; hint: string }
  /** una línea por fila: "Espada larga · +7 · 1d8+4" */
  | { kind: 'table'; title: string; key: string; headers: [string, string, string]; hint: string }
  /** una línea por tarjeta: "Título :: descripción" */
  | { kind: 'cards'; title: string; key: string; hint: string }
  /** etiquetas separadas por comas */
  | { kind: 'chips'; title: string; key: string; hint: string }
  /** nota libre */
  | { kind: 'text'; title: string; key: string; placeholder?: string };

const DND_CLASES = ['Bárbaro/a', 'Bardo/a', 'Brujo/a', 'Clérigo/a', 'Druida', 'Explorador/a', 'Guerrero/a', 'Hechicero/a', 'Mago/a', 'Monje', 'Paladín/a', 'Pícaro/a'];
const DND_RAZAS = ['Humano/a', 'Elfo/a', 'Enano/a', 'Mediano/a', 'Gnomo/a', 'Semielfo/a', 'Semiorco/a', 'Dracónido/a', 'Tiefling'];
const V5_CLANES = ['Brujah', 'Gangrel', 'Malkavian', 'Nosferatu', 'Toreador', 'Tremere', 'Ventrue', 'Caitiff'];
const PF_ANCESTRIAS = ['Humano/a', 'Elfo/a', 'Enano/a', 'Gnomo/a', 'Goblin', 'Mediano/a', 'Orco/a', 'Trasgo'];
const BITD_LIBRETOS = ['Cutter', 'Hound', 'Leech', 'Lurk', 'Slide', 'Spider', 'Whisper'];
const CPR_ROLES = ['Netrunner', 'Solo', 'Tech', 'Medtech', 'Media', 'Lawman', 'Exec', 'Fixer', 'Nomad', 'Rockerboy'];

const STATS6 = [
  { key: 'fue', label: 'FUE' }, { key: 'des', label: 'DES' }, { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' }, { key: 'sab', label: 'SAB' }, { key: 'car', label: 'CAR' },
];

export const SHEET_SECTIONS: Record<string, SheetSection[]> = {
  dnd5e: [
    { kind: 'fields', fields: [
      { key: 'raza', label: 'Raza', options: DND_RAZAS },
      { key: 'clase', label: 'Clase', options: DND_CLASES },
      { key: 'alineamiento', label: 'Alineamiento', options: ['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'] },
      { key: 'trasfondo_hoja', label: 'Trasfondo', placeholder: 'Soldado, ermitaña…' },
    ] },
    { kind: 'stats', title: 'Características', cols: 3, fields: STATS6 },
    { kind: 'fields', title: 'Combate', fields: [
      { key: 'ca', label: 'CA' }, { key: 'iniciativa', label: 'Iniciativa' },
      { key: 'velocidad', label: 'Velocidad' }, { key: 'competencia', label: 'Competencia' },
    ] },
    { kind: 'stats', title: 'Puntos de golpe', cols: 3, fields: [
      { key: 'pv', label: 'PV', placeholder: '58 / 58' }, { key: 'pv_temp', label: 'PV TEMP' }, { key: 'dados_golpe', label: 'DADOS' },
    ] },
    { kind: 'list', title: 'Tiradas de salvación', key: 'salvaciones', hint: 'Fuerza · +7 · COMP' },
    { kind: 'list', title: 'Habilidades destacadas', key: 'habilidades', hint: 'Atletismo · +7 · COMP' },
    { kind: 'table', title: 'Ataques', key: 'ataques', headers: ['Arma', 'Bono', 'Daño'], hint: 'Espada larga · +7 · 1d8+4 cort.' },
    { kind: 'cards', title: 'Rasgos y aptitudes', key: 'rasgos', hint: 'Segundo aliento :: Recupera 1d10+7 PV…' },
    { kind: 'chips', title: 'Equipo', key: 'equipo', hint: 'Cota de malla, Escudo, Cuerda 15 m' },
    { kind: 'text', title: 'Notas', key: 'notas', placeholder: '34 po · idiomas, contactos…' },
  ],
  pathfinder2e: [
    { kind: 'fields', fields: [
      { key: 'ascendencia', label: 'Ascendencia', options: PF_ANCESTRIAS },
      { key: 'clase', label: 'Clase', placeholder: 'Bárbaro, campeona…' },
      { key: 'trasfondo_hoja', label: 'Trasfondo', placeholder: 'Nómada' },
      { key: 'cd_clase', label: 'CD de clase' },
    ] },
    { kind: 'stats', title: 'Características', cols: 3, fields: STATS6 },
    { kind: 'fields', title: 'Defensa', fields: [
      { key: 'ca', label: 'CA' }, { key: 'percepcion', label: 'Percepción' }, { key: 'velocidad', label: 'Velocidad' },
    ] },
    { kind: 'stats', title: 'Salud y héroe', cols: 2, fields: [
      { key: 'pv', label: 'PV' }, { key: 'puntos_heroe', label: 'P. HÉROE', placeholder: '1/3' },
    ] },
    { kind: 'list', title: 'Salvaciones', key: 'salvaciones', hint: 'Fortaleza · +12 · EXPERTO' },
    { kind: 'list', title: 'Habilidades', key: 'habilidades', hint: 'Atletismo · +11 · EXPERTO' },
    { kind: 'table', title: 'Golpes', key: 'ataques', headers: ['Arma', 'Bono', 'Daño'], hint: 'Hacha grande ◆ · +12 · 1d12+7' },
    { kind: 'cards', title: 'Aptitudes y dotes', key: 'rasgos', hint: 'Furia ◆ :: +2 al daño…' },
    { kind: 'chips', title: 'Equipo', key: 'equipo', hint: 'Hacha grande, Jabalinas ×3' },
  ],
  cthulhu: [
    { kind: 'fields', fields: [
      { key: 'ocupacion', label: 'Ocupación', placeholder: 'Arqueóloga' },
      { key: 'epoca', label: 'Época', options: ['Años 20', 'Actual', 'Victoriana', 'Otra'] },
      { key: 'residencia', label: 'Residencia' },
    ] },
    { kind: 'stats', title: 'Características', cols: 4, fields: [
      { key: 'fue', label: 'FUE' }, { key: 'des', label: 'DES' }, { key: 'int', label: 'INT' }, { key: 'con', label: 'CON' },
      { key: 'apa', label: 'APA' }, { key: 'pod', label: 'POD' }, { key: 'tam', label: 'TAM' }, { key: 'edu', label: 'EDU' },
    ] },
    { kind: 'stats', title: 'Estado', cols: 4, fields: [
      { key: 'cordura', label: 'CORDURA', placeholder: '58/99' }, { key: 'suerte', label: 'SUERTE' },
      { key: 'pv', label: 'PV' }, { key: 'pm', label: 'PM' },
    ] },
    { kind: 'list', title: 'Habilidades (%)', key: 'habilidades', hint: 'Arqueología · 70' },
    { kind: 'table', title: 'Armas', key: 'ataques', headers: ['Arma', 'Hab.', 'Daño'], hint: 'Pistola .38 · 35% · 1d10' },
    { kind: 'cards', title: 'Trasfondo', key: 'rasgos', hint: 'Ideología :: «La razón ilumina…»' },
    { kind: 'text', title: 'Mythos', key: 'notas', placeholder: 'Mythos 5% · Cordura máx. 94…' },
  ],
  vampire: [
    { kind: 'fields', fields: [
      { key: 'clan', label: 'Clan', options: V5_CLANES },
      { key: 'sire', label: 'Sire' },
      { key: 'generacion', label: 'Generación', placeholder: '11ª' },
      { key: 'depredador', label: 'Depredador/a', placeholder: 'Callejera' },
    ] },
    { kind: 'dots', title: 'Atributos', fields: [
      { key: 'fuerza', label: 'Fuerza' }, { key: 'destreza', label: 'Destreza' }, { key: 'resistencia', label: 'Resistencia' },
      { key: 'carisma', label: 'Carisma' }, { key: 'manipulacion', label: 'Manipulación' }, { key: 'compostura', label: 'Compostura' },
      { key: 'inteligencia', label: 'Inteligencia' }, { key: 'astucia', label: 'Astucia' }, { key: 'resolucion', label: 'Resolución' },
    ] },
    { kind: 'track', title: 'Estado', fields: [
      { key: 'salud', label: 'Salud', placeholder: '3/6' }, { key: 'voluntad', label: 'F. de voluntad', placeholder: '1/5' },
      { key: 'hambre', label: 'Hambre', placeholder: '2/5' }, { key: 'humanidad', label: 'Humanidad', placeholder: '7/10' },
    ] },
    { kind: 'dots', title: 'Habilidades destacadas', fields: [
      { key: 'pelea', label: 'Pelea' }, { key: 'atletismo', label: 'Atletismo' },
      { key: 'intimidacion', label: 'Intimidación' }, { key: 'callejeo', label: 'Callejeo' },
    ] },
    { kind: 'cards', title: 'Disciplinas', key: 'disciplinas', hint: 'Potencia ●● :: Golpe brutal…' },
    { kind: 'cards', title: 'Crónica', key: 'rasgos', hint: 'Ambición :: Derrocar al Príncipe…' },
    { kind: 'text', title: 'Notas', key: 'notas', placeholder: 'Resonancia · piedras de toque…' },
  ],
  blades: [
    { kind: 'fields', fields: [
      { key: 'libreto', label: 'Libreto', options: BITD_LIBRETOS },
      { key: 'banda', label: 'Banda' },
      { key: 'herencia', label: 'Herencia' },
      { key: 'vicio', label: 'Vicio' },
    ] },
    { kind: 'track', title: 'Estrés y trauma', fields: [
      { key: 'estres', label: 'Estrés', placeholder: '4/9' }, { key: 'trauma', label: 'Trauma', placeholder: '1/4' },
    ] },
    { kind: 'dots', title: 'Acciones', max: 4, fields: [
      { key: 'cazar', label: 'Cazar' }, { key: 'estudiar', label: 'Estudiar' }, { key: 'inspeccionar', label: 'Inspeccionar' }, { key: 'trastear', label: 'Trastear' },
      { key: 'maniobrar', label: 'Maniobrar' }, { key: 'acechar', label: 'Acechar' }, { key: 'escaramuza', label: 'Escaramuza' }, { key: 'destrozar', label: 'Destrozar' },
      { key: 'sintonizar', label: 'Sintonizar' }, { key: 'mandar', label: 'Mandar' }, { key: 'confraternizar', label: 'Confraternizar' }, { key: 'persuadir', label: 'Persuadir' },
    ] },
    { kind: 'cards', title: 'Habilidades especiales', key: 'rasgos', hint: 'Infiltrada :: No te detectan…' },
    { kind: 'fields', title: 'Carga y monedas', fields: [
      { key: 'carga', label: 'Carga' }, { key: 'moneda', label: 'Moneda' }, { key: 'alijo', label: 'Alijo' },
    ] },
  ],
  fate: [
    { kind: 'cards', title: 'Aspectos', key: 'aspectos', hint: 'Concepto principal :: «Capitana mercenaria…»' },
    { kind: 'list', title: 'Pirámide de habilidades', key: 'habilidades', hint: 'Pilotar · +4 · GRANDE' },
    { kind: 'track', title: 'Estrés y puntos fate', fields: [
      { key: 'fisico', label: 'Físico', placeholder: '0/2' }, { key: 'mental', label: 'Mental', placeholder: '0/3' },
      { key: 'puntos_fate', label: 'Puntos fate', placeholder: '3/3' },
    ] },
    { kind: 'cards', title: 'Consecuencias', key: 'consecuencias', hint: 'Leve (2) :: —' },
    { kind: 'cards', title: 'Proezas', key: 'rasgos', hint: 'Viraje imposible :: +2 a Pilotar…' },
  ],
  'cyberpunk-red': [
    { kind: 'fields', fields: [
      { key: 'rol', label: 'Rol', options: CPR_ROLES },
      { key: 'habilidad_rol', label: 'Hab. de rol', placeholder: 'Interfaz 6' },
      { key: 'estilo', label: 'Estilo' },
    ] },
    { kind: 'stats', title: 'Estadísticas', cols: 5, fields: [
      { key: 'int', label: 'INT' }, { key: 'ref', label: 'REF' }, { key: 'des', label: 'DES' }, { key: 'tec', label: 'TEC' }, { key: 'fria', label: 'FRÍA' },
      { key: 'vol', label: 'VOL' }, { key: 'sue', label: 'SUE' }, { key: 'mov', label: 'MOV' }, { key: 'cue', label: 'CUE' }, { key: 'emp', label: 'EMP' },
    ] },
    { kind: 'stats', title: 'Salud', cols: 4, fields: [
      { key: 'pv', label: 'PV' }, { key: 'herida_grave', label: 'H. GRAVE' }, { key: 'salv_muerte', label: 'S. MUERTE' }, { key: 'humanidad', label: 'HUMANIDAD' },
    ] },
    { kind: 'list', title: 'Habilidades', key: 'habilidades', hint: 'Interfaz · +6 · ROL' },
    { kind: 'table', title: 'Armas', key: 'ataques', headers: ['Arma', 'Daño', 'CDT'], hint: 'Pistola pesada · 3d6 · 2' },
    { kind: 'chips', title: 'Ciberequipo', key: 'equipo', hint: 'Plugs de interfaz, Ojo ciber (IR)' },
    { kind: 'text', title: 'Notas', key: 'notas', placeholder: '€$ · vivienda · contactos…' },
  ],
  'savage-worlds': [
    { kind: 'fields', fields: [
      { key: 'raza', label: 'Raza' }, { key: 'rango', label: 'Rango', options: ['Novato', 'Experimentado', 'Veterano', 'Heroico', 'Legendario'] },
    ] },
    { kind: 'fields', title: 'Atributos', fields: [
      { key: 'agilidad', label: 'Agilidad', placeholder: 'd8' }, { key: 'astucia', label: 'Astucia', placeholder: 'd6' },
      { key: 'espiritu', label: 'Espíritu', placeholder: 'd6' }, { key: 'fuerza', label: 'Fuerza', placeholder: 'd8' },
      { key: 'vigor', label: 'Vigor', placeholder: 'd6' },
    ] },
    { kind: 'list', title: 'Habilidades', key: 'habilidades', hint: 'Pelear · d8' },
    { kind: 'cards', title: 'Ventajas y desventajas', key: 'rasgos', hint: 'Nervios de acero :: Ignora 1 de penalización…' },
    { kind: 'chips', title: 'Equipo', key: 'equipo', hint: 'Espada, escudo…' },
  ],
  pbta: [
    { kind: 'fields', fields: [{ key: 'libreto', label: 'Libreto', placeholder: 'El Corazón, la Elegida…' }] },
    { kind: 'stats', title: 'Estadísticas', cols: 5, fields: [
      { key: 'frio', label: 'FRÍO' }, { key: 'duro', label: 'DURO' }, { key: 'raro', label: 'RARO' }, { key: 'sexy', label: 'SEXY' }, { key: 'agudo', label: 'AGUDO' },
    ] },
    { kind: 'cards', title: 'Movimientos', key: 'rasgos', hint: 'Mirada helada :: Cuando amenazas…' },
    { kind: 'cards', title: 'Vínculos', key: 'vinculos', hint: 'Marta :: Me salvó la vida en…' },
    { kind: 'text', title: 'Notas', key: 'notas' },
  ],
};

/** Hoja flexible para «Otro / indie» y sistemas sin esquema propio. */
export const DEFAULT_SECTIONS: SheetSection[] = [
  { kind: 'cards', title: 'Identidad', key: 'rasgos', hint: 'Concepto :: Quién es en una frase' },
  { kind: 'dots', title: 'Rasgos', fields: [
    { key: 'vigor', label: 'Vigor' }, { key: 'reflejos', label: 'Reflejos' },
    { key: 'ingenio', label: 'Ingenio' }, { key: 'saber', label: 'Saber' },
    { key: 'coraje', label: 'Coraje' }, { key: 'carisma', label: 'Carisma' },
  ] },
  { kind: 'track', title: 'Contadores', fields: [
    { key: 'recurso', label: 'Recurso', placeholder: '3/5' }, { key: 'condicion', label: 'Condición', placeholder: '0/5' },
  ] },
  { kind: 'chips', title: 'Etiquetas', key: 'equipo', hint: 'Superviviente, curiosa…' },
  { kind: 'text', title: 'Notas de campaña', key: 'notas', placeholder: 'Reglas caseras, acuerdos de mesa…' },
];

export function sectionsForSystem(slug: string | null | undefined): SheetSection[] {
  return (slug && SHEET_SECTIONS[slug]) || DEFAULT_SECTIONS;
}

// ============================================================
// Diseños visuales (acentos y gradientes del handoff) + desbloqueos
// ============================================================

export type SheetUnlock = 'free' | 'premium' | { level: number };

export type SheetTheme = {
  id: string;
  name: string;
  emblem: string;
  colors: [string, string];
  accent: string;
  border: string;
  unlock: SheetUnlock;
};

export const SHEET_THEMES: SheetTheme[] = [
  { id: 'rolder', name: 'rolder', emblem: '🎲', colors: ['#1B1533', '#241B3A'], accent: '#A78BFF', border: 'rgba(167,139,255,0.55)', unlock: 'free' },
  { id: 'dnd5e', name: 'Mazmorra', emblem: '🛡', colors: ['#1A2333', '#2A3A55'], accent: '#FF6B6B', border: 'rgba(255,107,107,0.5)', unlock: 'free' },
  { id: 'pathfinder2e', name: 'Sendero', emblem: '🪓', colors: ['#2A1A0E', '#4A3018'], accent: '#F0A84B', border: 'rgba(240,168,75,0.5)', unlock: 'free' },
  { id: 'cthulhu', name: 'Abismo', emblem: '🕯', colors: ['#0D1F18', '#1E4D3B'], accent: '#5FC98F', border: 'rgba(95,201,143,0.45)', unlock: 'free' },
  { id: 'vampire', name: 'Estirpe', emblem: '🧛', colors: ['#25060F', '#4A1322'], accent: '#FF5A7A', border: 'rgba(255,90,122,0.5)', unlock: 'free' },
  { id: 'blades', name: 'Penumbra', emblem: '🗡', colors: ['#1A1A1E', '#333338'], accent: '#9FB4C8', border: 'rgba(159,180,200,0.45)', unlock: 'free' },
  { id: 'fate', name: 'Destino', emblem: '🚀', colors: ['#101E2C', '#22405C'], accent: '#5CB2F0', border: 'rgba(92,178,240,0.5)', unlock: 'free' },
  { id: 'cyberpunk-red', name: 'Neón', emblem: '🕶', colors: ['#26210A', '#4A4012'], accent: '#F5E04A', border: 'rgba(245,224,74,0.5)', unlock: 'free' },
  { id: 'savage-worlds', name: 'Salvaje', emblem: '🌪️', colors: ['#101C26', '#1E3448'], accent: '#7FBBF2', border: 'rgba(127,187,242,0.5)', unlock: 'free' },
  { id: 'pbta', name: 'Apocalipsis', emblem: '🔥', colors: ['#26140E', '#48261A'], accent: '#F2925C', border: 'rgba(242,146,92,0.5)', unlock: 'free' },
  { id: 'dorado', name: 'Dorado', emblem: '👑', colors: ['#251E0C', '#3A2E0E'], accent: '#F0BE7A', border: 'rgba(240,190,122,0.7)', unlock: 'premium' },
  { id: 'mitico', name: 'Mítico', emblem: '⚡', colors: ['#1C0E2E', '#320E3A'], accent: '#E08FF5', border: 'rgba(224,143,245,0.7)', unlock: { level: 10 } },
];

export function themeById(id: string | null | undefined): SheetTheme | undefined {
  return SHEET_THEMES.find((t) => t.id === id);
}

export function themeForCharacter(
  sheetTheme: string | null | undefined,
  systemSlug: string | null | undefined
): SheetTheme {
  return themeById(sheetTheme) ?? themeById(systemSlug ?? undefined) ?? SHEET_THEMES[0];
}

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
  if (theme.unlock === 'premium') return 'Premium';
  return `Nv. ${theme.unlock.level}`;
}

/** ¿Es un valor homebrew? (campo con opciones cuyo valor no está en la lista) */
export function isHomebrew(field: SheetField, value: string | undefined): boolean {
  return !!field.options && !!value && !field.options.includes(value);
}

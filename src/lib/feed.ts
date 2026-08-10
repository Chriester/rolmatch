import { matchPlayerToGroup, type MatchGroup, type MatchPlayer, type MatchResult } from '@/lib/matching';
import { fetchBlockRelations } from '@/lib/moderation';
import { fetchReliability } from '@/lib/ratings';
import { supabase } from '@/lib/supabase';
import { fetchXpTotals, levelFromXp } from '@/lib/xp';
import type { GroupFormat } from '@/lib/groups';
import type { VttType } from '@/lib/profile';

export type GroupCandidate = {
  group: MatchGroup & {
    id: string;
    owner_id: string;
    name: string;
    image_url: string | null;
    boosted_until: string | null;
    description: string | null;
    format: GroupFormat;
    frequency: string | null;
    systems: { name: string } | null;
    /** sin plazas abiertas: se puede pedir sitio igualmente (el GM decide) */
    full: boolean;
    /** quién dirige: decide muchos likes (nivel y fiabilidad incluidos) */
    owner: {
      alias: string;
      avatar_url: string | null;
      level: number;
      reliability: { average: number; count: number } | null;
    };
  };
  result: MatchResult;
};

export type ShowcaseCharacter = {
  id: string;
  name: string;
  archetype: string | null;
  level: string | null;
  gender: string | null;
  age: string | null;
  concept: string | null;
  backstory: string | null;
  portrait_url: string | null;
  status: string;
  is_public: boolean;
  traits: Record<string, string>;
  sheet_theme: string | null;
  systems: { name: string; slug: string } | null;
};

export type PlayerCandidate = {
  player: MatchPlayer & {
    id: string;
    alias: string;
    role: string;
    gender: string | null;
    birth_year: number | null;
    characters: ShowcaseCharacter[];
    xpTotal: number;
  };
  /** true si este jugador ya dio like a la mesa */
  likedGroup: boolean;
  /** personaje que propone para la mesa, si eligió uno al swipear */
  proposal: ShowcaseCharacter | null;
  result: MatchResult;
};

async function fetchMatchPlayer(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, alias, role, timezone, languages, open_to_any_system, bio, avatar_url,
       style_combat_narrative, style_serious_humor, style_roleplay_weight, preferred_vtt,
       availability_slots(weekday, slot), user_systems(system_id, experience)`
    )
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

function toMatchPlayer(row: Awaited<ReturnType<typeof fetchMatchPlayer>>): MatchPlayer {
  return {
    timezone: row.timezone,
    languages: row.languages,
    open_to_any_system: row.open_to_any_system,
    style_combat_narrative: row.style_combat_narrative,
    style_serious_humor: row.style_serious_humor,
    style_roleplay_weight: row.style_roleplay_weight,
    preferred_vtt: row.preferred_vtt as VttType,
    bio: row.bio,
    avatar_url: row.avatar_url,
    availability: row.availability_slots,
    systems: row.user_systems,
  };
}

/** Mesas activas con plazas que pasan los filtros duros para este jugador, ordenadas por score. */
export async function fetchPlayerFeed(userId: string): Promise<GroupCandidate[]> {
  const me = toMatchPlayer(await fetchMatchPlayer(userId));

  const [{ data: myMemberships }, { data: mySwipes }, blocked] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('user_id', userId),
    supabase.from('swipes').select('group_id').eq('user_id', userId).eq('origin', 'user'),
    fetchBlockRelations(userId),
  ]);
  const excluded = new Set([
    ...(myMemberships ?? []).map((m) => m.group_id),
    ...(mySwipes ?? []).map((s) => s.group_id),
  ]);

  // Las mesas LLENAS también salen (marcadas): darles like te convierte en
  // candidato y el GM decide si amplía la mesa — clave con pool pequeño.
  const { data: groups, error } = await supabase
    .from('groups')
    .select(
      `id, owner_id, name, image_url, boosted_until, description, format, frequency, timezone, language, system_id,
       session_weekday, session_slot, experience_wanted, vtt,
       style_combat_narrative, style_serious_humor, style_roleplay_weight,
       systems(name), max_players, group_members(user_id)`
    )
    .eq('is_active', true);
  if (error) throw error;

  const visible = (groups ?? []).filter((g) => !excluded.has(g.id) && !blocked.has(g.owner_id));

  // Identidad del GM en la tarjeta: alias, nivel y fiabilidad
  const ownerIds = [...new Set(visible.map((g) => g.owner_id))];
  const [{ data: ownerProfiles }, ownerReliability, ownerXp] = await Promise.all([
    supabase.from('profiles').select('id, alias, avatar_url').in('id', ownerIds),
    fetchReliability(ownerIds).catch(
      () => new Map<string, { average: number; count: number }>()
    ),
    fetchXpTotals(ownerIds).catch(() => new Map<string, number>()),
  ]);
  const ownersById = new Map(
    (ownerProfiles ?? []).map((p) => [
      p.id as string,
      { alias: p.alias as string, avatar_url: p.avatar_url as string | null },
    ])
  );

  return visible
    .map((g) => {
      // plazas derivadas: límite menos miembros sin contar al GM
      const memberRows = (g.group_members ?? []) as { user_id: string }[];
      const players = memberRows.filter((m) => m.user_id !== g.owner_id).length;
      const full = players >= ((g.max_players as number) ?? 5);
      const ownerProfile = ownersById.get(g.owner_id);
      const owner = {
        alias: ownerProfile?.alias ?? 'GM',
        avatar_url: ownerProfile?.avatar_url ?? null,
        level: levelFromXp(ownerXp.get(g.owner_id) ?? 0),
        reliability: ownerReliability.get(g.owner_id) ?? null,
      };
      return {
        group: { ...g, full, owner } as unknown as GroupCandidate['group'],
        result: matchPlayerToGroup(me, g as unknown as MatchGroup),
      };
    })
    .filter((c) => c.result.pass)
    // llenas al final; dentro de cada bloque, por score
    .sort(
      (a, b) => Number(a.group.full) - Number(b.group.full) || b.result.score - a.result.score
    );
}

// Columnas de un candidato para la tarjeta y el score. La disponibilidad se
// pide aparte porque en el pool general va con `!inner` (ver abajo).
const CANDIDATE_COLUMNS = `id, alias, role, gender, birth_year, timezone, languages, open_to_any_system, bio, avatar_url,
   style_combat_narrative, style_serious_humor, style_roleplay_weight, preferred_vtt,
   user_systems(system_id, experience),
   characters!characters_user_id_fkey(id, name, archetype, level, gender, age, concept, backstory, portrait_url, status, is_public, traits, sheet_theme, systems(name, slug))`;

type CandidateRow = {
  id: string;
  alias: string;
  role: string;
  gender: string | null;
  birth_year: number | null;
  characters: unknown;
  availability_slots: { weekday: number; slot: number }[];
} & Parameters<typeof toMatchPlayer>[0];

/** Lo que excluye a un candidato de UNA mesa, y quién le ha pedido sitio. */
type GroupExclusions = { excluded: Set<string>; likesByUser: Map<string, string | null> };

/**
 * Miembros, swipes y bloqueos de VARIAS mesas de una tacada. Antes esto eran
 * tres consultas por mesa dentro de un bucle secuencial.
 */
async function fetchGroupExclusions(
  groupIds: string[],
  viewerId: string,
  onlyApplicants: boolean
): Promise<Map<string, GroupExclusions>> {
  const byGroup = new Map<string, GroupExclusions>();
  if (groupIds.length === 0) return byGroup;

  const [{ data: members }, { data: groupSwipes }, { data: userLikes }, blocked] =
    await Promise.all([
      supabase.from('group_members').select('group_id, user_id').in('group_id', groupIds),
      supabase
        .from('swipes')
        .select('group_id, user_id, direction')
        .in('group_id', groupIds)
        .eq('origin', 'group'),
      supabase
        .from('swipes')
        .select('group_id, user_id, proposed_character_id')
        .in('group_id', groupIds)
        .eq('origin', 'user')
        .eq('direction', 'like'),
      fetchBlockRelations(viewerId),
    ]);

  for (const groupId of groupIds) {
    byGroup.set(groupId, { excluded: new Set(blocked), likesByUser: new Map() });
  }
  for (const member of members ?? []) {
    byGroup.get(member.group_id)?.excluded.add(member.user_id);
  }
  // En la cola de solicitudes, un like previo de la mesa NO excluye: el GM
  // pudo fichar al jugador desde el feed antes de que pidiera sitio, y es
  // aquí donde acepta (su like rearmado cierra el match). Un pass sí excluye.
  for (const swipe of groupSwipes ?? []) {
    if (onlyApplicants && swipe.direction !== 'pass') continue;
    byGroup.get(swipe.group_id)?.excluded.add(swipe.user_id);
  }
  for (const like of userLikes ?? []) {
    byGroup.get(like.group_id)?.likesByUser.set(like.user_id, like.proposed_character_id);
  }
  return byGroup;
}

/**
 * El pool de candidatos, UNA sola vez por feed.
 *
 * `availability_slots!inner` hace el descarte en Postgres: sin él bajábamos
 * la tabla `profiles` entera —con disponibilidad, sistemas y personajes
 * embebidos— para tirar en el móvil a los que no tienen disponibilidad, y
 * encima una vez por cada mesa del GM.
 *
 * Con `applicantIds` (cola de solicitudes) se acota a esa lista y NO se
 * exige disponibilidad: quien pide sitio entra aunque tenga el perfil a
 * medias, que esa decisión es del GM.
 */
async function fetchCandidatePool(applicantIds?: string[]): Promise<CandidateRow[]> {
  if (applicantIds && applicantIds.length === 0) return [];
  const query = applicantIds
    ? supabase
        .from('profiles')
        .select(`${CANDIDATE_COLUMNS}, availability_slots(weekday, slot)`)
        .in('id', applicantIds)
    : supabase
        .from('profiles')
        .select(`${CANDIDATE_COLUMNS}, availability_slots!inner(weekday, slot)`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CandidateRow[];
}

/** Fiabilidad (10 % del score) y XP (solo para pintar el nivel en la tarjeta). */
async function fetchCandidateScores(ids: string[]) {
  return Promise.all([
    fetchReliability(ids).catch(() => new Map<string, { average: number; count: number }>()),
    fetchXpTotals(ids).catch(() => new Map<string, number>()),
  ]);
}

/**
 * Puntúa el pool contra una mesa. Sin red: solo cálculo, y por eso es lo
 * único de aquí que se puede testear a pelo (feed.test.ts).
 */
export function buildCandidates(
  pool: CandidateRow[],
  group: MatchGroup,
  { excluded, likesByUser }: GroupExclusions,
  reliability: Map<string, { average: number; count: number }>,
  xpTotals: Map<string, number>,
  onlyApplicants: boolean
): PlayerCandidate[] {
  return pool
    .filter((p) =>
      onlyApplicants
        ? !excluded.has(p.id) && likesByUser.has(p.id)
        : !excluded.has(p.id) && p.availability_slots.length > 0
    )
    .map((p) => {
      const characters = (p.characters ?? []) as ShowcaseCharacter[];
      const likedGroup = likesByUser.has(p.id);
      const proposedId = likesByUser.get(p.id) ?? null;
      const matchInput = { ...toMatchPlayer(p), reliability: reliability.get(p.id) ?? null };
      return {
        player: {
          ...matchInput,
          id: p.id,
          alias: p.alias,
          role: p.role,
          gender: p.gender,
          birth_year: p.birth_year,
          characters,
          xpTotal: xpTotals.get(p.id) ?? 0,
        },
        likedGroup,
        proposal: characters.find((c) => c.id === proposedId) ?? null,
        result: matchPlayerToGroup(matchInput, group),
      };
    })
    .filter((c) => (onlyApplicants ? c.likedGroup : c.result.pass))
    // Los que ya han dado like a la mesa, primero; después por score
    .sort(
      (a, b) => Number(b.likedGroup) - Number(a.likedGroup) || b.result.score - a.result.score
    );
}

/** Columnas de mesa que necesita el algoritmo para puntuar candidatos. */
const GROUP_MATCH_COLUMNS = `id, timezone, language, system_id, session_weekday, session_slot,
   experience_wanted, style_combat_narrative, style_serious_humor, style_roleplay_weight, vtt`;

/**
 * Candidatos que pasan los filtros duros para esta mesa, ordenados por score.
 * Con `onlyApplicants` devuelve SOLO quienes han dado like a la mesa (la
 * cola de solicitudes de la pantalla Candidatos); el pool completo de
 * compatibles vive en el feed principal.
 */
export async function fetchGroupCandidates(
  groupId: string,
  viewerId: string,
  options: { onlyApplicants?: boolean } = {}
): Promise<PlayerCandidate[]> {
  const onlyApplicants = options.onlyApplicants ?? false;
  const [{ data: group, error: groupError }, exclusionsByGroup] = await Promise.all([
    supabase.from('groups').select(GROUP_MATCH_COLUMNS).eq('id', groupId).single(),
    fetchGroupExclusions([groupId], viewerId, onlyApplicants),
  ]);
  if (groupError) throw groupError;
  const exclusions = exclusionsByGroup.get(groupId) ?? {
    excluded: new Set<string>(),
    likesByUser: new Map<string, string | null>(),
  };

  const pool = await fetchCandidatePool(
    onlyApplicants ? [...exclusions.likesByUser.keys()] : undefined
  );
  const [reliability, xpTotals] = await fetchCandidateScores(pool.map((p) => p.id));
  return buildCandidates(
    pool,
    group as unknown as MatchGroup,
    exclusions,
    reliability,
    xpTotals,
    onlyApplicants
  );
}

// ============================================================
// Feed unificado (§3 del PRD): mesas si eres jugador, candidatos para tus
// mesas si eres GM, ambos mezclados si tienes rol "both".
// ============================================================

export type ForGroupRef = {
  id: string;
  name: string;
  image_url: string | null;
  session_weekday: number | null;
  session_slot: number | null;
  timezone: string;
};

export type FeedItem =
  | { kind: 'group'; group: GroupCandidate['group']; result: MatchResult }
  | { kind: 'player'; candidate: PlayerCandidate; forGroup: ForGroupRef };

export type UnifiedFeed = {
  items: FeedItem[];
  /** mi disponibilidad, para pintar el mini-grid en los detalles de mesas */
  myAvailability: { weekday: number; slot: number }[];
};

export async function fetchUnifiedFeed(userId: string): Promise<UnifiedFeed> {
  const meRow = await fetchMatchPlayer(userId);
  const role = meRow.role as 'player' | 'gm' | 'both';
  const items: FeedItem[] = [];

  if (role === 'player' || role === 'both') {
    const groups = await fetchPlayerFeed(userId);
    items.push(...groups.map((g) => ({ kind: 'group' as const, group: g.group, result: g.result })));
  }

  if (role === 'gm' || role === 'both') {
    // también las mesas llenas: sus candidatos («piden sitio») deben llegar al GM
    const { data: myGroups } = await supabase
      .from('groups')
      .select(`${GROUP_MATCH_COLUMNS}, name, image_url`)
      .eq('owner_id', userId)
      .eq('is_active', true);

    // El pool de candidatos y sus puntuaciones se piden UNA vez y se puntúan
    // contra cada mesa en memoria. Antes esto era fetchGroupCandidates dentro
    // de un bucle con await: un GM con 4 mesas bajaba el pool 4 veces, en
    // serie, antes de ver la primera tarjeta.
    const groupIds = (myGroups ?? []).map((g) => g.id);
    const [exclusionsByGroup, pool] = await Promise.all([
      fetchGroupExclusions(groupIds, userId, false),
      groupIds.length > 0 ? fetchCandidatePool() : Promise.resolve([]),
    ]);
    const [reliability, xpTotals] = await fetchCandidateScores(pool.map((p) => p.id));

    // Un candidato puede encajar en varias de mis mesas: nos quedamos con la
    // mejor combinación (like previo gana; si no, mayor score)
    const bestByUser = new Map<string, { candidate: PlayerCandidate; forGroup: ForGroupRef }>();
    for (const g of myGroups ?? []) {
      const exclusions = exclusionsByGroup.get(g.id);
      if (!exclusions) continue;
      const candidates = buildCandidates(
        pool,
        g as unknown as MatchGroup,
        exclusions,
        reliability,
        xpTotals,
        false
      );
      for (const c of candidates) {
        const previous = bestByUser.get(c.player.id);
        const better =
          !previous ||
          Number(c.likedGroup) - Number(previous.candidate.likedGroup) > 0 ||
          (c.likedGroup === previous.candidate.likedGroup &&
            c.result.score > previous.candidate.result.score);
        if (better) bestByUser.set(c.player.id, { candidate: c, forGroup: g });
      }
    }
    items.push(
      ...[...bestByUser.values()].map(({ candidate, forGroup }) => ({
        kind: 'player' as const,
        candidate,
        forGroup,
      }))
    );
  }

  // Likes recibidos primero; después destacadas (boost); llenas al final; después score
  const liked = (item: FeedItem) => (item.kind === 'player' && item.candidate.likedGroup ? 1 : 0);
  const boosted = (item: FeedItem) =>
    item.kind === 'group' &&
    item.group.boosted_until !== null &&
    new Date(item.group.boosted_until).getTime() > Date.now()
      ? 1
      : 0;
  const full = (item: FeedItem) => (item.kind === 'group' && item.group.full ? 1 : 0);
  const score = (item: FeedItem) =>
    item.kind === 'group' ? item.result.score : item.candidate.result.score;
  items.sort(
    (a, b) =>
      liked(b) - liked(a) || boosted(b) - boosted(a) || full(a) - full(b) || score(b) - score(a)
  );

  return { items, myAvailability: meRow.availability_slots };
}

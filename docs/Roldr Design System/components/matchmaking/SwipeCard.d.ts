import * as React from 'react';

/**
 * A table in the swipe deck — full-bleed art, bottom protection gradient, meta stack.
 * @startingPoint section="Matchmaking" subtitle="Swipe deck card for a TTRPG table" viewport="360x520"
 */
export interface SwipeCardProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  /** Game system line, e.g. "D&D 5e · 3d sesiones". */
  system: string;
  /** Game master name. */
  gm: string;
  gmPhoto?: string;
  /** Cover art URL. Falls back to the brand gradient at 55%. */
  imageUrl?: string;
  /** Attribute chips, 2–4 max. */
  tags?: string[];
  /** e.g. "a 3,2 km". */
  distance?: string;
  /** Open seats; renders a success badge. */
  seats?: number;
  /** Session running right now — carmine badge. */
  live?: boolean;
  /** Depth in the stack: 0 = top card. Scales 4% and drops 10px per step. */
  offset?: number;
  /** Drag feedback tint while swiping. */
  decision?: 'yes' | 'no' | null;
}

export function SwipeCard(props: SwipeCardProps): JSX.Element;

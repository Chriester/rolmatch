import * as React from 'react';

/** Uppercase micro status pill. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** "live" = solid carmine, games in progress only. Default "neutral". */
  tone?: 'live' | 'neutral' | 'success' | 'warning' | 'danger';
  /** Leading 6px dot. */
  dot?: boolean;
}

export function Badge(props: BadgeProps): JSX.Element;

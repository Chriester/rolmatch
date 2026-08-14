import * as React from 'react';

/** Circular player avatar with gradient initials fallback. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Used for the alt text and the initials fallback. */
  name?: string;
  /** Diameter in px. Default 44. */
  size?: number;
  /** 2px lilac ring — marks the GM of a table. */
  ring?: boolean;
  /** Carmine presence dot. */
  live?: boolean;
}

export function Avatar(props: AvatarProps): JSX.Element;

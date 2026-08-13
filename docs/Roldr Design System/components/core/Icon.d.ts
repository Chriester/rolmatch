import * as React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lucide icon name in kebab-case, e.g. "map-pin", "dices", "heart". */
  name: string;
  /** Square size in px. Default 20. */
  size?: number;
  /** Accessible label; omit for decorative icons. */
  title?: string;
}

/** Lucide glyph tinted with currentColor. Roldr has no bespoke icon set. */
export function Icon(props: IconProps): JSX.Element;

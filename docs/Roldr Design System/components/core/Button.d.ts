import * as React from 'react';

/**
 * Roldr button. Radius 12px, padding 12/18. Exactly one gradient primary per screen.
 * @startingPoint section="Core" subtitle="Primary, secondary, ghost and danger buttons" viewport="700x160"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = brand gradient (max one per view). Default "primary". */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Default "md" (min-height 44px tap target). */
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name rendered before the label. */
  icon?: string;
  /** Lucide icon name rendered after the label. */
  iconRight?: string;
  fullWidth?: boolean;
}

export function Button(props: ButtonProps): JSX.Element;

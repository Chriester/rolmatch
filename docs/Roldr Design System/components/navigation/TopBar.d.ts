import * as React from 'react';

/** Sticky screen header with glass blur. */
export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  /** Path to the d20 mark; shown on root screens when there is no back action. */
  logoSrc?: string;
  onBack?: () => void;
  /** Lucide icon name for the trailing action. */
  actionIcon?: string;
  action?: () => void;
}

export function TopBar(props: TopBarProps): JSX.Element;

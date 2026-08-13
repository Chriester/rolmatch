import * as React from 'react';

export interface BottomNavItem {
  /** Lucide icon name. */
  icon: string;
  label: string;
}

/** App tab bar — 64px tall, glass blur, lilac active state. */
export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  /** Index of the active tab. */
  active?: number;
  onChange?: (index: number) => void;
}

export function BottomNav(props: BottomNavProps): JSX.Element;

import * as React from 'react';

/** Attribute / filter chip: pill, alpha fill 12–28%, border 40–60% alpha. */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Chip text (or pass children). */
  label?: string;
  /** Raises fill to 28% and border to 60%. */
  selected?: boolean;
  /** "live" tints carmine (game in progress), "success" green (seats free). */
  tone?: 'default' | 'live' | 'success';
  /** Lucide icon name shown before the label. */
  icon?: string;
}

export function Chip(props: ChipProps): JSX.Element;

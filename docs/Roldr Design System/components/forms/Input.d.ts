import * as React from 'react';

/** Single-line text field. Radius 12px, 44px min height, lilac focus ring. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Helper text under the field. */
  hint?: string;
  /** Lucide icon name shown inside, leading. */
  icon?: string;
  /** Error message; replaces the hint and turns the border danger red. */
  error?: string;
}

export function Input(props: InputProps): JSX.Element;

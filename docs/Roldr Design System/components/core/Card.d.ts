import * as React from 'react';

/** Surface container — neutral.800 fill, neutral.600 hairline, radius 16px. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Uses neutral.700 + drop shadow instead of the flat surface. */
  raised?: boolean;
  /** CSS padding override. Default var(--card-padding) = 16px. */
  padding?: string;
  /** Adds the 20% carmine ambient radial behind the content. */
  ambient?: boolean;
}

export function Card(props: CardProps): JSX.Element;

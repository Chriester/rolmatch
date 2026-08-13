import * as React from 'react';

/** Celebration overlay shown when a GM accepts the player. */
export interface MatchBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Table name. */
  title: string;
  /** GM display name. */
  gm: string;
  onOpen?: () => void;
  onKeep?: () => void;
}

export function MatchBanner(props: MatchBannerProps): JSX.Element;

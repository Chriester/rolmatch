import * as React from 'react';

/** The three swipe-deck actions: pass (56px), save (48px), join (64px gradient). */
export interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  onNo?: () => void;
  onSuper?: () => void;
  onYes?: () => void;
}

export function SwipeActions(props: SwipeActionsProps): JSX.Element;

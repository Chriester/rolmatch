import * as React from 'react';

/** Bottom sheet over a 72% scrim. The only modal pattern in the app. */
export interface SheetProps extends React.HTMLAttributes<HTMLElement> {
  open?: boolean;
  title?: string;
  onClose?: () => void;
}

export function Sheet(props: SheetProps): JSX.Element | null;

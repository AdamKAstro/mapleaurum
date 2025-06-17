//src/components/ui/portal.tsx

import { Portal as RadixPortal } from '@radix-ui/react-portal';
import { ReactNode } from 'react';

interface PortalProps {
  children: ReactNode;
  container?: Element;
}

export const Portal = ({ children, container }: PortalProps) => {
  const defaultContainer = document.getElementById('portal-root');
  if (!defaultContainer) {
    console.warn('[Portal] #portal-root not found in DOM. Falling back to document.body.');
  }
  return (
    <RadixPortal container={container || defaultContainer || document.body}>
      {children}
    </RadixPortal>
  );
};
import React from 'react';
import { Shell } from './components/layout/Shell';

export const App: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <Shell>{children}</Shell>;
};

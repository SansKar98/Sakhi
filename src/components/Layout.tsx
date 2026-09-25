import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-space-navy-800 pb-20">
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}

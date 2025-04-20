import { useState, useRef, useEffect } from 'react';
import { SideMenu } from '../editor/side-menu';
import { Navbar } from './navbar';

interface MainLayoutProps {
  children: React.ReactNode;
  onAuthClick: () => void;
}

export function MainLayout({ children, onAuthClick }: MainLayoutProps) {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const sideMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSideMenuOpen && 
          sideMenuRef.current && 
          !sideMenuRef.current.contains(event.target as Node)) {
        setIsSideMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSideMenuOpen]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar onMenuToggle={() => setIsSideMenuOpen(!isSideMenuOpen)} onAuthClick={onAuthClick} />
      
      <div className="flex flex-1 overflow-hidden">
        <div ref={sideMenuRef}>
          <SideMenu 
            isOpen={isSideMenuOpen} 
            onClose={() => setIsSideMenuOpen(false)} 
            onAuthClick={onAuthClick}
          />
        </div>
        
        <div
  className={`fixed left-0 top-0 bottom-0 w-2 z-40 transition-opacity duration-200 ${
    isSideMenuOpen ? "opacity-100" : "opacity-0"
  }`}
  onMouseEnter={() => setIsSideMenuOpen(true)}
  onMouseLeave={() => setIsSideMenuOpen(false)}
/>
        
        <main className="flex-1 pt-14 overflow-auto">
          <div className="container mx-auto p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
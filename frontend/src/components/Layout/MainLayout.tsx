import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChat from '@/components/AI/AIChat';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground relative selection:bg-indigo-500/30">
      
      {/* Global Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/50" />
      </div>

      {/* Sidebar - Higher Z-index to sit above content */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative min-w-0 z-10">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <Header />
          <div className="container mx-auto p-6 max-w-[1400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Outlet />
          </div>
          
          {/* Footer spacer */}
          <div className="h-20" />
        </main>
        
        {/* Floating AI Chat Overlay */}
        <AIChat />
      </div>
    </div>
  );
}

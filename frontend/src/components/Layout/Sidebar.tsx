import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Monitor,
  Package,
  Users,
  FileText,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  ShieldCheck,
  Database,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export default function Sidebar() {
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { user, hasPermission } = useAuthStore();

  const navigation = useMemo(() => {
    const nav = [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ];

    if (hasPermission('asset:view_all')) {
      nav.push({ name: 'Assets', href: '/assets', icon: Monitor });
    }
    
    if (hasPermission('asset:create')) {
      nav.push({ name: 'Import', href: '/imports', icon: Database });
    }

    if (hasPermission('set:read')) {
      nav.push({ name: 'Asset Sets', href: '/inventory', icon: Package });
    }

    if (hasPermission('user:read')) {
      nav.push({ name: 'People', href: '/people', icon: Users });
    }

    if (hasPermission('request:read') || hasPermission('request:create')) {
      const name = hasPermission('request:view_all') ? 'Requests' : 'My Requests';
      nav.push({ name, href: '/requests', icon: ClipboardList });
    }

    if (hasPermission('audit:read')) {
      nav.push({ name: 'Reports', href: '/reports', icon: FileText });
    }

    if (hasPermission('config:read')) {
      nav.push({ name: 'Settings', href: '/settings', icon: Settings });
    }

    if (user?.roles?.includes('admin') || hasPermission('role:manage')) {
      nav.push({ name: 'Admin', href: '/admin', icon: ShieldCheck });
    }

    // Docs is always available to authenticated users
    nav.push({ name: 'Docs', href: '/docs', icon: BookOpen });

    return nav;
  }, [user, hasPermission]);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen transition-all duration-200 ease-out z-30",
        "bg-[hsl(var(--sidebar-bg))] border-r border-white/[0.06]",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
          <div className="h-8 w-8 rounded-md bg-[hsl(var(--sidebar-accent))] flex items-center justify-center flex-shrink-0">
            <Hexagon className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className={cn(
            "font-semibold text-sm text-white/90 transition-all duration-200",
            isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
          )}>
            assets-ai
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 my-0.5 rounded-md text-sm transition-colors duration-150",
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))]/10 text-[hsl(var(--sidebar-accent))]"
                  : "text-[hsl(var(--sidebar-fg))] hover:text-white/80 hover:bg-white/[0.04]",
                isCollapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              <span className={cn(
                "transition-all duration-200",
                isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full flex items-center justify-center gap-2 text-[hsl(var(--sidebar-fg))] hover:text-white/80 hover:bg-white/[0.04] h-8 rounded-md",
            isCollapsed && "px-0"
          )}
          onClick={toggleSidebar}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  User as UserIcon,
  LogOut, 
  Sun, 
  Moon,
  Settings,
  Laptop,
  FileText,
  Sparkles
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { searchGlobal } from '@/api/search';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: () => searchGlobal(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60, // 1 min
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.addEventListener('scroll', () => setIsScrolled(mainContent.scrollTop > 10));

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
          setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainContent) mainContent.removeEventListener('scroll', () => setIsScrolled(mainContent.scrollTop > 10));
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasResults = searchResults && (
      (searchResults.assets?.length > 0) || 
      (searchResults.users?.length > 0) || 
      (searchResults.logs?.length > 0)
  );

  return (
    <header className={cn(
      "sticky top-0 z-40 transition-all duration-300 ease-in-out px-6 pt-4 pb-2",
    )}>
      <div className={cn(
        "mx-auto w-full max-w-[1400px] h-16 rounded-2xl flex items-center justify-between px-4 transition-all duration-300",
        isScrolled 
          ? "bg-background/80 backdrop-blur-xl shadow-sm border border-border/40 supports-[backdrop-filter]:bg-background/60" 
          : "bg-transparent"
      )}>
        {/* Left: Search */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
           <div 
            ref={searchContainerRef}
            className="relative group w-full max-w-md transition-all duration-300 focus-within:max-w-lg"
           >
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
               <Search className="h-4 w-4" />
             </div>
             <input 
               type="text" 
               placeholder="Search assets, users, logs..."
               className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/40 border border-transparent focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all outline-none text-sm placeholder:text-muted-foreground/70"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onFocus={() => setIsSearchFocused(true)}
             />

             {/* Search Dropdown */}
             {isSearchFocused && debouncedQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-lg max-h-[400px] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                    {isSearching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                    ) : !hasResults ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
                    ) : (
                        <div className="py-2">
                            {/* Assets */}
                            {searchResults?.assets && searchResults.assets.length > 0 && (
                                <div className="px-2 mb-2">
                                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Assets</div>
                                    {searchResults.assets.map((asset: any) => (
                                        <div 
                                            key={asset.id} 
                                            className="px-2 py-1.5 hover:bg-muted rounded-lg cursor-pointer flex items-center gap-2 group"
                                            onClick={() => {
                                                navigate(`/assets/${asset.id}`);
                                                setIsSearchFocused(false);
                                            }}
                                        >
                                            <Laptop className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{asset.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{asset.serial_number} • {asset.status?.name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Users */}
                            {searchResults?.users && searchResults.users.length > 0 && (
                                <div className="px-2 mb-2">
                                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Users</div>
                                    {searchResults.users.map((user: any) => (
                                        <div 
                                            key={user.id} 
                                            className="px-2 py-1.5 hover:bg-muted rounded-lg cursor-pointer flex items-center gap-2 group"
                                            onClick={() => {
                                                navigate(`/people/${user.id}`);
                                                setIsSearchFocused(false);
                                            }}
                                        >
                                            <UserIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{user.full_name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                             {/* Logs */}
                             {searchResults?.logs && searchResults.logs.length > 0 && (
                                <div className="px-2 mb-2">
                                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Audit Logs</div>
                                    {searchResults.logs.map((log: any) => (
                                        <div 
                                            key={log.id} 
                                            className="px-2 py-1.5 hover:bg-muted rounded-lg cursor-pointer flex items-center gap-2 group"
                                            onClick={() => {
                                                if (log.entity_type === 'user') {
                                                    navigate(`/people/${log.entity_id}?log_id=${log.id}`);
                                                } else if (log.entity_type === 'asset') {
                                                    navigate(`/assets/${log.entity_id}?log_id=${log.id}`);
                                                }
                                                setIsSearchFocused(false);
                                            }}
                                        >
                                            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate capitalize flex items-center gap-2">
                                                    {log.action.replace('_', ' ')} <span className="text-muted-foreground">on {log.entity_type}</span>
                                                    {log.origin === 'ai' && (
                                                        <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-0 flex-shrink-0">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            AI
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">{new Date(log.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
             )}
           </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
           {/* Theme Toggle */}
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
             className="rounded-full hover:bg-muted/60 text-muted-foreground"
           >
             <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
             <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
           </Button>

           {/* User Menu */}
           <div className="relative ml-2" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-muted/40 transition-all group outline-none"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-foreground leading-none">{user?.full_name || 'User'}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{user?.roles?.join(', ') || 'User'}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg group-hover:shadow-indigo-500/20 transition-all">
                   <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                     {/* Placeholder Avatar */}
                     <span className="font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600">
                       {user?.full_name?.charAt(0) || 'A'}
                     </span>
                   </div>
                </div>
              </button>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl bg-popover/95 backdrop-blur-md ring-1 ring-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-200 border border-border/50 z-50 origin-top-right overflow-hidden">
                   <div className="p-4 bg-muted/30 border-b border-border/50">
                      <p className="font-medium text-foreground">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                   </div>
                   
                   <div className="p-2 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                        <UserIcon className="h-4 w-4" /> Profile
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                        <Settings className="h-4 w-4" /> Settings
                      </button>
                   </div>
                   
                   <div className="p-2 border-t border-border/50">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </header>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CalendarClock, 
  Settings, 
  LogOut,
  Users,
  Shield,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{name?: string, role?: string, username?: string} | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sentinela_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fechar menu ao mudar rota
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Relatórios', icon: FileText, path: '/reports' },
    { name: 'Agendamento', icon: CalendarClock, path: '/schedule' },
    { name: 'Configurações', icon: Settings, path: '/settings' },
    ...(user?.role === 'admin' ? [{ name: 'Equipe', icon: Users, path: '/users' }] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('sentinela_auth');
    localStorage.removeItem('sentinela_user');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-4 left-4 z-[100] md:hidden bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-white transition-all"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen bg-[#030712] border-r border-white/[0.03] flex flex-col 
        transition-all duration-300 z-50
        ${isMobile 
          ? `w-64 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : 'w-56 translate-x-0'
        }
      `}>
        <div className="p-6 pt-12 overflow-y-auto flex-1 flex flex-col">
          
          {/* LOGO OFICIAL */}
          <div className="flex flex-col items-center mb-16 p-2 group transition-all duration-500">
             <div className="relative w-40 h-40">
                 <img 
                   src="/logo.png?v=official-nav-clean" 
                   alt="Sentinela Master Logo" 
                   className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                   style={{ mixBlendMode: 'lighten' }}
                   onError={(e) => {
                     (e.target as any).src = '/logo.png?v=' + Date.now();
                   }}
                 />
             </div>
          </div>

          <nav className="space-y-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <a 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group ${
                    isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/10' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} className={`shrink-0 ${isActive ? 'text-blue-400 font-black' : 'group-hover:text-cyan-400'} transition-colors`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] hidden sm:inline">{item.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] sm:hidden">{item.name.substring(0, 4)}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="p-6 pb-10 border-t border-white/[0.03]">
          {/* User Profile */}
          {user && (
            <div className="mb-4 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  {user.role === 'admin' ? <Shield size={14} className="text-blue-400" /> : <Users size={14} className="text-emerald-400" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-white truncate">{user.name || user.username}</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{user.role === 'admin' ? 'Admin' : 'SDR'}</span>
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3 w-full text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all duration-300 group border border-transparent hover:border-red-500/10"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] hidden sm:inline">Sair</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] sm:hidden">Exit</span>
           </button>
        </div>
      </aside>
    </>
  );
}

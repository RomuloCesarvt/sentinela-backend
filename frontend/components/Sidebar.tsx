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
  Sun,
  Moon,
} from 'lucide-react';

// Hook de tema — persiste em localStorage e aplica classe no <html>
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('sentinela_theme') as 'dark' | 'light' | null;
    const resolved = saved ?? 'dark';
    setTheme(resolved);
    document.documentElement.classList.toggle('light', resolved === 'light');
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sentinela_theme', next);
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  };

  return { theme, toggle };
}

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{name?: string, role?: string, username?: string} | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme, toggle } = useTheme();

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

  const isLight = theme === 'light';

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
      <aside
        className={`
          fixed top-0 left-0 h-screen flex flex-col 
          transition-all duration-300 z-50
          ${isMobile 
            ? `w-64 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}` 
            : 'w-56 translate-x-0'
          }
        `}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        <div className="p-6 pt-12 overflow-y-auto flex-1 flex flex-col">
          
          {/* LOGO — transformada em badge premium (círculo perfeito) para cortar o fundo quadrado */}
          <div className="flex flex-col items-center mb-12 group">
            <div className="relative flex items-center justify-center">
              {/* Glow externo */}
              <div
                className="absolute inset-0 rounded-full blur-xl transition-all duration-500"
                style={{
                  background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 80%)',
                  transform: 'scale(1.4)',
                }}
              />
              
              {/* Container circular (corta as bordas quadradas da imagem) */}
              <div 
                className="relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-all duration-700 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                style={{ 
                  backgroundColor: '#030712', // A imagem tem fundo preto, então o fundo do container deve ser preto
                  border: '1px solid rgba(59,130,246,0.3)' 
                }}
              >
                <img
                  src="/logo.png"
                  alt="Sentinela IA"
                  className="w-full h-full object-cover scale-[1.2]" /* Scale para preencher o círculo e esconder as bordas internas se houver */
                  onError={(e) => {
                    (e.target as any).src = '/logo.png?v=' + Date.now();
                  }}
                />
              </div>
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
                    : isLight
                      ? 'text-slate-400 hover:bg-black/5 hover:text-slate-700'
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

        <div
          className="p-6 pb-10"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          {/* Theme Toggle — botão premium */}
          <button
            onClick={toggle}
            title={isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl mb-4 transition-all duration-300 group border"
            style={{
              background: isLight
                ? 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              borderColor: isLight ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
            }}
          >
            {/* Track */}
            <div
              className="relative w-9 h-5 rounded-full transition-all duration-500 shrink-0"
              style={{
                background: isLight
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'rgba(255,255,255,0.12)',
                boxShadow: isLight ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
              }}
            >
              {/* Thumb */}
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-500 flex items-center justify-center"
                style={{
                  left: isLight ? 'calc(100% - 18px)' : '2px',
                  background: isLight
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.7)',
                  boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {isLight
                  ? <Sun size={8} className="text-blue-500" />
                  : <Moon size={8} className="text-slate-400" />
                }
              </div>
            </div>

            <div className="flex flex-col items-start min-w-0">
              <span
                className="text-[9px] font-black uppercase tracking-widest leading-none"
                style={{ color: isLight ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}
              >
                {isLight ? 'Modo Claro' : 'Modo Escuro'}
              </span>
              <span
                className="text-[7px] font-bold mt-0.5 leading-none"
                style={{ color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.2)' }}
              >
                {isLight ? 'clique para escurecer' : 'clique para clarear'}
              </span>
            </div>
          </button>

          {/* User Profile */}
          {user && (
            <div
              className="mb-4 px-4 py-3 rounded-2xl"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  {user.role === 'admin' ? <Shield size={14} className="text-blue-400" /> : <Users size={14} className="text-emerald-400" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black truncate" style={{ color: 'var(--foreground)' }}>{user.name || user.username}</span>
                  <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: 'var(--foreground-3)' }}>{user.role === 'admin' ? 'Admin' : 'SDR'}</span>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3 w-full hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all duration-300 group border border-transparent hover:border-red-500/10"
            style={{ color: 'var(--foreground-3)' }}
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

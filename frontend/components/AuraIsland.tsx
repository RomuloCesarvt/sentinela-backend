'use client';
import { useState, useEffect } from 'react';

export default function AuraIsland({ status, message }: { status: 'healthy' | 'scanning' | 'reading' | 'critico' | 'saudavel' | 'atencao' | 'success' | 'error', message: string }) {

  const colors: Record<string, string> = {
    healthy: 'rgba(16, 185, 129, 0.9)', // green
    scanning: 'rgba(59, 130, 246, 0.9)', // blue
    reading: 'rgba(167, 139, 250, 0.9)', // purple
    critico: 'rgba(239, 68, 68, 0.9)', // red
    saudavel: 'rgba(16, 185, 129, 0.9)', // green
    atencao: 'rgba(234, 179, 8, 0.9)', // yellow
    success: 'rgba(16, 185, 129, 0.9)', // green
    error: 'rgba(239, 68, 68, 0.9)' // red
  };

  const labels: Record<string, string> = {
    healthy: 'SISTEMA ONLINE',
    scanning: 'REALIZANDO ANÁLISE',
    reading: 'LENDO DIÁLOGO',
    critico: 'RISCO DETECTADO',
    saudavel: 'SAUDÁVEL',
    atencao: 'ATENÇÃO PLENA',
    success: 'OPERAÇÃO CONCLUÍDA',
    error: 'ERRO DETECTADO'
  };

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Apenas aparece ao carregar a aplicação, desaparece após 4 segundos.
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const currentColor = colors[status] || colors.healthy;
  const currentLabel = labels[status] || 'SISTEMA ONLINE';

  if (!visible) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] w-max max-w-[95vw] shadow-2xl animate-in slide-in-from-bottom-10 fade-in zoom-in-95`}>
      <div 
        className="bg-[#0c0c0e] backdrop-blur-xl flex items-center justify-center gap-3 px-4 py-2 sm:py-2.5 rounded-2xl overflow-hidden border border-white/10"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColor, boxShadow: `0 0 10px ${currentColor}` }}></div>

        <div className="truncate text-ellipsis font-bold text-white text-[10px] sm:text-[11px] uppercase tracking-wider">
          {message || 'SENTINELA IA ONLINE'}
        </div>

        <div className="px-2 py-0.5 rounded-md text-[8px] uppercase tracking-widest font-black text-black whitespace-nowrap" style={{ backgroundColor: currentColor }}>
          {currentLabel}
        </div>
      </div>
    </div>
  );
}

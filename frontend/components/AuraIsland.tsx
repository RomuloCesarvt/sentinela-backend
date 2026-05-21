'use client';

export default function AuraIsland({ status, message }: { status: 'scanning' | 'reading' | 'critico' | 'saudavel' | 'atencao' | 'success', message: string }) {

  const colors = {
    scanning: 'rgba(59, 130, 246, 0.9)', // blue
    reading: 'rgba(167, 139, 250, 0.9)', // purple
    critico: 'rgba(239, 68, 68, 0.9)', // red
    saudavel: 'rgba(16, 185, 129, 0.9)', // green
    atencao: 'rgba(234, 179, 8, 0.9)', // yellow
    success: 'rgba(16, 185, 129, 0.9)' // green
  };

  const labels = {
    scanning: 'REALIZANDO ANÁLISE',
    reading: 'LENDO DIÁLOGO',
    critico: 'RISCO DETECTADO',
    saudavel: 'SAUDÁVEL',
    atencao: 'ATENÇÃO PLENA',
    success: 'OPERAÇÃO CONCLUÍDA'
  };

  const currentColor = colors[status] || colors.scanning;
  const currentLabel = labels[status] || 'SISTEMA ONLINE';

  return (
    <div className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] px-2 sm:px-0 w-max max-w-[95vw]`}>
      <div 
        className="bg-black/95 backdrop-blur-xl flex items-center justify-center gap-3 px-4 py-1.5 sm:py-2 rounded-full overflow-hidden border border-white/10"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColor, boxShadow: `0 0 10px ${currentColor}` }}></div>

        <div className="truncate text-ellipsis font-bold text-white text-[9px] sm:text-[11px] uppercase tracking-wider">
          {message || 'SENTINELA IA ONLINE'}
        </div>

        <div className="px-2 py-0.5 rounded-full text-[8px] uppercase tracking-widest font-black text-black whitespace-nowrap" style={{ backgroundColor: currentColor }}>
          {currentLabel}
        </div>
      </div>
    </div>
  );
}

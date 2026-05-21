'use client';
import { useEffect, useState } from 'react';

export default function CinematicIntro() {
  const [show, setShow] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if we already played the intro in this session
    if (sessionStorage.getItem('sentinela_intro_played') === 'true') {
        setShow(false);
        return;
    }
    sessionStorage.setItem('sentinela_intro_played', 'true');

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playForgeSound = (time: number, freq: number, type: 'square' | 'sawtooth') => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioContext.currentTime + time + 0.3);
        gain.gain.setValueAtTime(0.4, audioContext.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.5);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(audioContext.currentTime + time);
        osc.stop(audioContext.currentTime + time + 0.5);
    };

    const runSequence = async () => {
        try {
            audioContext.resume();
            setTimeout(() => { playForgeSound(0, 150, 'square'); setStage(1); }, 300);
            setTimeout(() => { playForgeSound(0, 180, 'square'); setStage(2); }, 1000);
            setTimeout(() => { playForgeSound(0, 220, 'sawtooth'); setStage(3); }, 1800);
            setTimeout(() => setStage(4), 3800);
            setTimeout(() => setShow(false), 4500);
        } catch (e) { setShow(false); }
    };
    runSequence();
    return () => { audioContext.close(); };
  }, []);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[99999] bg-[#030712] flex items-center justify-center transition-all duration-1000 ${stage === 4 ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03),transparent_80%)] opacity-40 animate-pulse" />

      <div className="relative text-center flex flex-col items-center max-w-lg">
        
        {/* TEXT-ONLY REVELATION AS REQUESTED (RESTORED BEAUTIFUL TYPOGRAPHY) */}
        <div className={`transition-all duration-1000 flex flex-col items-center ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <h1 
             className="text-4xl sm:text-5xl md:text-8xl font-black font-orbitron uppercase tracking-[0.2em] mb-2 sm:mb-4"
             style={{
               color: stage >= 3 ? '#f1f5f9' : 'transparent',
               WebkitTextStroke: stage >= 2 ? '1px rgba(255,255,255,0.2)' : '0px transparent',
               textShadow: stage >= 3 ? '0 0 50px rgba(34,211,238,0.3)' : 'none',
             }}
           >
             SENTINELA
           </h1>
           
           <div className={`flex items-center gap-4 sm:gap-10 transition-all duration-1000 ${stage >= 3 ? 'opacity-100 flex' : 'opacity-0 hidden'}`}>
              <div className="h-[2px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-cyan-500"></div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-orbitron uppercase tracking-[0.4em] sm:tracking-[0.6em] text-cyan-400"
                  style={{ textShadow: '0 0 20px #06b6d4' }}>
                  IA
              </h2>
              <div className="h-[2px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-cyan-500"></div>
           </div>
        </div>

        <div className={`mt-8 sm:mt-16 h-[3px] w-64 sm:w-96 bg-white/5 rounded-full overflow-hidden transition-opacity duration-1000 ${stage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 transition-all duration-1500 ease-out ${stage >= 3 ? 'w-full' : 'w-0'}`} 
                 style={{ boxShadow: '0 0 15px #06b6d4' }} />
        </div>
      </div>
    </div>
  );
}

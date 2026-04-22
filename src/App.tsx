import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trophy, Gamepad2, Music } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'Neon Nights (AI Gen 1)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Cyber Drift (AI Gen 2)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Digital Dream (AI Gen 3)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 50;

type Point = { x: number; y: number };

const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export default function App() {
  // --- Audio Player State ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Snake Game State ---
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [nextDirection, setNextDirection] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const gameBoardRef = useRef<HTMLDivElement>(null);

  // --- Audio Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play blocked", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  }, []);

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const { currentTime, duration } = audioRef.current;
      setProgress((currentTime / duration) * 100 || 0);
    }
  };

  const onAudioEnded = () => {
    nextTrack();
  };

  // --- Snake Game Logic ---
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: -1 });
    setNextDirection({ x: 0, y: -1 });
    setFood(generateFood([{ x: 10, y: 10 }]));
    setIsGameOver(false);
    setIsGamePaused(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    if (gameBoardRef.current) {
      gameBoardRef.current.focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only prevent default if it's a game key to allow normal tabbing
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'r', 'p', ' '].includes(e.key)) {
        if (e.target === document.body || gameBoardRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        resetGame();
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        setIsGamePaused(prev => !prev);
        return;
      }

      setNextDirection(prev => {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            return prev.y !== 1 ? { x: 0, y: -1 } : prev;
          case 'ArrowDown':
          case 's':
          case 'S':
            return prev.y !== -1 ? { x: 0, y: 1 } : prev;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            return prev.x !== 1 ? { x: -1, y: 0 } : prev;
          case 'ArrowRight':
          case 'd':
          case 'D':
            return prev.x !== -1 ? { x: 1, y: 0 } : prev;
          default:
            return prev;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isGameOver || isGamePaused) return;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        setDirection(nextDirection);
        const newHead = { x: head.x + nextDirection.x, y: head.y + nextDirection.y };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setIsGameOver(true);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
          setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(gameLoop);
  }, [nextDirection, food, isGameOver, isGamePaused, speed, highScore]);

  return (
    <div className="h-screen w-full bg-[#050510] text-cyan-400 font-mono flex flex-col overflow-hidden relative selection:bg-fuchsia-500 selection:text-white">
      {/* Glitch CRT Effects overlays */}
      <div className="static-noise"></div>
      <div className="crt-line"></div>
      
      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].url}
        onTimeUpdate={onTimeUpdate}
        onEnded={onAudioEnded}
      />

      {/* Header Section */}
      <header className="h-16 border-b-2 border-fuchsia-600/50 flex items-center justify-between px-4 lg:px-8 bg-black/80 flex-shrink-0 z-40 shadow-[0_4px_20px_rgba(255,0,255,0.2)]">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 bg-fuchsia-500 rounded-none animate-pulse shadow-[0_0_12px_#f0f]"></div>
          <h1 
            className="text-xl font-display tracking-widest text-cyan-400 hidden sm:block glitch-text drop-shadow-[2px_2px_0px_#f0f]"
            data-text="NEURO_SNAKE.exe"
          >
            NEURO_SNAKE.exe
          </h1>
        </div>
        <div className="flex gap-4 lg:gap-8 text-xs lg:text-sm uppercase tracking-widest text-cyan-500/50">
          <div className="flex flex-col items-end">
            <span className="text-fuchsia-500/80">SYS_STATE</span>
            <span className="text-cyan-400 font-bold">{isPlaying ? "MUX_ACTIVE" : "IDLE"}</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-fuchsia-500/80">MODULE</span>
            <span className="text-cyan-400 font-bold">{isGameOver ? "FATAL_ERR" : isGamePaused ? "SUSPENDED" : "RUNNING"}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-fuchsia-500/80">LINK</span>
            <span className="text-cyan-400 font-bold animate-pulse">ESTABLISHED</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6 flex-col md:flex-row z-40 relative">
        {/* Music Sideboard */}
        <aside className="w-full md:w-72 flex flex-col gap-4 flex-shrink-0 overflow-y-auto hidden-scrollbar">
          <div className="bg-black/40 border-2 border-cyan-500/50 p-4 flex flex-col gap-4 shadow-[inset_0_0_15px_rgba(0,255,255,0.1)] relative">
            {/* Decal */}
            <div className="absolute top-0 right-0 w-4 h-4 border-l-2 border-b-2 border-fuchsia-500 bg-fuchsia-500/20"></div>

            <h2 className="text-sm font-bold text-fuchsia-500 uppercase tracking-widest glitch-text" data-text="AUDIO_NODES">AUDIO_NODES</h2>
            <div className="flex flex-col gap-3 mt-2">
              {TRACKS.map((t, idx) => (
                <div 
                  key={t.id}
                  onClick={() => { setCurrentTrackIndex(idx); setIsPlaying(true); }}
                  className={`flex items-center gap-3 p-2 cursor-pointer transition-all border-l-4 ${
                    idx === currentTrackIndex ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-black/50 border-fuchsia-500/30 hover:bg-fuchsia-500/10'
                  }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center font-display text-xs flex-shrink-0 ${
                    idx === currentTrackIndex ? 'bg-cyan-400 text-black' : 'bg-fuchsia-900/50 text-fuchsia-400'
                  }`}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className={`text-base truncate ${idx === currentTrackIndex ? 'text-cyan-300 font-bold' : 'text-cyan-600'}`}>
                      {t.title}
                    </span>
                    <span className={`text-[11px] truncate ${idx === currentTrackIndex ? 'text-fuchsia-400' : 'text-fuchsia-600/50'}`}>
                      DATA_STREAM // {idx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 bg-black/40 border-2 border-fuchsia-500/50 p-4 hidden md:flex flex-col justify-between overflow-hidden shadow-[inset_0_0_15px_rgba(255,0,255,0.1)] relative">
            <div className="absolute bottom-0 left-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500 bg-cyan-500/20"></div>
            
            <div>
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-6">FREQ_ANALYZER</h2>
              <div className="flex items-end gap-2 h-32 px-2 border-b-2 border-fuchsia-500/30 pb-1">
                <div className={`flex-1 bg-cyan-400 ${isPlaying ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''} h-[60%] shadow-[0_0_10px_#0ff]`}></div>
                <div className={`flex-1 bg-fuchsia-500 ${isPlaying ? 'animate-[pulse_1s_ease-in-out_infinite_0.2s]' : ''} h-[80%] shadow-[0_0_10px_#f0f]`}></div>
                <div className={`flex-1 bg-cyan-400 ${isPlaying ? 'animate-[pulse_0.8s_ease-in-out_infinite_0.4s]' : ''} h-[40%] shadow-[0_0_10px_#0ff]`}></div>
                <div className={`flex-1 bg-fuchsia-500 ${isPlaying ? 'animate-[pulse_1.2s_ease-in-out_infinite_0.1s]' : ''} h-[90%] shadow-[0_0_10px_#f0f]`}></div>
                <div className={`flex-1 bg-cyan-400 ${isPlaying ? 'animate-[pulse_0.9s_ease-in-out_infinite_0.5s]' : ''} h-[50%] shadow-[0_0_10px_#0ff]`}></div>
                <div className={`flex-1 bg-fuchsia-500 ${isPlaying ? 'animate-[pulse_1.1s_ease-in-out_infinite_0.3s]' : ''} h-[70%] shadow-[0_0_10px_#f0f]`}></div>
                <div className={`flex-1 bg-cyan-400 ${isPlaying ? 'animate-[pulse_1s_ease-in-out_infinite_0.6s]' : ''} h-[30%] shadow-[0_0_10px_#0ff]`}></div>
              </div>
            </div>
            <div className="bg-[#050510] relative mt-4 border border-cyan-500/30 p-2 overflow-hidden">
               <div className="absolute inset-0 bg-fuchsia-500/5 mix-blend-screen"></div>
               <p className="text-xs leading-relaxed text-cyan-300">
                 {"<WARN> ORGANISM SYNCING TO FREQUENCIES. FEED THE CYCLE."}
               </p>
            </div>
          </div>
        </aside>

        {/* Main Game Window */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden min-h-[400px]">
          <div 
            ref={gameBoardRef}
            tabIndex={0}
            className="bg-[#000] border-4 border-fuchsia-600 rounded-none flex-1 relative overflow-hidden shadow-[0_0_30px_rgba(255,0,255,0.3)] outline-none min-h-[300px]"
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 z-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {/* Game Score Overlay */}
            <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 flex gap-6 lg:gap-12 pointer-events-none bg-black/80 p-3 border border-cyan-500/30">
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm uppercase tracking-widest text-fuchsia-500 font-bold mb-1">INTEGRITY</span>
                <span className="text-2xl lg:text-3xl font-display text-cyan-400 drop-shadow-[2px_2px_0px_#f0f]">{score.toString().padStart(5, '0')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm uppercase tracking-widest text-fuchsia-500 font-bold mb-1">MAX_SYNC</span>
                <span className="text-2xl lg:text-3xl font-display text-cyan-900 drop-shadow-[1px_1px_0px_#0ff]">{highScore.toString().padStart(5, '0')}</span>
              </div>
            </div>

            {/* The Snake Board */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pt-24 pb-12 lg:p-12 z-10">
              <div 
                className="w-full max-w-[500px] aspect-square relative border-2 border-cyan-500/20 bg-black/60 shadow-[inset_0_0_40px_rgba(0,255,255,0.1)]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                }}
              >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                  const x = i % GRID_SIZE;
                  const y = Math.floor(i / GRID_SIZE);
                  const isSnakeIndex = snake.findIndex(s => s.x === x && s.y === y);
                  const isSnake = isSnakeIndex !== -1;
                  const isHead = isSnakeIndex === 0;
                  const isFoodItem = food.x === x && food.y === y;

                  return (
                    <div
                      key={i}
                      className={`w-full h-full relative z-10 border border-transparent ${
                        isHead
                          ? 'bg-cyan-300 shadow-[0_0_15px_#0ff] z-20'
                          : isSnake
                          ? (isSnakeIndex % 2 === 0 ? 'bg-cyan-500/80 border-cyan-400 border-[0.5px]' : 'bg-fuchsia-500/80 border-fuchsia-400 border-[0.5px]')
                          : isFoodItem
                          ? 'bg-white shadow-[0_0_20px_#fff,0_0_40px_#f0f] animate-pulse rounded-none z-20'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Overlays */}
            {isGameOver && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwZmYiPjwvcmVjdD4KPC9zdmc+')] opacity-20"></div>
                <h2 className="text-3xl lg:text-4xl font-display text-white drop-shadow-[4px_4px_0_#f0f,-4px_-4px_0_#0ff] mb-4 text-center glitch-text" data-text="FATAL_ERROR">FATAL_ERROR</h2>
                <div className="bg-fuchsia-900/50 border border-fuchsia-500 p-4 mb-8">
                   <p className="text-fuchsia-300 font-mono text-sm lg:text-base tracking-widest break-all">ERR_CODE: ENTITY_COLLISION // CYCLES: {score}</p>
                </div>
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 bg-transparent text-cyan-400 font-bold border-2 border-cyan-400 hover:bg-cyan-400 hover:text-black transition-all font-display uppercase tracking-widest text-[10px] lg:text-xs shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                >
                  [ REBOOT_SYS ]
                </button>
              </div>
            )}
            
            {!isGameOver && isGamePaused && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80">
                <h2 className="text-2xl lg:text-3xl font-display text-yellow-400 drop-shadow-[3px_3px_0_#f0f] mb-8 text-center glitch-text" data-text="THREAD_SUSPENDED">THREAD_SUSPENDED</h2>
                <button 
                  onClick={() => setIsGamePaused(false)}
                  className="px-8 py-4 bg-transparent text-yellow-400 font-bold border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black transition-all font-display uppercase tracking-widest text-[10px] lg:text-xs shadow-[0_0_15px_rgba(255,255,0,0.4)]"
                >
                  [ RESUME_EXEC ]
                </button>
              </div>
            )}

            {/* Game UI Labels */}
            <div className="absolute bottom-4 right-4 lg:right-6 text-xs lg:text-sm font-mono text-fuchsia-500/80 uppercase tracking-widest pointer-events-none bg-black/60 px-2">
              <span className="text-cyan-500">[P]</span> SUSPEND / <span className="text-cyan-500">WSAD</span> OVERRIDE
            </div>
          </div>

          {/* Control Bar */}
          <div className="h-24 lg:h-28 bg-black/80 border-t-4 border-b-4 border-cyan-800 px-4 lg:px-8 mt-2 flex items-center justify-between flex-shrink-0 relative">
            {/* Accents */}
            <div className="absolute top-0 left-10 w-20 h-1 bg-cyan-400"></div>
            <div className="absolute bottom-0 right-10 w-20 h-1 bg-fuchsia-500"></div>

            <div className="flex items-center gap-6 max-w-[140px] sm:max-w-[200px] lg:max-w-sm">
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-fuchsia-500 uppercase font-bold tracking-widest mb-1">DECODER_Mux //</span>
                <span className="text-sm lg:text-base text-cyan-300 font-bold truncate underline decoration-fuchsia-500 underline-offset-4">{TRACKS[currentTrackIndex].title}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 lg:gap-8 bg-black border border-cyan-900 p-2 lg:p-3 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
              <button onClick={prevTrack} className="text-cyan-600 hover:text-cyan-300 transition-colors">
                <SkipBack className="w-5 h-5 lg:w-8 lg:h-8" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-12 h-12 lg:w-16 lg:h-16 bg-cyan-500 flex items-center justify-center text-black border-2 border-white hover:bg-fuchsia-500 hover:text-white transition-colors"
                style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }} // Custom skewed shape
              >
                {isPlaying ? <Pause className="w-5 h-5 lg:w-8 lg:h-8 fill-current" /> : <Play className="w-5 h-5 lg:w-8 lg:h-8 fill-current ml-1" />}
              </button>
              <button onClick={nextTrack} className="text-cyan-600 hover:text-cyan-300 transition-colors">
                <SkipForward className="w-5 h-5 lg:w-8 lg:h-8" />
              </button>
            </div>

            <div className="w-24 lg:w-48 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs text-cyan-500 uppercase font-bold tracking-widest">
                <button onClick={toggleMute} className="hover:text-fuchsia-400 transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />}
                </button>
                <span className="hidden sm:inline bg-cyan-900/50 px-2 py-0.5 border border-cyan-600">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-black border border-fuchsia-900 w-full p-0.5 relative">
                <div className="h-full bg-fuchsia-500" style={{ width: `${progress}%` }}></div>
                {/* Visual marker lines over progress */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjUiPjwvcmVjdD4KPC9zdmc+')] pointer-events-none"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Info Strip */}
      <footer className="h-8 bg-fuchsia-900/20 border-t border-fuchsia-500/30 px-4 lg:px-8 flex items-center justify-between text-[10px] text-fuchsia-400 uppercase tracking-widest flex-shrink-0 z-40 relative">
        <div className="flex gap-4 lg:gap-8">
          <span>KERNEL: GLITCH_V8</span>
          <span className="hidden sm:inline">SEED: 0x{Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')}</span>
        </div>
        <div className="flex gap-4 lg:gap-8">
          <span className="hidden sm:inline">LATENCY: {Math.floor(Math.random() * 20 + 5)}ms</span>
          <span>© 198X SYSTEM_VOID</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/game/GameEngine";
import { PlayerStats, EnemyEntity, DamageNumber } from "@/types/game";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GameCanvasProps {
  onEngineReady: (engine: GameEngine) => void;
  onStatsChanged: (stats: PlayerStats) => void;
  onTargetChanged: (enemy: EnemyEntity | null) => void;
  onDamageNumber: (dmg: DamageNumber) => void;
}

export function GameCanvas({
  onEngineReady,
  onStatsChanged,
  onTargetChanged,
  onDamageNumber,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initGame = useCallback(() => {
    if (!mountRef.current) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Clean up any existing engine
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    try {
      const engine = new GameEngine(mountRef.current, {
        onLoadSuccess: () => {
          setIsLoading(false);
          setErrorMessage(null);
        },
        onLoadError: (err) => {
          setIsLoading(false);
          setErrorMessage(err);
        },
        onStatsChanged,
        onTargetChanged,
        onDamageNumber,
      });

      engineRef.current = engine;
      onEngineReady(engine);
    } catch (e: unknown) {
      console.error("Failed to initialize GameEngine:", e);
      setIsLoading(false);
      setErrorMessage(
        e instanceof Error ? e.message : "An unexpected WebGL initialization error occurred."
      );
    }
  }, [onEngineReady, onStatsChanged, onTargetChanged, onDamageNumber]);

  useEffect(() => {
    initGame();

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [initGame]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* Dedicated empty ref container for Three.js Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md text-white">
          <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-wide">Loading CraftPiece 3D World</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Loading public/models/player.glb and generating Starter Island...
          </p>
        </div>
      )}

      {/* Clear Error Overlay (Requirement 6: หากโมเดลโหลดไม่สำเร็จ ให้แสดงข้อความ Error ในหน้าเกมอย่างชัดเจน) */}
      {errorMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-red-950/90 backdrop-blur-md text-white">
          <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto mb-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-red-200 mb-2">Model Load Error</h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 whitespace-pre-line leading-relaxed">
              {errorMessage}
            </p>

            <button
              onClick={initGame}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Loading Model</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

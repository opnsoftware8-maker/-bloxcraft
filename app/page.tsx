"use client";

import React, { useState, useRef, useCallback } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { MobileTouchControls } from "@/components/MobileTouchControls";
import { GameHUD } from "@/components/GameHUD";
import { GameEngine } from "@/game/GameEngine";
import { PlayerStats, EnemyEntity, DamageNumber } from "@/types/game";

export default function Home() {
  const engineRef = useRef<GameEngine | null>(null);

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    xp: 0,
    maxXp: 100,
    bounty: 30000,
    attackPower: 45,
    comboCount: 0,
  });

  const [targetEnemy, setTargetEnemy] = useState<EnemyEntity | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
  }, []);

  const handleDamageNumber = useCallback((dmg: DamageNumber) => {
    setDamageNumbers((prev) => [...prev, dmg]);

    // Animate drift and fade
    setTimeout(() => {
      setDamageNumbers((prev) =>
        prev.map((d) => (d.id === dmg.id ? { ...d, opacity: 0, y: d.y - 35 } : d))
      );
    }, 400);

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== dmg.id));
    }, 900);
  }, []);

  const handleAttackClick = useCallback(() => {
    engineRef.current?.triggerPlayerAttack();
  }, []);

  const handleSkyDrop = useCallback(() => {
    engineRef.current?.respawnPlayerFromSky();
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 1. Three.js 3D World Canvas */}
      <GameCanvas
        onEngineReady={handleEngineReady}
        onStatsChanged={setPlayerStats}
        onTargetChanged={setTargetEnemy}
        onDamageNumber={handleDamageNumber}
      />

      {/* 2. Game HUD (Stats, Enemy HP, Floating Damage Numbers, Sound Toggle, Help, Sky Drop) */}
      <GameHUD
        stats={playerStats}
        targetEnemy={targetEnemy}
        damageNumbers={damageNumbers}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onAttackClick={handleAttackClick}
        onSkyDropClick={handleSkyDrop}
      />

      {/* 3. Mobile Touch Controls (Analog Joystick, Attack M1, Jump, Sprint) */}
      <MobileTouchControls engineRef={engineRef} />
    </main>
  );
}

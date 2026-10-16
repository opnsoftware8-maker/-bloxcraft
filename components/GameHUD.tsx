"use client";

import React, { useState } from "react";
import { PlayerStats, EnemyEntity, DamageNumber } from "@/types/game";
import {
  Shield,
  HelpCircle,
  Volume2,
  VolumeX,
  Swords,
  X,
  Compass,
  ArrowDownToLine,
} from "lucide-react";
import { soundFX } from "@/lib/audio";

interface GameHUDProps {
  stats: PlayerStats;
  targetEnemy: EnemyEntity | null;
  damageNumbers: DamageNumber[];
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onAttackClick: () => void;
  onSkyDropClick?: () => void;
}

export function GameHUD({
  stats,
  targetEnemy,
  damageNumbers,
  isMuted,
  setIsMuted,
  onSkyDropClick,
}: GameHUDProps) {
  const [showHelp, setShowHelp] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFX.setMuted(next);
    if (!next) soundFX.playClick();
  };

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xpPercent = Math.max(0, Math.min(100, (stats.xp / stats.maxXp) * 100));

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 font-sans">
      {/* 1. Top-Left Player Status Profile */}
      <div className="absolute top-4 left-4 pointer-events-auto flex items-start gap-3">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md min-w-[200px] sm:min-w-[240px]">
          {/* Header & Level */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                CP
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">
                  CraftPiece
                </span>
                <span className="text-[10px] text-amber-400 font-semibold block leading-tight">
                  Level {stats.level} Pirate
                </span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-300 font-extrabold text-[11px]">
              ฿{stats.bounty.toLocaleString()}
            </div>
          </div>

          {/* Health Bar */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-300">
              <span className="flex items-center gap-1 text-red-400">
                <Shield className="w-3 h-3" /> HP
              </span>
              <span>
                {stats.hp} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* XP Bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span>EXP</span>
              <span>
                {stats.xp} / {stats.maxXp}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-200"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top-Center Target Enemy HUD (If active) */}
      {targetEnemy && !targetEnemy.isDead && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="bg-slate-900/90 border border-red-500/40 rounded-2xl px-4 py-2 shadow-2xl backdrop-blur-md min-w-[200px] sm:min-w-[280px] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-400 mb-1">
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>{targetEnemy.name}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-200"
                style={{
                  width: `${Math.max(0, (targetEnemy.hp / targetEnemy.maxHp) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Top-Right Utilities */}
      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => {
            soundFX.playJump();
            onSkyDropClick?.();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 border border-sky-400 text-white font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Sky Drop / เกิดใหม่ตกจากฟ้า (Key: R)"
        >
          <ArrowDownToLine className="w-4 h-4 text-sky-200" />
          <span className="hidden sm:inline">Sky Drop</span>
        </button>

        <button
          onClick={toggleSound}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white shadow-lg backdrop-blur-md transition-colors cursor-pointer"
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            setShowHelp(true);
          }}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white shadow-lg backdrop-blur-md transition-colors cursor-pointer"
          title="Controls Guide"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* 4. Floating Damage Numbers Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {damageNumbers.map((dmg) => (
          <div
            key={dmg.id}
            className={`absolute font-black text-sm sm:text-base drop-shadow-md transition-transform duration-500 ${
              dmg.isCrit ? "text-yellow-300 scale-125" : "text-white"
            }`}
            style={{
              left: `${dmg.x}px`,
              top: `${dmg.y}px`,
              opacity: dmg.opacity,
              transform: `translate(-50%, -100%) scale(${dmg.isCrit ? 1.3 : 1.0})`,
            }}
          >
            {dmg.isCrit && "CRIT! "}
            {dmg.value}
          </div>
        ))}
      </div>

      {/* 5. Controls Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Compass className="w-6 h-6" />
              <h2 className="text-lg font-bold">CraftPiece - ระบบควบคุม</h2>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <h3 className="font-bold text-amber-300 mb-1">🎮 คอมพิวเตอร์ (PC):</h3>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>W, A, S, D</strong> / <strong>ลูกศร</strong>: เดิน (อิงตามมุมกล้อง)</li>
                  <li><strong>Spacebar</strong>: กระโดด</li>
                  <li><strong>Shift</strong>: วิ่งเร็ว (Sprint)</li>
                  <li><strong>ลากเมาส์</strong>: หมุนมุมมองกล้องรอบตัวละคร</li>
                  <li><strong>หมุนลูกกลิ้งเมาส์</strong>: ซูมเข้า / ซูมออก</li>
                  <li><strong>J / F / คลิกซ้าย</strong>: ท่าโจมตี M1</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-emerald-300 mb-1">📱 มือถือ / แท็บเล็ต:</h3>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>Virtual Joystick (ซ้ายล่าง)</strong>: บังคับตัวละครเดิน</li>
                  <li><strong>ปัดนิ้วบนหน้าจอ</strong>: หมุนมุมกล้องอิสระ</li>
                  <li><strong>ปุ่ม Jump</strong>: กระโดดขึ้นที่สูง</li>
                  <li><strong>ปุ่ม Run</strong>: สลับวิ่งเร็ว</li>
                  <li><strong>ปุ่ม M1 Attack</strong>: ออกท่าโจมตี Combo</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                สถานะ: ปรับความเรียบเนียนของพื้นดิน หญ้า สะพานไม้ ก้อนหิน และเรือเรียบร้อย (บอทถูกปิดไว้ชั่วคราว)
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
            >
              เข้าสู่เกม
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

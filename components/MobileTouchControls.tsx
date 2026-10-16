"use client";

import React, { useRef, useState, useCallback } from "react";
import { ArrowUp, Zap, Flame } from "lucide-react";
import { GameEngine } from "@/game/GameEngine";

interface MobileTouchControlsProps {
  engineRef: React.RefObject<GameEngine | null>;
}

export function MobileTouchControls({ engineRef }: MobileTouchControlsProps) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragCenterRef = useRef({ x: 0, y: 0 });
  const [isSprintActive, setIsSprintActive] = useState(false);

  // Joystick Pointer Handlers
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    dragCenterRef.current = { x: cx, y: cy };
    setIsDragging(true);

    updateJoystickPos(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.preventDefault();
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });

    if (engineRef.current) {
      engineRef.current.input.joystickX = 0;
      engineRef.current.input.joystickY = 0;
    }
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    const dx = clientX - dragCenterRef.current.x;
    const dy = clientY - dragCenterRef.current.y;
    const maxRadius = 42;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    if (engineRef.current) {
      engineRef.current.input.joystickX = kx / maxRadius;
      engineRef.current.input.joystickY = ky / maxRadius;
    }
  };

  const handleAttack = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (engineRef.current) {
        engineRef.current.triggerPlayerAttack();
      }
    },
    [engineRef]
  );

  const handleJump = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (engineRef.current) {
        engineRef.current.triggerPlayerJump();
      }
    },
    [engineRef]
  );

  const toggleSprint = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = !isSprintActive;
      setIsSprintActive(next);
      if (engineRef.current) {
        engineRef.current.input.sprint = next;
      }
    },
    [engineRef, isSprintActive]
  );

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20">
      {/* 1. Virtual Touch Joystick (Bottom Left) */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          className="relative w-28 h-28 rounded-full bg-slate-900/60 border-2 border-slate-700/80 backdrop-blur-sm flex items-center justify-center touch-none shadow-2xl cursor-pointer"
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerUp}
          onPointerCancel={handleJoystickPointerUp}
        >
          {/* Outer direction indicator ring */}
          <div className="absolute inset-2 rounded-full border border-slate-600/30 pointer-events-none" />

          {/* Draggable Analog Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 shadow-lg border-2 border-amber-200 pointer-events-none flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-slate-950/20" />
          </div>
        </div>
      </div>

      {/* 2. Action Buttons Cluster (Bottom Right) */}
      <div className="absolute bottom-6 right-6 flex items-end gap-3 pointer-events-auto">
        {/* Sprint / Dash Button */}
        <button
          onPointerDown={toggleSprint}
          className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-95 shadow-lg touch-none ${
            isSprintActive
              ? "bg-amber-500 border-amber-300 text-slate-950 font-bold"
              : "bg-slate-900/70 border-slate-700 text-slate-300 hover:text-white"
          }`}
          title="Toggle Sprint"
        >
          <Flame className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-bold">Run</span>
        </button>

        {/* Jump Button */}
        <button
          onPointerDown={handleJump}
          className="w-14 h-14 rounded-full bg-slate-900/80 hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-600/80 text-white flex flex-col items-center justify-center shadow-xl touch-none transition-transform"
          title="Jump (Space)"
        >
          <ArrowUp className="w-6 h-6 text-amber-400" />
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-300">
            Jump
          </span>
        </button>

        {/* Primary Attack (M1) Button */}
        <button
          onPointerDown={handleAttack}
          className="w-18 h-18 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-95 border-3 border-amber-200 text-white flex flex-col items-center justify-center shadow-2xl touch-none transition-transform"
          title="Attack M1 (J or Left Click)"
        >
          <Zap className="w-7 h-7 text-white fill-amber-300" />
          <span className="text-[11px] font-black tracking-widest uppercase text-white drop-shadow">
            M1 Attack
          </span>
        </button>
      </div>
    </div>
  );
}

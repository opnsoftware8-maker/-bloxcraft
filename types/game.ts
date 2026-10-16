import * as THREE from "three";

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  attack: boolean;
  // Normalized analog vector from touch joystick (-1 to 1)
  joystickX: number;
  joystickY: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  level: number;
  xp: number;
  maxXp: number;
  bounty: number;
  attackPower: number;
  comboCount: number;
}

export interface EnemyEntity {
  id: string;
  name: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  isDead: boolean;
  attackCooldown: number;
  lastHurtTime: number;
  initialPos: THREE.Vector3;
  type: "dummy" | "bandit" | "boss";
  aggroRange: number;
  attackRange: number;
}

export interface DamageNumber {
  id: number;
  value: number;
  isCrit: boolean;
  x: number; // Screen X
  y: number; // Screen Y
  opacity: number;
}

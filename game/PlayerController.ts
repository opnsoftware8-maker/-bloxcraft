import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { InputState, PlayerStats, EnemyEntity } from "@/types/game";
import { soundFX } from "@/lib/audio";

// Pre-allocated module-level reusable math vectors (Zero Garbage Collection in loop)
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _toEnemy = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

export class PlayerController {
  public modelGroup: THREE.Group;
  public mixer: THREE.AnimationMixer | null = null;
  public actions: Map<string, THREE.AnimationAction> = new Map();
  public currentAction: string = "idle";

  // Physics & Kinematics (Spawns high up in the sky and drops down)
  public position: THREE.Vector3 = new THREE.Vector3(0, 48.0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, -2.0, 0);
  public rotationY: number = 0;
  public isGrounded: boolean = false;
  private lastStepTime: number = 0;

  // Combat State
  public isAttacking: boolean = false;
  private attackCooldownTimer: number = 0;
  private attackComboIndex: number = 0;
  private attackEffectMesh: THREE.Mesh | null = null;

  // Stats
  public stats: PlayerStats = {
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
  };

  private scene: THREE.Scene;
  private onStatsChanged?: (stats: PlayerStats) => void;
  private onDamageDealt?: (enemy: EnemyEntity, damage: number, isCrit: boolean) => void;

  constructor(
    scene: THREE.Scene,
    onLoadSuccess: () => void,
    onLoadError: (err: string) => void,
    onStatsChanged?: (stats: PlayerStats) => void,
    onDamageDealt?: (enemy: EnemyEntity, damage: number, isCrit: boolean) => void
  ) {
    this.scene = scene;
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);
    this.onStatsChanged = onStatsChanged;
    this.onDamageDealt = onDamageDealt;

    this.createAttackEffect();
    this.loadPlayerModel(onLoadSuccess, onLoadError);
  }

  private createAttackEffect() {
    // Dynamic slash arc mesh for M1 attack
    const arcGeo = new THREE.RingGeometry(0.8, 1.6, 16, 1, 0, Math.PI * 0.7);
    arcGeo.rotateX(-Math.PI / 2);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.attackEffectMesh = new THREE.Mesh(arcGeo, arcMat);
    this.attackEffectMesh.position.set(0, 1.2, 0.6);
    this.modelGroup.add(this.attackEffectMesh);
  }

  private loadPlayerModel(onSuccess: () => void, onError: (err: string) => void) {
    const loader = new GLTFLoader();
    const modelPath = "/models/player.glb";

    loader.load(
      modelPath,
      (gltf) => {
        const charScene = gltf.scene;
        charScene.castShadow = true;
        charScene.receiveShadow = true;

        charScene.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Optimize mobile rendering on player materials
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                if (m instanceof THREE.MeshStandardMaterial) {
                  m.roughness = 0.8;
                }
              });
            }
          }
        });

        this.modelGroup.add(charScene);
        this.modelGroup.position.copy(this.position);

        // Setup AnimationMixer
        this.mixer = new THREE.AnimationMixer(charScene);
        gltf.animations.forEach((clip) => {
          const name = clip.name.toLowerCase();
          const action = this.mixer!.clipAction(clip);
          this.actions.set(name, action);
        });

        // Start default idle animation
        const idleAction = this.actions.get("idle") || this.actions.values().next().value;
        if (idleAction) {
          idleAction.play();
          this.currentAction = "idle";
        }

        onSuccess();
      },
      undefined,
      (error) => {
        console.error("Error loading player model:", error);
        onError(
          `Failed to load player model from "${modelPath}". Please verify that the file exists in public/models/player.glb`
        );
      }
    );
  }

  public switchAnimation(animName: string, duration = 0.15) {
    if (!this.mixer || this.currentAction === animName) return;
    const nextAction = this.actions.get(animName);
    const prevAction = this.actions.get(this.currentAction);

    if (nextAction) {
      if (prevAction) prevAction.fadeOut(duration);
      nextAction.reset().fadeIn(duration).play();
      this.currentAction = animName;
    }
  }

  public respawnFromSky(height = 48.0) {
    this.position.set(0, height, 0);
    this.velocity.set(0, -2.0, 0);
    this.isGrounded = false;
    this.switchAnimation("jump", 0.1);
  }

  public triggerAttack(enemies: EnemyEntity[]) {
    if (this.attackCooldownTimer > 0) return;
    this.attackCooldownTimer = 0.28;
    this.isAttacking = true;
    this.attackComboIndex = (this.attackComboIndex + 1) % 3;

    soundFX.playSwing();

    // Visual slash effect
    if (this.attackEffectMesh) {
      const mat = this.attackEffectMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85;
      mat.color.set(this.attackComboIndex === 2 ? 0xff3b30 : 0xfacc15);
      this.attackEffectMesh.rotation.y = (this.attackComboIndex - 1) * 0.5;
    }

    // Play attack wave action
    const waveAction = this.actions.get("wave");
    if (waveAction) {
      waveAction.reset().fadeIn(0.08).setDuration(0.32).play();
      setTimeout(() => {
        if (this.currentAction !== "wave" && waveAction.isRunning()) {
          waveAction.fadeOut(0.1);
        }
      }, 240);
    }

    // Hit detection in front of player
    const attackRange = 2.8;
    _forward.set(0, 0, 1).applyAxisAngle(_yAxis, this.rotationY);

    for (const enemy of enemies) {
      if (enemy.isDead) continue;

      _toEnemy.subVectors(enemy.mesh.position, this.position);
      _toEnemy.y = 0;
      const dist = _toEnemy.length();

      if (dist <= attackRange) {
        _toEnemy.normalize();
        const dot = _forward.dot(_toEnemy);
        if (dot > 0.25) {
          const isCrit = Math.random() < 0.25 || this.attackComboIndex === 2;
          const damage = Math.round(
            this.stats.attackPower * (isCrit ? 1.8 : 1.0) * (0.9 + Math.random() * 0.25)
          );

          enemy.hp = Math.max(0, enemy.hp - damage);
          enemy.lastHurtTime = performance.now() * 0.001;

          if (isCrit) {
            soundFX.playCritHit();
          } else {
            soundFX.playHitImpact();
          }

          // Knockback enemy slightly
          enemy.mesh.position.addScaledVector(_forward, 0.4);

          if (this.onDamageDealt) {
            this.onDamageDealt(enemy, damage, isCrit);
          }

          if (enemy.hp <= 0) {
            enemy.isDead = true;
            soundFX.playDefeat();
            this.addReward(enemy.type === "boss" ? 150 : enemy.type === "bandit" ? 60 : 30);
          }
        }
      }
    }
  }

  private addReward(xpGained: number) {
    this.stats.xp += xpGained;
    this.stats.bounty += xpGained * 500;

    if (this.stats.xp >= this.stats.maxXp) {
      this.stats.level += 1;
      this.stats.xp -= this.stats.maxXp;
      this.stats.maxXp = Math.round(this.stats.maxXp * 1.4);
      this.stats.maxHp += 20;
      this.stats.hp = this.stats.maxHp;
      this.stats.attackPower += 8;
      soundFX.playLevelUp();
    }

    if (this.onStatsChanged) {
      this.onStatsChanged({ ...this.stats });
    }
  }

  public update(
    delta: number,
    elapsed: number,
    input: InputState,
    cameraYaw: number,
    getGroundHeight: (x: number, z: number) => number,
    enemies: EnemyEntity[],
    resolveObstacles?: (pos: THREE.Vector3, radius?: number) => void
  ) {
    // 1. Attack Cooldown & Effect Fade
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
      if (this.attackCooldownTimer <= 0) {
        this.isAttacking = false;
      }
    }
    if (this.attackEffectMesh) {
      const mat = this.attackEffectMesh.material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0) {
        mat.opacity = Math.max(0, mat.opacity - delta * 4);
      }
    }

    // 2. Process Attack Input
    if (input.attack) {
      this.triggerAttack(enemies);
      input.attack = false;
    }

    // 3. Camera-Relative Movement (Purely relative to camera look direction)
    const camForwardX = -Math.sin(cameraYaw);
    const camForwardZ = -Math.cos(cameraYaw);

    const camRightX = Math.cos(cameraYaw);
    const camRightZ = -Math.sin(cameraYaw);

    const forwardAxis =
      (input.forward ? 1 : 0) - (input.backward ? 1 : 0) - input.joystickY;
    const rightAxis =
      (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystickX;

    const inputMagnitude = Math.min(1.0, Math.hypot(forwardAxis, rightAxis));

    if (inputMagnitude > 0.08) {
      const dirX = camForwardX * forwardAxis + camRightX * rightAxis;
      const dirZ = camForwardZ * forwardAxis + camRightZ * rightAxis;
      const len = Math.hypot(dirX, dirZ);

      if (len > 0.001) {
        _moveDir.set(dirX / len, 0, dirZ / len);

        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        let diff = targetAngle - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.rotationY += diff * Math.min(1.0, delta * 22.0);
      }
    } else {
      _moveDir.set(0, 0, 0);
    }

    // Determine speed
    const isSprinting = input.sprint || inputMagnitude > 0.85;
    const baseSpeed = isSprinting ? 7.6 : 4.2;
    const targetVelX = _moveDir.x * inputMagnitude * baseSpeed;
    const targetVelZ = _moveDir.z * inputMagnitude * baseSpeed;

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, 14, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, 14, delta);

    // 4. Jump & Gravity
    if (input.jump && this.isGrounded) {
      this.velocity.y = 9.2;
      this.isGrounded = false;
      soundFX.playJump();
      input.jump = false;
    }

    this.velocity.y -= 25.0 * delta;

    // 5. Integrate Position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Resolve Solid Obstacle Collisions (Houses, Windmills, Trees)
    // Guarantees player CANNOT walk through buildings or trunks!
    if (resolveObstacles) {
      resolveObstacles(this.position, 0.55);
    }

    // 6. Ground Collision
    const groundY = getGroundHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY) {
      if (!this.isGrounded && this.velocity.y < -5.0) {
        soundFX.playHitImpact();
      }
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 7. Update Model Transform
    this.modelGroup.position.copy(this.position);
    this.modelGroup.rotation.y = this.rotationY;

    // 8. Animation State Machine
    if (!this.isGrounded) {
      this.switchAnimation("jump", 0.1);
    } else if (inputMagnitude > 0.12) {
      const anim = isSprinting ? "run" : "walk";
      this.switchAnimation(anim, 0.12);

      // Footstep sound
      const stepInterval = isSprinting ? 0.28 : 0.44;
      if (elapsed - this.lastStepTime > stepInterval) {
        soundFX.playStep();
        this.lastStepTime = elapsed;
      }
    } else {
      this.switchAnimation("idle", 0.18);
    }

    // 9. Update Animation Mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  public dispose() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.modelGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.scene.remove(this.modelGroup);
  }
}

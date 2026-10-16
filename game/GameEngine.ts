import * as THREE from "three";
import { StarterIsland } from "@/game/StarterIsland";
import { PlayerController } from "@/game/PlayerController";
import { ThirdPersonCamera } from "@/game/ThirdPersonCamera";
import { InputState, PlayerStats, EnemyEntity, DamageNumber } from "@/types/game";

// Pre-allocated vector for projecting damage numbers without GC
const _projVec = new THREE.Vector3();

export interface GameEngineCallbacks {
  onLoadSuccess: () => void;
  onLoadError: (err: string) => void;
  onStatsChanged: (stats: PlayerStats) => void;
  onTargetChanged: (enemy: EnemyEntity | null) => void;
  onDamageNumber: (dmg: DamageNumber) => void;
}

export class GameEngine {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public tpCamera: ThirdPersonCamera;
  public island: StarterIsland;
  public player: PlayerController;

  public input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    attack: false,
    joystickX: 0,
    joystickY: 0,
  };

  private animationFrameId: number = 0;
  private isDestroyed: boolean = false;
  private clock: THREE.Clock;
  private callbacks: GameEngineCallbacks;
  private nextDamageId: number = 1;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // 1. Scene & Clean Sky (No Fog - guarantees 100% solid, non-gradient colors)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8f8);
    this.scene.fog = null;

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1500);
    this.tpCamera = new ThirdPersonCamera(this.camera);

    // 3. High Performance Renderer (Mobile Android & PC Optimized)
    const isHeadless =
      typeof navigator !== "undefined" &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Turn off heavy MSAA on mobile for 60 FPS
      powerPreference: "high-performance",
      precision: "mediump", // Medium precision for mobile GPU speedup
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Cap pixel ratio to 1.0 - 1.25 to prevent fill-rate throttling
    this.renderer.setPixelRatio(isHeadless ? 1.0 : Math.min(window.devicePixelRatio, 1.2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // Pure solid colors without blowout curves
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Clean, Even Lighting (Pure solid colors, no gradient washout)
    this.setupLighting(!isHeadless);

    // 5. Starter Island
    this.island = new StarterIsland();
    this.scene.add(this.island.group);

    // 6. Player Controller
    this.player = new PlayerController(
      this.scene,
      () => {
        if (!this.isDestroyed) {
          this.callbacks.onLoadSuccess();
        }
      },
      (err) => {
        if (!this.isDestroyed) {
          this.callbacks.onLoadError(err);
        }
      },
      (stats) => {
        this.callbacks.onStatsChanged(stats);
      },
      (enemy, damage, isCrit) => {
        this.callbacks.onTargetChanged({ ...enemy });
        this.spawnDamageNumber(enemy.mesh.position, damage, isCrit);
      }
    );

    // 7. Event Listeners
    this.setupEventListeners();

    // 8. Start Game Loop
    this.startLoop();
  }

  private setupLighting(enableShadows: boolean) {
    // 1. Ambient Light provides completely even, flat, non-gradient illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // 2. Soft Directional Sunlight for crisp shadows without washing out surfaces
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.45);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = enableShadows;
    sunLight.shadow.mapSize.width = 512;
    sunLight.shadow.mapSize.height = 512;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 90;
    const d = 28;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0006;
    this.scene.add(sunLight);
  }

  private setupEventListeners() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);

    const dom = this.renderer.domElement;
    dom.addEventListener("pointerdown", this.onPointerDown);
    dom.addEventListener("pointermove", this.onPointerMove);
    dom.addEventListener("pointerup", this.onPointerUp);
    dom.addEventListener("pointercancel", this.onPointerUp);
    dom.addEventListener("wheel", this.onWheel, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.input.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.input.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.input.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.input.right = true;
        break;
      case "Space":
        e.preventDefault();
        this.input.jump = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.input.sprint = true;
        break;
      case "KeyJ":
      case "KeyF":
        this.input.attack = true;
        break;
      case "KeyR":
        this.player.respawnFromSky();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.input.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        this.input.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.input.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.input.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.input.sprint = false;
        break;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.tpCamera.handlePointerDown(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent) => {
    this.tpCamera.handlePointerMove(e.clientX, e.clientY);
  };

  private onPointerUp = () => {
    this.tpCamera.handlePointerUp();
  };

  private onWheel = (e: WheelEvent) => {
    this.tpCamera.handleWheel(e.deltaY);
  };

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private spawnDamageNumber(worldPos: THREE.Vector3, damage: number, isCrit: boolean) {
    _projVec.set(worldPos.x, worldPos.y + 1.8, worldPos.z);
    _projVec.project(this.camera);

    const halfW = this.container.clientWidth / 2;
    const halfH = this.container.clientHeight / 2;
    const screenX = _projVec.x * halfW + halfW;
    const screenY = -(_projVec.y * halfH) + halfH;

    this.callbacks.onDamageNumber({
      id: this.nextDamageId++,
      value: damage,
      isCrit,
      x: screenX,
      y: screenY,
      opacity: 1.0,
    });
  }

  private startLoop() {
    const loop = () => {
      if (this.isDestroyed) return;
      this.animationFrameId = requestAnimationFrame(loop);

      // Capped delta to avoid physics stutter on lag spikes
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const elapsed = this.clock.getElapsedTime();

      // 1. Update Island & Enemies
      this.island.update(delta, elapsed, this.player.position);

      // 2. Update Player Controller (Camera-relative movement & solid obstacle collisions)
      this.player.update(
        delta,
        elapsed,
        this.input,
        this.tpCamera.yaw,
        (x, z) => this.island.getGroundHeight(x, z),
        this.island.enemies,
        (pos, r) => this.island.resolveObstacleCollisions(pos, r)
      );

      // 3. Update Camera Orbit & Follow
      this.tpCamera.update(delta, this.player.position, (x, z) =>
        this.island.getGroundHeight(x, z)
      );

      // 4. Render Frame
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  public triggerPlayerAttack() {
    this.player.triggerAttack(this.island.enemies);
  }

  public triggerPlayerJump() {
    this.input.jump = true;
  }

  public respawnPlayerFromSky() {
    this.player.respawnFromSky();
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationFrameId);

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);

    const dom = this.renderer.domElement;
    dom.removeEventListener("pointerdown", this.onPointerDown);
    dom.removeEventListener("pointermove", this.onPointerMove);
    dom.removeEventListener("pointerup", this.onPointerUp);
    dom.removeEventListener("pointercancel", this.onPointerUp);
    dom.removeEventListener("wheel", this.onWheel);

    this.player.dispose();
    this.island.dispose();

    if (this.container && dom && dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
    this.renderer.dispose();
  }
}

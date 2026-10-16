import * as THREE from "three";

// Pre-allocated module-level vectors for Zero Garbage Collection in render loop
const _targetLookAt = new THREE.Vector3();
const _idealPosition = new THREE.Vector3();

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private currentPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;

  // Spherical orbit parameters
  public distance: number = 6.5;
  public minDistance: number = 2.0;
  public maxDistance: number = 18.0;
  public yaw: number = 0; // horizontal angle in radians
  public pitch: number = 0.32; // vertical angle in radians
  public minPitch: number = -0.2;
  public maxPitch: number = 1.35;

  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
  }

  public handlePointerDown(clientX: number, clientY: number) {
    this.isDragging = true;
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;
  }

  public handlePointerMove(clientX: number, clientY: number) {
    if (!this.isDragging) return;
    const deltaX = clientX - this.lastPointerX;
    const deltaY = clientY - this.lastPointerY;
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;

    // Smooth responsive camera orbit sensitivity
    const sensitivity = 0.0045;
    this.yaw -= deltaX * sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + deltaY * sensitivity,
      this.minPitch,
      this.maxPitch
    );
  }

  public handlePointerUp() {
    this.isDragging = false;
  }

  public handleWheel(deltaY: number) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + deltaY * 0.005,
      this.minDistance,
      this.maxDistance
    );
  }

  public handlePinch(zoomDelta: number) {
    this.distance = THREE.MathUtils.clamp(
      this.distance - zoomDelta * 0.02,
      this.minDistance,
      this.maxDistance
    );
  }

  public update(
    delta: number,
    targetPosition: THREE.Vector3,
    groundHeightAtCam?: (x: number, z: number) => number
  ) {
    // Focus point is player upper body
    _targetLookAt.set(targetPosition.x, targetPosition.y + 1.35, targetPosition.z);

    // Compute ideal camera position from spherical angles
    const sinPitch = Math.sin(this.pitch);
    const cosPitch = Math.cos(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const cx = _targetLookAt.x + this.distance * sinYaw * cosPitch;
    const cz = _targetLookAt.z + this.distance * cosYaw * cosPitch;
    let cy = _targetLookAt.y + this.distance * sinPitch;

    // Prevent camera from clipping through terrain
    if (groundHeightAtCam) {
      const minCamY = groundHeightAtCam(cx, cz) + 0.55;
      if (cy < minCamY) {
        cy = minCamY;
      }
    }

    _idealPosition.set(cx, cy, cz);

    // Smooth camera damping without GC allocation
    const dampPos = Math.min(1.0, delta * 14.0);
    const dampLook = Math.min(1.0, delta * 18.0);
    this.currentPosition.lerp(_idealPosition, dampPos);
    this.currentLookAt.lerp(_targetLookAt, dampLook);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}

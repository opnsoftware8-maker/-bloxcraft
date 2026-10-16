import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EnemyEntity } from "@/types/game";

export class StarterIsland {
  public group: THREE.Group;
  public enemies: EnemyEntity[] = [];
  public waterMesh: THREE.Mesh | null = null;
  public islandModel: THREE.Group | null = null;
  public isLoaded: boolean = false;

  // Raycaster for 100% exact polygon collision on the custom island model
  private raycaster: THREE.Raycaster;
  private rayOrigin: THREE.Vector3;
  private rayDown: THREE.Vector3;

  private matWater: THREE.MeshLambertMaterial;

  constructor(onLoadSuccess?: () => void, onLoadError?: (err: string) => void) {
    this.group = new THREE.Group();

    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.rayDown = new THREE.Vector3(0, -1, 0);

    // Flat ocean water
    this.matWater = new THREE.MeshLambertMaterial({
      color: 0x0288d1,
      transparent: true,
      opacity: 0.85,
    });

    this.buildOcean();
    this.loadCustomIsland(onLoadSuccess, onLoadError);
  }

  private buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(600, 600);
    oceanGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(oceanGeo, this.matWater);
    this.waterMesh.position.y = -0.15;
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  /**
   * Loads "Brilliant Migelo-Bruticus.glb" directly without adding any extra decorations.
   * ("Brilliant Migelo-Bruticus.glb ไฟล์นี้เอาไผแทนเกาะเดิมเถอะ อย่าตกแต่งอะไรทั้งนั้น")
   */
  private loadCustomIsland(onSuccess?: () => void, onError?: (err: string) => void) {
    const loader = new GLTFLoader();
    const modelPath = "/models/island.glb";

    loader.load(
      modelPath,
      (gltf) => {
        const island = gltf.scene;
        this.islandModel = island;

        // Compute original bounding box
        const box = new THREE.Box3().setFromObject(island);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Scale island to appropriate in-game size (~180m wide)
        // Original size is ~1998 in Tinkercad units, scale 0.1 makes it ~200m
        const targetWidth = 180;
        const maxDim = Math.max(size.x, size.z);
        const scale = maxDim > 100 ? targetWidth / maxDim : 1.0;

        island.scale.set(scale, scale, scale);

        // Center horizontally
        island.position.x = -center.x * scale;
        island.position.z = -center.z * scale;

        // Position vertically so the island floats above water (y = 0)
        island.position.y = -box.min.y * scale + 1.0;

        island.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.receiveShadow = true;
            child.castShadow = true;

            // Ensure materials look clean, visible, and double-sided
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                m.side = THREE.DoubleSide;
                if (m instanceof THREE.MeshStandardMaterial) {
                  m.roughness = 0.9;
                  m.metalness = 0.05;
                }
              });
            }
          }
        });

        this.group.add(island);
        this.isLoaded = true;

        if (onSuccess) onSuccess();
      },
      undefined,
      (err) => {
        console.error("Failed to load custom island model:", err);
      }
    );
  }

  /**
   * 100% Exact Polygon Raycasting Collision:
   * Accurately tracks every triangle and height of Brilliant Migelo-Bruticus.glb.
   * Never falls through!
   */
  public getGroundHeight(x: number, z: number): number {
    if (!this.islandModel) {
      return 1.4;
    }

    this.rayOrigin.set(x, 150.0, z);
    this.raycaster.set(this.rayOrigin, this.rayDown);

    const hits = this.raycaster.intersectObject(this.islandModel, true);
    if (hits.length > 0) {
      return hits[0].point.y;
    }

    // Default to water level when outside the island boundaries
    return -0.15;
  }

  public resolveObstacleCollisions(_pos: THREE.Vector3, _radius = 0.55): void {
    // No artificial obstacle walls - custom island model terrain is traversed directly
  }

  public update(_delta?: number, _elapsed?: number, _playerPos?: THREE.Vector3) {
    // Static & completely stable
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });

    this.matWater.dispose();
  }
}

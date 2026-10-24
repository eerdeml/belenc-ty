/**
 * Procedural 3D assets for Coastal Highway Racing game.
 * All models are procedurally assembled Three.js groups (zero 404 dependencies).
 */

import * as THREE from 'three';
import { CarDefinition } from './cars';

// Reusable shared materials and geometries for optimal draw performance
export interface CarParts {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  bodyMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  bbox: THREE.Box3;
}

// Generate circular soft shadow texture
function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const shadowTexture = createSoftShadowTexture();

/**
 * Creates a wheel mesh with rim and tire
 */
function createWheelMesh(): THREE.Mesh {
  const group = new THREE.Group();
  
  // Tire
  const tireGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
    metalness: 0.1,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  group.add(tire);

  // Rim (inner metallic cap)
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.25,
    metalness: 0.85,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  group.add(rim);

  // Return as a single root mesh (by wrapping in Object3D or grouping)
  const root = new THREE.Mesh();
  root.add(tire);
  root.add(rim);
  return root;
}

/**
 * Creates the Player Supercar with optional custom livery, spoilers, and neon underglow.
 */
export function createPlayerCar(carDef?: CarDefinition): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const paintColor = carDef?.colorHex ?? 0xee1526;
  const isGold = carDef?.id === 'golden_storm';
  const isCyber = carDef?.id === 'cyber_pulse';

  // Body paint material
  const bodyPaintMat = new THREE.MeshStandardMaterial({
    color: paintColor,
    roughness: isGold ? 0.12 : 0.18,
    metalness: isGold ? 0.9 : (isCyber ? 0.6 : 0.35),
  });

  // Dark glass material
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c121d,
    roughness: 0.08,
    metalness: 0.9,
  });

  // Black trim / carbon material
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: carDef?.accentColorHex ?? 0x16181c,
    roughness: 0.65,
    metalness: 0.3,
  });

  // Glowing red tail light material
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff2025,
    emissive: 0xff1518,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // White front headlights
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xecfeff,
    emissiveIntensity: 2.5,
    roughness: 0.1,
  });

  // 1. Lower chassis / floor
  const lowerChassisGeo = new THREE.BoxGeometry(1.5, 0.3, 3.8);
  const lowerChassis = new THREE.Mesh(lowerChassisGeo, darkTrimMat);
  lowerChassis.position.y = 0.25;
  lowerChassis.castShadow = true;
  group.add(lowerChassis);

  // 2. Main aerodynamic body hull (tapered top)
  const bodyGeo = new THREE.BoxGeometry(1.52, 0.42, 3.6);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
  bodyMesh.position.y = 0.52;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 3. Front hood slope
  const hoodGeo = new THREE.BoxGeometry(1.42, 0.2, 1.2);
  hoodGeo.rotateX(-0.12);
  const hood = new THREE.Mesh(hoodGeo, bodyPaintMat);
  hood.position.set(0, 0.56, -1.2);
  hood.castShadow = true;
  group.add(hood);

  // 4. Cockpit / Roof & Cabin
  const cabinGeo = new THREE.BoxGeometry(1.22, 0.42, 1.7);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.88, 0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof panel
  const roofGeo = new THREE.BoxGeometry(1.18, 0.06, 1.25);
  const roof = new THREE.Mesh(roofGeo, bodyPaintMat);
  roof.position.set(0, 1.09, 0.2);
  group.add(roof);

  // 5. Rear louvers
  for (let i = 0; i < 4; i++) {
    const louverGeo = new THREE.BoxGeometry(0.85, 0.03, 0.1);
    const louver = new THREE.Mesh(louverGeo, darkTrimMat);
    louver.position.set(0, 0.84 - i * 0.07, 0.78 + i * 0.16);
    louver.rotation.x = 0.2;
    group.add(louver);
  }

  // 6. Rear spoiler (if configured)
  if (carDef?.hasSpoiler) {
    const spoilerWingMat = new THREE.MeshStandardMaterial({
      color: carDef.accentColorHex ?? 0x111111,
      metalness: 0.7,
      roughness: 0.25,
    });

    if (carDef.spoilerStyle === 'gt_wing' || carDef.spoilerStyle === 'hyper_dual') {
      // Big GT Racing Wing on upright struts
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.12), darkTrimMat);
      strutL.position.set(-0.52, 0.88, 1.62);
      group.add(strutL);

      const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.12), darkTrimMat);
      strutR.position.set(0.52, 0.88, 1.62);
      group.add(strutR);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 0.36), spoilerWingMat);
      wing.position.set(0, 1.02, 1.62);
      wing.rotation.x = -0.06;
      group.add(wing);

      // End plates
      const endPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.38), bodyPaintMat);
      endPlateL.position.set(-0.84, 1.04, 1.62);
      group.add(endPlateL);

      const endPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.38), bodyPaintMat);
      endPlateR.position.set(0.84, 1.04, 1.62);
      group.add(endPlateR);
    } else if (carDef.spoilerStyle === 'cyber_fins') {
      // Dual futuristic angled fins
      const finL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.45), bodyPaintMat);
      finL.position.set(-0.64, 0.86, 1.6);
      finL.rotation.z = -0.25;
      group.add(finL);

      const finR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.45), bodyPaintMat);
      finR.position.set(0.64, 0.86, 1.6);
      finR.rotation.z = 0.25;
      group.add(finR);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.24), darkTrimMat);
      wing.position.set(0, 0.94, 1.62);
      group.add(wing);
    } else {
      // Classic sleek lip spoiler
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.22), darkTrimMat);
      wing.position.set(0, 0.78, 1.76);
      wing.rotation.x = 0.15;
      group.add(wing);
    }
  }

  // 7. Neon Underglow (if configured)
  if (carDef?.hasNeonUnderglow && carDef.neonColorHex) {
    const neonMat = new THREE.MeshBasicMaterial({
      color: carDef.neonColorHex,
      transparent: true,
      opacity: 0.85,
    });
    // Left neon tube
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.6), neonMat);
    neonL.position.set(-0.7, 0.12, 0);
    group.add(neonL);
    // Right neon tube
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.6), neonMat);
    neonR.position.set(0.7, 0.12, 0);
    group.add(neonR);

    // Glowing ground projection quad
    const glowPlaneMat = new THREE.MeshBasicMaterial({
      color: carDef.neonColorHex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.0), glowPlaneMat);
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.y = 0.04;
    group.add(glowPlane);
  }

  // 8. Distinct horizontal rear light bars
  const tailLightLeftGeo = new THREE.BoxGeometry(0.48, 0.08, 0.05);
  const tailLightLeft = new THREE.Mesh(tailLightLeftGeo, tailLightMat);
  tailLightLeft.position.set(-0.45, 0.52, 1.81);
  group.add(tailLightLeft);

  const tailLightRightGeo = new THREE.BoxGeometry(0.48, 0.08, 0.05);
  const tailLightRight = new THREE.Mesh(tailLightRightGeo, tailLightMat);
  tailLightRight.position.set(0.45, 0.52, 1.81);
  group.add(tailLightRight);

  // 9. Headlights
  const headLightL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.05), headLightMat);
  headLightL.position.set(-0.52, 0.46, -1.81);
  group.add(headLightL);

  const headLightR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.05), headLightMat);
  headLightR.position.set(0.52, 0.46, -1.81);
  group.add(headLightR);

  // 10. Rear diffuser & dual exhaust pipes
  const diffuserGeo = new THREE.BoxGeometry(1.3, 0.18, 0.2);
  const diffuser = new THREE.Mesh(diffuserGeo, darkTrimMat);
  diffuser.position.set(0, 0.24, 1.8);
  group.add(diffuser);

  const chromeMat = new THREE.MeshStandardMaterial({
    color: isGold ? 0xd4af37 : 0xcccccc,
    metalness: 0.95,
    roughness: 0.15,
  });

  const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 12), chromeMat);
  exhaustL.rotation.x = Math.PI / 2;
  exhaustL.position.set(-0.46, 0.22, 1.88);
  group.add(exhaustL);

  const exhaustR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 12), chromeMat);
  exhaustR.rotation.x = Math.PI / 2;
  exhaustR.position.set(0.46, 0.22, 1.88);
  group.add(exhaustR);

  // 11. Side mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.09, 0.12);
  const mirrorL = new THREE.Mesh(mirrorGeo, bodyPaintMat);
  mirrorL.position.set(-0.76, 0.74, -0.4);
  group.add(mirrorL);

  const mirrorR = new THREE.Mesh(mirrorGeo, bodyPaintMat);
  mirrorR.position.set(0.76, 0.74, -0.4);
  group.add(mirrorR);

  // 12. Wheels (4 positions)
  const wheelPositions = [
    [-0.76, 0.32, -1.15],
    [0.76, 0.32, -1.15],
    [-0.76, 0.32, 1.15],
    [0.76, 0.32, 1.15],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheelMesh();
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  });

  // 13. Soft contact shadow on ground
  const shadowGeo = new THREE.PlaneGeometry(2.3, 4.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  return {
    group,
    wheels,
    bodyMesh,
    shadowMesh,
    bbox: new THREE.Box3(new THREE.Vector3(-0.75, 0, -1.8), new THREE.Vector3(0.75, 1.1, 1.8)),
  };
}

/**
 * Creates an opponent sports car with specified color and style
 */
export function createTrafficCar(colorHex: number): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.22,
    metalness: 0.4,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111622,
    roughness: 0.1,
    metalness: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181c,
    roughness: 0.6,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1020,
    emissive: 0xee0011,
    emissiveIntensity: 1.8,
  });

  // Chassis
  const lowerGeo = new THREE.BoxGeometry(1.48, 0.28, 3.7);
  const lower = new THREE.Mesh(lowerGeo, trimMat);
  lower.position.y = 0.24;
  lower.castShadow = true;
  group.add(lower);

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.4, 3.6);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.5;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.42, 1.8);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.85, 0.05);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof
  const roofGeo = new THREE.BoxGeometry(1.16, 0.05, 1.35);
  const roof = new THREE.Mesh(roofGeo, bodyMat);
  roof.position.set(0, 1.06, 0.1);
  group.add(roof);

  // Spoiler on rear
  const spoilerBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.25), bodyMat);
  spoilerBar.position.set(0, 0.82, 1.6);
  group.add(spoilerBar);

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), trimMat);
  postL.position.set(-0.55, 0.72, 1.6);
  group.add(postL);

  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), trimMat);
  postR.position.set(0.55, 0.72, 1.6);
  group.add(postR);

  // Taillights
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.05), tailMat);
  tailL.position.set(-0.48, 0.52, 1.8);
  group.add(tailL);

  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.05), tailMat);
  tailR.position.set(0.48, 0.52, 1.8);
  group.add(tailR);

  // Wheels
  const wheelPositions = [
    [-0.75, 0.32, -1.1],
    [0.75, 0.32, -1.1],
    [-0.75, 0.32, 1.1],
    [0.75, 0.32, 1.1],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheelMesh();
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  });

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(2.3, 4.3);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  return {
    group,
    wheels,
    bodyMesh,
    shadowMesh,
    bbox: new THREE.Box3(new THREE.Vector3(-0.75, 0, -1.8), new THREE.Vector3(0.75, 1.1, 1.8)),
  };
}

/**
 * Creates an imposing 3D Semi-Truck / Trailer (Tır) with high cab, chrome exhaust stacks,
 * heavy trailer cargo box, rear dual wheels, and industrial warning lights.
 */
export function createTrafficTruck(colorHex: number): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const cabMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.4,
  });

  const trailerMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Silver/white corrugated industrial container
    roughness: 0.45,
    metalness: 0.35,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.1,
    metalness: 0.95,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1520,
    emissive: 0xee0011,
    emissiveIntensity: 2.2,
  });

  // 1. Heavy Chassis Beam
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.35, 6.6);
  const chassis = new THREE.Mesh(chassisGeo, trimMat);
  chassis.position.y = 0.3;
  chassis.castShadow = true;
  group.add(chassis);

  // 2. High Truck Cabin (Front)
  const cabGeo = new THREE.BoxGeometry(1.72, 1.6, 2.1);
  const bodyMesh = new THREE.Mesh(cabGeo, cabMat);
  bodyMesh.position.set(0, 1.25, -2.1);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Front grill / Bumper
  const grillGeo = new THREE.BoxGeometry(1.65, 0.65, 0.2);
  const grill = new THREE.Mesh(grillGeo, chromeMat);
  grill.position.set(0, 0.65, -3.2);
  group.add(grill);

  // Front Windshield
  const windshieldGeo = new THREE.BoxGeometry(1.55, 0.75, 0.1);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.45, -3.16);
  group.add(windshield);

  // Cabin side windows
  const sideWinGeo = new THREE.BoxGeometry(0.08, 0.55, 0.9);
  const sideWinL = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinL.position.set(-0.87, 1.45, -2.2);
  group.add(sideWinL);

  const sideWinR = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinR.position.set(0.87, 1.45, -2.2);
  group.add(sideWinR);

  // Chrome vertical exhaust stacks behind cab
  const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustL.position.set(-0.88, 1.8, -1.0);
  group.add(exhaustL);

  const exhaustR = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustR.position.set(0.88, 1.8, -1.0);
  group.add(exhaustR);

  // Roof wind deflector
  const deflectorGeo = new THREE.ConeGeometry(0.8, 0.6, 4);
  deflectorGeo.rotateY(Math.PI / 4);
  deflectorGeo.rotateX(-Math.PI / 3);
  const deflector = new THREE.Mesh(deflectorGeo, cabMat);
  deflector.position.set(0, 2.2, -1.7);
  group.add(deflector);

  // 3. Huge Rear Cargo Container (Trailer)
  const trailerGeo = new THREE.BoxGeometry(1.82, 1.95, 4.3);
  const trailer = new THREE.Mesh(trailerGeo, trailerMat);
  trailer.position.set(0, 1.45, 1.15);
  trailer.castShadow = true;
  group.add(trailer);

  // Container horizontal styling rib lines
  for (let r = 0; r < 4; r++) {
    const ribGeo = new THREE.BoxGeometry(1.85, 0.05, 4.25);
    const rib = new THREE.Mesh(ribGeo, trimMat);
    rib.position.set(0, 0.75 + r * 0.45, 1.15);
    group.add(rib);
  }

  // Rear trailer door locking bars
  const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8);
  const barL = new THREE.Mesh(barGeo, chromeMat);
  barL.position.set(-0.35, 1.45, 3.32);
  group.add(barL);
  const barR = new THREE.Mesh(barGeo, chromeMat);
  barR.position.set(0.35, 1.45, 3.32);
  group.add(barR);

  // Rear trailer taillights & bumper
  const rearBumperGeo = new THREE.BoxGeometry(1.8, 0.25, 0.15);
  const rearBumper = new THREE.Mesh(rearBumperGeo, trimMat);
  rearBumper.position.set(0, 0.35, 3.32);
  group.add(rearBumper);

  const tLightL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.05), tailMat);
  tLightL.position.set(-0.65, 0.35, 3.41);
  group.add(tLightL);

  const tLightR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.05), tailMat);
  tLightR.position.set(0.65, 0.35, 3.41);
  group.add(tLightR);

  // 4. Wheels (6 wheels: 2 front cab, 4 rear trailer tandem)
  const truckWheelPositions = [
    [-0.88, 0.36, -2.4],
    [0.88, 0.36, -2.4],
    [-0.92, 0.36, 1.9],
    [0.92, 0.36, 1.9],
    [-0.92, 0.36, 2.8],
    [0.92, 0.36, 2.8],
  ];

  truckWheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheelMesh();
    wheel.scale.set(1.15, 1.15, 1.15);
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  });

  // Soft contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.7, 7.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.02, 0.2);
  group.add(shadowMesh);

  return {
    group,
    wheels,
    bodyMesh,
    shadowMesh,
    bbox: new THREE.Box3(new THREE.Vector3(-0.95, 0, -3.3), new THREE.Vector3(0.95, 2.5, 3.3)),
  };
}

/**
 * Creates a Long Passenger Highway Bus (Otobüs) with tinted panorama side windows,
 * front route display screen, streamlined curved roof, and 6 heavy wheels.
 */
export function createTrafficBus(colorHex: number): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const busMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.3,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x091220,
    roughness: 0.08,
    metalness: 0.92,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1020,
    emissive: 0xee0011,
    emissiveIntensity: 2.2,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xecfeff,
    emissiveIntensity: 2.0,
  });

  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
  });

  // 1. Lower chassis
  const chassisGeo = new THREE.BoxGeometry(1.76, 0.4, 7.5);
  const chassis = new THREE.Mesh(chassisGeo, trimMat);
  chassis.position.y = 0.3;
  chassis.castShadow = true;
  group.add(chassis);

  // 2. Main Bus Body Hull (Long passenger compartment)
  const bodyGeo = new THREE.BoxGeometry(1.82, 1.85, 7.3);
  const bodyMesh = new THREE.Mesh(bodyGeo, busMat);
  bodyMesh.position.y = 1.35;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Roof cap
  const roofGeo = new THREE.BoxGeometry(1.78, 0.15, 7.25);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 2.32;
  group.add(roof);

  // Air Conditioner unit on roof
  const acGeo = new THREE.BoxGeometry(1.2, 0.22, 1.8);
  const acMesh = new THREE.Mesh(acGeo, roofMat);
  acMesh.position.set(0, 2.45, 0);
  group.add(acMesh);

  // Front Panorama Windshield
  const windshieldGeo = new THREE.BoxGeometry(1.72, 1.15, 0.1);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.45, -3.66);
  group.add(windshield);

  // Route LED Matrix Display Sign above front windshield
  const signGeo = new THREE.BoxGeometry(1.3, 0.22, 0.08);
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 2.15, -3.66);
  group.add(sign);

  // Passenger Panorama Side Windows
  const sideWinGeo = new THREE.BoxGeometry(0.08, 0.72, 6.2);
  const winL = new THREE.Mesh(sideWinGeo, glassMat);
  winL.position.set(-0.92, 1.5, 0.1);
  group.add(winL);

  const winR = new THREE.Mesh(sideWinGeo, glassMat);
  winR.position.set(0.92, 1.5, 0.1);
  group.add(winR);

  // Front headlights
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.05), headMat);
  headL.position.set(-0.65, 0.62, -3.66);
  group.add(headL);

  const headR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.05), headMat);
  headR.position.set(0.65, 0.62, -3.66);
  group.add(headR);

  // Rear vertical taillights
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), tailMat);
  tailL.position.set(-0.76, 1.2, 3.66);
  group.add(tailL);

  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), tailMat);
  tailR.position.set(0.76, 1.2, 3.66);
  group.add(tailR);

  // 3. Wheels (6 bus wheels)
  const busWheelPositions = [
    [-0.92, 0.36, -2.6],
    [0.92, 0.36, -2.6],
    [-0.92, 0.36, 1.8],
    [0.92, 0.36, 1.8],
    [-0.92, 0.36, 2.7],
    [0.92, 0.36, 2.7],
  ];

  busWheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheelMesh();
    wheel.scale.set(1.12, 1.12, 1.12);
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  });

  // Soft bus contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.7, 8.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.02, 0);
  group.add(shadowMesh);

  return {
    group,
    wheels,
    bodyMesh,
    shadowMesh,
    bbox: new THREE.Box3(new THREE.Vector3(-0.95, 0, -3.7), new THREE.Vector3(0.95, 2.4, 3.7)),
  };
}

/**
 * Creates a rugged SUV / 4x4 with elevated clearance and roof rack.
 */
export function createTrafficSUV(colorHex: number): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.35,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111622,
    roughness: 0.1,
    metalness: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181c,
    roughness: 0.7,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1020,
    emissive: 0xee0011,
    emissiveIntensity: 1.8,
  });

  // Chassis
  const lowerGeo = new THREE.BoxGeometry(1.6, 0.32, 4.2);
  const lower = new THREE.Mesh(lowerGeo, trimMat);
  lower.position.y = 0.3;
  lower.castShadow = true;
  group.add(lower);

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.62, 0.58, 4.0);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.65;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.4, 0.55, 2.4);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.15, 0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof Rack Rails
  const railGeo = new THREE.BoxGeometry(0.06, 0.06, 1.8);
  const railL = new THREE.Mesh(railGeo, trimMat);
  railL.position.set(-0.55, 1.48, 0.2);
  group.add(railL);

  const railR = new THREE.Mesh(railGeo, trimMat);
  railR.position.set(0.55, 1.48, 0.2);
  group.add(railR);

  // Taillights
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.05), tailMat);
  tailL.position.set(-0.52, 0.75, 2.02);
  group.add(tailL);

  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.05), tailMat);
  tailR.position.set(0.52, 0.75, 2.02);
  group.add(tailR);

  // Wheels
  const wheelPositions = [
    [-0.82, 0.36, -1.3],
    [0.82, 0.36, -1.3],
    [-0.82, 0.36, 1.3],
    [0.82, 0.36, 1.3],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheelMesh();
    wheel.scale.set(1.08, 1.08, 1.08);
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  });

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(2.4, 4.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  return {
    group,
    wheels,
    bodyMesh,
    shadowMesh,
    bbox: new THREE.Box3(new THREE.Vector3(-0.85, 0, -2.1), new THREE.Vector3(0.85, 1.5, 2.1)),
  };
}

/**
 * Creates a gleaming 3D Gold Coin with embossed star
 */
export function createCoin(): { group: THREE.Group; mesh: THREE.Mesh; shadow: THREE.Mesh } {
  const group = new THREE.Group();

  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffbb00,
    metalness: 0.88,
    roughness: 0.18,
    emissive: 0x885500,
    emissiveIntensity: 0.25,
  });

  // Coin cylinder
  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24);
  coinGeo.rotateX(Math.PI / 2); // Stand upright facing camera
  const mesh = new THREE.Mesh(coinGeo, coinMat);
  mesh.castShadow = true;
  group.add(mesh);

  // Outer ring ridge
  const ringGeo = new THREE.TorusGeometry(0.36, 0.045, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffd533,
    metalness: 0.95,
    roughness: 0.12,
  });
  const ringFront = new THREE.Mesh(ringGeo, ringMat);
  ringFront.position.z = 0.052;
  group.add(ringFront);

  const ringBack = new THREE.Mesh(ringGeo, ringMat);
  ringBack.position.z = -0.052;
  group.add(ringBack);

  // 5-pointed star emblem in center (approximated with overlapping tetrahedrons or star shape)
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffea66,
    metalness: 0.9,
    roughness: 0.15,
  });

  for (let s = 0; s < 5; s++) {
    const armGeo = new THREE.ConeGeometry(0.08, 0.28, 4);
    armGeo.rotateZ((s * 72 * Math.PI) / 180);
    const arm = new THREE.Mesh(armGeo, starMat);
    arm.position.z = 0.054;
    group.add(arm);

    const armBack = arm.clone();
    armBack.position.z = -0.054;
    group.add(armBack);
  }

  // Soft coin shadow plane directly on asphalt
  const shadowGeo = new THREE.PlaneGeometry(0.7, 0.7);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Lift coin off ground
  mesh.position.y = 0.65;
  ringFront.position.y = 0.65;
  ringBack.position.y = 0.65;

  return { group, mesh, shadow };
}

/**
 * Creates a Mediterranean Palm Tree
 */
export function createPalmTree(): THREE.Group {
  const group = new THREE.Group();

  // Curved segmented trunk
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6e5033,
    roughness: 0.9,
    metalness: 0.05,
  });

  const curveSegments = 6;
  let currentY = 0;
  let currentX = 0;
  const lean = (Math.random() - 0.5) * 0.35;

  for (let i = 0; i < curveSegments; i++) {
    const bottomR = 0.28 - i * 0.028;
    const topR = 0.26 - i * 0.028;
    const h = 0.75;
    const segGeo = new THREE.CylinderGeometry(topR, bottomR, h, 7);
    const seg = new THREE.Mesh(segGeo, trunkMat);
    seg.position.set(currentX + lean * 0.5, currentY + h / 2, 0);
    seg.rotation.z = -lean * 0.6;
    seg.castShadow = true;
    group.add(seg);

    currentY += h;
    currentX += lean * 0.4;
  }

  // Palm fronds (leaf canopy)
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2e8b35,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const leafCount = 9;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2;
    const leafGeo = new THREE.BufferGeometry();
    
    // Curving leaf shape
    const w = 0.45;
    const l = 2.4;
    const vertices = new Float32Array([
      0, 0, 0,
      -w, -0.4, l * 0.5,
      w, -0.4, l * 0.5,

      -w, -0.4, l * 0.5,
      0, -1.0, l,
      w, -0.4, l * 0.5,
    ]);
    leafGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    leafGeo.computeVertexNormals();

    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(currentX, currentY, 0);
    leafMesh.rotation.y = angle;
    leafMesh.rotation.x = 0.35 + (Math.random() * 0.2);
    leafMesh.castShadow = true;
    group.add(leafMesh);
  }

  return group;
}

/**
 * Creates coastal rock / cliff boulder
 */
export function createCliffRock(): THREE.Mesh {
  const geo = new THREE.DodecahedronGeometry(1.4 + Math.random() * 1.2, 1);
  // Deform slightly for natural rough stone
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = (Math.sin(x * 3) + Math.cos(y * 3) + Math.sin(z * 3)) * 0.12;
    pos.setXYZ(i, x + noise, y + noise, z + noise);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a7a68, // Warm sandstone
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const rock = new THREE.Mesh(geo, mat);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

/**
 * Creates coastal chevron road warning sign (yellow with black chevron)
 */
export function createWarningSign(): THREE.Group {
  const group = new THREE.Group();

  // Metal pole
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.4,
    metalness: 0.8,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 0.9;
  pole.castShadow = true;
  group.add(pole);

  // Yellow chevron sign plate
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 128;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(35, 20);
  ctx.lineTo(85, 64);
  ctx.lineTo(35, 108);
  ctx.lineTo(55, 108);
  ctx.lineTo(105, 64);
  ctx.lineTo(55, 20);
  ctx.closePath();
  ctx.fill();

  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;

  const plateGeo = new THREE.BoxGeometry(0.65, 0.65, 0.04);
  const plateMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.3,
    metalness: 0.2,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 1.45, 0.02);
  plate.castShadow = true;
  group.add(plate);

  return group;
}

/**
 * Creates coastal guardrail segment
 */
export function createGuardrailSegment(length: number): THREE.Group {
  const group = new THREE.Group();
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.85,
  });

  // W-beam horizontal rail
  const railGeo = new THREE.BoxGeometry(0.08, 0.28, length);
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.y = 0.65;
  rail.castShadow = true;
  group.add(rail);

  // Vertical posts every 3 meters
  const postSpacing = 3.0;
  const count = Math.floor(length / postSpacing);
  for (let i = 0; i <= count; i++) {
    const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const post = new THREE.Mesh(postGeo, railMat);
    const z = -length / 2 + i * postSpacing;
    post.position.set(0, 0.4, z);
    post.castShadow = true;
    group.add(post);
  }

  return group;
}

/**
 * Creates distant Mediterranean lighthouse on rocky island
 */
export function createLighthouse(): THREE.Group {
  const group = new THREE.Group();

  // Rocky base island
  const rockGeo = new THREE.DodecahedronGeometry(6, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6355, roughness: 0.95 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.scale.set(1.4, 0.6, 1.2);
  rock.position.y = 1.5;
  group.add(rock);

  // Striped tower
  const towerHeight = 10;
  const segments = 5;
  const segHeight = towerHeight / segments;

  for (let i = 0; i < segments; i++) {
    const isRed = i % 2 === 1;
    const rBottom = 1.3 - i * 0.12;
    const rTop = 1.3 - (i + 1) * 0.12;
    const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight, 16);
    const segMat = new THREE.MeshStandardMaterial({
      color: isRed ? 0xcc2222 : 0xf0f0f0,
      roughness: 0.4,
    });
    const seg = new THREE.Mesh(segGeo, segMat);
    seg.position.y = 3.5 + i * segHeight + segHeight / 2;
    group.add(seg);
  }

  // Lantern room and roof
  const lanternGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.2, 12);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffe688,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const lantern = new THREE.Mesh(lanternGeo, lanternMat);
  lantern.position.y = 3.5 + towerHeight + 0.6;
  group.add(lantern);

  // Red cone roof
  const roofGeo = new THREE.ConeGeometry(1.0, 1.2, 12);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.5 + towerHeight + 1.8;
  group.add(roof);

  // Revolving beacon beam
  const beaconGroup = new THREE.Group();
  beaconGroup.name = 'beacon';
  beaconGroup.position.y = 3.5 + towerHeight + 0.6;

  const beamGeo = new THREE.ConeGeometry(4.0, 32, 16, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, -16);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff0aa,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beaconGroup.add(beam);
  group.add(beaconGroup);

  return group;
}

/**
 * Creates coastal Mediterranean pine / umbrella pine tree
 */
export function createPineTree(): THREE.Group {
  const group = new THREE.Group();

  // Bark trunk
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 5, 8);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.5;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage (umbrella dome style)
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x255220,
    roughness: 0.85,
    flatShading: true,
  });
  const topGeo = new THREE.DodecahedronGeometry(2.3, 1);
  const foliage = new THREE.Mesh(topGeo, foliageMat);
  foliage.scale.set(1.4, 0.7, 1.4);
  foliage.position.y = 4.8;
  foliage.castShadow = true;
  group.add(foliage);

  const lowerGeo = new THREE.DodecahedronGeometry(2.7, 1);
  const lowerFoliage = new THREE.Mesh(lowerGeo, foliageMat);
  lowerFoliage.scale.set(1.6, 0.55, 1.6);
  lowerFoliage.position.y = 4.2;
  lowerFoliage.castShadow = true;
  group.add(lowerFoliage);

  return group;
}


/**
 * Creates distant sailboat drifting on the sea
 */
export function createSailboat(): THREE.Group {
  const group = new THREE.Group();

  // White boat hull
  const hullGeo = new THREE.BoxGeometry(1.2, 0.8, 3.6);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.2;
  group.add(hull);

  // Mast
  const mastGeo = new THREE.CylinderGeometry(0.05, 0.05, 4.5, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0, 2.4, 0);
  group.add(mast);

  // White triangular sail
  const sailGeo = new THREE.BufferGeometry();
  const sailVertices = new Float32Array([
    0, 4.3, -0.1,
    0, 0.8, -1.8,
    0, 0.8, 0,
  ]);
  sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVertices, 3));
  sailGeo.computeVertexNormals();

  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const sail = new THREE.Mesh(sailGeo, sailMat);
  group.add(sail);

  return group;
}

/**
 * Creates 3D Horseshoe Magnet Power-up Model
 */
export function createMagnetModel(): { group: THREE.Group; mesh: THREE.Group; shadow: THREE.Mesh } {
  const group = new THREE.Group();
  const mesh = new THREE.Group();

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x991b1b,
    emissiveIntensity: 0.35,
  });

  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.35,
  });

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.9,
  });

  // Base curve (bottom horizontal bar)
  const baseGeo = new THREE.BoxGeometry(0.7, 0.18, 0.18);
  const base = new THREE.Mesh(baseGeo, redMat);
  mesh.add(base);

  // Left prong (Red)
  const armLGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
  const armL = new THREE.Mesh(armLGeo, redMat);
  armL.position.set(-0.26, 0.28, 0);
  mesh.add(armL);

  // Left tip (Silver)
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.19), silverMat);
  tipL.position.set(-0.26, 0.58, 0);
  mesh.add(tipL);

  // Right prong (Blue)
  const armR = new THREE.Mesh(armLGeo, blueMat);
  armR.position.set(0.26, 0.28, 0);
  mesh.add(armR);

  // Right tip (Silver)
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.19), silverMat);
  tipR.position.set(0.26, 0.58, 0);
  mesh.add(tipR);

  // Glowing magnetic aura ring around prongs
  const auraGeo = new THREE.TorusGeometry(0.48, 0.035, 8, 20);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.35;
  mesh.add(aura);

  // Lift mesh off ground
  mesh.position.y = 0.65;
  group.add(mesh);

  // Contact shadow
  const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, mesh, shadow };
}

/**
 * Creates 3D Nitro Turbo / Speed Boost Model
 */
export function createNitroModel(): { group: THREE.Group; mesh: THREE.Group; shadow: THREE.Mesh } {
  const group = new THREE.Group();
  const mesh = new THREE.Group();

  const cyanCanisterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x0891b2,
    emissiveIntensity: 0.45,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.95,
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
  });

  // Cylinder bottle
  const bottleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.72, 16);
  const bottle = new THREE.Mesh(bottleGeo, cyanCanisterMat);
  bottle.castShadow = true;
  mesh.add(bottle);

  // Top cap & nozzle
  const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12);
  const cap = new THREE.Mesh(capGeo, chromeMat);
  cap.position.y = 0.44;
  mesh.add(cap);

  const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8);
  const nozzle = new THREE.Mesh(nozzleGeo, chromeMat);
  nozzle.position.y = 0.58;
  mesh.add(nozzle);

  // Lightning bolt emblem on front
  const boltGeo = new THREE.ConeGeometry(0.08, 0.32, 3);
  boltGeo.rotateZ(0.4);
  const bolt1 = new THREE.Mesh(boltGeo, flameMat);
  bolt1.position.set(0, 0.08, 0.25);
  mesh.add(bolt1);

  const bolt2 = new THREE.Mesh(boltGeo, flameMat);
  bolt2.position.set(0, -0.08, 0.25);
  bolt2.rotation.z = Math.PI + 0.4;
  mesh.add(bolt2);

  // Glowing energy ring
  const auraGeo = new THREE.TorusGeometry(0.42, 0.04, 8, 20);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.7,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  mesh.add(aura);

  mesh.position.y = 0.65;
  group.add(mesh);

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, mesh, shadow };
}

/**
 * Modern Curved Coastal Highway Lamp Post with warm emissive LED fixture
 */
export function createHighwayLamp(isLeft: boolean = true): THREE.Group {
  const group = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.75,
  });

  const fixtureMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.6,
  });

  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xffedd5,
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });

  // Vertical pole
  const verticalPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.2, 12), poleMat);
  verticalPole.position.y = 2.6;
  verticalPole.castShadow = true;
  group.add(verticalPole);

  // Horizontal cantilever arm extending over road
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 10), poleMat);
  arm.rotation.z = isLeft ? -Math.PI / 3 : Math.PI / 3;
  arm.position.set(isLeft ? 0.9 : -0.9, 5.5, 0);
  group.add(arm);

  // Lamp fixture head
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.7), fixtureMat);
  fixture.position.set(isLeft ? 1.8 : -1.8, 5.9, 0);
  group.add(fixture);

  // Downward warm light emitter
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.58), lightMat);
  light.position.set(isLeft ? 1.8 : -1.8, 5.82, 0);
  group.add(light);

  // Subtle warm road illumination glow cone
  const glowGeo = new THREE.ConeGeometry(3.2, 5.5, 12, 1, true);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(isLeft ? 1.8 : -1.8, 2.8, 0);
  group.add(glow);

  return group;
}

/**
 * Mediterranean Flower Bushes / Bougainvillea shrubs
 */
export function createCoastalBushes(): THREE.Group {
  const group = new THREE.Group();

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.9,
    metalness: 0.05,
  });

  const flowerColors = [0xe11d48, 0xf43f5e, 0xf59e0b, 0xd946ef];
  const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
  const flowerMat = new THREE.MeshStandardMaterial({
    color: flowerColor,
    roughness: 0.8,
    metalness: 0.1,
  });

  // Base shrub clusters
  const clusterCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < clusterCount; i++) {
    const r = 0.45 + Math.random() * 0.35;
    const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), foliageMat);
    sphere.position.set(
      (Math.random() - 0.5) * 0.9,
      r * 0.7,
      (Math.random() - 0.5) * 0.9
    );
    sphere.castShadow = true;
    group.add(sphere);

    // Blossom dots
    if (Math.random() > 0.3) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 6, 6), flowerMat);
      flower.position.copy(sphere.position).add(new THREE.Vector3(0, r * 0.45, 0));
      group.add(flower);
    }
  }

  return group;
}

/**
 * Coastal Scenic Wooden Post-and-Rail Fence
 */
export function createBeachFence(length: number = 8): THREE.Group {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.9,
    metalness: 0.05,
  });

  // 2 horizontal rails
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
  railGeo.rotateX(Math.PI / 2);

  const topRail = new THREE.Mesh(railGeo, woodMat);
  topRail.position.y = 0.75;
  topRail.castShadow = true;
  group.add(topRail);

  const bottomRail = new THREE.Mesh(railGeo, woodMat);
  bottomRail.position.y = 0.4;
  bottomRail.castShadow = true;
  group.add(bottomRail);

  // Vertical posts every 2m
  const postsCount = Math.floor(length / 2) + 1;
  for (let i = 0; i < postsCount; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 8), woodMat);
    post.position.set(0, 0.47, -length / 2 + i * 2);
    post.castShadow = true;
    group.add(post);
  }

  return group;
}


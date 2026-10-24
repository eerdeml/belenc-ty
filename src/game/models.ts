/**
 * Procedural 3D assets for Coastal Highway Racing game.
 * All models are procedurally assembled Three.js groups (zero 404 dependencies).
 */

import * as THREE from 'three';

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
 * Creates the Player Red Supercar (matching the reference image)
 */
export function createPlayerCar(): CarParts {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  // Red car paint material
  const bodyPaintMat = new THREE.MeshStandardMaterial({
    color: 0xee1526, // Vibrant supercar red
    roughness: 0.18,
    metalness: 0.35,
  });

  // Dark glass material
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0c121d,
    roughness: 0.08,
    metalness: 0.9,
  });

  // Black trim / carbon material
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
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

  // 5. Rear louvers (slats on the back window like the reference picture)
  for (let i = 0; i < 4; i++) {
    const louverGeo = new THREE.BoxGeometry(0.85, 0.03, 0.1);
    const louver = new THREE.Mesh(louverGeo, darkTrimMat);
    louver.position.set(0, 0.84 - i * 0.07, 0.78 + i * 0.16);
    louver.rotation.x = 0.2;
    group.add(louver);
  }

  // 6. Distinct horizontal rear light bars (wide LED strip with angled edges)
  const tailLightLeftGeo = new THREE.BoxGeometry(0.48, 0.08, 0.05);
  const tailLightLeft = new THREE.Mesh(tailLightLeftGeo, tailLightMat);
  tailLightLeft.position.set(-0.45, 0.52, 1.81);
  group.add(tailLightLeft);

  const tailLightRightGeo = new THREE.BoxGeometry(0.48, 0.08, 0.05);
  const tailLightRight = new THREE.Mesh(tailLightRightGeo, tailLightMat);
  tailLightRight.position.set(0.45, 0.52, 1.81);
  group.add(tailLightRight);

  // 7. Headlights
  const headLightL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.05), headLightMat);
  headLightL.position.set(-0.52, 0.46, -1.81);
  group.add(headLightL);

  const headLightR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.05), headLightMat);
  headLightR.position.set(0.52, 0.46, -1.81);
  group.add(headLightR);

  // 8. Rear diffuser & dual exhaust pipes
  const diffuserGeo = new THREE.BoxGeometry(1.3, 0.18, 0.2);
  const diffuser = new THREE.Mesh(diffuserGeo, darkTrimMat);
  diffuser.position.set(0, 0.24, 1.8);
  group.add(diffuser);

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x999999,
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

  // 9. Side mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.09, 0.12);
  const mirrorL = new THREE.Mesh(mirrorGeo, bodyPaintMat);
  mirrorL.position.set(-0.76, 0.74, -0.4);
  group.add(mirrorL);

  const mirrorR = new THREE.Mesh(mirrorGeo, bodyPaintMat);
  mirrorR.position.set(0.76, 0.74, -0.4);
  group.add(mirrorR);

  // 10. Wheels (4 positions)
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

  // 11. Soft contact shadow on ground
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

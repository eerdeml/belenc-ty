/**
 * Dynamic Coastal Weather & Atmospheric Effects System for Three.js.
 * Handles dynamic fog, sun glare, lens flare, coastal mist, sunset, and snowy coastal weather.
 */

import * as THREE from 'three';

export type WeatherMode = 'sunny' | 'sunset' | 'mist' | 'snowy';

export interface WeatherConfig {
  name: WeatherMode;
  labelTr: string;
  icon: string;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  dirLightColor: THREE.Color;
  dirLightIntensity: number;
  dirLightPos: THREE.Vector3;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  oceanColor: THREE.Color;
  sunFlareColor: THREE.Color;
  sunFlareScale: number;
  mistDensity: number;
}

// Procedural sun flare texture generator
function createSunFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Multi-stop radial glow
  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 120);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.12, 'rgba(255, 245, 210, 0.9)');
  grad.addColorStop(0.3, 'rgba(255, 200, 110, 0.45)');
  grad.addColorStop(0.6, 'rgba(255, 150, 50, 0.15)');
  grad.addColorStop(1, 'rgba(255, 120, 20, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Soft cross streak
  ctx.fillStyle = 'rgba(255, 250, 230, 0.18)';
  ctx.fillRect(0, 126, 256, 4);
  ctx.fillRect(126, 0, 4, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural soft mist particle texture
function createMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(0.5, 'rgba(235, 245, 255, 0.25)');
  grad.addColorStop(1, 'rgba(220, 235, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural circular soft snowflake texture
function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.4, 'rgba(240, 248, 255, 0.7)');
  grad.addColorStop(0.8, 'rgba(220, 240, 255, 0.2)');
  grad.addColorStop(1, 'rgba(220, 240, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunSprite: THREE.Sprite;
  private sunCoronaSprite: THREE.Sprite;
  private mistGroup: THREE.Group;
  private mistParticles: THREE.Mesh[] = [];

  // Snow Particle System
  private snowPoints: THREE.Points;
  private snowGeo: THREE.BufferGeometry;
  private snowMat: THREE.PointsMaterial;
  private snowPositions: Float32Array;
  private snowVelocities: Float32Array;
  private readonly SNOW_COUNT = 320;

  // Weather presets
  private configs: Record<WeatherMode, WeatherConfig> = {
    sunny: {
      name: 'sunny',
      labelTr: 'Güneşli Sahil',
      icon: '☀️',
      skyColor: new THREE.Color(0x60a5fa),
      fogColor: new THREE.Color(0x89c7f9),
      fogDensity: 0.007,
      dirLightColor: new THREE.Color(0xfff3db),
      dirLightIntensity: 2.4,
      dirLightPos: new THREE.Vector3(35, 45, 20),
      hemiSkyColor: new THREE.Color(0x9bd8ff),
      hemiGroundColor: new THREE.Color(0xd49b5c),
      hemiIntensity: 1.4,
      oceanColor: new THREE.Color(0x0ca6d4),
      sunFlareColor: new THREE.Color(0xffeec2),
      sunFlareScale: 28,
      mistDensity: 0.2,
    },
    sunset: {
      name: 'sunset',
      labelTr: 'Altın Gün Batımı',
      icon: '🌅',
      skyColor: new THREE.Color(0xe05e26),
      fogColor: new THREE.Color(0xf26e25),
      fogDensity: 0.008,
      dirLightColor: new THREE.Color(0xff8c3b),
      dirLightIntensity: 2.1, // Warm, steady, non-blinding intensity
      dirLightPos: new THREE.Vector3(60, 28, -70),
      hemiSkyColor: new THREE.Color(0xfdba74),
      hemiGroundColor: new THREE.Color(0x7c2d12),
      hemiIntensity: 1.5,
      oceanColor: new THREE.Color(0xbd3c14),
      sunFlareColor: new THREE.Color(0xff9d3b),
      sunFlareScale: 32,
      mistDensity: 0.25,
    },
    mist: {
      name: 'mist',
      labelTr: 'Sahil Sisi',
      icon: '🌫️',
      skyColor: new THREE.Color(0x94a3b8),
      fogColor: new THREE.Color(0xcbd5e1),
      fogDensity: 0.016,
      dirLightColor: new THREE.Color(0xdbeafe),
      dirLightIntensity: 1.6,
      dirLightPos: new THREE.Vector3(25, 35, 10),
      hemiSkyColor: new THREE.Color(0xcbd5e1),
      hemiGroundColor: new THREE.Color(0x64748b),
      hemiIntensity: 1.8,
      oceanColor: new THREE.Color(0x155e75),
      sunFlareColor: new THREE.Color(0xe2e8f0),
      sunFlareScale: 18,
      mistDensity: 1.0,
    },
    snowy: {
      name: 'snowy',
      labelTr: 'Karlı Sahil',
      icon: '❄️',
      skyColor: new THREE.Color(0x64748b),
      fogColor: new THREE.Color(0xcad5e2),
      fogDensity: 0.013,
      dirLightColor: new THREE.Color(0xe0f2fe),
      dirLightIntensity: 1.8,
      dirLightPos: new THREE.Vector3(20, 38, 15),
      hemiSkyColor: new THREE.Color(0xcbd5e1),
      hemiGroundColor: new THREE.Color(0x475569),
      hemiIntensity: 1.4,
      oceanColor: new THREE.Color(0x0f2744), // Icy deep coastal waters
      sunFlareColor: new THREE.Color(0xdbeafe),
      sunFlareScale: 14,
      mistDensity: 0.35,
    },
  };

  private currentMode: WeatherMode = 'sunny';
  private targetMode: WeatherMode = 'sunny';
  private transitionAlpha: number = 1.0;
  private autoCycle: boolean = true;
  private cycleTimer: number = 0;

  // Active interpolated values
  private currentSkyColor = new THREE.Color();
  private currentFogColor = new THREE.Color();
  private currentDirColor = new THREE.Color();
  private currentHemiSky = new THREE.Color();
  private currentHemiGround = new THREE.Color();
  private currentOceanColor = new THREE.Color();
  private currentDirPos = new THREE.Vector3();
  private baseFlareScale: number = 28;

  constructor(
    scene: THREE.Scene,
    dirLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;

    // 1. Procedural Sun Flare Sprite Billboard
    const flareTex = createSunFlareTexture();
    const flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      color: 0xffeedd,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunSprite = new THREE.Sprite(flareMat);
    this.sunSprite.scale.set(30, 30, 1);
    this.sunSprite.position.set(45, 42, -90);
    this.scene.add(this.sunSprite);

    // Corona wide aura
    const coronaMat = new THREE.SpriteMaterial({
      map: flareTex,
      color: 0xffaa33,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunCoronaSprite = new THREE.Sprite(coronaMat);
    this.sunCoronaSprite.scale.set(55, 55, 1);
    this.sunCoronaSprite.position.copy(this.sunSprite.position);
    this.scene.add(this.sunCoronaSprite);

    // 2. Coastal Mist & Sea Spray Particle System
    this.mistGroup = new THREE.Group();
    this.scene.add(this.mistGroup);

    const mistTex = createMistTexture();
    const mistGeo = new THREE.PlaneGeometry(8, 5);
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    // Create pooled mist planes along the road & ocean side
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(mistGeo, mistMat.clone());
      mesh.position.set(
        (Math.random() - 0.3) * 35,
        0.8 + Math.random() * 2.5,
        -i * 12
      );
      mesh.rotation.y = (Math.random() - 0.5) * 0.5;
      mesh.rotation.x = -0.15;
      mesh.scale.set(1 + Math.random() * 0.8, 1 + Math.random() * 0.5, 1);
      this.mistGroup.add(mesh);
      this.mistParticles.push(mesh);
    }

    // 3. Falling Snowflakes Particle System (for snowy mode)
    const snowTex = createSnowflakeTexture();
    this.snowGeo = new THREE.BufferGeometry();
    this.snowPositions = new Float32Array(this.SNOW_COUNT * 3);
    this.snowVelocities = new Float32Array(this.SNOW_COUNT * 3);

    for (let i = 0; i < this.SNOW_COUNT; i++) {
      const i3 = i * 3;
      this.snowPositions[i3] = (Math.random() - 0.5) * 45; // X
      this.snowPositions[i3 + 1] = Math.random() * 25 + 0.5; // Y
      this.snowPositions[i3 + 2] = -Math.random() * 120; // Z relative
      // Drift speeds
      this.snowVelocities[i3] = (Math.random() - 0.5) * 1.5; // X drift
      this.snowVelocities[i3 + 1] = -(2.5 + Math.random() * 3.5); // Fall speed Y
      this.snowVelocities[i3 + 2] = (Math.random() - 0.5) * 1.5; // Z drift
    }

    this.snowGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowPositions, 3)
    );

    this.snowMat = new THREE.PointsMaterial({
      map: snowTex,
      size: 0.65,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.snowPoints = new THREE.Points(this.snowGeo, this.snowMat);
    this.scene.add(this.snowPoints);

    // Initialize with sunny config
    this.applyInstantConfig(this.configs.sunny);
  }

  private applyInstantConfig(cfg: WeatherConfig) {
    this.currentSkyColor.copy(cfg.skyColor);
    this.currentFogColor.copy(cfg.fogColor);
    this.currentDirColor.copy(cfg.dirLightColor);
    this.currentHemiSky.copy(cfg.hemiSkyColor);
    this.currentHemiGround.copy(cfg.hemiGroundColor);
    this.currentOceanColor.copy(cfg.oceanColor);
    this.currentDirPos.copy(cfg.dirLightPos);
    this.baseFlareScale = cfg.sunFlareScale;

    this.scene.background = this.currentSkyColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentFogColor);
      this.scene.fog.density = cfg.fogDensity;
    }
    this.dirLight.color.copy(this.currentDirColor);
    this.dirLight.intensity = cfg.dirLightIntensity;
    this.hemiLight.color.copy(this.currentHemiSky);
    this.hemiLight.groundColor.copy(this.currentHemiGround);
    this.hemiLight.intensity = cfg.hemiIntensity;

    this.sunSprite.scale.set(this.baseFlareScale, this.baseFlareScale, 1);
    this.sunCoronaSprite.scale.set(this.baseFlareScale * 1.8, this.baseFlareScale * 1.8, 1);
  }

  public setWeather(mode: WeatherMode, manualOverride: boolean = true) {
    if (manualOverride) {
      this.autoCycle = false;
    }
    this.targetMode = mode;
    this.transitionAlpha = 0.0;
  }

  public nextWeather(): WeatherMode {
    const sequence: WeatherMode[] = ['sunny', 'sunset', 'mist', 'snowy'];
    const nextIdx = (sequence.indexOf(this.targetMode) + 1) % sequence.length;
    const nextMode = sequence[nextIdx];
    this.setWeather(nextMode, true);
    return nextMode;
  }

  public getWeatherMode(): WeatherMode {
    return this.targetMode;
  }

  public isAutoCycling(): boolean {
    return this.autoCycle;
  }

  public toggleAutoCycle(): boolean {
    this.autoCycle = !this.autoCycle;
    return this.autoCycle;
  }

  public update(playerZ: number, delta: number, oceanMaterial?: THREE.MeshStandardMaterial) {
    // 1. Auto weather cycle if enabled (changes roughly every 50 seconds of driving)
    if (this.autoCycle) {
      this.cycleTimer += delta;
      if (this.cycleTimer > 50) {
        this.cycleTimer = 0;
        const sequence: WeatherMode[] = ['sunny', 'sunset', 'mist', 'snowy'];
        const nextIdx = (sequence.indexOf(this.currentMode) + 1) % sequence.length;
        this.targetMode = sequence[nextIdx];
        this.transitionAlpha = 0.0;
      }
    }

    // 2. Smooth Lerp transition between weather configs
    const fromCfg = this.configs[this.currentMode];
    const toCfg = this.configs[this.targetMode];

    if (this.transitionAlpha < 1.0) {
      this.transitionAlpha = Math.min(1.0, this.transitionAlpha + delta * 0.4); // ~2.5s smooth transition

      this.currentSkyColor.lerpColors(fromCfg.skyColor, toCfg.skyColor, this.transitionAlpha);
      this.currentFogColor.lerpColors(fromCfg.fogColor, toCfg.fogColor, this.transitionAlpha);
      this.currentDirColor.lerpColors(fromCfg.dirLightColor, toCfg.dirLightColor, this.transitionAlpha);
      this.currentHemiSky.lerpColors(fromCfg.hemiSkyColor, toCfg.hemiSkyColor, this.transitionAlpha);
      this.currentHemiGround.lerpColors(fromCfg.hemiGroundColor, toCfg.hemiGroundColor, this.transitionAlpha);
      this.currentOceanColor.lerpColors(fromCfg.oceanColor, toCfg.oceanColor, this.transitionAlpha);
      this.currentDirPos.lerpVectors(fromCfg.dirLightPos, toCfg.dirLightPos, this.transitionAlpha);

      const curDensity = THREE.MathUtils.lerp(fromCfg.fogDensity, toCfg.fogDensity, this.transitionAlpha);
      const curDirInt = THREE.MathUtils.lerp(fromCfg.dirLightIntensity, toCfg.dirLightIntensity, this.transitionAlpha);
      const curHemiInt = THREE.MathUtils.lerp(fromCfg.hemiIntensity, toCfg.hemiIntensity, this.transitionAlpha);
      this.baseFlareScale = THREE.MathUtils.lerp(fromCfg.sunFlareScale, toCfg.sunFlareScale, this.transitionAlpha);

      this.scene.background = this.currentSkyColor;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(this.currentFogColor);
        this.scene.fog.density = curDensity;
      }
      this.dirLight.color.copy(this.currentDirColor);
      this.dirLight.intensity = curDirInt;
      this.hemiLight.color.copy(this.currentHemiSky);
      this.hemiLight.groundColor.copy(this.currentHemiGround);
      this.hemiLight.intensity = curHemiInt;

      if (this.transitionAlpha >= 1.0) {
        this.currentMode = this.targetMode;
      }
    }

    // 3. Steady Sun Flare in sky (NO strobing or runaway scale multiplication!)
    const sunOffsetX = this.targetMode === 'sunset' ? 62 : 45;
    const sunOffsetY = this.targetMode === 'sunset' ? 18 : 38;
    const sunOffsetZ = -140;

    this.sunSprite.position.set(sunOffsetX, sunOffsetY, playerZ + sunOffsetZ);
    this.sunCoronaSprite.position.copy(this.sunSprite.position);

    // Fixed, peaceful scale based on interpolated preset (avoids the annoying flickering pulse)
    this.sunSprite.scale.set(this.baseFlareScale, this.baseFlareScale, 1);
    this.sunCoronaSprite.scale.set(this.baseFlareScale * 1.8, this.baseFlareScale * 1.8, 1);

    // In snowy weather, dim the sun flare significantly
    const isSnowy = this.targetMode === 'snowy';
    this.sunSprite.visible = !isSnowy || this.transitionAlpha < 1.0;
    this.sunCoronaSprite.visible = this.sunSprite.visible;

    // 4. Update Ocean color & specular reflection
    if (oceanMaterial) {
      oceanMaterial.color.copy(this.currentOceanColor);
      if (this.targetMode === 'sunset') {
        oceanMaterial.roughness = 0.12;
        oceanMaterial.metalness = 0.55;
      } else if (this.targetMode === 'mist') {
        oceanMaterial.roughness = 0.32;
        oceanMaterial.metalness = 0.2;
      } else if (this.targetMode === 'snowy') {
        oceanMaterial.roughness = 0.25;
        oceanMaterial.metalness = 0.4;
      } else {
        oceanMaterial.roughness = 0.15;
        oceanMaterial.metalness = 0.45;
      }
    }

    // 5. Update Mist Particles (recycles smoothly around player)
    const mistTargetOpacity = toCfg.mistDensity * 0.22;
    const time = Date.now() * 0.001;

    for (let i = 0; i < this.mistParticles.length; i++) {
      const p = this.mistParticles[i];
      const mat = p.material as THREE.MeshBasicMaterial;

      mat.opacity += (mistTargetOpacity - mat.opacity) * Math.min(1, delta * 2);
      p.position.x += Math.sin(time + i) * delta * 0.3;

      if (p.position.z > playerZ + 20) {
        p.position.z = playerZ - 200 - Math.random() * 40;
        p.position.x = (Math.random() - 0.3) * 40;
      }
    }

    // 6. Update Snowy Particles (gentle flutter & rapid pass-by)
    const targetSnowOpacity = this.targetMode === 'snowy' ? 0.9 : 0.0;
    this.snowMat.opacity += (targetSnowOpacity - this.snowMat.opacity) * Math.min(1, delta * 2.5);

    if (this.snowMat.opacity > 0.01) {
      const posAttr = this.snowGeo.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.SNOW_COUNT; i++) {
        const i3 = i * 3;
        // Fall down
        positions[i3 + 1] += this.snowVelocities[i3 + 1] * delta;
        // Sway sideways
        positions[i3] += Math.sin(time * 2 + i) * delta * 0.8;

        // If snowflake reaches ground or drops too low, respawn high ahead
        if (positions[i3 + 1] < 0.2 || positions[i3 + 2] > playerZ + 15) {
          positions[i3] = (Math.random() - 0.5) * 45;
          positions[i3 + 1] = Math.random() * 20 + 6;
          positions[i3 + 2] = playerZ - Math.random() * 110 - 10;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.sunSprite);
    this.scene.remove(this.sunCoronaSprite);
    this.scene.remove(this.mistGroup);
    this.scene.remove(this.snowPoints);
    this.snowGeo.dispose();
    this.snowMat.dispose();
  }
}

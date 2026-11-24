import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { SpecialtyItem } from '../data/neurologyData';

interface HolographicBrain3DProps {
  activeSpecialty: SpecialtyItem;
  autoOrbit: boolean;
  exploded: boolean;
  resetSignal: number;
  scrollProgressRef: React.MutableRefObject<number>;
}

// Pre-allocated math helpers outside the render loop (zero GC in tick)
const _dummy = new THREE.Object3D();
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vMid = new THREE.Vector3();
const _vFocus = new THREE.Vector3();
const _cTmp = new THREE.Color();
const _cGold = new THREE.Color('#ffd373');
const _cBlue = new THREE.Color('#4cb6ff');
const _cWarm = new THREE.Color('#ff9d3b');

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Procedurally sculpts an anatomically recognizable cerebral hemisphere with
 * frontal, temporal, parietal, and occipital proportions + gyri/sulci folding.
 */
function createHemisphereGeometry(side: -1 | 1): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.92, 4);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Normalize direction
    const nx = v.x;
    const ny = v.y;
    const nz = v.z;

    // Flatten medial wall facing the longitudinal fissure
    const isMedial = side * nx < 0;
    let x = nx * 0.62;
    if (isMedial) {
      x *= 0.24;
    }

    // Elongate anterior-posterior (Z) and shape dorsal arch (Y)
    let y = ny * 0.84;
    let z = nz * 1.18;

    // Slight frontal pole fullness (+Z) and occipital taper (-Z)
    if (z > 0) {
      x *= 0.96 - 0.1 * Math.max(0, z - 0.5);
      y += 0.08 * Math.max(0, 1 - Math.abs(z - 0.35));
    } else {
      y *= 0.94;
      x *= 0.94;
    }

    // Temporal lobe lateral-inferior bulge
    const temporalMask =
      Math.exp(-Math.pow((z - 0.08) / 0.52, 2)) *
      Math.exp(-Math.pow((y + 0.32) / 0.36, 2)) *
      (isMedial ? 0.1 : 1.0);
    x += side * temporalMask * 0.16;
    y -= temporalMask * 0.12;

    // Concave base for brainstem & cerebellum tuck
    if (y < -0.25 && z < 0.15) {
      y += 0.18 * Math.exp(-Math.pow((z + 0.45) / 0.55, 2));
    }

    // Organic cortical gyri & sulci folding via layered trigonometric waves
    const foldA = Math.sin(nx * 10.5 + nz * 7.2 + ny * 4.5);
    const foldB = Math.cos(nz * 12.2 - ny * 9.8 + nx * 5.1);
    const foldC = Math.sin((nx * side + ny) * 14.0 - nz * 8.4);
    const gyri = (foldA * 0.45 + foldB * 0.35 + foldC * 0.2) * (isMedial ? 0.022 : 0.056);

    const len = Math.max(0.001, Math.hypot(x, y, z));
    x += (x / len) * gyri;
    y += (y / len) * gyri;
    z += (z / len) * gyri;

    // Shift hemisphere outward from longitudinal fissure
    x += side * 0.34;
    y += 0.16;

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a soft procedural radial glow texture on an offscreen canvas.
 */
function createRadialGlowTexture(
  innerColor: string,
  midColor: string,
  outerColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.38, midColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function HolographicBrain3D({
  activeSpecialty,
  autoOrbit,
  exploded,
  resetSignal,
  scrollProgressRef,
}: HolographicBrain3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    focusPoint: new THREE.Vector3(...activeSpecialty.focusPoint),
    targetAzimuth: activeSpecialty.cameraAngle[0],
    targetElevation: activeSpecialty.cameraAngle[1],
    accentColor: new THREE.Color(activeSpecialty.accentHex),
    autoOrbit,
    exploded,
    manualOverrideUntil: 0,
    orbitResetVersion: 0,
  });

  // Sync props to mutable ref without recreating WebGL context
  useEffect(() => {
    stateRef.current.focusPoint.set(...activeSpecialty.focusPoint);
    stateRef.current.targetAzimuth = activeSpecialty.cameraAngle[0];
    stateRef.current.targetElevation = activeSpecialty.cameraAngle[1];
    stateRef.current.accentColor.set(activeSpecialty.accentHex);
    stateRef.current.orbitResetVersion += 1;
  }, [activeSpecialty]);

  useEffect(() => {
    stateRef.current.autoOrbit = autoOrbit;
  }, [autoOrbit]);

  useEffect(() => {
    stateRef.current.exploded = exploded;
  }, [exploded]);

  useEffect(() => {
    stateRef.current.manualOverrideUntil = 0;
  }, [resetSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(360, container.clientHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050b18, 0.068);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    camera.position.set(0, 0.65, 5.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x050b18, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.maxWidth = '100%';
    container.appendChild(renderer.domElement);

    // Studio environment reflection for brushed-gold pedestal & glass rings
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    // Balanced warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0x7cc4ff, 0x101c36, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffdca0, 2.2);
    keyLight.position.set(3.5, 4.5, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b9eff, 1.9);
    rimLight.position.set(-4.0, 2.5, -3.5);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0xffb94a, 2.4, 7.5);
    coreLight.position.set(0, 0.15, 0.25);
    scene.add(coreLight);

    const underLight = new THREE.PointLight(0x38bdf8, 1.8, 6.0);
    underLight.position.set(0, -1.2, 0.6);
    scene.add(underLight);

    // Track disposable resources cleanly
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Root hero assembly group
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, -0.05, 0);
    scene.add(rootGroup);

    // -------------------------------------------------------------
    // 1. COMPOSITE HOLOGRAPHIC BRAIN GROUP (Left/Right + Cerebellum + Stem)
    // -------------------------------------------------------------
    const brainAssembly = new THREE.Group();
    brainAssembly.position.set(0, 0.34, 0);
    rootGroup.add(brainAssembly);

    // Fresnel holographic cortex shader material (translucent sapphire + warm gold rim)
    const cortexShaderMat = trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        uniforms: {
          uTime: { value: 0 },
          uFocus: { value: new THREE.Vector3(...activeSpecialty.focusPoint) },
          uBaseColor: { value: new THREE.Color('#1d72f2') },
          uRimColor: { value: new THREE.Color('#5ce1ff') },
          uFocusColor: { value: new THREE.Color('#ffbd4a') },
        },
        vertexShader: `
          varying vec3 vNormalWorld;
          varying vec3 vViewDir;
          varying vec3 vLocalPos;
          void main() {
            vLocalPos = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vNormalWorld = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uFocus;
          uniform vec3 uBaseColor;
          uniform vec3 uRimColor;
          uniform vec3 uFocusColor;
          varying vec3 vNormalWorld;
          varying vec3 vViewDir;
          varying vec3 vLocalPos;

          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormalWorld), normalize(vViewDir)), 0.0), 2.35);
            float scan = 0.5 + 0.5 * sin(vLocalPos.y * 16.0 - uTime * 2.4 + vLocalPos.x * 6.0);
            float distFocus = distance(vLocalPos, uFocus);
            float focusGlow = exp(-distFocus * distFocus * 3.1) * (0.78 + 0.22 * sin(uTime * 3.6));

            vec3 col = mix(uBaseColor * 0.55, uRimColor * 1.15, fresnel);
            col += uRimColor * scan * 0.14;
            col = mix(col, uFocusColor * 1.65, clamp(focusGlow * 0.92, 0.0, 0.95));

            float alpha = clamp(0.18 + fresnel * 0.68 + focusGlow * 0.45, 0.0, 0.92);
            gl_FragColor = vec4(col, alpha);
          }
        `,
      })
    );

    const wireCortexMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x67d3ff,
        wireframe: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const leftHemiGeo = trackGeo(createHemisphereGeometry(-1));
    const rightHemiGeo = trackGeo(createHemisphereGeometry(1));

    const leftHemiGroup = new THREE.Group();
    const rightHemiGroup = new THREE.Group();

    const leftHemiMesh = new THREE.Mesh(leftHemiGeo, cortexShaderMat);
    const leftHemiWire = new THREE.Mesh(leftHemiGeo, wireCortexMat);
    leftHemiWire.scale.setScalar(1.008);
    leftHemiGroup.add(leftHemiMesh, leftHemiWire);

    const rightHemiMesh = new THREE.Mesh(rightHemiGeo, cortexShaderMat);
    const rightHemiWire = new THREE.Mesh(rightHemiGeo, wireCortexMat);
    rightHemiWire.scale.setScalar(1.008);
    rightHemiGroup.add(rightHemiMesh, rightHemiWire);

    brainAssembly.add(leftHemiGroup, rightHemiGroup);

    // Brainstem (curved TubeGeometry descending into the holographic beam)
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.22, -0.04),
      new THREE.Vector3(0, -0.56, -0.14),
      new THREE.Vector3(0, -0.98, -0.22),
      new THREE.Vector3(0, -1.32, -0.25),
    ]);
    const stemGeo = trackGeo(new THREE.TubeGeometry(stemCurve, 24, 0.14, 14, false));
    const stemMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x58c4ff,
        emissive: 0x1e64c8,
        emissiveIntensity: 0.9,
        roughness: 0.28,
        metalness: 0.15,
        transparent: true,
        opacity: 0.8,
      })
    );
    const brainstemMesh = new THREE.Mesh(stemGeo, stemMat);
    brainAssembly.add(brainstemMesh);

    // -------------------------------------------------------------
    // 2. CORTICAL NEURAL PATHWAYS & SYNAPTIC FIRING PARTICLES
    // -------------------------------------------------------------
    const leftPositions = leftHemiGeo.attributes.position;
    const rightPositions = rightHemiGeo.attributes.position;
    const sampleNodes: THREE.Vector3[] = [];

    // Sample surface vertices from both hemispheres for authentic neural network anchors
    const stepL = Math.max(1, Math.floor(leftPositions.count / 90));
    for (let i = 0; i < leftPositions.count; i += stepL) {
      sampleNodes.push(
        new THREE.Vector3(
          leftPositions.getX(i),
          leftPositions.getY(i),
          leftPositions.getZ(i)
        )
      );
    }
    const stepR = Math.max(1, Math.floor(rightPositions.count / 90));
    for (let i = 0; i < rightPositions.count; i += stepR) {
      sampleNodes.push(
        new THREE.Vector3(
          rightPositions.getX(i),
          rightPositions.getY(i),
          rightPositions.getZ(i)
        )
      );
    }

    // Build curved intra-hemispheric & corpus-callosum neural tracts
    const tractSegments: number[] = [];
    const tractColors: number[] = [];
    const pulsePaths: { a: THREE.Vector3; b: THREE.Vector3; mid: THREE.Vector3; speed: number; phase: number; warm: boolean }[] = [];

    for (let i = 0; i < sampleNodes.length; i++) {
      const a = sampleNodes[i];
      // Connect to 2 nearby neighbors
      let connections = 0;
      for (let j = i + 1; j < sampleNodes.length && connections < 2; j++) {
        const b = sampleNodes[j];
        const dist = a.distanceTo(b);
        if (dist > 0.26 && dist < 0.72) {
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
          mid.multiplyScalar(0.92); // tuck slightly inward through white matter
          tractSegments.push(a.x, a.y, a.z, mid.x, mid.y, mid.z);
          tractSegments.push(mid.x, mid.y, mid.z, b.x, b.y, b.z);

          const isWarm = (i + j) % 5 === 0;
          const c = isWarm ? _cGold : _cBlue;
          for (let k = 0; k < 4; k++) {
            tractColors.push(c.r, c.g, c.b);
          }

          if (pulsePaths.length < 150) {
            pulsePaths.push({
              a: a.clone(),
              b: b.clone(),
              mid,
              speed: 0.35 + ((i * 17 + j * 31) % 100) * 0.006,
              phase: ((i * 23 + j * 13) % 100) * 0.01,
              warm: (i + j) % 3 !== 0,
            });
          }
          connections++;
        }
      }
    }

    const tractsGeo = trackGeo(new THREE.BufferGeometry());
    tractsGeo.setAttribute('position', new THREE.Float32BufferAttribute(tractSegments, 3));
    tractsGeo.setAttribute('color', new THREE.Float32BufferAttribute(tractColors, 3));
    const tractsMat = trackMat(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const neuralTracts = new THREE.LineSegments(tractsGeo, tractsMat);
    brainAssembly.add(neuralTracts);

    // InstancedMesh for glowing synaptic impulses travelling along neural tracts
    const pulseCount = pulsePaths.length;
    const pulseGeo = trackGeo(new THREE.SphereGeometry(0.024, 8, 8));
    const pulseMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const pulseInstances = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
    pulseInstances.frustumCulled = false;
    for (let i = 0; i < pulseCount; i++) {
      _cTmp.copy(pulsePaths[i].warm ? _cGold : _cBlue);
      pulseInstances.setColorAt(i, _cTmp);
    }
    if (pulseInstances.instanceColor) {
      pulseInstances.instanceColor.needsUpdate = true;
    }
    brainAssembly.add(pulseInstances);

    // -------------------------------------------------------------
    // 3. TARGETED NEURAL REGION FOCUS BEACON
    // -------------------------------------------------------------
    const focusBeacon = new THREE.Group();
    const beaconCore = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.085, 16, 16)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xffe094,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );
    const beaconRing1 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.19, 0.011, 10, 40)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xf6c86e,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );
    const beaconRing2 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.28, 0.007, 8, 40)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x58c4ff,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );
    focusBeacon.add(beaconCore, beaconRing1, beaconRing2);
    focusBeacon.position.copy(stateRef.current.focusPoint);
    brainAssembly.add(focusBeacon);

    // -------------------------------------------------------------
    // 4. FUTURISTIC GLASS CONTAINMENT CHAMBER & BRUSHED-GOLD PEDESTAL
    // -------------------------------------------------------------
    const chamberGroup = new THREE.Group();
    rootGroup.add(chamberGroup);

    const brushedGoldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe8b44c,
        metalness: 0.92,
        roughness: 0.2,
        clearcoat: 0.4,
        emissive: 0x452a05,
        emissiveIntensity: 0.22,
      })
    );

    const darkTitaniumMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0d1b33,
        metalness: 0.82,
        roughness: 0.34,
      })
    );

    const emitterRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffce6b,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      })
    );

    // Multi-tier LatheGeometry pedestal (grounded at bottom)
    const pedestalProfile = [
      new THREE.Vector2(0.01, -1.62),
      new THREE.Vector2(1.92, -1.62),
      new THREE.Vector2(1.88, -1.5),
      new THREE.Vector2(1.66, -1.46),
      new THREE.Vector2(1.62, -1.36),
      new THREE.Vector2(1.42, -1.32),
      new THREE.Vector2(0.01, -1.32),
    ];
    const pedestalGeo = trackGeo(new THREE.LatheGeometry(pedestalProfile, 56));
    const pedestalMesh = new THREE.Mesh(pedestalGeo, darkTitaniumMat);
    chamberGroup.add(pedestalMesh);

    // Brushed-gold pedestal trim rings
    const lowerGoldRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.78, 0.032, 14, 72)),
      brushedGoldMat
    );
    lowerGoldRim.rotation.x = Math.PI / 2;
    lowerGoldRim.position.y = -1.48;
    chamberGroup.add(lowerGoldRim);

    const innerEmitterRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.44, 0.022, 12, 72)),
      emitterRingMat
    );
    innerEmitterRim.rotation.x = Math.PI / 2;
    innerEmitterRim.position.y = -1.33;
    chamberGroup.add(innerEmitterRim);

    // Top brushed-gold holographic crown ring
    const topChamberGroup = new THREE.Group();
    const topGoldRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.48, 0.04, 16, 72)),
      brushedGoldMat
    );
    topGoldRing.rotation.x = Math.PI / 2;
    topGoldRing.position.y = 1.62;
    topChamberGroup.add(topGoldRing);

    const topEnergyRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.42, 0.014, 10, 72)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x6bd4ff,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    topEnergyRing.rotation.x = Math.PI / 2;
    topEnergyRing.position.y = 1.56;
    topChamberGroup.add(topEnergyRing);
    chamberGroup.add(topChamberGroup);

    // Subtle open-ended cylindrical holographic glass shell (depthWrite: false, zero extra render pass)
    const glassCylinderMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x5dbbff,
        transparent: true,
        opacity: 0.09,
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 1.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const glassCylinder = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.45, 1.42, 2.94, 48, 1, true)),
      glassCylinderMat
    );
    glassCylinder.position.y = 0.14;
    glassCylinder.renderOrder = 10;
    chamberGroup.add(glassCylinder);

    // Soft glowing holographic contact pad underneath the brain
    const padTex = createRadialGlowTexture(
      'rgba(255, 210, 115, 0.85)',
      'rgba(56, 178, 255, 0.35)',
      'rgba(5, 11, 24, 0.0)'
    );
    textures.push(padTex);
    const glowPad = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(3.2, 3.2)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: padTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    glowPad.rotation.x = -Math.PI / 2;
    glowPad.position.y = -1.3;
    chamberGroup.add(glowPad);

    // Orbiting futuristic telemetry coordinate rings (counter-rotating 3D gyroscope)
    const orbitRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.76, 0.01, 8, 96)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x4ca8ff,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    orbitRing.rotation.x = Math.PI / 2.4;
    orbitRing.position.y = 0.28;
    chamberGroup.add(orbitRing);

    const gyroGoldRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.94, 0.012, 10, 96)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xf6c86e,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    gyroGoldRing.rotation.x = Math.PI / 1.75;
    gyroGoldRing.rotation.y = 0.45;
    gyroGoldRing.position.y = 0.22;
    chamberGroup.add(gyroGoldRing);

    // Volumetric upward holographic projection beam from the brushed-gold emitter
    const beamMat = trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float verticalFade = pow(1.0 - vUv.y, 1.85);
            float shimmer = 0.78 + 0.22 * sin(vUv.y * 18.0 - uTime * 2.8);
            vec3 col = mix(vec3(0.24, 0.72, 1.0), vec3(0.96, 0.78, 0.43), 1.0 - vUv.y);
            gl_FragColor = vec4(col, verticalFade * shimmer * 0.16);
          }
        `,
      })
    );
    const projectionBeam = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.32, 0.96, 2.7, 36, 1, true)),
      beamMat
    );
    projectionBeam.position.y = 0.05;
    chamberGroup.add(projectionBeam);

    // Dynamic 3D focus trajectory laser line connecting pedestal emitter to active brain lobe
    const beamLinePositions = new Float32Array([0, -1.28, 0, 0, 0, 0]);
    const beamLineGeo = trackGeo(new THREE.BufferGeometry());
    beamLineGeo.setAttribute('position', new THREE.BufferAttribute(beamLinePositions, 3));
    const beamLineMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0xffd373,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const focusBeamLine = new THREE.Line(beamLineGeo, beamLineMat);
    brainAssembly.add(focusBeamLine);

    // Floating ambient micro-sparks inside the glass chamber
    const sparkCount = 96;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkSpeeds = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      const r = 0.3 + Math.random() * 1.08;
      const theta = Math.random() * Math.PI * 2;
      sparkPositions[i * 3] = Math.cos(theta) * r;
      sparkPositions[i * 3 + 1] = -1.2 + Math.random() * 2.6;
      sparkPositions[i * 3 + 2] = Math.sin(theta) * r;
      sparkSpeeds[i] = 0.12 + Math.random() * 0.25;
    }
    const sparkGeo = trackGeo(new THREE.BufferGeometry());
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = trackMat(
      new THREE.PointsMaterial({
        color: 0x8fd6ff,
        size: 0.036,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const sparkField = new THREE.Points(sparkGeo, sparkMat);
    chamberGroup.add(sparkField);

    // Pre-warm shaders on GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------
    // INTERACTIVE POINTER DRAG ORBIT
    // -------------------------------------------------------------
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let currentAzimuth = stateRef.current.targetAzimuth;
    let currentElevation = stateRef.current.targetElevation;
    let dragAzimuth = currentAzimuth;
    let dragElevation = currentElevation;

    const canvasEl = renderer.domElement;
    canvasEl.style.cursor = 'grab';
    canvasEl.style.touchAction = 'pan-y';

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dragAzimuth = currentAzimuth;
      dragElevation = currentElevation;
      stateRef.current.manualOverrideUntil = performance.now() + 9000;
      canvasEl.style.cursor = 'grabbing';
      canvasEl.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragAzimuth -= dx * 0.009;
      dragElevation = THREE.MathUtils.clamp(dragElevation + dy * 0.006, -0.45, 0.72);
      stateRef.current.manualOverrideUntil = performance.now() + 9000;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      canvasEl.style.cursor = 'grab';
      try {
        canvasEl.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture already released
      }
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointercancel', onPointerUp);

    // ResizeObserver for crisp responsive fitting (supports 320px+ mobile screens cleanly)
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(220, container.clientWidth);
      const h = Math.max(260, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Pause rendering when scrolled out of viewport for peak page performance
    let isVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    // -------------------------------------------------------------
    // ANIMATION LOOP (Software-WebGL afterDraw paced + zero GC)
    // -------------------------------------------------------------
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let orbitSpin = 0;
    let seenOrbitReset = stateRef.current.orbitResetVersion;
    let explodeFactor = 0;
    const currentFocus = stateRef.current.focusPoint.clone();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    }

    function scheduleNext() {
      if (disposed) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!isVisible) {
        frameId = window.setTimeout(tick, 180);
        return;
      }

      if (!reducedMotion) {
        elapsed += dt;
      }

      const st = stateRef.current;

      // Smoothly damp focus point toward selected specialty's brain lobe
      const focusAlpha = 1 - Math.exp(-5.5 * dt);
      currentFocus.lerp(st.focusPoint, focusAlpha);
      cortexShaderMat.uniforms.uTime.value = elapsed;
      cortexShaderMat.uniforms.uFocus.value.copy(currentFocus);
      cortexShaderMat.uniforms.uFocusColor.value.lerp(st.accentColor, focusAlpha);
      beamMat.uniforms.uTime.value = elapsed;

      // Update focus beacon & trajectory line from emitter to active brain lobe
      focusBeacon.position.copy(currentFocus);
      focusBeacon.lookAt(camera.position);
      beaconRing1.rotation.z = elapsed * 1.1;
      beaconRing2.rotation.z = -elapsed * 0.75;
      const beaconPulse = 0.92 + 0.14 * Math.sin(elapsed * 3.4);
      beaconRing1.scale.setScalar(beaconPulse);

      const linePosAttr = beamLineGeo.attributes.position as THREE.BufferAttribute;
      linePosAttr.setXYZ(1, currentFocus.x, currentFocus.y, currentFocus.z);
      linePosAttr.needsUpdate = true;

      // Smoothly damp exploded layers state
      const targetExplode = st.exploded ? 1 : 0;
      explodeFactor = THREE.MathUtils.damp(explodeFactor, targetExplode, 5.0, dt);
      leftHemiGroup.position.x = -0.34 * explodeFactor;
      rightHemiGroup.position.x = 0.34 * explodeFactor;
      topChamberGroup.position.y = 0.28 * explodeFactor;

      // Subtle floating levitation of the brain assembly
      brainAssembly.position.y = 0.34 + Math.sin(elapsed * 1.35) * 0.05;

      // Counter-rotate orbiting 3D gyroscopic telemetry hoops (livelier holographic pace)
      orbitRing.rotation.z = elapsed * 0.42;
      orbitRing.rotation.y = elapsed * 0.3;
      gyroGoldRing.rotation.z = -elapsed * 0.32;
      gyroGoldRing.rotation.y = -elapsed * 0.38 + 0.45;

      // Animate synaptic impulse particles along cortical tracts (zero allocations)
      for (let i = 0; i < pulseCount; i++) {
        const p = pulsePaths[i];
        const t = (elapsed * p.speed + p.phase) % 1;
        const oneMinusT = 1 - t;
        _vA.copy(p.a).multiplyScalar(oneMinusT * oneMinusT);
        _vMid.copy(p.mid).multiplyScalar(2 * oneMinusT * t);
        _vB.copy(p.b).multiplyScalar(t * t);
        _vFocus.copy(_vA).add(_vMid).add(_vB);

        if (explodeFactor > 0.001) {
          _vFocus.x += (_vFocus.x < 0 ? -0.28 : 0.28) * explodeFactor;
        }

        _dummy.position.copy(_vFocus);
        const proximity = _vFocus.distanceTo(currentFocus);
        const boost = proximity < 0.55 ? 1.55 : 0.85;
        const sc = (0.65 + 0.55 * Math.sin(t * Math.PI)) * boost;
        _dummy.scale.setScalar(sc);
        _dummy.updateMatrix();
        pulseInstances.setMatrixAt(i, _dummy.matrix);

        if (proximity < 0.55) {
          _cTmp.copy(_cWarm);
        } else {
          _cTmp.copy(p.warm ? _cGold : _cBlue);
        }
        pulseInstances.setColorAt(i, _cTmp);
      }
      pulseInstances.instanceMatrix.needsUpdate = true;
      if (pulseInstances.instanceColor) {
        pulseInstances.instanceColor.needsUpdate = true;
      }

      // Gently drift ambient chamber sparks upward
      if (!reducedMotion) {
        const sAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < sparkCount; i++) {
          let sy = sAttr.getY(i) + sparkSpeeds[i] * dt;
          if (sy > 1.48) sy = -1.2;
          sAttr.setY(i, sy);
        }
        sAttr.needsUpdate = true;
      }

      // Camera kinematics: blend drag, slightly faster continuous auto-orbit, specialty focus, and scroll parallax
      if (st.orbitResetVersion !== seenOrbitReset) {
        seenOrbitReset = st.orbitResetVersion;
        orbitSpin = 0;
      }

      const scrollBias = (scrollProgressRef.current - 0.35) * 0.65;
      const isManual = isDragging || now < st.manualOverrideUntil;
      let desiredAzimuth: number;
      let desiredElevation: number;

      if (isManual) {
        desiredAzimuth = dragAzimuth;
        desiredElevation = dragElevation;
      } else {
        if (st.autoOrbit && !reducedMotion) {
          orbitSpin += dt * 0.42;
        }
        desiredAzimuth = st.targetAzimuth + orbitSpin + scrollBias * 0.45;
        desiredElevation = THREE.MathUtils.clamp(st.targetElevation + scrollBias * 0.16, -0.35, 0.62);
      }

      currentAzimuth = THREE.MathUtils.damp(currentAzimuth, desiredAzimuth, 4.6, dt);
      currentElevation = THREE.MathUtils.damp(currentElevation, desiredElevation, 4.6, dt);

      const radius = camera.aspect < 0.95 ? 5.65 : 5.05;
      camera.position.x = Math.sin(currentAzimuth) * Math.cos(currentElevation) * radius;
      camera.position.y = 0.25 + Math.sin(currentElevation) * radius * 0.62;
      camera.position.z = Math.cos(currentAzimuth) * Math.cos(currentElevation) * radius;
      camera.lookAt(0, 0.15, 0);

      // Pulse core lighting subtly
      coreLight.intensity = 2.15 + 0.35 * Math.sin(elapsed * 2.2);

      renderer.render(scene, camera);
      scheduleNext();
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      io.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointercancel', onPointerUp);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === container) {
        container.removeChild(canvasEl);
      }
    };
  }, [scrollProgressRef]);

  return (
    <div
      ref={mountRef}
      className="relative h-[380px] w-full min-w-0 max-w-full overflow-hidden select-none sm:h-[500px] lg:h-[620px] xl:h-[660px]"
      aria-label="Interactive 3D holographic brain model"
    />
  );
}

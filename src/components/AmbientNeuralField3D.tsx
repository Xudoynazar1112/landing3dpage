import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AmbientNeuralField3DProps {
  scrollProgressRef: React.MutableRefObject<number>;
}

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
 * Lightweight 3D background neural constellation that responds to page scroll
 * with smooth depth parallax. Uses only 2 draw calls (Points + LineSegments)
 * and guards software WebGL via afterDraw pacing.
 */
export function AmbientNeuralField3D({
  scrollProgressRef,
}: AmbientNeuralField3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050b18, 0);
    container.appendChild(renderer.domElement);

    // Deterministic seeded-like distribution of 3D neural constellation nodes
    const nodeCount = 96;
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const nodes: THREE.Vector3[] = [];
    const cBlue = new THREE.Color('#4eb8ff');
    const cGold = new THREE.Color('#f4c15d');

    for (let i = 0; i < nodeCount; i++) {
      const a = i * 2.3999632; // golden angle
      const radius = 3.5 + ((i * 37) % 100) * 0.11;
      const x = Math.cos(a) * radius * 1.4;
      const y = (((i * 53) % 100) / 100 - 0.5) * 18;
      const z = Math.sin(a) * radius - 3;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      nodes.push(new THREE.Vector3(x, y, z));

      const col = i % 4 === 0 ? cGold : cBlue;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pointsMat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);

    // Connect nearby 3D neural nodes with delicate synaptic filaments
    const linePos: number[] = [];
    const lineCol: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      let links = 0;
      for (let j = i + 1; j < nodeCount && links < 2; j++) {
        const d = nodes[i].distanceTo(nodes[j]);
        if (d < 4.4) {
          linePos.push(
            nodes[i].x,
            nodes[i].y,
            nodes[i].z,
            nodes[j].x,
            nodes[j].y,
            nodes[j].z
          );
          const c = (i + j) % 5 === 0 ? cGold : cBlue;
          lineCol.push(c.r, c.g, c.b, c.r, c.g, c.b);
          links++;
        }
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    linesGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));
    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const linesMesh = new THREE.LineSegments(linesGeo, linesMat);

    const fieldGroup = new THREE.Group();
    fieldGroup.add(pointsMesh, linesMesh);
    scene.add(fieldGroup);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let currentScroll = 0;

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
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 110);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 120);
      }
    }

    function tick() {
      if (disposed) return;

      if (document.hidden) {
        frameId = window.setTimeout(tick, 300);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!reducedMotion) {
        elapsed += dt;
      }

      currentScroll = THREE.MathUtils.damp(
        currentScroll,
        scrollProgressRef.current,
        3.5,
        dt
      );

      // Smooth 3D camera flight & rotation driven by scroll
      fieldGroup.rotation.y = elapsed * 0.035 + currentScroll * 0.85;
      fieldGroup.rotation.x = Math.sin(elapsed * 0.08) * 0.08 + currentScroll * 0.25;
      fieldGroup.position.y = currentScroll * 4.2 - 1.2;
      camera.position.z = 14 - currentScroll * 2.4;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      pointsGeo.dispose();
      pointsMat.dispose();
      linesGeo.dispose();
      linesMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollProgressRef]);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-75"
      aria-hidden="true"
    />
  );
}

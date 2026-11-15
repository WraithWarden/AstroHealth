import { useEffect, useRef, useState } from 'react';
import nasaLogoUrl from '../assets/nasa-logo.svg';

// 3D anchor positions in astronaut local space (feet ~ -1.85, helmet top ~ +1.80)
export const NODE_ANCHORS_3D = {
  brain: [-0.14, 1.65, 0.28],
  eyes: [0.16, 1.30, 0.42],
  lungs: [-0.22, 0.64, 0.34],
  heart: [0.22, 0.64, 0.34],
  whole: [0.10, 0.04, 0.34],
  bones: [-0.24, -0.82, 0.26],
};

/** Generate a subtle woven/ribbed fabric bump map so the white EMU suit has realistic 3D relief. */
function createSuitWeaveTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle cross-weave + horizontal pressure pleats
  for (let y = 0; y < 128; y += 4) {
    ctx.fillStyle = y % 16 === 0 ? 'rgba(90,90,90,0.28)' : 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, y, 128, 2);
  }
  for (let x = 0; x < 128; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(130,130,130,0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, 0, 2, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 8);
  return tex;
}

/** Rasterize the official NASA SVG emblem onto a crisp CanvasTexture for the chest DCM. */
function createNasaBadgeTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 214;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (ctx) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      tex.needsUpdate = true;
    };
    img.src = nasaLogoUrl;
  }

  return tex;
}

/** Build a sculpted 3D Planetes-inspired international-orange EVA spacesuit. */
function buildAstronautModel(THREE) {
  const root = new THREE.Group();
  const weaveTex = createSuitWeaveTexture(THREE);

  // Planetes EVA orange suit fabric
  const whiteSuitMat = new THREE.MeshStandardMaterial({
    color: 0xd95922,
    emissive: 0x260b02,
    emissiveIntensity: 0.25,
    roughness: 0.68,
    metalness: 0.08,
    bumpMap: weaveTex,
    bumpScale: 0.018,
  });

  // Helmet burnt-orange outer shell
  const orangeShellMat = new THREE.MeshStandardMaterial({
    color: 0xe26228,
    emissive: 0x240a02,
    emissiveIntensity: 0.2,
    roughness: 0.36,
    metalness: 0.16,
  });

  // Off-white / warm light-gray chest pack, hoses & PLSS tank hardware
  const hardShellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e4dc,
    roughness: 0.42,
    metalness: 0.14,
  });

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.80,
  });

  // Charcoal-slate harness bands & straps (crisp contrast against orange)
  const redStripeMat = new THREE.MeshStandardMaterial({
    color: 0x262d38,
    roughness: 0.52,
    metalness: 0.24,
  });

  const darkSlateMat = new THREE.MeshStandardMaterial({
    color: 0x262d38,
    roughness: 0.58,
    metalness: 0.2,
  });

  const bootGrayMat = new THREE.MeshStandardMaterial({
    color: 0x333c4a,
    roughness: 0.60,
    metalness: 0.16,
  });

  // Deep smoked cobalt-slate reflective visor complementing burnt orange
  const goldVisorMat = new THREE.MeshPhysicalMaterial({
    color: 0x102a46,
    emissive: 0x061629,
    emissiveIntensity: 0.55,
    roughness: 0.09,
    metalness: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const addRing = (radius, tube, y, x = 0, z = 0, rx = Math.PI / 2, ry = 0, rz = 0, mat = silverMat) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 14, 36), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    root.add(mesh);
    return mesh;
  };

  // ── 1. Burnt-Orange Helmet, Side Headlamps & Reflective Visor ──
  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.41, 32, 24), orangeShellMat);
  helmetShell.position.set(0, 1.36, -0.02);
  helmetShell.scale.set(0.98, 1.04, 1.04);
  root.add(helmetShell);

  // Top visor cowl / sunshade brow
  const visorBrow = new THREE.Mesh(
    new THREE.TorusGeometry(0.365, 0.048, 12, 32, Math.PI * 1.15),
    orangeShellMat
  );
  visorBrow.position.set(0, 1.36, 0.07);
  visorBrow.rotation.z = -Math.PI * 0.075;
  root.add(visorBrow);

  // Twin side EMU helmet camera / headlamp pods
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.22), orangeShellMat);
    pod.position.set(side * 0.41, 1.44, 0.04);
    pod.rotation.z = side * -0.08;
    root.add(pod);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 14), darkSlateMat);
    lens.position.set(side * 0.41, 1.47, 0.145);
    lens.rotation.x = Math.PI / 2;
    root.add(lens);
  }

  // Iconic gold reflective bubble visor (phi centered at PI/2 faces +Z)
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 36, 28, Math.PI * 0.14, Math.PI * 0.72, Math.PI * 0.22, Math.PI * 0.54),
    goldVisorMat
  );
  visor.position.set(0, 1.33, 0.075);
  root.add(visor);

  // Neck disconnect silver ring + crimson trim
  addRing(0.33, 0.028, 0.99, 0, 0.01, Math.PI / 2, 0, 0, silverMat);
  addRing(0.34, 0.014, 0.96, 0, 0.01, Math.PI / 2, 0, 0, redStripeMat);

  // ── 2. White Upper Torso, Chest DCM & Umbilical Hose ──
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.56, 14, 32), whiteSuitMat);
  torso.position.set(0, 0.45, 0);
  torso.scale.set(1.06, 1.0, 0.74);
  root.add(torso);

  // Subtle shoulder pressure ridges
  for (let i = 0; i < 3; i++) {
    const fold = addRing(0.42 - i * 0.02, 0.022, 0.72 - i * 0.11, 0, 0.01, Math.PI / 2, 0, 0, whiteSuitMat);
    fold.scale.set(1.04, 0.74, 1);
  }

  // Front Display & Control Module (DCM) matching white/gray EMU chest pack
  const dcmBody = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.40, 0.22), hardShellMat);
  dcmBody.position.set(0, 0.50, 0.30);
  root.add(dcmBody);

  // Official NASA meatball emblem mounted cleanly on the white chest DCM face
  const nasaBadgeTex = createNasaBadgeTexture(THREE);
  const nasaBadgeMat = new THREE.MeshStandardMaterial({
    map: nasaBadgeTex,
    transparent: true,
    roughness: 0.44,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const nasaBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25 * (92 / 110)), nasaBadgeMat);
  // Offset +0.012 on X to compensate for the SVG chevron asymmetry (circle cx=50.05 in 110-wide viewBox)
  nasaBadge.position.set(0.012, 0.475, 0.413);
  root.add(nasaBadge);

  // DCM upper telemetry visor bar & right-side cylindrical purge valve
  const dcmLatch = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.24), silverMat);
  dcmLatch.position.set(0, 0.67, 0.30);
  root.add(dcmLatch);

  const dcmNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.26, 18), hardShellMat);
  dcmNozzle.position.set(0.20, 0.53, 0.37);
  root.add(dcmNozzle);

  const dcmPortCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16), darkSlateMat);
  dcmPortCap.position.set(0.20, 0.665, 0.37);
  root.add(dcmPortCap);

  // Lower-chest dark circular hose connector + looping white umbilical hose
  const hoseSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.05, 20), darkSlateMat);
  hoseSocket.position.set(-0.08, 0.20, 0.33);
  hoseSocket.rotation.x = Math.PI / 2;
  root.add(hoseSocket);

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.20, 0.36),
    new THREE.Vector3(-0.26, 0.13, 0.38),
    new THREE.Vector3(-0.46, 0.11, 0.28),
    new THREE.Vector3(-0.47, 0.19, 0.05),
    new THREE.Vector3(-0.38, 0.28, -0.18),
  ]);
  const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 24, 0.032, 12, false), hardShellMat);
  root.add(hoseMesh);

  // ── 3. Brushed Silver Waist Bearing Ring ──
  const waistRing = addRing(0.405, 0.038, -0.02, 0, 0, Math.PI / 2, 0, 0, silverMat);
  waistRing.scale.set(1.06, 0.78, 1);
  const waistLower = addRing(0.40, 0.02, -0.07, 0, 0, Math.PI / 2, 0, 0, whiteSuitMat);
  waistLower.scale.set(1.05, 0.78, 1);

  // ── 4. Off-White PLSS Life-Support Backpack & Overhead Cylinder ──
  const plss = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.12, 0.38), hardShellMat);
  plss.position.set(0, 0.62, -0.35);
  root.add(plss);

  const overheadTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.74, 10, 18), hardShellMat);
  overheadTank.position.set(0, 1.24, -0.34);
  overheadTank.rotation.z = Math.PI / 2;
  root.add(overheadTank);

  for (const side of [-1, 1]) {
    const redShoulderTrim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.24), redStripeMat);
    redShoulderTrim.position.set(side * 0.39, 1.13, -0.22);
    redShoulderTrim.rotation.z = side * -0.32;
    root.add(redShoulderTrim);

    const sideTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.68, 10, 16), silverMat);
    sideTank.position.set(side * 0.24, 0.56, -0.51);
    root.add(sideTank);
  }

  // ── 5. Pelvis, Red + Silver Thigh Commander Stripes, Legs & Gray EVA Boots ──
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.22, 10, 22), whiteSuitMat);
  pelvis.position.set(0, -0.20, 0);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(0.82, 1.0, 0.78);
  root.add(pelvis);

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.50, 12, 20), whiteSuitMat);
    thigh.position.set(side * 0.24, -0.58, 0.01);
    thigh.rotation.z = side * 0.03;
    root.add(thigh);

    // Classic NASA EMU red + silver upper-thigh bands
    addRing(0.186, 0.028, -0.46, side * 0.24, 0.01, Math.PI / 2, 0, side * 0.04, redStripeMat);
    addRing(0.185, 0.022, -0.52, side * 0.24, 0.01, Math.PI / 2, 0, side * 0.04, silverMat);

    // Knee bellows creases
    for (let k = -1; k <= 1; k++) {
      addRing(0.168, 0.018, -0.94 + k * 0.06, side * 0.25, 0.015, Math.PI / 2, 0, 0, whiteSuitMat);
    }

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.52, 12, 20), whiteSuitMat);
    shin.position.set(side * 0.25, -1.30, 0.0);
    root.add(shin);

    // Gray EVA Boot with crisp white rubber sole
    const bootUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.22, 20), bootGrayMat);
    bootUpper.position.set(side * 0.25, -1.65, 0.02);
    root.add(bootUpper);

    const bootToe = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.15, 0.42), bootGrayMat);
    bootToe.position.set(side * 0.26, -1.75, 0.09);
    root.add(bootToe);

    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.045, 0.44), hardShellMat);
    bootSole.position.set(side * 0.26, -1.84, 0.09);
    root.add(bootSole);
  }

  // ── 6. Articulated White Arms, Silver Wrist Rings & Two-Tone Gloves ──
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.185, 18, 16), whiteSuitMat);
    shoulder.position.set(side * 0.51, 0.74, 0);
    root.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.40, 10, 18), whiteSuitMat);
    upperArm.position.set(side * 0.63, 0.45, 0.02);
    upperArm.rotation.z = side * 0.24;
    root.add(upperArm);

    addRing(0.152, 0.018, 0.23, side * 0.70, 0.04, Math.PI / 2, side * -0.18, 0, whiteSuitMat);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.38, 10, 18), whiteSuitMat);
    forearm.position.set(side * 0.72, 0.02, 0.08);
    forearm.rotation.z = side * 0.06;
    forearm.rotation.x = -0.20;
    root.add(forearm);

    // Silver wrist bearing disconnect
    addRing(0.132, 0.020, -0.19, side * 0.74, 0.13, Math.PI / 2 - 0.18, 0, 0, silverMat);

    // Glove shell (charcoal gray like Planetes EVA gloves)
    const gloveOuter = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 14), bootGrayMat);
    gloveOuter.position.set(side * 0.75, -0.32, 0.15);
    gloveOuter.scale.set(0.86, 1.32, 0.92);
    root.add(gloveOuter);

    const glovePalm = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), darkSlateMat);
    glovePalm.position.set(side * 0.71, -0.34, 0.16);
    glovePalm.scale.set(0.62, 1.18, 0.85);
    root.add(glovePalm);
  }

  // ── 7. Subtle Cyan Holographic Scanner Base Ring ──
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.00, 64), ringMat);
  baseRing.position.set(0, -1.89, 0);
  baseRing.rotation.x = -Math.PI / 2;
  root.add(baseRing);

  return root;
}

/**
 * Interactive Three.js 3D Astronaut renderer.
 * Projects 3D anatomical coordinates onto 2D container percentages every frame
 * via direct callback updates so React does not re-render at 60fps.
 */
export default function Astronaut3D({ onProjectNodes, onFallback, dragHint = true }) {
  const containerRef = useRef(null);
  const projectCbRef = useRef(onProjectNodes);
  const fallbackCbRef = useRef(onFallback);
  const [rotated, setRotated] = useState(false);
  const resetViewRef = useRef(null);

  projectCbRef.current = onProjectNodes;
  fallbackCbRef.current = onFallback;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let frameId = 0;
    let renderer = null;
    let scene = null;
    let envRT = null;
    let resizeObserver = null;
    let cleanupListeners = null;

    (async () => {
      let THREE;
      try {
        THREE = await import('three');
      } catch {
        if (!cancelled) fallbackCbRef.current?.();
        return;
      }
      if (cancelled || !containerRef.current) return;

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        if (!cancelled) fallbackCbRef.current?.();
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      // Lightweight procedural studio softbox environment so the gold visor & silver rings gleam naturally
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x162238);
      const softboxMat = new THREE.MeshBasicMaterial({ color: 0xfff5e0 });
      const topPanel = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), softboxMat);
      topPanel.position.set(-2, 5, 4);
      topPanel.lookAt(0, 0, 0);
      envScene.add(topPanel);
      const sidePanel = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
      sidePanel.position.set(5, 1, 3);
      sidePanel.lookAt(0, 0, 0);
      envScene.add(sidePanel);
      envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
      topPanel.geometry.dispose();
      sidePanel.geometry.dispose();
      softboxMat.dispose();
      sidePanel.material.dispose();
      pmrem.dispose();
      const initialAspect = (container.clientWidth || 380) / (container.clientHeight || 520);
      const camera = new THREE.PerspectiveCamera(34, initialAspect, 0.1, 50);
      camera.position.set(0, 0.02, 7.45);
      camera.lookAt(0, -0.04, 0);

      // Balanced studio lighting tailored for the white suit + reflective gold visor
      scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.95));

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
      keyLight.position.set(-2.4, 3.6, 4.4);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.7);
      fillLight.position.set(2.8, 1.0, 3.2);
      scene.add(fillLight);

      const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.45);
      cyanRim.position.set(3.2, 2.0, -3.0);
      scene.add(cyanRim);

      // Warm golden glint light positioned to create realistic visor reflections
      const visorLight = new THREE.PointLight(0xffe6a3, 1.8, 8);
      visorLight.position.set(0.9, 2.2, 2.8);
      scene.add(visorLight);

      const suit = buildAstronautModel(THREE);
      scene.add(suit);

      const anchorEntries = Object.entries(NODE_ANCHORS_3D).map(([id, [x, y, z]]) => {
        const obj = new THREE.Object3D();
        obj.position.set(x, y, z);
        suit.add(obj);
        return [id, obj];
      });

      const syncSize = () => {
        if (!container || !renderer) return;
        const w = Math.max(container.clientWidth, 120);
        const h = Math.max(container.clientHeight, 160);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      syncSize();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(syncSize);
        resizeObserver.observe(container);
      }

      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let userYaw = 0;
      let userPitch = 0;
      let curYaw = 0;
      let curPitch = 0;

      resetViewRef.current = () => {
        userYaw = 0;
        userPitch = 0;
        setRotated(false);
      };

      const onPointerDown = (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        container.setPointerCapture?.(e.pointerId);
      };
      const onPointerMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        userYaw += dx * 0.011;
        userPitch = Math.max(-0.34, Math.min(0.34, userPitch + dy * 0.008));
        if (Math.abs(userYaw) > 0.06 || Math.abs(userPitch) > 0.06) {
          setRotated(true);
        }
      };
      const onPointerUp = (e) => {
        dragging = false;
        container.releasePointerCapture?.(e.pointerId);
      };
      const onDoubleClick = () => resetViewRef.current?.();

      container.addEventListener('pointerdown', onPointerDown);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerup', onPointerUp);
      container.addEventListener('pointercancel', onPointerUp);
      container.addEventListener('dblclick', onDoubleClick);

      cleanupListeners = () => {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointercancel', onPointerUp);
        container.removeEventListener('dblclick', onDoubleClick);
      };

      const worldVec = new THREE.Vector3();
      const projected = {};
      const startTime = performance.now();

      const animate = (now) => {
        if (cancelled) return;
        const t = (now - startTime) * 0.001;

        curYaw += (userYaw - curYaw) * 0.14;
        curPitch += (userPitch - curPitch) * 0.14;

        const idleSway = dragging ? 0 : Math.sin(t * 0.9) * 0.055;
        suit.rotation.y = curYaw + idleSway;
        suit.rotation.x = curPitch;
        suit.position.y = Math.sin(t * 1.35) * 0.025;

        suit.updateMatrixWorld(true);
        renderer.render(scene, camera);

        const suitDirZ = Math.cos(suit.rotation.y);
        for (let i = 0; i < anchorEntries.length; i++) {
          const [id, obj] = anchorEntries[i];
          obj.getWorldPosition(worldVec);
          const localFrontFacing = worldVec.z > -0.05 || suitDirZ > 0;
          worldVec.project(camera);
          projected[id] = {
            px: (worldVec.x * 0.5 + 0.5) * 100,
            py: (-worldVec.y * 0.5 + 0.5) * 100,
            front: localFrontFacing,
          };
        }
        projectCbRef.current?.(projected);

        frameId = requestAnimationFrame(animate);
      };

      frameId = requestAnimationFrame(animate);
    })();

    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      cleanupListeners?.();
      if (renderer) {
        envRT?.dispose?.();
        scene?.traverse((obj) => {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              m.map?.dispose?.();
              m.bumpMap?.dispose?.();
              m.dispose?.();
            });
          } else {
            obj.material?.map?.dispose?.();
            obj.material?.bumpMap?.dispose?.();
            obj.material?.dispose?.();
          }
        });
        renderer.dispose();
        renderer.domElement?.remove();
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          touchAction: 'none',
        }}
      />
      {dragHint && (
        <div style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: rotated ? 'auto' : 'none',
          zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9.5,
            color: 'rgba(148, 163, 184, 0.78)',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}>
            Drag to rotate 3D
          </span>
          {rotated && (
            <button
              type="button"
              onClick={() => resetViewRef.current?.()}
              style={{
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 9.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⟲ Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

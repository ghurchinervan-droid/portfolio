/* ============================================================
   NERONE N9 — real 3D hero logo (three.js + the Rhino OBJ export)
   Uses the OWN Rhino materials (red body + white/black inlays).
   Two models swap by theme:
     - assets/models/N9-white.obj  (red body + white letters, dark theme)
     - assets/models/N9-black.obj  (red body + black letters, light theme)
   Drag to spin 360° in any direction with inertia; scroll auto-flattens
   it; the red background wave follows the spin. Falls back to the flat
   <img> silently if WebGL or loading fails.
   ============================================================ */
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

const host = document.getElementById("heroBigLogo");
const bgBlobs = document.getElementById("bgBlobs");
if (host) {
  try { init(); } catch (e) { /* keep the <img> fallback */ }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "logo3d-canvas";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 600);
  camera.position.set(0, 0, 120);

  // studio lighting — bright and clean so the Rhino diffuse colours read true
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(55, 90, 140);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-90, -30, 60);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-40, 40, 130);
  scene.add(fill);

  // pose + rotation state — kept across model swaps (theme toggle)
  const group = new THREE.Group();
  scene.add(group);
  let holder = null;
  let rx = 0, ry = 0, vx = 0, vy = 0;

  function sizeCanvas() {
    const w = host.clientWidth || 300;
    renderer.setSize(w, w);
    render();
  }
  function render() { renderer.render(scene, camera); }

  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const modelFor = (light) => (light ? "N9-black" : "N9-white");
  let currentModel = null;

  function loadModel(name) {
    if (currentModel === name) return;
    currentModel = name;
    new MTLLoader()
      .setPath("assets/models/")
      .load(name + ".mtl", (materials) => {
        materials.preload();
        // upgrade Rhino's basic diffuse to a PBR-ish look so lighting reads well
        Object.values(materials.materials).forEach((m) => {
          if (m.color) {
            m.metalness = 0.25;
            m.roughness = 0.42;
            m.side = THREE.DoubleSide;
          }
        });
        new OBJLoader()
          .setMaterials(materials)
          .setPath("assets/models/")
          .load(name + ".obj", (obj) => {
            // stand the flat extrusion up to face the camera, centre + fit
            obj.rotation.x = Math.PI / 2;
            const wrap = new THREE.Group();
            wrap.add(obj);
            const box = new THREE.Box3().setFromObject(wrap);
            const c = box.getCenter(new THREE.Vector3());
            obj.position.sub(c);
            const dims = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(dims.x, dims.y, dims.z) || 1;
            wrap.scale.setScalar(62 / maxDim);

            // swap in the new mesh, keep the current rotation
            if (holder) group.remove(holder);
            holder = wrap;
            group.add(holder);

            if (!renderer.domElement.parentNode) {
              host.appendChild(renderer.domElement);
              host.classList.add("has3d");
            }
            sizeCanvas();
            applySpin();
          }, undefined, () => {});
      }, undefined, () => {});
  }

  loadModel(modelFor(isLight()));
  new MutationObserver(() => loadModel(modelFor(isLight())))
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---- drag to orbit freely (mouse + touch), with inertia ---- */
  let dragging = false, px = 0, py = 0, raf = null;

  function applySpin() {
    group.rotation.x = THREE.MathUtils.degToRad(rx);
    group.rotation.y = THREE.MathUtils.degToRad(ry);
    if (bgBlobs) {
      bgBlobs.style.setProperty("--bgRot", (ry * 0.1).toFixed(2) + "deg");
      bgBlobs.style.setProperty("--bgTilt", (rx * 0.5).toFixed(1) + "px");
    }
    render();
  }

  function inertia() {
    raf = null;
    if (dragging) return;
    vx *= 0.94; vy *= 0.94;
    if (Math.abs(vx) < 0.03 && Math.abs(vy) < 0.03) return;
    ry += vx; rx += vy;
    applySpin();
    raf = window.requestAnimationFrame(inertia);
  }

  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    dragging = true; px = e.clientX; py = e.clientY; vx = vy = 0;
    host.classList.add("dragging");
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    ry += dx * 0.5;
    rx += dy * 0.5;
    vx = dx * 0.5; vy = dy * 0.5;
    applySpin();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    host.classList.remove("dragging");
    if (!raf) raf = window.requestAnimationFrame(inertia);
  }
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  /* ---- scrolling eases the logo back flat (shortest path) ---- */
  let resetRaf = null;
  window.n9ResetLogoSpin = function () {
    if (dragging) return;
    if (rx === 0 && ry === 0 && !raf && !resetRaf) return;
    vx = vy = 0;
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
    rx = ((rx % 360) + 540) % 360 - 180;
    ry = ((ry % 360) + 540) % 360 - 180;
    if (resetRaf) return;
    const step = () => {
      resetRaf = null;
      rx *= 0.8; ry *= 0.8;
      if (Math.abs(rx) < 0.1 && Math.abs(ry) < 0.1) { rx = 0; ry = 0; applySpin(); return; }
      applySpin();
      resetRaf = window.requestAnimationFrame(step);
    };
    resetRaf = window.requestAnimationFrame(step);
  };

  window.addEventListener("resize", sizeCanvas);
}

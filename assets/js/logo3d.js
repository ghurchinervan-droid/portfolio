/* ============================================================
   NERONE N9 — real 3D hero logo (three.js + the Rhino OBJ export)
   One solid mesh, drag to spin 360° in any direction, inertia on
   release, auto-straighten on scroll, red background follows.
   Falls back silently to the 2D <img> logo if WebGL/loading fails.
   ============================================================ */
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const host = document.getElementById("heroBigLogo");
const bgBlobs = document.getElementById("bgBlobs");
if (host) {
  try { init(); } catch (e) { /* keep the img fallback */ }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "logo3d-canvas";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 600);
  camera.position.set(0, 0, 120);

  // lighting: soft ambient + white key (bright red highlights) + light rim
  // (edge highlight) so the red volume shows clear form and depth
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(55, 85, 130);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd0d6, 1.5);
  rim.position.set(-95, -40, 60);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-40, 30, 120);
  scene.add(fill);

  // brand-coloured material — the logo's own red, in both themes
  // (slightly deeper red on the light page so it still reads with contrast)
  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const bodyColor = () => (isLight() ? 0xa5182a : 0xbf1e2e);
  const mat = new THREE.MeshStandardMaterial({
    color: bodyColor(),
    metalness: 0.35,
    roughness: 0.34,
  });
  new MutationObserver(() => { mat.color.set(bodyColor()); render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const group = new THREE.Group();
  scene.add(group);

  function sizeCanvas() {
    const w = host.clientWidth || 300;
    renderer.setSize(w, w);
    render();
  }

  function render() { renderer.render(scene, camera); }

  new OBJLoader().load("assets/models/logo-3d.obj", (obj) => {
    // one solid material on every mesh
    obj.traverse((n) => { if (n.isMesh) n.material = mat; });

    // stand the flat-lying extrusion up to face the camera, then centre + fit
    obj.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(obj);
    const box = new THREE.Box3().setFromObject(holder);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    const dims = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(dims.x, dims.y, dims.z) || 1;
    holder.scale.setScalar(62 / maxDim);
    group.add(holder);

    host.appendChild(renderer.domElement);
    host.classList.add("has3d");
    sizeCanvas();
  });

  /* ---- drag to orbit freely (mouse + touch), with inertia ---- */
  let rx = 0, ry = 0, vx = 0, vy = 0;
  let dragging = false, px = 0, py = 0, raf = null;

  function applySpin() {
    group.rotation.x = THREE.MathUtils.degToRad(rx);
    group.rotation.y = THREE.MathUtils.degToRad(ry);
    // the red wave field follows the spin direction
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

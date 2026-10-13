import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// Put the Sketchfab download at: public/bird.glb  (must open at http://localhost:<port>/bird.glb)
const MODEL_URL = "/bird.glb";

// If the bird flies sideways/backwards, change this (in radians). Try 0, Math.PI, Math.PI / 2, -Math.PI / 2
const MODEL_YAW_OFFSET = 0;

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

/* ------------------------------------------------------------------ */
/* Check that the model URL really returns a model (not index.html)    */
/* ------------------------------------------------------------------ */
function useModelStatus(url) {
  const [status, setStatus] = useState("checking"); // checking | ok | missing

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        const type = res.headers.get("content-type") || "";
        if (!res.ok || type.includes("text/html")) throw new Error("not a model");
        const head = new TextDecoder().decode((await res.arrayBuffer()).slice(0, 4));
        if (head !== "glTF" && !url.endsWith(".gltf")) throw new Error("invalid glb");
        if (!cancelled) setStatus("ok");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return status;
}

/* ------------------------------------------------------------------ */
/* Error boundary so a bad model never crashes the whole canvas        */
/* ------------------------------------------------------------------ */
class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.warn("Bird model failed to load, using fallback:", err.message);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Canvas-drawn particle trail (only emits while the bird is flying)   */
/* ------------------------------------------------------------------ */
const TRAIL_COUNT = 500;

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function Trail({ target, energy }) {
  const points = useRef();
  const sprite = useMemo(makeSprite, []);
  const data = useMemo(
    () => ({
      positions: new Float32Array(TRAIL_COUNT * 3),
      colors: new Float32Array(TRAIL_COUNT * 3),
      life: new Float32Array(TRAIL_COUNT),
      vel: new Float32Array(TRAIL_COUNT * 3),
      head: 0,
    }),
    []
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!points.current || !target.current) return;
    const dt = Math.min(delta, 0.05);
    const { positions, colors, life, vel } = data;

    // Spawn particles only while flying
    const spawn = energy.current > 0.08 ? Math.ceil(energy.current * 6) : 0;
    target.current.getWorldPosition(tmp);
    for (let n = 0; n < spawn; n++) {
      const i = data.head;
      data.head = (data.head + 1) % TRAIL_COUNT;
      positions[i * 3] = tmp.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = tmp.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = tmp.z + (Math.random() - 0.5) * 0.2;
      vel[i * 3] = (Math.random() - 0.5) * 0.25;
      vel[i * 3 + 1] = -Math.random() * 0.2;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
      life[i] = 1;
    }

    for (let i = 0; i < TRAIL_COUNT; i++) {
      if (life[i] <= 0) {
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        continue;
      }
      life[i] -= dt * 0.9;
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // teal -> violet as it ages, fading out (additive blending)
      color.setHSL(0.5 + (1 - life[i]) * 0.2, 0.9, 0.6).multiplyScalar(Math.max(life[i], 0));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = points.current.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.positions} count={TRAIL_COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={data.colors} count={TRAIL_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.18}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Bird chases the cursor. Idle when the cursor is still.              */
/* energy: 0 = resting, 1 = flying fast (shared with wings + trail)    */
/* ------------------------------------------------------------------ */
function FlyingBird({ energy, children }) {
  const flyer = useRef();
  const body = useRef();
  const vel = useMemo(() => new THREE.Vector2(), []);

  useFrame((state, delta) => {
    if (!flyer.current) return;
    const dt = Math.min(delta, 0.05);
    const { x, y } = state.pointer; // -1..1, only changes when the mouse moves

    // Move toward the cursor position (smoothed)
    const p = flyer.current.position;
    const px = p.x;
    const py = p.y;
    p.x = damp(p.x, x * 3, 2.5, dt);
    p.y = damp(p.y, y * 1.5, 2.5, dt);
    vel.set((p.x - px) / dt, (p.y - py) / dt);

    // Energy follows how fast the bird is actually moving
    energy.current = damp(energy.current, clamp(vel.length() / 1.2, 0, 1), 5, dt);

    // Turn toward travel direction while flying, face front when resting
    const vx = clamp(vel.x / 2, -1, 1);
    const vy = clamp(vel.y / 2, -1, 1);
    const targetYaw = MODEL_YAW_OFFSET + vx * (Math.PI / 2);
    flyer.current.rotation.y = damp(flyer.current.rotation.y, targetYaw, 6, dt);

    if (body.current) {
      // Nose up/down with vertical travel, only when moving sideways
      const pitch = -vy * 0.5 * Math.min(1, Math.abs(vx) * 2);
      body.current.rotation.x = damp(body.current.rotation.x, pitch, 5, dt);
    }
  });

  return (
    <>
      <group ref={flyer}>
        <group ref={body}>{children}</group>
      </group>
      <Trail target={flyer} energy={energy} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Your Sketchfab model: wings flap faster while the bird is moving    */
/* ------------------------------------------------------------------ */
function ModelBird({ energy }) {
  const holder = useRef();
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, holder);

  useEffect(() => {
    if (names.length) actions[names[0]]?.reset().fadeIn(0.5).play();
  }, [actions, names]);

  // Center + scale the model so it fits regardless of its original size
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.4 / Math.max(size.x, size.y, size.z);
    scene.scale.setScalar(scale);
    scene.position.sub(center.multiplyScalar(scale));
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame(() => {
    const action = names.length ? actions[names[0]] : null;
    if (action) action.timeScale = 0.05 + energy.current * 1.8; // near-still when idle
  });

  return (
    <group ref={holder}>
      <primitive object={scene} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Simple flapping bird shown only if the GLB can't be loaded          */
/* ------------------------------------------------------------------ */
function FallbackBird({ energy }) {
  const left = useRef();
  const right = useRef();
  const phase = useRef(0);

  useFrame((_, delta) => {
    phase.current += Math.min(delta, 0.05) * (2 + energy.current * 18);
    const flap = Math.sin(phase.current) * (0.1 + energy.current * 0.55);
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });

  const wing = (
    <mesh castShadow position={[0.4, 0, 0]} scale={[0.8, 0.04, 0.35]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshStandardMaterial color="#5eead4" roughness={0.5} />
    </mesh>
  );

  return (
    <group scale={0.8}>
      <mesh castShadow scale={[0.18, 0.18, 0.45]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0.45]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.06, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.14, 12]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <group ref={left} position={[0.1, 0.02, 0]}>
        {wing}
      </group>
      <group ref={right} position={[-0.1, 0.02, 0]} scale={[-1, 1, 1]}>
        {wing}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
function Scene({ status }) {
  const energy = useRef(0); // shared: 0 resting -> 1 flying

  return (
    <>
      {status !== "checking" && (
        <FlyingBird energy={energy}>
          {status === "ok" ? (
            <ModelBoundary fallback={<FallbackBird energy={energy} />}>
              <ModelBird energy={energy} />
            </ModelBoundary>
          ) : (
            <FallbackBird energy={energy} />
          )}
        </FlyingBird>
      )}
      <Environment preset="city" />
      <ContactShadows position={[0, -1.8, 0]} opacity={0.4} blur={2.5} scale={10} far={3} />
    </>
  );
}

export default function BirdScene() {
  const status = useModelStatus(MODEL_URL);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0b0b12" }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 6], fov: 40 }} gl={{ antialias: true }}>
        <color attach="background" args={["#0b0b12"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 4]} intensity={1.8} castShadow />
        <Suspense fallback={null}>
          <Scene status={status} />
        </Suspense>
      </Canvas>

      {status === "missing" && (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            maxWidth: 360,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.08)",
            color: "#e5e7eb",
            font: "13px/1.4 system-ui, sans-serif",
          }}
        >
        
        </div>
      )}
    </div>
  );
}
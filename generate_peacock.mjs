// Polyfill FileReader before importing Three
class FileReaderPolyfill {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (typeof this.onload === 'function') {
        this.onload({ target: this });
      } else if (typeof this.onloadend === 'function') {
        this.onloadend({ target: this });
      }
    });
  }
}
globalThis.FileReader = FileReaderPolyfill;

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

function createPeacockModel() {
  const peacockRoot = new THREE.Group();
  peacockRoot.name = "Peacock";

  // Materials with vibrant peacock colors (royal blue, emerald green, turquoise, gold)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c4da2, // Sapphire peacock blue
    roughness: 0.3,
    metalness: 0.4,
  });

  const chestMaterial = new THREE.MeshStandardMaterial({
    color: 0x00a896, // Turquoise / iridescent breast
    roughness: 0.25,
    metalness: 0.45,
  });

  const beakMaterial = new THREE.MeshStandardMaterial({
    color: 0xefb036, // Warm golden beak
    roughness: 0.4,
    metalness: 0.3,
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.1,
  });

  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x028090, // Deep sea green/teal
    roughness: 0.35,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });

  const featherMaterial = new THREE.MeshStandardMaterial({
    color: 0x05668d, // Deep indigo / ocean
    roughness: 0.3,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });

  const ocellusGold = new THREE.MeshStandardMaterial({
    color: 0xf4a261, // Gold outer ring
    roughness: 0.3,
    metalness: 0.6,
  });

  const ocellusBlue = new THREE.MeshStandardMaterial({
    color: 0x0077b6, // Vibrant turquoise ring
    roughness: 0.2,
    metalness: 0.5,
  });

  const ocellusEye = new THREE.MeshStandardMaterial({
    color: 0x1d3557, // Royal dark blue eye center
    roughness: 0.2,
    metalness: 0.7,
  });

  // 1. Torso / Body (Aerodynamic bird body)
  const bodyGeo = new THREE.SphereGeometry(0.5, 20, 20);
  bodyGeo.scale(0.8, 0.9, 1.4);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.name = "BodyMesh";
  peacockRoot.add(bodyMesh);

  // Breast
  const chestGeo = new THREE.SphereGeometry(0.42, 16, 16);
  chestGeo.scale(0.75, 0.85, 1.1);
  const chestMesh = new THREE.Mesh(chestGeo, chestMaterial);
  chestMesh.position.set(0, -0.05, 0.25);
  peacockRoot.add(chestMesh);

  // 2. Neck and Head
  const neckGroup = new THREE.Group();
  neckGroup.name = "NeckGroup";
  neckGroup.position.set(0, 0.25, 0.55);

  const neckGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.7, 16);
  const neckMesh = new THREE.Mesh(neckGeo, bodyMaterial);
  neckMesh.rotation.x = 0.35;
  neckMesh.position.set(0, 0.3, 0.1);
  neckGroup.add(neckMesh);

  const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
  headGeo.scale(0.85, 0.95, 1.15);
  const headMesh = new THREE.Mesh(headGeo, bodyMaterial);
  headMesh.position.set(0, 0.66, 0.22);
  neckGroup.add(headMesh);

  // Beak
  const beakGeo = new THREE.ConeGeometry(0.07, 0.28, 12);
  const beakMesh = new THREE.Mesh(beakGeo, beakMaterial);
  beakMesh.rotation.x = Math.PI / 2;
  beakMesh.position.set(0, 0.63, 0.44);
  neckGroup.add(beakMesh);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), eyeMaterial);
  eyeL.position.set(0.13, 0.68, 0.28);
  neckGroup.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), eyeMaterial);
  eyeR.position.set(-0.13, 0.68, 0.28);
  neckGroup.add(eyeR);

  // Peacock Crown Crest
  for (let i = -2; i <= 2; i++) {
    const stemGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6);
    const stem = new THREE.Mesh(stemGeo, beakMaterial);
    stem.position.set(i * 0.035, 0.9, 0.2 + Math.abs(i) * 0.015);
    stem.rotation.z = -i * 0.15;
    neckGroup.add(stem);

    const fanGeo = new THREE.SphereGeometry(0.032, 8, 8);
    fanGeo.scale(1, 0.35, 1);
    const fan = new THREE.Mesh(fanGeo, chestMaterial);
    fan.position.set(i * 0.035 - i * 0.02, 1.0, 0.2 + Math.abs(i) * 0.015);
    neckGroup.add(fan);
  }
  peacockRoot.add(neckGroup);

  // 3. Left Wing (Flying wings with feathered spans)
  const wingLeft = new THREE.Group();
  wingLeft.name = "WingLeft";
  wingLeft.position.set(0.35, 0.1, 0.05);

  for (let f = 0; f < 5; f++) {
    const wFeatherGeo = new THREE.ConeGeometry(0.14 - f * 0.015, 1.4 - f * 0.1, 6);
    wFeatherGeo.scale(1, 0.08, 1);
    const wMesh = new THREE.Mesh(wFeatherGeo, wingMaterial);
    wMesh.rotation.z = -Math.PI / 2 + f * 0.14;
    wMesh.rotation.y = -0.2 - f * 0.06;
    wMesh.position.set(0.68 - f * 0.04, 0, -f * 0.12);
    wingLeft.add(wMesh);
  }
  peacockRoot.add(wingLeft);

  // 4. Right Wing
  const wingRight = new THREE.Group();
  wingRight.name = "WingRight";
  wingRight.position.set(-0.35, 0.1, 0.05);

  for (let f = 0; f < 5; f++) {
    const wFeatherGeo = new THREE.ConeGeometry(0.14 - f * 0.015, 1.4 - f * 0.1, 6);
    wFeatherGeo.scale(1, 0.08, 1);
    const wMesh = new THREE.Mesh(wFeatherGeo, wingMaterial);
    wMesh.rotation.z = Math.PI / 2 - f * 0.14;
    wMesh.rotation.y = 0.2 + f * 0.06;
    wMesh.position.set(-(0.68 - f * 0.04), 0, -f * 0.12);
    wingRight.add(wMesh);
  }
  peacockRoot.add(wingRight);

  // 5. Tail Train Feathers
  const tailTrain = new THREE.Group();
  tailTrain.name = "TailTrain";
  tailTrain.position.set(0, 0.05, -0.6);

  const featherCount = 11;
  for (let i = 0; i < featherCount; i++) {
    const angle = ((i - (featherCount - 1) / 2) / ((featherCount - 1) / 2)) * 0.85;
    const length = 1.7 - Math.abs(angle) * 0.3;

    const quill = new THREE.Group();
    quill.rotation.y = angle * 0.75;
    quill.rotation.x = -0.25 - Math.abs(angle) * 0.1;

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.01, 0.018, length, 6);
    const stemMesh = new THREE.Mesh(stemGeo, bodyMaterial);
    stemMesh.position.set(0, 0, -length / 2);
    stemMesh.rotation.x = Math.PI / 2;
    quill.add(stemMesh);

    // Ocellus layers
    const ocellusG = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), ocellusGold);
    ocellusG.position.set(0, 0.01, -length * 0.92);
    ocellusG.rotation.x = -Math.PI / 2;
    quill.add(ocellusG);

    const ocellusB = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), ocellusBlue);
    ocellusB.position.set(0, 0.015, -length * 0.92);
    ocellusB.rotation.x = -Math.PI / 2;
    quill.add(ocellusB);

    const ocellusE = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), ocellusEye);
    ocellusE.position.set(0, 0.02, -length * 0.92);
    ocellusE.rotation.x = -Math.PI / 2;
    quill.add(ocellusE);

    // Vane / Feather body
    const vaneGeo = new THREE.PlaneGeometry(0.2, length * 0.75);
    const vane = new THREE.Mesh(vaneGeo, featherMaterial);
    vane.position.set(0, 0.005, -length * 0.55);
    vane.rotation.x = -Math.PI / 2;
    quill.add(vane);

    tailTrain.add(quill);
  }
  peacockRoot.add(tailTrain);

  // 6. Flying Animations Keyframes
  const times = [0, 0.25, 0.5, 0.75, 1.0];

  const wingL_Track = new THREE.QuaternionKeyframeTrack(
    "WingLeft.quaternion",
    times,
    [
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.45)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.65)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.45)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.65)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.45)).toArray(),
    ]
  );

  const wingR_Track = new THREE.QuaternionKeyframeTrack(
    "WingRight.quaternion",
    times,
    [
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.45)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.65)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.45)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.65)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.45)).toArray(),
    ]
  );

  const tail_Track = new THREE.QuaternionKeyframeTrack(
    "TailTrain.quaternion",
    times,
    [
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0.06)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.06)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)).toArray(),
    ]
  );

  const neck_Track = new THREE.QuaternionKeyframeTrack(
    "NeckGroup.quaternion",
    times,
    [
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0)).toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)).toArray(),
    ]
  );

  const flyClip = new THREE.AnimationClip("Fly", 1.0, [
    wingL_Track,
    wingR_Track,
    tail_Track,
    neck_Track,
  ]);

  return { root: peacockRoot, clip: flyClip };
}

async function run() {
  const { root, clip } = createPeacockModel();
  const exporter = new GLTFExporter();

  try {
    const gltfBuffer = await exporter.parseAsync(root, {
      binary: true,
      animations: [clip],
    });

    const outDir = path.resolve('public/models');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'peacock.glb');
    fs.writeFileSync(outFile, Buffer.from(gltfBuffer));
    console.log('SUCCESS! Created:', outFile, 'Size:', fs.statSync(outFile).size, 'bytes');
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

run();

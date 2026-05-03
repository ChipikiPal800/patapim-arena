import * as THREE from 'three';
import { CONFIG } from './config.js';
import { keybinds } from './keybinds.js';

let buildMode = 'wall';
let buildables = [];
let hologram = null;
let lastPlaceTime = 0;

const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0xc4a27a,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x221100
});

const hologramMaterial = new THREE.MeshStandardMaterial({
    color: 0x44ffaa,
    transparent: true,
    opacity: 0.45,
    emissive: 0x2288aa
});

export function initBuilding(scene, getPlayerPos) {
    window.addEventListener('keydown', (e) => {
        if (e.code === keybinds.buildCycle) {
            const types = ['wall', 'ramp', 'floor', 'cone'];
            let idx = types.indexOf(buildMode);
            idx = (idx + 1) % types.length;
            buildMode = types[idx];
            updateBuildUI();
        }
        if (e.code === keybinds.buildPlace) {
            const now = performance.now() / 1000;
            if (now - lastPlaceTime >= CONFIG.building.placeCooldown) {
                placeBuild(scene, getPlayerPos);
                lastPlaceTime = now;
            }
        }
    });
    setInterval(() => updateHologram(scene, getPlayerPos), 50);
}

function getBuildPosition(getPlayerPos) {
    const playerPos = getPlayerPos();
    const size = CONFIG.building.pieceSize;
    return new THREE.Vector3(
        Math.round(playerPos.x / size) * size,
        0,
        Math.round(playerPos.z / size) * size
    );
}

function makePieceMesh(mode, size, material) {
    let mesh;
    switch (mode) {
        case 'wall':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.3), material);
            break;
        case 'ramp':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), material);
            mesh.rotation.x = Math.PI / 6;
            break;
        case 'floor':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), material);
            break;
        case 'cone':
            mesh = new THREE.Mesh(new THREE.ConeGeometry(size / 2, size * 0.8, 4), material);
            mesh.rotation.y = Math.PI / 4;
            break;
    }
    return mesh;
}

function getPieceOffset(mode, size) {
    switch (mode) {
        case 'wall':  return new THREE.Vector3(0, size / 2, 0);
        case 'ramp':  return new THREE.Vector3(0, 0.15, 0);
        case 'floor': return new THREE.Vector3(0, 0, 0);
        case 'cone':  return new THREE.Vector3(0, size * 0.4, 0);
        default:      return new THREE.Vector3();
    }
}

function placeBuild(scene, getPlayerPos) {
    if (buildables.length >= CONFIG.building.maxBuilds) return;
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.pieceSize;
    const mesh = makePieceMesh(buildMode, size, woodMaterial.clone());
    if (!mesh) return;
    const offset = getPieceOffset(buildMode, size);
    mesh.position.set(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    buildables.push(mesh);
}

function updateHologram(scene, getPlayerPos) {
    if (hologram) { scene.remove(hologram); hologram = null; }
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.pieceSize;
    hologram = makePieceMesh(buildMode, size, hologramMaterial);
    if (!hologram) return;
    const offset = getPieceOffset(buildMode, size);
    hologram.position.set(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
    scene.add(hologram);
}

function updateBuildUI() {
    const modeSpan = document.getElementById('buildModeText');
    if (modeSpan) modeSpan.innerText = buildMode.toUpperCase();
    const icons = ['wallIcon', 'rampIcon', 'floorIcon', 'coneIcon'];
    icons.forEach(iconId => {
        const el = document.getElementById(iconId);
        if (el) {
            if (iconId === buildMode + 'Icon') el.classList.add('active');
            else el.classList.remove('active');
        }
    });
}

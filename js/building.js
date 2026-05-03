import * as THREE from 'three';
import { CONFIG } from './config.js';

let buildMode = 'wall';
let buildables = [];
let hologram = null;

// Wooden material (Fortnite style)
const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0xc4a27a,
    roughness: 0.6,
    metalness: 0.1,
    flatShading: false
});

const hologramMaterial = new THREE.MeshStandardMaterial({
    color: 0x44ffaa,
    transparent: true,
    opacity: 0.5,
    emissive: 0x2288aa
});

export function initBuilding(scene, getPlayerPos) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            const types = ['wall', 'ramp', 'floor', 'cone'];
            let idx = types.indexOf(buildMode);
            idx = (idx + 1) % types.length;
            buildMode = types[idx];
            updateBuildUI();
        }
        if (e.code === 'KeyE') {
            placeBuild(scene, getPlayerPos);
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

function placeBuild(scene, getPlayerPos) {
    if (buildables.length >= CONFIG.building.maxBuilds) return;
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.pieceSize;
    let mesh;

    switch (buildMode) {
        case 'wall':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.3), woodMaterial);
            mesh.position.set(pos.x, pos.y + size / 2, pos.z);
            break;
        case 'ramp':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), woodMaterial);
            mesh.position.set(pos.x, pos.y + 0.15, pos.z);
            mesh.rotation.x = Math.PI / 6;
            break;
        case 'floor':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), woodMaterial);
            mesh.position.set(pos.x, pos.y, pos.z);
            break;
        case 'cone':
            mesh = new THREE.Mesh(new THREE.ConeGeometry(size / 2, size * 0.8, 4), woodMaterial);
            mesh.position.set(pos.x, pos.y + size * 0.4, pos.z);
            mesh.rotation.y = Math.PI / 4;
            break;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    buildables.push(mesh);
}

function updateHologram(scene, getPlayerPos) {
    if (hologram) scene.remove(hologram);
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.pieceSize;

    switch (buildMode) {
        case 'wall':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.3), hologramMaterial);
            hologram.position.set(pos.x, pos.y + size / 2, pos.z);
            break;
        case 'ramp':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), hologramMaterial);
            hologram.position.set(pos.x, pos.y + 0.15, pos.z);
            hologram.rotation.x = Math.PI / 6;
            break;
        case 'floor':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), hologramMaterial);
            hologram.position.set(pos.x, pos.y, pos.z);
            break;
        case 'cone':
            hologram = new THREE.Mesh(new THREE.ConeGeometry(size / 2, size * 0.8, 4), hologramMaterial);
            hologram.position.set(pos.x, pos.y + size * 0.4, pos.z);
            hologram.rotation.y = Math.PI / 4;
            break;
    }
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

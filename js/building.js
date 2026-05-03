import * as THREE from 'three';
import { CONFIG } from './config.js';

let buildMode = 'wall';
let buildables = [];
let hologram = null;
const buildMaterial = new THREE.MeshStandardMaterial({ color: 0x5a7a9e, roughness: 0.3, metalness: 0.7 });
const hologramMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, transparent: true, opacity: 0.5, emissive: 0x2288aa });

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
    
    switch(buildMode) {
        case 'wall':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.3), buildMaterial);
            mesh.position.set(pos.x, pos.y + size/2, pos.z);
            break;
        case 'ramp':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), buildMaterial);
            mesh.position.set(pos.x, pos.y + 0.15, pos.z);
            mesh.rotation.x = Math.PI / 6;
            break;
        case 'floor':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), buildMaterial);
            mesh.position.set(pos.x, pos.y, pos.z);
            break;
        case 'cone':
            mesh = new THREE.Mesh(new THREE.ConeGeometry(size/2, size*0.8, 4), buildMaterial);
            mesh.position.set(pos.x, pos.y + size*0.4, pos.z);
            mesh.rotation.y = Math.PI/4;
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
    
    switch(buildMode) {
        case 'wall':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.3), hologramMat);
            hologram.position.set(pos.x, pos.y + size/2, pos.z);
            break;
        case 'ramp':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), hologramMat);
            hologram.position.set(pos.x, pos.y + 0.15, pos.z);
            hologram.rotation.x = Math.PI / 6;
            break;
        case 'floor':
            hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), hologramMat);
            hologram.position.set(pos.x, pos.y, pos.z);
            break;
        case 'cone':
            hologram = new THREE.Mesh(new THREE.ConeGeometry(size/2, size*0.8, 4), hologramMat);
            hologram.position.set(pos.x, pos.y + size*0.4, pos.z);
            hologram.rotation.y = Math.PI/4;
            break;
    }
    scene.add(hologram);
}

function updateBuildUI() {
    const modeSpan = document.getElementById('buildModeText');
    if (modeSpan) modeSpan.innerText = buildMode.toUpperCase();
    // Update icon highlighting
    const icons = ['wallIcon', 'rampIcon', 'floorIcon', 'coneIcon'];
    icons.forEach(iconId => {
        const el = document.getElementById(iconId);
        if (el) {
            if (iconId === buildMode + 'Icon') el.style.opacity = '1';
            else el.style.opacity = '0.5';
        }
    });
}

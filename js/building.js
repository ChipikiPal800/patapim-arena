import * as THREE from 'three';
import { CONFIG } from './config.js';

let buildMode = 'wall', buildables = [], hologram = null;
const buildMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.4, transparent: true, opacity: 0.6 });
const hologramMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.5, emissive: 0x44ffaa });

export function initBuilding(scene, getPlayerPos) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            const types = ['wall', 'ramp', 'floor'];
            let idx = types.indexOf(buildMode);
            idx = (idx + 1) % types.length;
            buildMode = types[idx];
            const txt = document.getElementById('buildModeText');
            if (txt) txt.innerText = buildMode.toUpperCase();
        }
        if (e.code === 'KeyE') placeBuild(scene, getPlayerPos);
    });
    setInterval(() => updateHologram(scene, getPlayerPos), 50);
}

function placeBuild(scene, getPlayerPos) {
    if (buildables.length >= CONFIG.building.maxBuilds) return;
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.gridSize;
    let mesh;
    if (buildMode === 'wall') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.2), buildMaterial);
        mesh.position.set(pos.x, pos.y + size/2, pos.z);
    } else if (buildMode === 'ramp') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial);
        mesh.position.set(pos.x, pos.y + 0.1, pos.z);
        mesh.rotation.x = Math.PI / 6;
    } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial);
        mesh.position.set(pos.x, pos.y, pos.z);
    }
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    buildables.push(mesh);
}

function getBuildPosition(getPlayerPos) {
    const playerPos = getPlayerPos();
    return new THREE.Vector3(Math.round(playerPos.x / 2) * 2, 0, Math.round(playerPos.z / 2) * 2);
}

function updateHologram(scene, getPlayerPos) {
    if (hologram) scene.remove(hologram);
    const pos = getBuildPosition(getPlayerPos);
    const size = CONFIG.building.gridSize;
    if (buildMode === 'wall') {
        hologram = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.2), hologramMat);
        hologram.position.set(pos.x, pos.y + size/2, pos.z);
    } else if (buildMode === 'ramp') {
        hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), hologramMat);
        hologram.position.set(pos.x, pos.y + 0.1, pos.z);
        hologram.rotation.x = Math.PI / 6;
    } else {
        hologram = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), hologramMat);
        hologram.position.set(pos.x, pos.y, pos.z);
    }
    scene.add(hologram);
}

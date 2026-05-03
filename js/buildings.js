import * as THREE from 'three';
import { CONFIG } from './config.js';

let buildMode = 'wall', buildables = [];
const buildMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.4 });

export function initBuilding(scene, getPlayerPos) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') { const types = ['wall', 'ramp', 'floor']; let idx = types.indexOf(buildMode); idx = (idx + 1) % types.length; buildMode = types[idx]; const txt = document.getElementById('buildModeText'); if (txt) txt.innerText = buildMode.toUpperCase(); }
        if (e.code === 'KeyE') { if (buildables.length >= CONFIG.building.maxBuilds) return; const playerPos = getPlayerPos ? getPlayerPos() : new THREE.Vector3(0, 0, 0); const pos = new THREE.Vector3(playerPos.x + 2, 0, playerPos.z + 2); const size = CONFIG.building.gridSize; let mesh; if (buildMode === 'wall') { mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.2), buildMaterial); mesh.position.set(pos.x, pos.y + size/2, pos.z); } else if (buildMode === 'ramp') { mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial); mesh.position.set(pos.x, pos.y + 0.1, pos.z); mesh.rotation.x = Math.PI / 6; } else { mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial); mesh.position.set(pos.x, pos.y, pos.z); } mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); buildables.push(mesh); }
    });
}

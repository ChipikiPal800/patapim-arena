import * as THREE from 'three';
import { CONFIG } from './config.js';

let buildMode = 'wall'; // wall, ramp, floor
let buildables = [];
const buildMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.4 });

export function initBuilding(scene) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            cycleBuildType(-1);
            updateBuildUI();
        }
        if (e.code === 'KeyE') {
            placeBuild(scene);
        }
    });
}

function cycleBuildType(dir) {
    const types = ['wall', 'ramp', 'floor'];
    let idx = types.indexOf(buildMode);
    idx = (idx + dir + types.length) % types.length;
    buildMode = types[idx];
}

function placeBuild(scene) {
    if (buildables.length >= CONFIG.building.maxBuilds) return;
    
    // Place in front of player (approximate)
    let pos = getBuildPosition();
    let mesh;
    const size = CONFIG.building.gridSize;
    
    if (buildMode === 'wall') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.2), buildMaterial);
        mesh.position.set(pos.x, pos.y + size/2, pos.z);
    }
    else if (buildMode === 'ramp') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial);
        mesh.position.set(pos.x, pos.y + 0.1, pos.z);
        mesh.rotation.x = Math.PI / 6;
    }
    else { // floor
        mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), buildMaterial);
        mesh.position.set(pos.x, pos.y, pos.z);
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    buildables.push(mesh);
}

function getBuildPosition() {
    // Dummy — in real game, raycast to ground from croshair
    // For prototype: 5 units in front of player
    // We'll approximate using player position (set by main.js later)
    if (window.playerPosition) {
        return new THREE.Vector3(window.playerPosition.x + 2, 0, window.playerPosition.z + 2);
    }
    return new THREE.Vector3(10, 0, 10);
}

function updateBuildUI() {
    const panel = document.getElementById('buildModeText');
    if (panel) panel.innerText = buildMode.toUpperCase();
}

export function getBuildMode() { return buildMode; }

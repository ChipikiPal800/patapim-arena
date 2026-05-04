import * as THREE from 'three';
import { CONFIG } from './config.js';
import { keybinds } from './keybinds.js';
import { getPlayerPosition, getPlayerYaw, setBuildables } from './player.js';

let buildMode = 'wall';
let buildables = [];
let hologram = null;
let lastPlaceTime = 0;
let scene = null;
let getPlayerPos = null;

// Fortnite-style wood material with blue tint for player builds
const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8eb4d4,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9
});

const hologramMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.4,
    emissive: 0x00aa66,
    emissiveIntensity: 0.3
});

const invalidHologramMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.4,
    emissive: 0xaa2222,
    emissiveIntensity: 0.3
});

export function initBuilding(sceneRef, getPlayerPosFunc) {
    scene = sceneRef;
    getPlayerPos = getPlayerPosFunc;
    
    window.addEventListener('keydown', (e) => {
        if (!window.gameStarted) return;
        
        // Direct build piece selection (Fortnite style)
        if (e.code === keybinds.buildWall) {
            buildMode = 'wall';
            updateBuildUI();
        }
        if (e.code === keybinds.buildRamp) {
            buildMode = 'ramp';
            updateBuildUI();
        }
        if (e.code === keybinds.buildFloor) {
            buildMode = 'floor';
            updateBuildUI();
        }
        if (e.code === keybinds.buildCone) {
            buildMode = 'cone';
            updateBuildUI();
        }
        
        // Place build with E key
        if (e.code === 'KeyE') {
            const now = performance.now() / 1000;
            if (now - lastPlaceTime >= CONFIG.building.placeCooldown) {
                if (window.isBuildModeActive && window.isBuildModeActive()) {
                    placeBuild();
                    lastPlaceTime = now;
                }
            }
        }
    });
    
    // Place build with left click in build mode
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && window.isBuildModeActive && window.isBuildModeActive()) {
            const now = performance.now() / 1000;
            if (now - lastPlaceTime >= CONFIG.building.placeCooldown) {
                placeBuild();
                lastPlaceTime = now;
            }
        }
    });
    
    setInterval(() => updateHologram(), 50);
}

function getBuildPosition() {
    const playerPos = getPlayerPos();
    const yaw = getPlayerYaw();
    const size = CONFIG.building.pieceSize;
    
    // Place in front of player
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const targetPos = playerPos.clone().add(forward.multiplyScalar(size * 0.8));
    
    return new THREE.Vector3(
        Math.round(targetPos.x / size) * size,
        Math.floor(playerPos.y / size) * size,
        Math.round(targetPos.z / size) * size
    );
}

function makePieceMesh(mode, size, material) {
    let mesh;
    const group = new THREE.Group();
    
    switch (mode) {
        case 'wall':
            // Wall with wooden plank texture pattern
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.2), material);
            
            // Add wooden beam details
            const beam1 = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, size, 0.25),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.5 })
            );
            beam1.position.x = -size / 2 + 0.1;
            
            const beam2 = beam1.clone();
            beam2.position.x = size / 2 - 0.1;
            
            const beam3 = new THREE.Mesh(
                new THREE.BoxGeometry(size, 0.15, 0.25),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.5 })
            );
            beam3.position.y = -size / 2 + 0.1;
            
            const beam4 = beam3.clone();
            beam4.position.y = size / 2 - 0.1;
            
            group.add(mesh, beam1, beam2, beam3, beam4);
            break;
            
        case 'ramp':
            // Sloped ramp
            const rampGeo = new THREE.BoxGeometry(size, 0.2, size * 1.4);
            mesh = new THREE.Mesh(rampGeo, material);
            mesh.rotation.x = -Math.PI / 6;
            mesh.position.y = size / 4;
            
            // Support beams
            const support1 = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, size * 0.7, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.5 })
            );
            support1.position.set(-size / 2 + 0.2, 0, size / 4);
            
            const support2 = support1.clone();
            support2.position.x = size / 2 - 0.2;
            
            group.add(mesh, support1, support2);
            break;
            
        case 'floor':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), material);
            
            // Cross beams
            const floorBeam1 = new THREE.Mesh(
                new THREE.BoxGeometry(size, 0.25, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.5 })
            );
            floorBeam1.position.y = -0.1;
            
            const floorBeam2 = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.25, size),
                new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.5 })
            );
            floorBeam2.position.y = -0.1;
            
            group.add(mesh, floorBeam1, floorBeam2);
            break;
            
        case 'cone':
            // Pyramid/cone shape
            const coneGeo = new THREE.ConeGeometry(size / 2, size * 0.7, 4);
            mesh = new THREE.Mesh(coneGeo, material);
            mesh.rotation.y = Math.PI / 4;
            mesh.position.y = size * 0.35;
            group.add(mesh);
            break;
    }
    
    return group;
}

function getPieceOffset(mode, size) {
    switch (mode) {
        case 'wall': return new THREE.Vector3(0, size / 2, 0);
        case 'ramp': return new THREE.Vector3(0, 0, 0);
        case 'floor': return new THREE.Vector3(0, 0.1, 0);
        case 'cone': return new THREE.Vector3(0, 0, 0);
        default: return new THREE.Vector3();
    }
}

function canPlaceAt(pos, mode) {
    const size = CONFIG.building.pieceSize;
    
    // Check if position overlaps with existing builds
    for (const build of buildables) {
        const dx = Math.abs(pos.x - build.position.x);
        const dy = Math.abs(pos.y - build.position.y);
        const dz = Math.abs(pos.z - build.position.z);
        
        if (dx < size * 0.5 && dy < size * 0.5 && dz < size * 0.5) {
            return false;
        }
    }
    
    return true;
}

function placeBuild() {
    if (!scene || buildables.length >= CONFIG.building.maxBuilds) return;
    
    const pos = getBuildPosition();
    const size = CONFIG.building.pieceSize;
    const offset = getPieceOffset(buildMode, size);
    const finalPos = pos.clone().add(offset);
    
    if (!canPlaceAt(finalPos, buildMode)) return;
    
    const mesh = makePieceMesh(buildMode, size, woodMaterial.clone());
    if (!mesh) return;
    
    mesh.position.copy(finalPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store build type for collision detection
    mesh.userData = {
        buildType: buildMode,
        health: CONFIG.building.health[buildMode] || 100
    };
    
    scene.add(mesh);
    buildables.push(mesh);
    
    // Update player's buildables reference for collision
    setBuildables(buildables);
    
    // Play build sound
    if (window.AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }
}

function updateHologram() {
    if (!scene) return;
    
    // Remove old hologram
    if (hologram) {
        scene.remove(hologram);
        hologram = null;
    }
    
    // Only show hologram in build mode
    if (!window.isBuildModeActive || !window.isBuildModeActive()) return;
    
    const pos = getBuildPosition();
    const size = CONFIG.building.pieceSize;
    const offset = getPieceOffset(buildMode, size);
    const finalPos = pos.clone().add(offset);
    
    const canPlace = canPlaceAt(finalPos, buildMode);
    const material = canPlace ? hologramMaterial : invalidHologramMaterial;
    
    hologram = makePieceMesh(buildMode, size, material);
    if (!hologram) return;
    
    hologram.position.copy(finalPos);
    scene.add(hologram);
}

function updateBuildUI() {
    if (window.updateBuildSlots) {
        window.updateBuildSlots(buildMode);
    }
}

export function getCurrentBuildMode() {
    return buildMode;
}

export function setBuildMode(mode) {
    buildMode = mode;
    updateBuildUI();
}

export function getBuildables() {
    return buildables;
}

export function clearBuildables() {
    for (const build of buildables) {
        if (build.parent) build.parent.remove(build);
    }
    buildables = [];
    setBuildables(buildables);
}

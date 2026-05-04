import * as THREE from 'three';
import { CONFIG } from './config.js';

// Build pieces are placed on a 4x4 grid
const GRID_SIZE = CONFIG.building.pieceSize || 4;
const WALL_H = CONFIG.building.wallHeight || 4;

export const buildState = {
    enabled: false,
    selected: 'wall',
    cooldown: 0,
    pieces: [],
    placedSet: new Set(),
    preview: null,
    previewMaterial: null,
    previewBadMaterial: null,
    materials: null
};

function makeMaterials() {
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0xc4a574, 
        roughness: 0.55, 
        metalness: 0.05,
        emissive: 0x221100
    });
    return {
        wall: woodMat.clone(),
        ramp: woodMat.clone(),
        floor: woodMat.clone(),
        cone: woodMat.clone()
    };
}

function makePreviewMat(valid) {
    return new THREE.MeshBasicMaterial({
        color: valid ? 0x44ff66 : 0xff4444,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
    });
}

function makeGeometry(type) {
    const s = GRID_SIZE;
    const h = WALL_H;
    
    if (type === 'wall') {
        const g = new THREE.BoxGeometry(s, h, 0.4);
        g.translate(0, h / 2, 0);
        return g;
    }
    if (type === 'floor') {
        const g = new THREE.BoxGeometry(s, 0.25, s);
        g.translate(0, -0.125, 0);
        return g;
    }
    if (type === 'ramp') {
        const g = new THREE.BufferGeometry();
        const hs = s / 2;
        const verts = new Float32Array([
            -hs, 0, -hs,   hs, 0, -hs,   hs, 0, hs,
            -hs, 0, -hs,   hs, 0, hs,   -hs, 0, hs,
            -hs, 0, -hs,   -hs, h, hs,   hs, h, hs,
            -hs, 0, -hs,   hs, h, hs,   hs, 0, -hs,
            -hs, 0, -hs,   -hs, 0, hs,   -hs, h, hs,
             hs, 0, -hs,   hs, h, hs,   hs, 0, hs,
            -hs, 0, hs,   -hs, h, hs,   hs, h, hs,
            -hs, 0, hs,   hs, h, hs,   hs, 0, hs
        ]);
        g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        g.computeVertexNormals();
        return g;
    }
    if (type === 'cone') {
        const g = new THREE.ConeGeometry(s / 2 * 1.05, h * 0.6, 4);
        g.translate(0, h * 0.3, 0);
        g.rotateY(Math.PI / 4);
        return g;
    }
    return new THREE.BoxGeometry(1, 1, 1);
}

const geoCache = {};
function getGeoCached(type) {
    if (!geoCache[type]) geoCache[type] = makeGeometry(type);
    return geoCache[type];
}

export function initBuilding(scene, getPlayerPos) {
    buildState.materials = makeMaterials();
    buildState.previewMaterial = makePreviewMat(true);
    buildState.previewBadMaterial = makePreviewMat(false);

    const preview = new THREE.Mesh(getGeoCached('wall'), buildState.previewMaterial);
    preview.visible = false;
    scene.add(preview);
    buildState.preview = preview;

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyZ') setBuildMode('wall');
        if (e.code === 'KeyX') setBuildMode('ramp');
        if (e.code === 'KeyC') setBuildMode('floor');
        if (e.code === 'KeyV') setBuildMode('cone');
        if (e.code === 'KeyE') placeBuild(scene, getPlayerPos);
        if (e.code === 'KeyQ') toggleBuildMode();
    });
    
    setInterval(() => updateHologram(scene, getPlayerPos), 50);
}

export function updateBuilding(dt, scene) {
    buildState.cooldown = Math.max(0, buildState.cooldown - dt);
    
    if (!buildState.enabled || !buildState.preview) {
        if (buildState.preview) buildState.preview.visible = false;
        return;
    }
}

function getSnapPosition(getPlayerPos) {
    const pos = getPlayerPos();
    return new THREE.Vector3(
        Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
        0,
        Math.round(pos.z / GRID_SIZE) * GRID_SIZE
    );
}

function placeBuild(scene, getPlayerPos) {
    if (!buildState.enabled) return;
    if (buildState.pieces.length >= CONFIG.building.maxBuilds) return;
    if (buildState.cooldown > 0) return;
    
    const snap = getSnapPosition(getPlayerPos);
    const type = buildState.selected;
    const mesh = new THREE.Mesh(getGeoCached(type), buildState.materials[type]);
    
    switch(type) {
        case 'wall':
            mesh.position.set(snap.x, snap.y + WALL_H/2, snap.z);
            break;
        case 'floor':
            mesh.position.set(snap.x, snap.y, snap.z);
            break;
        case 'ramp':
            mesh.position.set(snap.x, snap.y, snap.z);
            mesh.rotation.x = -Math.PI / 6;
            break;
        case 'cone':
            mesh.position.set(snap.x, snap.y, snap.z);
            break;
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { 
        type: type, 
        health: CONFIG.building.health?.[type] || 120,
        buildType: type
    };
    
    scene.add(mesh);
    buildState.pieces.push(mesh);
    buildState.placedSet.add(`${type}_${snap.x}_${snap.y}_${snap.z}`);
    buildState.cooldown = CONFIG.building.placeCooldown || 0.15;
}

function updateHologram(scene, getPlayerPos) {
    if (!buildState.enabled) {
        if (buildState.preview) buildState.preview.visible = false;
        return;
    }
    
    const snap = getSnapPosition(getPlayerPos);
    const type = buildState.selected;
    
    if (buildState.preview) {
        buildState.preview.geometry = getGeoCached(type);
        buildState.preview.material = buildState.previewMaterial;
        
        switch(type) {
            case 'wall':
                buildState.preview.position.set(snap.x, snap.y + WALL_H/2, snap.z);
                break;
            case 'floor':
                buildState.preview.position.set(snap.x, snap.y, snap.z);
                break;
            case 'ramp':
                buildState.preview.position.set(snap.x, snap.y, snap.z);
                buildState.preview.rotation.x = -Math.PI / 6;
                break;
            case 'cone':
                buildState.preview.position.set(snap.x, snap.y, snap.z);
                break;
        }
        buildState.preview.visible = true;
    }
}

export function setBuildMode(mode) {
    if (mode === 'wall' || mode === 'ramp' || mode === 'floor' || mode === 'cone') {
        buildState.selected = mode;
        buildState.enabled = true;
        if (window.updateBuildSlots) window.updateBuildSlots(mode);
    }
}

export function getCurrentBuildMode() {
    return buildState.selected;
}

export function toggleBuildMode() {
    buildState.enabled = !buildState.enabled;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildState.enabled);
}

export function setBuildEnabled(enabled) {
    buildState.enabled = enabled;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildState.enabled);
}

export function getBuildPieces() {
    return buildState.pieces;
}

export function clearBuildables(scene) {
    for (const piece of buildState.pieces) {
        if (piece.parent) scene.remove(piece);
    }
    buildState.pieces = [];
    buildState.placedSet.clear();
}

// Collision system
const pBox = new THREE.Box3();
const pieceBox = new THREE.Box3();

export function collideWithBuilds(currentPos, nextPos, velocity) {
    const radius = 0.45;
    const height = CONFIG.player.height;
    let onGround = false;
    const result = {
        position: nextPos.clone(),
        velocity: velocity.clone(),
        onGround: false
    };

    // Y-axis
    let testPos = new THREE.Vector3(currentPos.x, result.position.y, currentPos.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        pieceBox.setFromObject(piece);
        if (pBox.intersectsBox(pieceBox)) {
            if (velocity.y <= 0 && currentPos.y >= pieceBox.max.y - 0.4) {
                result.position.y = pieceBox.max.y;
                result.velocity.y = 0;
                onGround = true;
            } else if (velocity.y > 0) {
                result.position.y = pieceBox.min.y - height - 0.05;
                result.velocity.y = 0;
            }
            pBox.min.y = result.position.y;
            pBox.max.y = result.position.y + height;
        }
    }

    // X-axis
    testPos.set(result.position.x, result.position.y, currentPos.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        if (piece.userData?.buildType === 'floor' && onGround) continue;
        pieceBox.setFromObject(piece);
        if (pBox.intersectsBox(pieceBox)) {
            if (velocity.x > 0) result.position.x = pieceBox.min.x - radius - 0.05;
            else if (velocity.x < 0) result.position.x = pieceBox.max.x + radius + 0.05;
            result.velocity.x = 0;
            pBox.min.x = result.position.x - radius;
            pBox.max.x = result.position.x + radius;
        }
    }

    // Z-axis
    testPos.set(result.position.x, result.position.y, result.position.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        if (piece.userData?.buildType === 'floor' && onGround) continue;
        pieceBox.setFromObject(piece);
        if (pBox.intersectsBox(pieceBox)) {
            if (velocity.z > 0) result.position.z = pieceBox.min.z - radius - 0.05;
            else if (velocity.z < 0) result.position.z = pieceBox.max.z + radius + 0.05;
            result.velocity.z = 0;
        }
    }

    result.onGround = onGround;
    return result;
}

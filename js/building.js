import * as THREE from 'three';
import { CONFIG } from './config.js';
import { player, input } from './player.js';

// Build pieces are placed on a 4x4 grid
const GRID = CONFIG.building.pieceSize || 4;
const WALL_H = CONFIG.building.wallHeight || 4;

export const buildState = {
    enabled: false,
    selected: 'wall',  // wall | ramp | floor | cone
    cooldown: 0,
    pieces: [],        // active build meshes
    placedSet: new Set(),
    preview: null,
    previewMaterial: null,
    previewBadMaterial: null,
    materials: null
};

function makeMaterials() {
    // Wooden Fortnite-style material
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

// Each piece type centered on its anchor
function makeGeometry(type) {
    const s = GRID;
    const h = WALL_H;
    
    if (type === 'wall') {
        // Wall: full tile width, full height, 0.4 thick
        const g = new THREE.BoxGeometry(s, h, 0.4);
        g.translate(0, h / 2, 0);
        return g;
    }
    if (type === 'floor') {
        // Floor: flat platform, 0.25 thick, centered at bottom
        const g = new THREE.BoxGeometry(s, 0.25, s);
        g.translate(0, -0.125, 0);
        return g;
    }
    if (type === 'ramp') {
        // Ramp: triangular prism going up across one cell
        const g = new THREE.BufferGeometry();
        const hs = s / 2;
        const verts = new Float32Array([
            // Bottom face (flat on ground)
            -hs, 0, -hs,   hs, 0, -hs,   hs, 0, hs,
            -hs, 0, -hs,   hs, 0, hs,   -hs, 0, hs,
            // Top sloped face (rises to full height at +z side)
            -hs, 0, -hs,   -hs, h, hs,   hs, h, hs,
            -hs, 0, -hs,   hs, h, hs,   hs, 0, -hs,
            // Left side (flat)
            -hs, 0, -hs,   -hs, 0, hs,   -hs, h, hs,
            // Right side (flat)
             hs, 0, -hs,   hs, h, hs,   hs, 0, hs,
            // Back face (vertical at +z)
            -hs, 0, hs,   -hs, h, hs,   hs, h, hs,
            -hs, 0, hs,   hs, h, hs,   hs, 0, hs
        ]);
        g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        g.computeVertexNormals();
        return g;
    }
    if (type === 'cone') {
        // Pyramid/cone top piece
        const g = new THREE.ConeGeometry(s / 2 * 1.05, h * 0.6, 4);
        g.translate(0, h * 0.3, 0);
        g.rotateY(Math.PI / 4);
        return g;
    }
    return new THREE.BoxGeometry(1, 1, 1);
}

// Geometry cache for performance
const geoCache = {};
function getGeoCached(type) {
    if (!geoCache[type]) geoCache[type] = makeGeometry(type);
    return geoCache[type];
}

export function setupBuilding(scene) {
    buildState.materials = makeMaterials();
    buildState.previewMaterial = makePreviewMat(true);
    buildState.previewBadMaterial = makePreviewMat(false);

    const preview = new THREE.Mesh(getGeoCached('wall'), buildState.previewMaterial);
    preview.visible = false;
    scene.add(preview);
    buildState.preview = preview;
}

// Snap to grid based on player position + facing direction
function computePlacement(type) {
    const px = player.object.position.x;
    const pz = player.object.position.z;
    const py = player.object.position.y;
    const yaw = player.yaw;

    // Snap to grid
    const sx = Math.round(px / GRID) * GRID;
    const sz = Math.round(pz / GRID) * GRID;
    const sy = Math.round(py / GRID) * GRID;

    // Direction player is facing (cardinal)
    let yawSnap = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
    const fx = Math.round(-Math.sin(yawSnap));
    const fz = Math.round(-Math.cos(yawSnap));

    if (type === 'wall') {
        // Wall placed in front of player, between current cell and next
        const wx = sx + fx * GRID / 2;
        const wz = sz + fz * GRID / 2;
        const rotY = (fz !== 0) ? 0 : Math.PI / 2;
        return { 
            x: wx, 
            y: sy, 
            z: wz, 
            rotY, 
            key: `wall|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` 
        };
    }
    if (type === 'floor') {
        // Floor in front of player (next cell over)
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        return { 
            x: wx, 
            y: sy, 
            z: wz, 
            rotY: 0, 
            key: `floor|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` 
        };
    }
    if (type === 'ramp') {
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        // Ramp faces away from player so high end is far
        const rotY = Math.atan2(-fx, -fz);
        return { 
            x: wx, 
            y: sy, 
            z: wz, 
            rotY, 
            key: `ramp|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` 
        };
    }
    if (type === 'cone') {
        // Cone placed above ground on the next cell
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        const wy = sy + GRID;
        return { 
            x: wx, 
            y: wy, 
            z: wz, 
            rotY: 0, 
            key: `cone|${Math.round(wx*10)}|${Math.round(wy*10)}|${Math.round(wz*10)}` 
        };
    }
    return null;
}

function isValidPlacement(plac, type) {
    if (!plac) return false;
    if (buildState.placedSet.has(plac.key)) return false;
    
    // Don't place too close to player
    const dx = plac.x - player.object.position.x;
    const dz = plac.z - player.object.position.z;
    const horizDist = Math.sqrt(dx*dx + dz*dz);
    if (type === 'wall' && horizDist < 1.2) return false;
    if (type === 'floor' && horizDist < 1.0) return false;
    return true;
}

export function updateBuilding(dt, scene) {
    buildState.cooldown = Math.max(0, buildState.cooldown - dt);

    if (!buildState.enabled || !player.alive) {
        if (buildState.preview) buildState.preview.visible = false;
        return;
    }

    const plac = computePlacement(buildState.selected);
    if (!plac) {
        buildState.preview.visible = false;
        return;
    }

    const valid = isValidPlacement(plac, buildState.selected);

    // Update preview mesh
    const preview = buildState.preview;
    preview.geometry = getGeoCached(buildState.selected);
    preview.material = valid ? buildState.previewMaterial : buildState.previewBadMaterial;
    preview.position.set(plac.x, plac.y, plac.z);
    preview.rotation.set(0, plac.rotY, 0);
    preview.visible = true;

    // Place on shoot (left click) when in build mode
    if (input.shoot && buildState.cooldown <= 0 && valid) {
        placePiece(scene, buildState.selected, plac);
        buildState.cooldown = CONFIG.building.placeCooldown || 0.15;
    }
}

function placePiece(scene, type, plac) {
    const mesh = new THREE.Mesh(getGeoCached(type), buildState.materials[type]);
    mesh.position.set(plac.x, plac.y, plac.z);
    mesh.rotation.set(0, plac.rotY, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        type: type,
        health: CONFIG.building.health?.[type] || 120,
        key: plac.key,
        buildType: type
    };
    scene.add(mesh);
    buildState.pieces.push(mesh);
    buildState.placedSet.add(plac.key);

    // Limit total builds to prevent lag
    if (buildState.pieces.length > (CONFIG.building.maxBuilds || 150)) {
        const oldest = buildState.pieces.shift();
        buildState.placedSet.delete(oldest.userData.key);
        scene.remove(oldest);
    }
}

// ─── Collision System ─────────────────────────────────────────────────────────
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

    // Y-axis (vertical) - landing on floors/ramps
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
        if (piece.userData.buildType === 'floor' && onGround) continue;
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
        if (piece.userData.buildType === 'floor' && onGround) continue;
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

// ─── Public API ───────────────────────────────────────────────────────────────
export function setBuildSelected(type) {
    buildState.selected = type;
    buildState.enabled = true;
}

export function setBuildMode(mode) {
    if (mode === 'wall' || mode === 'ramp' || mode === 'floor' || mode === 'cone') {
        buildState.selected = mode;
        buildState.enabled = true;
    }
}

export function toggleBuild() {
    buildState.enabled = !buildState.enabled;
}

export function setBuildEnabled(v) {
    buildState.enabled = v;
}

export function clearBuildables(scene) {
    for (const p of buildState.pieces) {
        if (p.parent) p.parent.remove(p);
    }
    buildState.pieces.length = 0;
    buildState.placedSet.clear();
}

export function getBuildPieces() {
    return buildState.pieces;
}

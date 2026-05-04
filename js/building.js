import * as THREE from 'three';
import { CONFIG } from './config.js';
import { player, input } from './player.js';

// Build pieces are placed on a 4x4 grid with discrete vertical levels
const GRID = CONFIG.building.pieceSize;       // 4
const WALL_H = CONFIG.building.wallHeight;     // 4

export const buildState = {
    enabled: false,
    selected: 'wall',  // wall | ramp | floor | cone
    cooldown: 0,
    pieces: [],        // active build meshes
    placedSet: new Set(),  // unique keys to prevent duplicate placement
    preview: null,
    previewMaterial: null,
    previewBadMaterial: null,
    materials: null
};

function makeMaterials() {
    return {
        wall:  new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
        ramp:  new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
        floor: new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
        cone:  new THREE.MeshLambertMaterial({ color: 0xc4a574 })
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

// Each piece type has a known geometry centered on its anchor
function makeGeometry(type) {
    if (type === 'wall') {
        // Wall: 4w x 4h x 0.2 thick, centered horizontally, bottom at y=0
        const g = new THREE.BoxGeometry(GRID, WALL_H, 0.2);
        g.translate(0, WALL_H / 2, 0);
        return g;
    }
    if (type === 'floor') {
        // Floor: 4x4 plate, 0.2 thick. anchor at top surface (y=0)
        const g = new THREE.BoxGeometry(GRID, 0.2, GRID);
        g.translate(0, -0.1, 0);
        return g;
    }
    if (type === 'ramp') {
        // Ramp: triangular prism going up across one cell
        // Build using BufferGeometry triangles
        const g = new THREE.BufferGeometry();
        const h = WALL_H;
        const s = GRID / 2;
        // Local axes: ramp goes from -z (low) to +z (high)
        const verts = new Float32Array([
            // Bottom face
            -s, 0, -s,   s, 0, -s,   s, 0, s,
            -s, 0, -s,   s, 0, s,  -s, 0, s,
            // Top sloped face (hypotenuse)
            -s, 0, -s,  -s, h, s,   s, h, s,
            -s, 0, -s,   s, h, s,   s, 0, -s,
            // Left side triangle
            -s, 0, -s,  -s, 0, s,  -s, h, s,
            // Right side triangle
             s, 0, -s,   s, h, s,   s, 0, s,
            // Back face (vertical at +z, top of ramp)
            -s, 0, s,   -s, h, s,   s, h, s,
            -s, 0, s,    s, h, s,   s, 0, s
        ]);
        g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        g.computeVertexNormals();
        return g;
    }
    if (type === 'cone') {
        const g = new THREE.ConeGeometry(GRID / 2 * 1.05, WALL_H * 0.6, 4);
        g.translate(0, WALL_H * 0.3, 0);
        g.rotateY(Math.PI / 4);
        return g;
    }
    return new THREE.BoxGeometry(1, 1, 1);
}

function getGeoCached(type) {
    if (!buildState._geoCache) buildState._geoCache = {};
    if (!buildState._geoCache[type]) buildState._geoCache[type] = makeGeometry(type);
    return buildState._geoCache[type];
}

export function setupBuilding(scene) {
    buildState.materials = makeMaterials();
    buildState.previewMaterial = makePreviewMat(true);
    buildState.previewBadMaterial = makePreviewMat(false);

    // Build preview (initially wall)
    const preview = new THREE.Mesh(getGeoCached('wall'), buildState.previewMaterial);
    preview.visible = false;
    scene.add(preview);
    buildState.preview = preview;
}

// Compute snapped placement based on player position + facing
function computePlacement(type) {
    const px = player.object.position.x;
    const py = player.object.position.y;
    const pz = player.object.position.z;
    const yaw = player.yaw;

    // Snap to grid
    const sx = Math.round(px / GRID) * GRID;
    const sz = Math.round(pz / GRID) * GRID;
    // Vertical snap to nearest WALL_H level (player feet)
    const sy = Math.round(py / WALL_H) * WALL_H;

    // Direction the player is facing (snapped to 4 cardinals)
    let yawSnap = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
    // Forward direction in XZ
    const fx = Math.round(-Math.sin(yawSnap));
    const fz = Math.round(-Math.cos(yawSnap));

    if (type === 'wall') {
        // Place a wall in front of the player (between current cell and next cell)
        const wx = sx + fx * GRID / 2;
        const wz = sz + fz * GRID / 2;
        // Wall orientation: perpendicular to forward
        const rotY = (fz !== 0) ? 0 : Math.PI / 2;
        return { x: wx, y: sy, z: wz, rotY, key: `wall|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` };
    }
    if (type === 'floor') {
        // Floor in front of player (next cell over) at player's foot level
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        return { x: wx, y: sy, z: wz, rotY: 0, key: `floor|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` };
    }
    if (type === 'ramp') {
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        // Ramp goes from low (-z local) at near side to high (+z local) at far side
        // Need to face away from player so high end is far
        const rotY = Math.atan2(-fx, -fz);
        return { x: wx, y: sy, z: wz, rotY, key: `ramp|${Math.round(wx*10)}|${Math.round(sy*10)}|${Math.round(wz*10)}` };
    }
    if (type === 'cone') {
        // Cone above player position (anti-edit/peek protection)
        const wx = sx + fx * GRID;
        const wz = sz + fz * GRID;
        const wy = sy + WALL_H;
        return { x: wx, y: wy, z: wz, rotY: 0, key: `cone|${Math.round(wx*10)}|${Math.round(wy*10)}|${Math.round(wz*10)}` };
    }
    return null;
}

function isValidPlacement(plac, type) {
    if (!plac) return false;
    if (buildState.placedSet.has(plac.key)) return false;
    // Don't place too close to player (avoid clipping) - skip for floor at feet
    const dx = plac.x - player.object.position.x;
    const dz = plac.z - player.object.position.z;
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    if (type === 'wall' && horizDist < 1.0) return false;
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

    // Update preview
    const preview = buildState.preview;
    preview.geometry = getGeoCached(buildState.selected);
    preview.material = valid ? buildState.previewMaterial : buildState.previewBadMaterial;
    preview.position.set(plac.x, plac.y, plac.z);
    preview.rotation.set(0, plac.rotY, 0);
    preview.visible = true;

    // Place on input.shoot when in build mode
    if (input.shoot && buildState.cooldown <= 0 && valid) {
        placePiece(scene, buildState.selected, plac);
        buildState.cooldown = CONFIG.building.placeCooldown;
    }
}

function placePiece(scene, type, plac) {
    const geo = getGeoCached(type);
    const mat = buildState.materials[type];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(plac.x, plac.y, plac.z);
    mesh.rotation.set(0, plac.rotY, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        type: type,
        health: CONFIG.building.health[type],
        key: plac.key,
        // Store world bounds for collision
        buildType: type
    };
    scene.add(mesh);
    buildState.pieces.push(mesh);
    buildState.placedSet.add(plac.key);

    // Cap pieces to avoid lag
    if (buildState.pieces.length > CONFIG.building.maxBuilds) {
        const old = buildState.pieces.shift();
        buildState.placedSet.delete(old.userData.key);
        scene.remove(old);
    }
}

// Collision: check if player AABB intersects any build piece
// Returns adjusted position
const pBox = new THREE.Box3();
const pieceBox = new THREE.Box3();

export function collideWithBuilds(currentPos, nextPos, velocity) {
    const radius = 0.4;
    const halfHeight = CONFIG.player.height / 2;
    let onGround = false;
    const result = {
        position: nextPos.clone(),
        velocity: velocity.clone(),
        onGround: false
    };

    // Solve axis by axis: Y, then X, then Z
    // Y axis (vertical) - landing on floors/ramps
    let testPos = new THREE.Vector3(currentPos.x, result.position.y, currentPos.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + CONFIG.player.height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        pieceBox.setFromObject(piece);
        // Inflate slightly for ramps
        if (pBox.intersectsBox(pieceBox)) {
            // Determine which side
            if (velocity.y <= 0 && currentPos.y >= pieceBox.max.y - 0.4) {
                // Landed on top
                result.position.y = pieceBox.max.y;
                result.velocity.y = 0;
                onGround = true;
            } else if (velocity.y > 0) {
                // Hit ceiling
                result.position.y = pieceBox.min.y - CONFIG.player.height - 0.01;
                result.velocity.y = 0;
            }
            pBox.min.y = result.position.y;
            pBox.max.y = result.position.y + CONFIG.player.height;
        }
    }

    // X axis
    testPos.set(result.position.x, result.position.y, currentPos.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + CONFIG.player.height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        // Skip floors and the piece we're standing on for X movement
        if (piece.userData.buildType === 'floor' && onGround) continue;
        pieceBox.setFromObject(piece);
        if (pBox.intersectsBox(pieceBox)) {
            // Push back along X
            if (velocity.x > 0) {
                result.position.x = pieceBox.min.x - radius - 0.01;
            } else if (velocity.x < 0) {
                result.position.x = pieceBox.max.x + radius + 0.01;
            }
            result.velocity.x = 0;
            pBox.min.x = result.position.x - radius;
            pBox.max.x = result.position.x + radius;
        }
    }

    // Z axis
    testPos.set(result.position.x, result.position.y, result.position.z);
    pBox.min.set(testPos.x - radius, testPos.y, testPos.z - radius);
    pBox.max.set(testPos.x + radius, testPos.y + CONFIG.player.height, testPos.z + radius);

    for (const piece of buildState.pieces) {
        if (piece.userData.buildType === 'floor' && onGround) continue;
        pieceBox.setFromObject(piece);
        if (pBox.intersectsBox(pieceBox)) {
            if (velocity.z > 0) {
                result.position.z = pieceBox.min.z - radius - 0.01;
            } else if (velocity.z < 0) {
                result.position.z = pieceBox.max.z + radius + 0.01;
            }
            result.velocity.z = 0;
        }
    }

    result.onGround = onGround;
    return result;
}

export function setBuildSelected(type) {
    buildState.selected = type;
    buildState.enabled = true;
}

export function toggleBuild() {
    buildState.enabled = !buildState.enabled;
}

export function setBuildEnabled(v) {
    buildState.enabled = v;
}

export function clearBuilds(scene) {
    for (const p of buildState.pieces) {
        scene.remove(p);
    }
    buildState.pieces.length = 0;
    buildState.placedSet.clear();
}

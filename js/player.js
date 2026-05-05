import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';

export const input = {
    forward: false, back: false, left: false, right: false,
    jump: false, sprint: false, scope: false, shoot: false,
    yaw: 0, pitch: 0, mouseDX: 0, mouseDY: 0
};

export const player = {
    object: null, rig: null, camera: null,
    velocity: new THREE.Vector3(),
    yaw: 0, pitch: 0, health: 100, shield: 100, stamina: 100,
    onGround: false, walkCycle: 0, speedSmooth: 0, coins: 0, alive: true,
    targetFOV: 75, currentFOV: 75, aimBlend: 0
};

let buildModeActive = false;

// Build 1v1.lol style character from shapes
function buildPlayerModel() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    // Material colors (will be updated by locker)
    const shirtMat = new THREE.MeshStandardMaterial({ color: COSMETICS.bodyColor || 0x6da3d4, roughness: 0.4, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: COSMETICS.accentColor || 0x1a3550, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: COSMETICS.headColor || 0xfdd7a8, roughness: 0.3 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a });

    // === UPPER BODY ===
    // Torso (slim, athletic)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.4), shirtMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    rig.add(torso);

    // Chest plate / armor accent
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.06), darkMat);
    chestPlate.position.set(0, 1.05, 0.22);
    chestPlate.castShadow = true;
    rig.add(chestPlate);

    // Shoulders (rounded)
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), darkMat);
    leftShoulder.position.set(-0.4, 1.2, 0);
    leftShoulder.castShadow = true;
    rig.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), darkMat);
    rightShoulder.position.set(0.4, 1.2, 0);
    rightShoulder.castShadow = true;
    rig.add(rightShoulder);

    // === ARMS ===
    // Upper arms
    const leftArmUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 6), shirtMat);
    leftArmUpper.position.set(-0.48, 0.95, 0);
    leftArmUpper.castShadow = true;
    rig.add(leftArmUpper);
    
    const rightArmUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 6), shirtMat);
    rightArmUpper.position.set(0.48, 0.95, 0);
    rightArmUpper.castShadow = true;
    rig.add(rightArmUpper);

    // Forearms
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.45, 6), skinMat);
    leftForearm.position.set(-0.49, 0.65, 0);
    leftForearm.castShadow = true;
    rig.add(leftForearm);
    
    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.45, 6), skinMat);
    rightForearm.position.set(0.49, 0.65, 0);
    rightForearm.castShadow = true;
    rig.add(rightForearm);

    // Hands (simple boxes)
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.18), skinMat);
    leftHand.position.set(-0.51, 0.43, 0);
    leftHand.castShadow = true;
    rig.add(leftHand);
    
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.18), skinMat);
    rightHand.position.set(0.51, 0.43, 0);
    rightHand.castShadow = true;
    rig.add(rightHand);

    // === LOWER BODY ===
    // Hips / pelvis
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.42), pantsMat);
    hips.position.y = 0.5;
    hips.castShadow = true;
    rig.add(hips);

    // Thighs
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 6), pantsMat);
    leftThigh.position.set(-0.18, 0.25, 0);
    leftThigh.castShadow = true;
    rig.add(leftThigh);
    
    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 6), pantsMat);
    rightThigh.position.set(0.18, 0.25, 0);
    rightThigh.castShadow = true;
    rig.add(rightThigh);

    // Calves
    const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6), pantsMat);
    leftCalf.position.set(-0.18, -0.05, 0);
    leftCalf.castShadow = true;
    rig.add(leftCalf);
    
    const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6), pantsMat);
    rightCalf.position.set(0.18, -0.05, 0);
    rightCalf.castShadow = true;
    rig.add(rightCalf);

    // Feet
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.4), bootMat);
    leftFoot.position.set(-0.18, -0.32, 0.06);
    leftFoot.castShadow = true;
    rig.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.4), bootMat);
    rightFoot.position.set(0.18, -0.32, 0.06);
    rightFoot.castShadow = true;
    rig.add(rightFoot);

    // === HEAD ===
    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 6), skinMat);
    neck.position.set(0, 1.48, 0);
    neck.castShadow = true;
    rig.add(neck);

    // Head (slightly squashed sphere)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), skinMat);
    head.position.y = 1.68;
    head.castShadow = true;
    rig.add(head);

    // Hair (helmet-like)
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), hairMat);
    hair.position.y = 1.73;
    hair.scale.set(1.05, 0.32, 1.05);
    hair.castShadow = true;
    rig.add(hair);

    // Face visor (1v1.lol signature)
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, emissive: 0x335599, emissiveIntensity: 0.25 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), visorMat);
    visor.position.set(0, 1.66, 0.36);
    rig.add(visor);

    player.rig = rig;
    return root;
}

export function createPlayerModel(scene) {
    const model = buildPlayerModel();
    model.position.set(0, 0, 0);
    scene.add(model);
    player.object = model;
    return model;
}

export function initPlayerControls(camera, domElement) {
    player.camera = camera;
    domElement.addEventListener('click', () => { if (!document.pointerLockElement) domElement.requestPointerLock(); });
    document.addEventListener('mousemove', (e) => { if (document.pointerLockElement) { input.mouseDX += e.movementX; input.mouseDY += e.movementY; } });
    document.addEventListener('mousedown', (e) => { if (!document.pointerLockElement) return; if (e.button === 0) input.shoot = true; if (e.button === 2) input.scope = true; });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) input.shoot = false; if (e.button === 2) input.scope = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (!document.pointerLockElement && e.code !== 'Escape') return;
        if (e.code === keybinds.forward) input.forward = true;
        if (e.code === keybinds.back) input.back = true;
        if (e.code === keybinds.left) input.left = true;
        if (e.code === keybinds.right) input.right = true;
        if (e.code === keybinds.jump) input.jump = true;
        if (e.code === keybinds.sprint) input.sprint = true;
        if (e.code === keybinds.buildToggle) toggleBuildMode();
        if (e.code === keybinds.pickaxe || e.code === 'Digit5' || e.code === 'KeyQ') {
            if (window.switchWeaponTo) window.switchWeaponTo('pickaxe');
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === keybinds.forward) input.forward = false;
        if (e.code === keybinds.back) input.back = false;
        if (e.code === keybinds.left) input.left = false;
        if (e.code === keybinds.right) input.right = false;
        if (e.code === keybinds.jump) input.jump = false;
        if (e.code === keybinds.sprint) input.sprint = false;
    });
}

function toggleBuildMode() { buildModeActive = !buildModeActive; if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive); }
export function isBuildModeActive() { return buildModeActive; }
export function setBuildModeActive(active) { buildModeActive = active; if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive); }

export function updateGunVisuals(weaponId) { /* Handled in weapons.js */ }

export function applyCosmetics() {
    if (!player.rig) return;
    const shirtColor = COSMETICS.bodyColor || '#6da3d4';
    const pantsColor = COSMETICS.accentColor || '#1a3550';
    const skinColor = COSMETICS.headColor || '#fdd7a8';
    
    player.rig.children.forEach(child => {
        if (child.isMesh) {
            if (child.position.y > 1.5) child.material.color.set(skinColor);
            else if (child.position.y < 0.6 && child.position.x !== 0) child.material.color.set(pantsColor);
            else if (child.position.y < 0.3) {} // keep boots black
            else child.material.color.set(shirtColor);
        }
    });
}

export function respawnPlayer() { player.health = CONFIG.player.health; player.shield = CONFIG.player.shield; player.stamina = 100; player.velocity.set(0, 0, 0); player.alive = true; }

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped, getTerrainHeight, checkTreeCollision, collideWithBuilds) {
    const dt = Math.min(deltaTime, 0.033);
    const sens = CONFIG.player.mouseSensitivity * SETTINGS.sensitivity;
    const scopeSens = player.aimBlend > 0.5 ? CONFIG.player.scopeSensitivityMultiplier : 1.0;
    
    player.yaw -= input.mouseDX * sens * scopeSens;
    player.pitch -= input.mouseDY * sens * scopeSens * (SETTINGS.invertY ? -1 : 1);
    player.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.5, player.pitch));
    input.mouseDX = 0; input.mouseDY = 0;

    tmpForward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    tmpRight.set(Math.sin(player.yaw + Math.PI / 2), 0, Math.cos(player.yaw + Math.PI / 2));
    tmpMove.set(0, 0, 0);
    if (input.forward) tmpMove.sub(tmpForward);
    if (input.back) tmpMove.add(tmpForward);
    if (input.left) tmpMove.sub(tmpRight);
    if (input.right) tmpMove.add(tmpRight);
    if (tmpMove.lengthSq() > 0) tmpMove.normalize();

    let speed = CONFIG.player.walkSpeed;
    const isSprinting = input.sprint && player.stamina > 0 && tmpMove.lengthSq() > 0 && !isScoped && !buildModeActive;
    if (isSprinting) {
        speed = CONFIG.player.runSpeed;
        player.stamina = Math.max(0, player.stamina - CONFIG.player.sprintDrain * dt);
    } else {
        player.stamina = Math.min(100, player.stamina + CONFIG.player.sprintRegen * dt);
    }
    if (onSprintUpdate) onSprintUpdate(player.stamina);
    if (player.aimBlend > 0.5) speed *= 0.55;

    player.velocity.x = tmpMove.x * speed;
    player.velocity.z = tmpMove.z * speed;
    player.velocity.y -= CONFIG.player.gravity * dt;
    if (input.jump && player.onGround && !isScoped && !buildModeActive) {
        player.velocity.y = CONFIG.player.jumpPower;
        player.onGround = false;
    }

    let newPos = player.object.position.clone();
    newPos.x += player.velocity.x * dt;
    newPos.z += player.velocity.z * dt;
    newPos.y += player.velocity.y * dt;

    const terrainY = getTerrainHeight ? getTerrainHeight(newPos.x, newPos.z) : 0;
    if (newPos.y <= terrainY) {
        newPos.y = terrainY;
        player.velocity.y = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }
    
    if (checkTreeCollision && checkTreeCollision(newPos.x, newPos.z, 0.5)) {
        newPos.x = player.object.position.x;
        newPos.z = player.object.position.z;
    }
    if (collideWithBuilds) {
        const cr = collideWithBuilds(player.object.position, newPos, player.velocity);
        newPos.copy(cr.position);
        player.velocity.copy(cr.velocity);
        player.onGround = cr.onGround;
    }
    
    player.object.position.copy(newPos);
    if (player.rig) {
        player.rig.rotation.y = player.yaw;
        animateBody(dt, tmpMove.lengthSq() > 0, speed);
    }

    // Third-person camera
    const camOffset = new THREE.Vector3(0, 1.3, 5.2);
    const rotatedOffset = camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
    ));
    camera.position.copy(player.object.position).add(rotatedOffset);
    camera.position.y += player.pitch * 1.0;
    camera.lookAt(player.object.position.clone().add(new THREE.Vector3(0, 1.2, 0)));

    player.currentFOV += ((player.targetFOV || 75) - player.currentFOV) * dt * 12;
    camera.fov = player.currentFOV;
    camera.updateProjectionMatrix();
    player.aimBlend += ((input.scope ? 1 : 0) - player.aimBlend) * dt * 10;
    player.aimBlend = Math.min(1, Math.max(0, player.aimBlend));
    return player.object.position.clone();
}

function animateBody(dt, moving, speed) {
    const targetSpeed = moving ? speed / CONFIG.player.runSpeed : 0;
    player.speedSmooth += (targetSpeed - player.speedSmooth) * dt * 10;
    if (moving) player.walkCycle += dt * (8 + speed * 0.6);
    else player.walkCycle += dt * 1.5;
    
    const cycle = player.walkCycle;
    const intensity = player.speedSmooth;
    const legSwing = Math.sin(cycle) * 0.9 * intensity;
    const armSwing = Math.sin(cycle * 1.3) * 0.8 * intensity;
    
    // Find and animate limbs
    const parts = {};
    player.rig.children.forEach(child => {
        if (child.position.x < -0.4 && child.geometry.type === 'CylinderGeometry') parts.leftArmUpper = child;
        if (child.position.x > 0.4 && child.geometry.type === 'CylinderGeometry') parts.rightArmUpper = child;
        if (child.position.x < -0.1 && child.position.y < 0.4 && child.geometry.type === 'CylinderGeometry') parts.leftThigh = child;
        if (child.position.x > 0.1 && child.position.y < 0.4 && child.geometry.type === 'CylinderGeometry') parts.rightThigh = child;
        if (child.position.x < -0.48 && child.geometry.type === 'CylinderGeometry') parts.leftForearm = child;
        if (child.position.x > 0.48 && child.geometry.type === 'CylinderGeometry') parts.rightForearm = child;
    });
    
    if (parts.leftThigh) parts.leftThigh.rotation.x = legSwing;
    if (parts.rightThigh) parts.rightThigh.rotation.x = -legSwing;
    if (parts.leftArmUpper) parts.leftArmUpper.rotation.z = armSwing - 0.2;
    if (parts.rightArmUpper) parts.rightArmUpper.rotation.z = -armSwing - 0.2;
    if (parts.leftForearm) parts.leftForearm.rotation.z = armSwing * 0.5;
    if (parts.rightForearm) parts.rightForearm.rotation.z = -armSwing * 0.5;
}


export { input, player };

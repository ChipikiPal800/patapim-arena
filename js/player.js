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
    targetFOV: 75, currentFOV: 75, aimBlend: 0, weaponModel: null
};

let buildModeActive = false;

// Build 1v1.lol style humanoid model (connected, realistic proportions)
function buildPlayerModel() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const skinMat = new THREE.MeshStandardMaterial({ color: COSMETICS.skinColor || 0xfdd7a8, roughness: 0.3 });
    const clothMat = new THREE.MeshStandardMaterial({ color: COSMETICS.bodyColor || 0x6da3d4, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: COSMETICS.accentColor || 0x1a3550, roughness: 0.5 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.4 });

    // Torso (connected to hips)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), clothMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    rig.add(torso);

    // Hips/lower body
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.45), pantsMat);
    hips.position.y = 0.45;
    hips.castShadow = true;
    rig.add(hips);

    // Legs (connected)
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), pantsMat);
    leftLeg.position.set(-0.18, 0.2, 0);
    leftLeg.castShadow = true;
    rig.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), pantsMat);
    rightLeg.position.set(0.18, 0.2, 0);
    rightLeg.castShadow = true;
    rig.add(rightLeg);

    // Feet
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.38), bootMat);
    leftFoot.position.set(-0.18, -0.12, 0.05);
    leftFoot.castShadow = true;
    rig.add(leftFoot);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.38), bootMat);
    rightFoot.position.set(0.18, -0.12, 0.05);
    rightFoot.castShadow = true;
    rig.add(rightFoot);

    // Arms (connected at shoulders)
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.6, 6), clothMat);
    leftArm.position.set(-0.35, 1.15, 0);
    leftArm.castShadow = true;
    rig.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.6, 6), clothMat);
    rightArm.position.set(0.35, 1.15, 0);
    rightArm.castShadow = true;
    rig.add(rightArm);

    // Forearms
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 6), skinMat);
    leftForearm.position.set(-0.36, 0.8, 0);
    leftForearm.castShadow = true;
    rig.add(leftForearm);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 6), skinMat);
    rightForearm.position.set(0.36, 0.8, 0);
    rightForearm.castShadow = true;
    rig.add(rightForearm);

    // Hands
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), skinMat);
    leftHand.position.set(-0.38, 0.55, 0);
    leftHand.castShadow = true;
    rig.add(leftHand);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), skinMat);
    rightHand.position.set(0.38, 0.55, 0);
    rightHand.castShadow = true;
    rig.add(rightHand);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 6), skinMat);
    neck.position.set(0, 1.45, 0);
    neck.castShadow = true;
    rig.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), skinMat);
    head.position.y = 1.65;
    head.castShadow = true;
    rig.add(head);

    // Hair (simple helmet-like)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), hairMat);
    hair.position.y = 1.72;
    hair.scale.set(1.05, 0.3, 1.05);
    hair.castShadow = true;
    rig.add(hair);

    // Face visor (1v1.lol style)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, emissive: 0x335599, emissiveIntensity: 0.3 }));
    visor.position.set(0, 1.64, 0.33);
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
    const skinColor = COSMETICS.skinColor || '#fdd7a8';
    const clothColor = COSMETICS.bodyColor || '#6da3d4';
    const pantsColor = COSMETICS.accentColor || '#1a3550';
    player.rig.children.forEach(child => {
        if (child.isMesh) {
            if (child.position.y > 1.5 || child.geometry.type === 'SphereGeometry') child.material.color.set(skinColor);
            else if (child.position.y < 0.6 && child.position.x !== 0) child.material.color.set(pantsColor);
            else if (child.position.y < 0.3) child.material.color.set(0x2a2a2a);
            else child.material.color.set(clothColor);
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
    if (isSprinting) { speed = CONFIG.player.runSpeed; player.stamina = Math.max(0, player.stamina - CONFIG.player.sprintDrain * dt); }
    else { player.stamina = Math.min(100, player.stamina + CONFIG.player.sprintRegen * dt); }
    if (onSprintUpdate) onSprintUpdate(player.stamina);
    if (player.aimBlend > 0.5) speed *= 0.55;

    player.velocity.x = tmpMove.x * speed;
    player.velocity.z = tmpMove.z * speed;
    player.velocity.y -= CONFIG.player.gravity * dt;
    if (input.jump && player.onGround && !isScoped && !buildModeActive) { player.velocity.y = CONFIG.player.jumpPower; player.onGround = false; }

    let newPos = player.object.position.clone();
    newPos.x += player.velocity.x * dt;
    newPos.z += player.velocity.z * dt;
    newPos.y += player.velocity.y * dt;

    const terrainY = getTerrainHeight ? getTerrainHeight(newPos.x, newPos.z) : 0;
    if (newPos.y <= terrainY) { newPos.y = terrainY; player.velocity.y = 0; player.onGround = true; }
    else { player.onGround = false; }
    
    if (checkTreeCollision && checkTreeCollision(newPos.x, newPos.z, 0.5)) { newPos.x = player.object.position.x; newPos.z = player.object.position.z; }
    if (collideWithBuilds) { const cr = collideWithBuilds(player.object.position, newPos, player.velocity); newPos.copy(cr.position); player.velocity.copy(cr.velocity); player.onGround = cr.onGround; }
    
    player.object.position.copy(newPos);
    if (player.rig) { player.rig.rotation.y = player.yaw; animateBody(dt, tmpMove.lengthSq() > 0, speed); }

    // Third-person camera
    const camOffset = new THREE.Vector3(0, 1.3, 5.2);
    const rotatedOffset = camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))));
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
    
    const cycle = player.walkCycle, intensity = player.speedSmooth;
    const legSwing = Math.sin(cycle) * 0.9 * intensity;
    const armSwing = Math.sin(cycle * 1.3) * 0.7 * intensity;
    
    if (player.rig) {
        const leftLeg = player.rig.children.find(c => c.position.x < -0.15 && c.geometry?.parameters?.height > 0.6);
        const rightLeg = player.rig.children.find(c => c.position.x > 0.15 && c.geometry?.parameters?.height > 0.6);
        const leftArm = player.rig.children.find(c => c.position.x < -0.3 && c.geometry?.type === 'CylinderGeometry');
        const rightArm = player.rig.children.find(c => c.position.x > 0.3 && c.geometry?.type === 'CylinderGeometry');
        if (leftLeg) leftLeg.rotation.x = legSwing;
        if (rightLeg) rightLeg.rotation.x = -legSwing;
        if (leftArm) leftArm.rotation.z = armSwing - 0.2;
        if (rightArm) rightArm.rotation.z = -armSwing - 0.2;
    }
}

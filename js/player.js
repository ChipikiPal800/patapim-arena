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

function buildPlayerModel() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const bodyMat = new THREE.MeshLambertMaterial({ color: COSMETICS.bodyColor });
    const accentMat = new THREE.MeshLambertMaterial({ color: COSMETICS.accentColor });
    const headMat = new THREE.MeshLambertMaterial({ color: COSMETICS.headColor });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a4a5a });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.4), bodyMat);
    torso.position.y = 1.0;
    torso.castShadow = true;
    rig.add(torso);

    // Chest plate
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.05), accentMat);
    chest.position.set(0, 1.25, 0.22);
    chest.castShadow = true;
    rig.add(chest);

    // Shoulders
    const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), darkMat);
    leftShoulder.position.set(-0.5, 1.4, 0);
    leftShoulder.castShadow = true;
    rig.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), darkMat);
    rightShoulder.position.set(0.5, 1.4, 0);
    rightShoulder.castShadow = true;
    rig.add(rightShoulder);

    // Upper arms
    const leftArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.28), bodyMat);
    leftArmUpper.position.set(-0.58, 1.15, 0);
    leftArmUpper.castShadow = true;
    rig.add(leftArmUpper);
    
    const rightArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.28), bodyMat);
    rightArmUpper.position.set(0.58, 1.15, 0);
    rightArmUpper.castShadow = true;
    rig.add(rightArmUpper);

    // Forearms
    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.24), bodyMat);
    leftForearm.position.set(-0.62, 0.85, 0);
    leftForearm.castShadow = true;
    rig.add(leftForearm);
    
    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.24), bodyMat);
    rightForearm.position.set(0.62, 0.85, 0);
    rightForearm.castShadow = true;
    rig.add(rightForearm);

    // Hands
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), darkMat);
    leftHand.position.set(-0.62, 0.58, 0);
    leftHand.castShadow = true;
    rig.add(leftHand);
    
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), darkMat);
    rightHand.position.set(0.62, 0.58, 0);
    rightHand.castShadow = true;
    rig.add(rightHand);

    // Thighs
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.32), darkMat);
    leftThigh.position.set(-0.25, 0.5, 0);
    leftThigh.castShadow = true;
    rig.add(leftThigh);
    
    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.32), darkMat);
    rightThigh.position.set(0.25, 0.5, 0);
    rightThigh.castShadow = true;
    rig.add(rightThigh);

    // Calves
    const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.28), darkMat);
    leftCalf.position.set(-0.25, 0.18, 0);
    leftCalf.castShadow = true;
    rig.add(leftCalf);
    
    const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.28), darkMat);
    rightCalf.position.set(0.25, 0.18, 0);
    rightCalf.castShadow = true;
    rig.add(rightCalf);

    // Feet
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.42), darkMat);
    leftFoot.position.set(-0.25, -0.08, 0.05);
    leftFoot.castShadow = true;
    rig.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.42), darkMat);
    rightFoot.position.set(0.25, -0.08, 0.05);
    rightFoot.castShadow = true;
    rig.add(rightFoot);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), headMat);
    head.position.y = 1.75;
    head.castShadow = true;
    rig.add(head);

    // Face mask / visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, emissive: 0x335599 }));
    visor.position.set(0, 1.73, 0.39);
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
export function respawnPlayer() { player.health = CONFIG.player.health; player.shield = CONFIG.player.shield; player.stamina = 100; player.velocity.set(0,0,0); player.alive = true; }

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped, getTerrainHeight, checkTreeCollision, collideWithBuilds) {
    const dt = Math.min(deltaTime, 0.033);
    const sens = CONFIG.player.mouseSensitivity * SETTINGS.sensitivity;
    const scopeSens = player.aimBlend > 0.5 ? CONFIG.player.scopeSensitivityMultiplier : 1.0;
    
    player.yaw -= input.mouseDX * sens * scopeSens;
    player.pitch -= input.mouseDY * sens * scopeSens * (SETTINGS.invertY ? -1 : 1);
    player.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.2, player.pitch));
    input.mouseDX = 0; input.mouseDY = 0;

    tmpForward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    tmpRight.set(Math.sin(player.yaw + Math.PI/2), 0, Math.cos(player.yaw + Math.PI/2));
    tmpMove.set(0,0,0);
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
    const camOffset = new THREE.Vector3(0, 1.4, 5.5);
    const rotatedOffset = camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw))));
    camera.position.copy(player.object.position).add(rotatedOffset);
    camera.position.y += player.pitch * 1.2;
    camera.lookAt(player.object.position.clone().add(new THREE.Vector3(0, 1.3, 0)));

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
    const legSwing = Math.sin(cycle) * 0.8 * intensity;
    const armSwing = Math.sin(cycle * 1.3) * 0.6 * intensity;
    
    if (player.rig) {
        const parts = ['leftThigh', 'rightThigh', 'leftCalf', 'rightCalf'];
        parts.forEach(p => { if (player.rig[p]) player.rig[p].rotation.x = 0; });
        if (player.rig.leftThigh) player.rig.leftThigh.rotation.x = legSwing;
        if (player.rig.rightThigh) player.rig.rightThigh.rotation.x = -legSwing;
        if (player.rig.leftCalf) player.rig.leftCalf.rotation.x = Math.max(0, legSwing * 0.8);
        if (player.rig.rightCalf) player.rig.rightCalf.rotation.x = Math.max(0, -legSwing * 0.8);
    }
}

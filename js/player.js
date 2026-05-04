import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';

// Input state
export const input = {
    forward: false, back: false, left: false, right: false,
    jump: false, sprint: false, scope: false, shoot: false,
    yaw: 0, pitch: 0,
    mouseDX: 0, mouseDY: 0
};

// Player state
export const player = {
    object: null,
    rig: null,
    head: null,
    body: null,
    leftArm: null, rightArm: null,
    leftLeg: null, rightLeg: null,
    camera: null,
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    health: 100,
    shield: 100,
    stamina: 100,
    onGround: false,
    walkCycle: 0,
    speedSmooth: 0,
    coins: 0,
    alive: true,
    targetFOV: 75,
    currentFOV: 75,
    aimBlend: 0,
    bodyHeight: CONFIG.player.height,
    // Third-person camera offset
    cameraOffset: new THREE.Vector3(0, 1.2, 4.5)
};

let buildModeActive = false;

// ─── Player Model (1v1.lol style) ────────────────────────────────────────────
function buildPlayerModel() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const bodyMat = new THREE.MeshLambertMaterial({ color: COSMETICS.bodyColor });
    const accentMat = new THREE.MeshLambertMaterial({ color: COSMETICS.accentColor });
    const headMat = new THREE.MeshLambertMaterial({ color: COSMETICS.headColor });

    // Torso
    const torsoGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.45), bodyMat);
    torso.position.y = 0;
    torso.castShadow = true;
    torsoGroup.add(torso);
    
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.1, 0.46), accentMat);
    stripe.position.y = 0.15;
    torsoGroup.add(stripe);
    
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.47), accentMat);
    belt.position.y = -0.4;
    torsoGroup.add(belt);
    
    torsoGroup.position.y = 1.05;
    rig.add(torsoGroup);
    player.body = torsoGroup;

    // Head
    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
    head.castShadow = true;
    headGroup.add(head);
    headGroup.position.y = 1.75;
    rig.add(headGroup);
    player.head = headGroup;

    // Arms
    function makeArm(side) {
        const shoulder = new THREE.Group();
        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), bodyMat);
        upperArm.position.y = -0.21;
        upperArm.castShadow = true;
        shoulder.add(upperArm);
        const elbow = new THREE.Group();
        elbow.position.y = -0.42;
        const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), bodyMat);
        lowerArm.position.y = -0.21;
        lowerArm.castShadow = true;
        elbow.add(lowerArm);
        const armStripe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.21), accentMat);
        armStripe.position.y = -0.05;
        elbow.add(armStripe);
        shoulder.add(elbow);
        shoulder.userData.elbow = elbow;
        return shoulder;
    }

    function makeLeg(side) {
        const hip = new THREE.Group();
        const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.28), accentMat);
        upperLeg.position.y = -0.225;
        upperLeg.castShadow = true;
        hip.add(upperLeg);
        const knee = new THREE.Group();
        knee.position.y = -0.45;
        const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.27), accentMat);
        lowerLeg.position.y = -0.225;
        lowerLeg.castShadow = true;
        knee.add(lowerLeg);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.36),
            new THREE.MeshLambertMaterial({ color: 0x111111 }));
        foot.position.set(0, -0.46, 0.04);
        foot.castShadow = true;
        knee.add(foot);
        hip.add(knee);
        hip.userData.knee = knee;
        return hip;
    }

    const leftArm = makeArm(-1);
    leftArm.position.set(-0.46, 1.4, 0);
    rig.add(leftArm);
    player.leftArm = leftArm;

    const rightArm = makeArm(1);
    rightArm.position.set(0.46, 1.4, 0);
    rig.add(rightArm);
    player.rightArm = rightArm;

    const leftLeg = makeLeg(-1);
    leftLeg.position.set(-0.18, 0.6, 0);
    rig.add(leftLeg);
    player.leftLeg = leftLeg;

    const rightLeg = makeLeg(1);
    rightLeg.position.set(0.18, 0.6, 0);
    rig.add(rightLeg);
    player.rightLeg = rightLeg;

    player.rig = rig;
    return root;
}

export function createPlayerModel(scene) {
    const model = buildPlayerModel();
    model.position.set(0, 0, 0);
    scene.add(model);
    player.object = model;
    if (player.head) player.head.visible = false;
    return model;
}

export function initPlayerControls(camera, domElement) {
    player.camera = camera;
    
    domElement.addEventListener('click', () => {
        if (!document.pointerLockElement) domElement.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement) {
            input.mouseDX += e.movementX;
            input.mouseDY += e.movementY;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!document.pointerLockElement) return;
        if (e.button === 0) input.shoot = true;
        if (e.button === 2) input.scope = true;
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) input.shoot = false;
        if (e.button === 2) input.scope = false;
    });

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

function toggleBuildMode() {
    buildModeActive = !buildModeActive;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive);
}

export function isBuildModeActive() {
    return buildModeActive;
}

export function setBuildModeActive(active) {
    buildModeActive = active;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive);
}

export function updateGunVisuals(weaponId) {
    // Gun visuals handled in weapons.js
}

export function applyCosmetics() {
    if (player.body) {
        player.body.children.forEach(child => {
            if (child.isMesh && child.material) {
                child.material.color.set(COSMETICS.bodyColor);
            }
        });
    }
    if (player.head && player.head.children[0]) {
        player.head.children[0].material.color.set(COSMETICS.headColor);
    }
}

export function respawnPlayer() {
    player.health = CONFIG.player.health;
    player.shield = CONFIG.player.shield;
    player.stamina = 100;
    player.velocity.set(0, 0, 0);
    player.alive = true;
}

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped, getTerrainHeight, checkTreeCollision, collideWithBuilds) {
    const dt = Math.min(deltaTime, 0.033);
    const sens = CONFIG.player.mouseSensitivity * SETTINGS.sensitivity;
    const scopeSens = (player.aimBlend || 0) > 0.5 ? CONFIG.player.scopeSensitivityMultiplier : 1.0;
    
    player.yaw -= input.mouseDX * sens * scopeSens;
    player.pitch -= input.mouseDY * sens * scopeSens * (SETTINGS.invertY ? -1 : 1);
    player.pitch = Math.max(-Math.PI / 2 + 0.3, Math.min(Math.PI / 2 - 0.1, player.pitch));
    input.mouseDX = 0;
    input.mouseDY = 0;

    tmpForward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    tmpRight.set(Math.sin(player.yaw + Math.PI / 2), 0, Math.cos(player.yaw + Math.PI / 2));

    tmpMove.set(0, 0, 0);
    if (input.forward) tmpMove.sub(tmpForward);
    if (input.back) tmpMove.add(tmpForward);
    if (input.left) tmpMove.sub(tmpRight);
    if (input.right) tmpMove.add(tmpRight);
    if (tmpMove.lengthSq() > 0) tmpMove.normalize();

    let speed = CONFIG.player.walkSpeed;
    const isSprinting = input.sprint && player.stamina > 0 && tmpMove.lengthSq() > 0 && !isScoped && !isBuildModeActive();
    if (isSprinting) {
        speed = CONFIG.player.runSpeed;
        player.stamina = Math.max(0, player.stamina - CONFIG.player.sprintDrain * dt);
    } else {
        player.stamina = Math.min(100, player.stamina + CONFIG.player.sprintRegen * dt);
    }
    if (onSprintUpdate) onSprintUpdate(player.stamina);
    
    if ((player.aimBlend || 0) > 0.5) speed *= 0.55;

    let moveX = tmpMove.x * speed;
    let moveZ = tmpMove.z * speed;
    
    // Apply to velocity
    player.velocity.x = moveX;
    player.velocity.z = moveZ;
    player.velocity.y -= CONFIG.player.gravity * dt;
    
    if (input.jump && player.onGround && !isScoped && !isBuildModeActive()) {
        player.velocity.y = CONFIG.player.jumpPower;
        player.onGround = false;
    }

    let newPos = player.object.position.clone();
    newPos.x += player.velocity.x * dt;
    newPos.z += player.velocity.z * dt;
    newPos.y += player.velocity.y * dt;

    // Terrain collision
    const terrainY = getTerrainHeight ? getTerrainHeight(newPos.x, newPos.z) : 0;
    if (newPos.y <= terrainY) {
        newPos.y = terrainY;
        player.velocity.y = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }
    
    // Tree collision
    if (checkTreeCollision) {
        if (checkTreeCollision(newPos.x, newPos.z, 0.5)) {
            newPos.x = player.object.position.x;
            newPos.z = player.object.position.z;
        }
    }
    
    // Build collision
    if (collideWithBuilds) {
        const collResult = collideWithBuilds(player.object.position, newPos, player.velocity);
        newPos.copy(collResult.position);
        player.velocity.copy(collResult.velocity);
        player.onGround = collResult.onGround;
    }
    
    player.object.position.copy(newPos);

    // Update model rotation
    if (player.rig) {
        player.rig.rotation.y = player.yaw;
        animateBody(dt, tmpMove.lengthSq() > 0, speed);
    }

    // Third-person camera (over-the-shoulder)
    const camOffset = player.cameraOffset.clone();
    // Rotate offset based on player yaw
    const rotatedOffset = camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
    ));
    camera.position.copy(player.object.position).add(rotatedOffset);
    camera.position.y += player.pitch * 1.5;
    camera.lookAt(player.object.position.clone().add(new THREE.Vector3(0, 1.2, 0)));

    // Smooth camera follow
    const targetPos = camera.position.clone();
    camera.position.lerp(targetPos, 0.2);
    
    // Scope zoom effect
    player.currentFOV += ((player.targetFOV || 75) - player.currentFOV) * Math.min(1, dt * 12);
    camera.fov = player.currentFOV;
    camera.updateProjectionMatrix();

    const targetAim = input.scope ? 1 : 0;
    player.aimBlend = (player.aimBlend || 0) + (targetAim - (player.aimBlend || 0)) * Math.min(1, dt * 10);
    player.aimBlend = Math.min(1, Math.max(0, player.aimBlend));

    return player.object.position.clone();
}

function animateBody(dt, moving, speed) {
    const targetSpeed = moving ? speed / CONFIG.player.runSpeed : 0;
    player.speedSmooth += (targetSpeed - player.speedSmooth) * Math.min(1, dt * 10);

    if (moving) {
        player.walkCycle += dt * (8 + speed * 0.6);
    } else {
        player.walkCycle += dt * 1.5;
    }

    const cycle = player.walkCycle;
    const intensity = player.speedSmooth;
    const legSwing = Math.sin(cycle) * 0.7 * intensity;
    const armBase = THREE.MathUtils.lerp(-0.3, -1.4, player.aimBlend || 0);
    const armRunSwing = Math.sin(cycle) * 0.5 * intensity * (1 - (player.aimBlend || 0));

    if (player.leftLeg) {
        player.leftLeg.rotation.x = legSwing;
        if (player.leftLeg.userData.knee) player.leftLeg.userData.knee.rotation.x = Math.max(0, -Math.sin(cycle) * 0.6) * intensity;
    }
    if (player.rightLeg) {
        player.rightLeg.rotation.x = -legSwing;
        if (player.rightLeg.userData.knee) player.rightLeg.userData.knee.rotation.x = Math.max(0, Math.sin(cycle) * 0.6) * intensity;
    }
    if (player.leftArm) {
        player.leftArm.rotation.x = armBase + armRunSwing;
        player.leftArm.rotation.z = THREE.MathUtils.lerp(0.1, 0.4, player.aimBlend || 0);
        if (player.leftArm.userData.elbow) player.leftArm.userData.elbow.rotation.x = THREE.MathUtils.lerp(0.2, 0.9, player.aimBlend || 0);
    }
    if (player.rightArm) {
        player.rightArm.rotation.x = armBase - armRunSwing;
        player.rightArm.rotation.z = THREE.MathUtils.lerp(-0.1, -0.4, player.aimBlend || 0);
        if (player.rightArm.userData.elbow) player.rightArm.userData.elbow.rotation.x = THREE.MathUtils.lerp(0.2, 0.9, player.aimBlend || 0);
    }
    if (player.body) {
        player.body.rotation.x = intensity * 0.05;
        player.body.position.y = 1.05 + Math.abs(Math.sin(cycle * 2)) * 0.03 * intensity;
    }
}

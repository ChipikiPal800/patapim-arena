import * as THREE from 'three';
import { CONFIG } from './config.js';

// Input state
const keyState = { forward: false, back: false, left: false, right: false, shift: false, space: false };
let yaw = -Math.PI / 2;
let pitch = 0.3;
let sprintPercent = 100;
let verticalVelocity = 0;
let isGrounded = true;

// Player model parts
let playerGroup;
let leftLeg, rightLeg, leftArm, rightArm, gunModel;
let legSwing = 0;
let armSwing = 0;
let jumpHeight = 0;

export function createPlayerModel(scene) {
    playerGroup = new THREE.Group();

    // Cubed body (Fortnite style)
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.9, 0.6);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x2c5a7a });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.castShadow = true;
    torso.position.y = 0.8;
    playerGroup.add(torso);

    // Cubed head
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf0c0a0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = 1.3;
    playerGroup.add(head);

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2c5a7a });
    leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), armMat);
    rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), armMat);
    leftArm.position.set(-0.55, 1.0, 0);
    rightArm.position.set(0.55, 1.0, 0);
    leftArm.castShadow = true;
    rightArm.castShadow = true;
    playerGroup.add(leftArm, rightArm);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5a });
    leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), legMat);
    rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), legMat);
    leftLeg.position.set(-0.3, 0.35, 0);
    rightLeg.position.set(0.3, 0.35, 0);
    leftLeg.castShadow = true;
    rightLeg.castShadow = true;
    playerGroup.add(leftLeg, rightLeg);

    // Gun model
    gunModel = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.15), new THREE.MeshStandardMaterial({ color: 0x443322 }));
    grip.position.set(0, -0.1, 0.2);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    barrel.position.set(0.35, 0, 0.2);
    gunModel.add(grip, barrel);
    rightArm.add(gunModel);
    gunModel.position.set(0.25, -0.2, 0.2);

    playerGroup.position.y = 0;
    scene.add(playerGroup);
    return playerGroup;
}

export function initPlayerControls(camera, domElement) {
    domElement.addEventListener('click', () => domElement.requestPointerLock());
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': keyState.forward = true; break;
            case 'KeyS': keyState.back = true; break;
            case 'KeyA': keyState.left = true; break;
            case 'KeyD': keyState.right = true; break;
            case 'ShiftLeft': keyState.shift = true; break;
            case 'Space': keyState.space = true; e.preventDefault(); break;
            case 'KeyF': toggleBuildMode(); break;
        }
    });
    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': keyState.forward = false; break;
            case 'KeyS': keyState.back = false; break;
            case 'KeyA': keyState.left = false; break;
            case 'KeyD': keyState.right = false; break;
            case 'ShiftLeft': keyState.shift = false; break;
            case 'Space': keyState.space = false; break;
        }
    });
    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === domElement) {
            yaw -= e.movementX * CONFIG.player.mouseSensitivity;
            pitch -= e.movementY * CONFIG.player.mouseSensitivity;
            pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
        }
    });
}

let buildModeActive = false;
function toggleBuildMode() {
    buildModeActive = !buildModeActive;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive);
}

let playerPosition = new THREE.Vector3(0, CONFIG.player.height, 0);

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped) {
    const dt = Math.min(deltaTime, 0.033);
    
    // Sprint logic
    let currentSpeed = CONFIG.player.walkSpeed;
    let isSprinting = keyState.shift && sprintPercent > 0 && isGrounded && !isScoped;
    if (isSprinting) {
        currentSpeed = CONFIG.player.runSpeed;
        sprintPercent -= CONFIG.player.sprintDrain * dt;
        if (sprintPercent < 0) sprintPercent = 0;
    } else {
        sprintPercent += CONFIG.player.sprintRegen * dt;
        if (sprintPercent > 100) sprintPercent = 100;
    }
    if (onSprintUpdate) onSprintUpdate(sprintPercent);
    
    // Jump
    if (keyState.space && isGrounded && !isScoped) {
        verticalVelocity = CONFIG.player.jumpPower;
        isGrounded = false;
    }
    
    // Gravity
    verticalVelocity -= CONFIG.player.gravity * dt;
    playerPosition.y += verticalVelocity * dt;
    if (playerPosition.y <= CONFIG.player.height) {
        playerPosition.y = CONFIG.player.height;
        verticalVelocity = 0;
        isGrounded = true;
    } else {
        isGrounded = false;
    }
    
    // Movement direction (FIXED: A = left, D = right)
    let moveDir = new THREE.Vector3(0, 0, 0);
    if (keyState.forward) moveDir.z -= 1;
    if (keyState.back) moveDir.z += 1;
    if (keyState.left) moveDir.x -= 1;      // FIXED
    if (keyState.right) moveDir.x += 1;     // FIXED
    if (moveDir.length() > 0) moveDir.normalize();
    
    // Transform direction from camera orientation
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3(0, 0, 0);
    move.addScaledVector(forward, moveDir.z);
    move.addScaledVector(right, moveDir.x);
    move.multiplyScalar(currentSpeed * dt);
    playerPosition.add(move);
    
    // Boundaries
    const limit = CONFIG.world.groundSize / 2 - 3;
    playerPosition.x = Math.min(limit, Math.max(-limit, playerPosition.x));
    playerPosition.z = Math.min(limit, Math.max(-limit, playerPosition.z));
    
    // Update model position
    playerGroup.position.copy(playerPosition);
    playerGroup.position.y = 0;
    playerGroup.rotation.y = yaw;
    
    // Third-person camera
    const camOffset = new THREE.Vector3(0, 1.2, isScoped ? 2.5 : 5);
    camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    ));
    camera.position.copy(playerPosition).add(camOffset);
    camera.position.y += pitch * 2;
    camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)));
    
    // Animate limbs
    const isMoving = moveDir.length() > 0.1;
    if (isMoving && isGrounded) {
        const swingSpeed = isSprinting ? 18 : 12;
        legSwing += dt * swingSpeed;
        armSwing += dt * swingSpeed;
        
        const legAngle = Math.sin(legSwing) * 0.9;
        const armAngle = Math.sin(armSwing) * 0.7;
        leftLeg.rotation.x = legAngle;
        rightLeg.rotation.x = -legAngle;
        leftArm.rotation.z = armAngle - 0.3;
        rightArm.rotation.z = -armAngle - 0.3;
        
        gunModel.position.y = Math.sin(armSwing * 2) * 0.04;
    } else if (!isGrounded) {
        // Jump animation
        const jumpVal = Math.sin(Date.now() * 0.01) * 0.5;
        leftLeg.rotation.x = jumpVal * 0.5;
        rightLeg.rotation.x = -jumpVal * 0.5;
        leftArm.rotation.z = 0.5;
        rightArm.rotation.z = -0.5;
    } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.z = -0.3;
        rightArm.rotation.z = -0.3;
        gunModel.position.y = 0;
    }
    
    return playerPosition.clone();
}

export function updateGunVisuals(weaponId) {
    if (!gunModel) return;
    while (gunModel.children.length) gunModel.remove(gunModel.children[0]);
    const wp = CONFIG.weapons[weaponId];
    const mat = new THREE.MeshStandardMaterial({ color: wp.color });
    if (weaponId === 'pistol') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.15), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), mat);
        barrel.position.set(0.2, 0, 0.2);
        gunModel.add(grip, barrel);
    } else if (weaponId === 'assault') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), mat);
        barrel.position.set(0.35, 0, 0.2);
        gunModel.add(grip, barrel);
    } else if (weaponId === 'sniper') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.1), mat);
        barrel.position.set(0.5, 0, 0.2);
        gunModel.add(grip, barrel);
    } else if (weaponId === 'shotgun') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.15), mat);
        barrel.position.set(0.3, 0, 0.2);
        gunModel.add(grip, barrel);
    }
}

export function respawnPlayer() {
    playerPosition.set(0, CONFIG.player.height, 0);
    verticalVelocity = 0;
    isGrounded = true;
}

export function isBuildModeActive() {
    return buildModeActive;
}

import * as THREE from 'three';
import { CONFIG } from './config.js';

const keyState = { w: false, s: false, a: false, d: false, shift: false, space: false };
let yaw = -Math.PI / 2, pitch = 0.3, sprintPercent = 100, verticalVelocity = 0, isGrounded = true;
let playerModel, limbs = {}, gunModel;
let legSwing = 0, armSwing = 0, jumpLegSwing = 0;

export function createPlayerModel(scene) {
    const group = new THREE.Group();
    
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: CONFIG.player.modelColor }));
    torso.castShadow = true; torso.position.y = 0.8; group.add(torso);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), new THREE.MeshStandardMaterial({ color: 0xfdd7a8 }));
    head.castShadow = true; head.position.y = 1.3; group.add(head);
    
    // Arms (individual)
    const armMat = new THREE.MeshStandardMaterial({ color: CONFIG.player.modelColor });
    limbs.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), armMat);
    limbs.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), armMat);
    limbs.leftArm.position.set(-0.5, 1.05, 0); limbs.rightArm.position.set(0.5, 1.05, 0);
    limbs.leftArm.castShadow = limbs.rightArm.castShadow = true;
    group.add(limbs.leftArm, limbs.rightArm);
    
    // Legs (individual)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e66 });
    limbs.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.4), legMat);
    limbs.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.4), legMat);
    limbs.leftLeg.position.set(-0.25, 0.35, 0); limbs.rightLeg.position.set(0.25, 0.35, 0);
    limbs.leftLeg.castShadow = limbs.rightLeg.castShadow = true;
    group.add(limbs.leftLeg, limbs.rightLeg);
    
    // Gun
    gunModel = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.15), new THREE.MeshStandardMaterial({ color: 0x443322 }));
    grip.position.set(0, -0.1, 0.2);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    barrel.position.set(0.35, 0, 0.2);
    gunModel.add(grip, barrel);
    limbs.rightArm.add(gunModel);
    gunModel.position.set(0.25, -0.25, 0.2);
    
    group.position.y = 0;
    scene.add(group);
    return group;
}

export function initPlayerControls(camera, domElement, playerObj) {
    playerModel = playerObj;
    domElement.addEventListener('click', () => domElement.requestPointerLock());
    document.addEventListener('keydown', (e) => {
        const k = e.code;
        if (k === 'KeyW') keyState.w = true;
        if (k === 'KeyS') keyState.s = true;
        if (k === 'KeyA') keyState.a = true;
        if (k === 'KeyD') keyState.d = true;
        if (k === 'ShiftLeft') keyState.shift = true;
        if (k === 'Space') { keyState.space = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
        const k = e.code;
        if (k === 'KeyW') keyState.w = false;
        if (k === 'KeyS') keyState.s = false;
        if (k === 'KeyA') keyState.a = false;
        if (k === 'KeyD') keyState.d = false;
        if (k === 'ShiftLeft') keyState.shift = false;
        if (k === 'Space') keyState.space = false;
    });
    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === domElement) {
            yaw -= e.movementX * CONFIG.player.mouseSensitivity;
            pitch -= e.movementY * CONFIG.player.mouseSensitivity;
            pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
        }
    });
}

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped) {
    // Clamp deltaTime to prevent huge jumps
    const dt = Math.min(deltaTime, 0.033);
    
    // Sprint logic
    let currentSpeed = CONFIG.player.walkSpeed;
    let isSprinting = keyState.shift && sprintPercent > 0 && isGrounded && !isScoped;
    if (isSprinting) {
        currentSpeed = CONFIG.player.runSpeed;
        sprintPercent -= CONFIG.player.sprintDrain * dt;
        if (sprintPercent <= 0) sprintPercent = 0;
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
    camera.position.y += verticalVelocity * dt;
    if (camera.position.y <= CONFIG.player.height) {
        camera.position.y = CONFIG.player.height;
        verticalVelocity = 0;
        isGrounded = true;
    } else {
        isGrounded = false;
    }
    
    // Movement vector
    const move = new THREE.Vector3(0, 0, 0);
    if (keyState.w) move.z -= 1;
    if (keyState.s) move.z += 1;
    if (keyState.a) move.x -= 1;
    if (keyState.d) move.x += 1;
    
    // Only normalize if there's movement
    if (move.length() > 0) {
        move.normalize();
    }
    
    // Apply camera rotation
    move.applyQuaternion(camera.quaternion);
    move.y = 0;
    
    // Apply speed with dt clamp
    move.multiplyScalar(currentSpeed * dt);
    
    // Apply movement
    camera.position.add(move);
    
    // Animations
    const isMoving = Math.abs(move.x) > 0.01 || Math.abs(move.z) > 0.01;
    if (isMoving && isGrounded) {
        const swingSpeed = isSprinting ? 20 : 12;
        legSwing += dt * swingSpeed;
        armSwing += dt * swingSpeed;
        const legAngle = Math.sin(legSwing) * 0.8;
        const armAngle = Math.sin(armSwing) * 0.6;
        if (limbs.leftLeg) limbs.leftLeg.rotation.x = legAngle;
        if (limbs.rightLeg) limbs.rightLeg.rotation.x = -legAngle;
        if (limbs.leftArm) limbs.leftArm.rotation.z = armAngle - 0.2;
        if (limbs.rightArm) limbs.rightArm.rotation.z = -armAngle - 0.2;
        if (gunModel) gunModel.position.y = Math.sin(armSwing * 2) * 0.03;
    } else if (!isGrounded) {
        jumpLegSwing += dt * 15;
        const jumpAngle = Math.sin(jumpLegSwing) * 0.5;
        if (limbs.leftLeg) limbs.leftLeg.rotation.x = jumpAngle;
        if (limbs.rightLeg) limbs.rightLeg.rotation.x = -jumpAngle;
        if (limbs.leftArm) limbs.leftArm.rotation.z = 0.5;
        if (limbs.rightArm) limbs.rightArm.rotation.z = -0.5;
    } else {
        if (limbs.leftLeg) limbs.leftLeg.rotation.x = 0;
        if (limbs.rightLeg) limbs.rightLeg.rotation.x = 0;
        if (limbs.leftArm) limbs.leftArm.rotation.z = -0.2;
        if (limbs.rightArm) limbs.rightArm.rotation.z = -0.2;
        if (gunModel) gunModel.position.y = 0;
    }
    
    // Update model position
    if (playerModel) {
        playerModel.position.copy(camera.position);
        playerModel.position.y = 0;
        playerModel.rotation.y = yaw;
    }
    
    // Third-person camera
    const camOffset = new THREE.Vector3(0, 1.2, isScoped ? 2.5 : 5);
    camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    ));
    camera.position.copy(playerModel.position).add(camOffset);
    camera.position.y += pitch * 2;
    camera.lookAt(playerModel.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    
    // Boundaries
    const limit = CONFIG.world.groundSize / 2 - 3;
    if (playerModel) {
        playerModel.position.x = Math.min(limit, Math.max(-limit, playerModel.position.x));
        playerModel.position.z = Math.min(limit, Math.max(-limit, playerModel.position.z));
    }
    
    return playerModel ? playerModel.position.clone() : new THREE.Vector3(0, 0, 0);
}

export function updateGunVisuals(weaponId) {
    if (!gunModel) return;
    while(gunModel.children.length) gunModel.remove(gunModel.children[0]);
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
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.15), mat);
        stock.position.set(-0.15, -0.05, 0.18);
        gunModel.add(grip, barrel, stock);
    } else if (weaponId === 'sniper') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.1), mat);
        barrel.position.set(0.5, 0, 0.2);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), mat);
        scope.position.set(0.35, 0.12, 0.23);
        gunModel.add(grip, barrel, scope);
    } else if (weaponId === 'shotgun') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), mat);
        grip.position.set(0, -0.1, 0.2);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.15), mat);
        barrel.position.set(0.3, 0, 0.2);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.12), mat);
        pump.position.set(0.15, -0.08, 0.22);
        gunModel.add(grip, barrel, pump);
    }
}

export function respawnPlayer(camera) {
    camera.position.set(0, CONFIG.player.height, 0);
    verticalVelocity = 0;
    isGrounded = true;
}

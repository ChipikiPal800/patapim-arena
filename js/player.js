import * as THREE from 'three';
import { CONFIG } from './config.js';

const keyState = { w: false, s: false, a: false, d: false, shift: false };
let yaw = -Math.PI / 2;
let pitch = 0.3;
let sprintPercent = 100;
let isSprinting = false;

let playerModel;
let leftLeg, rightLeg, leftArm, rightArm, gunModel;

export function createPlayerModel(scene) {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.7, CONFIG.player.modelHeight, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: CONFIG.player.modelColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = CONFIG.player.modelHeight / 2;
    group.add(body);
    
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfdd7a8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = CONFIG.player.modelHeight + 0.2;
    group.add(head);
    
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e66 });
    leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.3), legMat);
    rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.3), legMat);
    leftLeg.position.set(-0.25, 0.3, 0);
    rightLeg.position.set(0.25, 0.3, 0);
    leftLeg.castShadow = true;
    rightLeg.castShadow = true;
    group.add(leftLeg, rightLeg);
    
    const armMat = new THREE.MeshStandardMaterial({ color: CONFIG.player.modelColor });
    leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.3), armMat);
    rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.3), armMat);
    leftArm.position.set(-0.5, 1.0, 0);
    rightArm.position.set(0.5, 1.0, 0);
    leftArm.castShadow = true;
    rightArm.castShadow = true;
    group.add(leftArm, rightArm);
    
    gunModel = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.15), new THREE.MeshStandardMaterial({ color: 0x443322 }));
    grip.position.set(0, -0.1, 0.2);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    barrel.position.set(0.25, 0, 0.2);
    gunModel.add(grip, barrel);
    rightArm.add(gunModel);
    gunModel.position.set(0.15, -0.2, 0.15);
    
    group.position.y = 0;
    group.castShadow = true;
    scene.add(group);
    return group;
}

export function initPlayerControls(camera, domElement, playerObj) {
    playerModel = playerObj;
    domElement.addEventListener('click', () => domElement.requestPointerLock());
    document.addEventListener('keydown', (e) => {
        const key = e.code;
        if (key === 'KeyW') keyState.w = true;
        if (key === 'KeyS') keyState.s = true;
        if (key === 'KeyA') keyState.a = true;
        if (key === 'KeyD') keyState.d = true;
        if (key === 'ShiftLeft') keyState.shift = true;
    });
    document.addEventListener('keyup', (e) => {
        const key = e.code;
        if (key === 'KeyW') keyState.w = false;
        if (key === 'KeyS') keyState.s = false;
        if (key === 'KeyA') keyState.a = false;
        if (key === 'KeyD') keyState.d = false;
        if (key === 'ShiftLeft') keyState.shift = false;
    });
    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === domElement) {
            yaw -= e.movementX * CONFIG.player.mouseSensitivity;
            pitch -= e.movementY * CONFIG.player.mouseSensitivity;
            pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.5, pitch));
        }
    });
}

let legSwing = 0;
let armSwing = 0;
let gunBob = 0;

export function updatePlayerMovement(camera, deltaTime, onSprintUpdate) {
    let currentSpeed = CONFIG.player.walkSpeed;
    isSprinting = keyState.shift && sprintPercent > 0;
    if (isSprinting) {
        currentSpeed = CONFIG.player.runSpeed;
        sprintPercent -= CONFIG.player.sprintDrain * deltaTime;
        if (sprintPercent <= 0) sprintPercent = 0;
    } else {
        sprintPercent += CONFIG.player.sprintRegen * deltaTime;
        if (sprintPercent > 100) sprintPercent = 100;
    }
    if (onSprintUpdate) onSprintUpdate(sprintPercent);
    
    const move = new THREE.Vector3(0, 0, 0);
    if (keyState.w) move.z -= 1;
    if (keyState.s) move.z += 1;
    if (keyState.a) move.x -= 1;
    if (keyState.d) move.x += 1;
    move.normalize();
    move.applyQuaternion(camera.quaternion);
    move.y = 0;
    move.multiplyScalar(currentSpeed * deltaTime);
    
    const isMoving = move.length() > 0.01;
    
    if (isMoving) {
        const swingSpeed = isSprinting ? 18 : 10;
        legSwing += deltaTime * swingSpeed;
        armSwing += deltaTime * swingSpeed;
        const legAngle = Math.sin(legSwing) * 0.6;
        const armAngle = Math.sin(armSwing) * 0.5;
        leftLeg.rotation.x = legAngle;
        rightLeg.rotation.x = -legAngle;
        leftArm.rotation.z = armAngle - 0.2;
        rightArm.rotation.z = -armAngle - 0.2;
        gunBob = Math.sin(armSwing * 2) * 0.03;
        gunModel.position.y = gunBob;
        gunModel.position.x = 0.15 + Math.sin(armSwing * 4) * 0.01;
    } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.z = -0.2;
        rightArm.rotation.z = -0.2;
        gunModel.position.y = 0;
        gunModel.position.x = 0.15;
    }
    
    playerModel.position.copy(camera.position);
    playerModel.position.y = 0;
    playerModel.rotation.y = yaw;
    
    const camOffset = new THREE.Vector3(0, 1.2, 5);
    camOffset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    ));
    camera.position.copy(playerModel.position).add(camOffset);
    camera.position.y += pitch * 2;
    camera.lookAt(playerModel.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    
    const limit = CONFIG.world.groundSize / 2 - 3;
    playerModel.position.x = Math.min(limit, Math.max(-limit, playerModel.position.x));
    playerModel.position.z = Math.min(limit, Math.max(-limit, playerModel.position.z));
    camera.position.x = Math.min(limit + 2, Math.max(-limit - 2, camera.position.x));
    camera.position.z = Math.min(limit + 2, Math.max(-limit - 2, camera.position.z));
    
    return playerModel.position.clone();
}

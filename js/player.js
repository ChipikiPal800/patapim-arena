import * as THREE from 'three';
import { CONFIG } from './config.js';

const keyState = { w: false, s: false, a: false, d: false };
let yaw = -Math.PI / 2;
let pitch = 0;

export function initPlayerControls(camera, domElement) {
    domElement.addEventListener('click', () => domElement.requestPointerLock());
    document.addEventListener('keydown', (e) => {
        const key = e.code;
        if (key === 'KeyW') keyState.w = true;
        if (key === 'KeyS') keyState.s = true;
        if (key === 'KeyA') keyState.a = true;
        if (key === 'KeyD') keyState.d = true;
    });
    document.addEventListener('keyup', (e) => {
        const key = e.code;
        if (key === 'KeyW') keyState.w = false;
        if (key === 'KeyS') keyState.s = false;
        if (key === 'KeyA') keyState.a = false;
        if (key === 'KeyD') keyState.d = false;
    });
    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === domElement) {
            yaw -= e.movementX * CONFIG.player.mouseSensitivity;
            pitch -= e.movementY * CONFIG.player.mouseSensitivity;
            pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;
        }
    });
}

export function updatePlayerMovement(camera, deltaTime) {
    const move = new THREE.Vector3(0, 0, 0);
    if (keyState.w) move.z -= 1;
    if (keyState.s) move.z += 1;
    if (keyState.a) move.x -= 1;
    if (keyState.d) move.x += 1;
    move.normalize();
    move.applyQuaternion(camera.quaternion);
    move.y = 0;
    move.multiplyScalar(CONFIG.player.speed * deltaTime);
    camera.position.add(move);
    const limit = CONFIG.world.groundSize / 2 - 3;
    camera.position.x = Math.min(limit, Math.max(-limit, camera.position.x));
    camera.position.z = Math.min(limit, Math.max(-limit, camera.position.z));
    camera.position.y = CONFIG.player.height;
    return camera.position.clone();
}

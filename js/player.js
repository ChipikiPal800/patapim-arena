// js/player.js
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';

const keyState = { w: false, s: false, a: false, d: false };
let yaw = -Math.PI/2;
let pitch = 0;
let velocity = new THREE.Vector3(0,0,0);

export function initPlayerControls(camera, renderer) {
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'KeyW': keyState.w = true; break;
            case 'KeyS': keyState.s = true; break;
            case 'KeyA': keyState.a = true; break;
            case 'KeyD': keyState.d = true; break;
        }
    });
    document.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW': keyState.w = false; break;
            case 'KeyS': keyState.s = false; break;
            case 'KeyA': keyState.a = false; break;
            case 'KeyD': keyState.d = false; break;
        }
    });
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement) {
            yaw -= e.movementX * GAME_CONFIG.player.mouseSensitivity;
            pitch -= e.movementY * GAME_CONFIG.player.mouseSensitivity;
            pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, pitch));
            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;
        }
    });
}

export function updatePlayerMovement(camera, deltaTime) {
    const speed = GAME_CONFIG.player.speed;
    const move = new THREE.Vector3(0,0,0);
    if (keyState.w) move.z -= 1;
    if (keyState.s) move.z += 1;
    if (keyState.a) move.x -= 1;
    if (keyState.d) move.x += 1;
    move.normalize();
    move.applyQuaternion(camera.quaternion);
    move.y = 0;
    move.multiplyScalar(speed * deltaTime);
    camera.position.add(move);
    // simple boundaries (arena)
    const limit = GAME_CONFIG.world.groundSize/2 - 2;
    camera.position.x = Math.min(limit, Math.max(-limit, camera.position.x));
    camera.position.z = Math.min(limit, Math.max(-limit, camera.position.z));
    return camera.position.clone();
}

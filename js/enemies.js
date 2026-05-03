// js/enemies.js
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';

export function createBlobEnemy(x, z) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(GAME_CONFIG.enemies.blob.size, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xb56a3c });
    const body = new THREE.Mesh(bodyGeo, material);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    // eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8,8), eyeMat);
    leftEye.position.set(-0.25, 0.3, 0.7);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), eyeMat);
    rightEye.position.set(0.25, 0.3, 0.7);
    group.add(leftEye, rightEye);
    
    // health bar
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xaa0000 }));
    barBg.position.set(0, 1.0, 0);
    const barFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    barFill.position.set(0, 1.0, 0);
    barFill.scale.x = 1.0;
    barFill.userData.isHealthBar = true;
    group.add(barBg, barFill);
    
    group.position.set(x, 0, z);
    group.userData = {
        isEnemy: true,
        health: GAME_CONFIG.enemies.blob.health,
        maxHealth: GAME_CONFIG.enemies.blob.health,
        barFill: barFill,
        speed: GAME_CONFIG.enemies.blob.speed
    };
    return group;
}

export function updateEnemies(enemiesList, playerPos) {
    for (let enemy of enemiesList) {
        const dir = new THREE.Vector3().subVectors(playerPos, enemy.position).normalize();
        enemy.position.x += dir.x * GAME_CONFIG.enemies.blob.speed * 0.016; // assume 60fps delta
        enemy.position.z += dir.z * GAME_CONFIG.enemies.blob.speed * 0.016;
        // rotate to face player
        enemy.lookAt(playerPos);
    }
}

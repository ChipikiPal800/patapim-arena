import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createBlobEnemy(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.enemies.blob.size, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xb56a3c })
    );
    body.castShadow = true;
    group.add(body);
    
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    leftEye.position.set(-0.25, 0.3, 0.7);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    rightEye.position.set(0.25, 0.3, 0.7);
    group.add(leftEye, rightEye);
    
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xaa0000 }));
    barBg.position.set(0, 1.0, 0);
    const barFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    barFill.position.set(0, 1.0, 0);
    barFill.userData.isHealthBar = true;
    group.add(barBg, barFill);
    
    group.position.set(x, 0, z);
    group.userData = {
        isEnemy: true,
        health: CONFIG.enemies.blob.health,
        maxHealth: CONFIG.enemies.blob.health,
        speed: CONFIG.enemies.blob.speed
    };
    return group;
}

export function updateEnemies(enemiesList, playerPos, deltaTime = 0.016) {
    for (let enemy of enemiesList) {
        const dir = new THREE.Vector3().subVectors(playerPos, enemy.position).normalize();
        enemy.position.x += dir.x * CONFIG.enemies.blob.speed * deltaTime;
        enemy.position.z += dir.z * CONFIG.enemies.blob.speed * deltaTime;
        enemy.lookAt(playerPos);
        
        // update health bar
        const bar = enemy.children.find(c => c.userData?.isHealthBar);
        if (bar) {
            const percent = enemy.userData.health / enemy.userData.maxHealth;
            bar.scale.x = Math.max(0, percent);
        }
    }
}

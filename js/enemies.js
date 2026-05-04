import * as THREE from 'three';
import { CONFIG } from './config.js';

// Create a zombie enemy (COD-style zombie look)
export function createZombieEnemy(x, z) {
    const group = new THREE.Group();
    const config = CONFIG.enemies.zombie;
    
    // Zombie body - hunched posture
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a5a4a, // Greenish grey dead skin
        roughness: 0.8 
    });
    const clothMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a3a3a, // Torn dark clothes
        roughness: 0.9 
    });
    const bloodMat = new THREE.MeshStandardMaterial({ 
        color: 0x8a2020, 
        roughness: 0.7 
    });
    
    // Torso (hunched)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), clothMat);
    torso.position.set(0, 1.0, 0);
    torso.rotation.x = 0.3; // Hunched forward
    torso.castShadow = true;
    group.add(torso);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), bodyMat);
    head.position.set(0, 1.5, 0.15);
    head.scale.set(1, 1.1, 0.9);
    head.castShadow = true;
    group.add(head);
    
    // Glowing red eyes
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000, 
        emissiveIntensity: 0.8 
    });
    
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    leftEye.position.set(-0.08, 1.55, 0.35);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    rightEye.position.set(0.08, 1.55, 0.35);
    group.add(rightEye);
    
    // Mouth/jaw
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.1), bloodMat);
    mouth.position.set(0, 1.4, 0.3);
    group.add(mouth);
    
    // Arms (reaching forward)
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8);
    
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.35, 1.1, 0.3);
    leftArm.rotation.x = -Math.PI / 3;
    leftArm.rotation.z = 0.2;
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.35, 1.1, 0.3);
    rightArm.rotation.x = -Math.PI / 3;
    rightArm.rotation.z = -0.2;
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // Hands (claw-like)
    const handGeo = new THREE.BoxGeometry(0.1, 0.15, 0.08);
    
    const leftHand = new THREE.Mesh(handGeo, bodyMat);
    leftHand.position.set(-0.35, 0.9, 0.6);
    group.add(leftHand);
    
    const rightHand = new THREE.Mesh(handGeo, bodyMat);
    rightHand.position.set(0.35, 0.9, 0.6);
    group.add(rightHand);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
    
    const leftLeg = new THREE.Mesh(legGeo, clothMat);
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, clothMat);
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    // Health bar
    const barBg = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.08, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x440000 })
    );
    barBg.position.set(0, 2.0, 0);
    group.add(barBg);
    
    const barFill = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.08, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    barFill.position.set(0, 2.0, 0.01);
    barFill.userData.isHealthBar = true;
    group.add(barFill);
    
    group.position.set(x, 0, z);
    group.userData = {
        isEnemy: true,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        type: 'zombie',
        animTime: Math.random() * Math.PI * 2
    };
    
    return group;
}

// Create a practice dummy (doesn't move or attack)
export function createDummyEnemy(x, z) {
    const group = new THREE.Group();
    
    const dummyMat = new THREE.MeshStandardMaterial({ 
        color: 0xff6644, 
        roughness: 0.5 
    });
    const targetMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.3 
    });
    
    // Body (target shape)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 16), dummyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), dummyMat);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);
    
    // Target rings on body
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 24), targetMat);
    ring1.position.set(0, 1.0, 0.4);
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);
    
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), targetMat);
    ring2.position.set(0, 1.0, 0.42);
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);
    
    // Bullseye
    const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    bullseye.position.set(0, 1.0, 0.44);
    group.add(bullseye);
    
    // Stand
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    stand.position.y = 0.2;
    group.add(stand);
    
    // Health bar
    const barBg = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.08, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x440000 })
    );
    barBg.position.set(0, 2.2, 0);
    group.add(barBg);
    
    const barFill = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.08, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    barFill.position.set(0, 2.2, 0.01);
    barFill.userData.isHealthBar = true;
    group.add(barFill);
    
    group.position.set(x, 0, z);
    group.userData = {
        isEnemy: true,
        health: 100,
        maxHealth: 100,
        speed: 0, // Dummies don't move
        type: 'dummy',
        animTime: 0
    };
    
    return group;
}

export function updateEnemies(enemiesList, playerPos, deltaTime = 0.016) {
    for (const enemy of enemiesList) {
        if (enemy.userData.type === 'dummy') {
            // Dummies don't move
            continue;
        }
        
        // Zombie movement and animation
        enemy.userData.animTime += deltaTime * 8;
        
        const dir = new THREE.Vector3().subVectors(playerPos, enemy.position).normalize();
        const speed = enemy.userData.speed || CONFIG.enemies.zombie.speed;
        
        enemy.position.x += dir.x * speed * deltaTime;
        enemy.position.z += dir.z * speed * deltaTime;
        
        // Bobbing animation for zombies
        if (enemy.userData.type === 'zombie') {
            enemy.position.y = Math.sin(enemy.userData.animTime) * 0.05;
            enemy.rotation.z = Math.sin(enemy.userData.animTime * 0.5) * 0.05;
        }
        
        enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
        
        // Update health bar
        const bar = enemy.children.find(c => c.userData?.isHealthBar);
        if (bar) {
            bar.scale.x = Math.max(0, enemy.userData.health / enemy.userData.maxHealth);
        }
    }
}

// Wave system for Zombies mode
export function spawnWave(scene, enemies, wave, playerPos) {
    const baseCount = 3;
    const waveCount = baseCount + Math.floor(wave * 1.5);
    const spawnRadius = 30 + wave * 5;
    
    for (let i = 0; i < waveCount; i++) {
        const angle = (Math.PI * 2 / waveCount) * i + Math.random() * 0.5;
        const distance = spawnRadius + Math.random() * 20;
        const x = playerPos.x + Math.cos(angle) * distance;
        const z = playerPos.z + Math.sin(angle) * distance;
        
        const zombie = createZombieEnemy(x, z);
        
        // Scale difficulty with waves
        zombie.userData.health = CONFIG.enemies.zombie.health + wave * 10;
        zombie.userData.maxHealth = zombie.userData.health;
        zombie.userData.speed = CONFIG.enemies.zombie.speed + wave * 0.1;
        
        enemies.push(zombie);
        scene.add(zombie);
    }
    
    return waveCount;
}

import * as THREE from 'three';
import { CONFIG } from './config.js';

const ZOMBIE_SKIN = 0x6b8a4a;
const ZOMBIE_DARK = 0x3d5028;
const ZOMBIE_CLOTH = 0x4a3a30;
const ZOMBIE_BLOOD = 0x6e1a1a;

// ─── ZOMBIE ENEMY ────────────────────────────────────────────────────────────
export function createZombieEnemy(x, z) {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: ZOMBIE_SKIN });
    const darkMat = new THREE.MeshLambertMaterial({ color: ZOMBIE_DARK });
    const clothMat = new THREE.MeshLambertMaterial({ color: ZOMBIE_CLOTH });

    // Torso
    const torsoGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), clothMat);
    torso.castShadow = true;
    torsoGroup.add(torso);
    const tear = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.46), skinMat);
    tear.position.set(0.1, -0.05, 0);
    torsoGroup.add(tear);
    const blood = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.46),
        new THREE.MeshLambertMaterial({ color: ZOMBIE_BLOOD }));
    blood.position.set(-0.1, 0.05, 0.001);
    torsoGroup.add(blood);
    torsoGroup.position.y = 1.0;
    group.add(torsoGroup);

    // Head
    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.castShadow = true;
    headGroup.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
    eyeL.position.set(-0.12, 0.05, 0.26);
    headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
    eyeR.position.set(0.12, 0.05, 0.26);
    headGroup.add(eyeR);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.04),
        new THREE.MeshLambertMaterial({ color: 0x111111 }));
    mouth.position.set(0, -0.15, 0.26);
    headGroup.add(mouth);
    headGroup.position.y = 1.7;
    headGroup.rotation.x = 0.2;
    group.add(headGroup);

    // Arms
    function makeArm() {
        const shoulder = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), clothMat);
        upper.position.y = -0.21;
        upper.castShadow = true;
        shoulder.add(upper);
        const elbow = new THREE.Group();
        elbow.position.y = -0.42;
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), skinMat);
        lower.position.y = -0.21;
        lower.castShadow = true;
        elbow.add(lower);
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), darkMat);
        hand.position.y = -0.5;
        elbow.add(hand);
        shoulder.add(elbow);
        shoulder.userData.elbow = elbow;
        return shoulder;
    }

    function makeLeg() {
        const hip = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.28), darkMat);
        upper.position.y = -0.225;
        upper.castShadow = true;
        hip.add(upper);
        const knee = new THREE.Group();
        knee.position.y = -0.45;
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.27), darkMat);
        lower.position.y = -0.225;
        lower.castShadow = true;
        knee.add(lower);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.36),
            new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
        foot.position.set(0, -0.46, 0.04);
        knee.add(foot);
        hip.add(knee);
        hip.userData.knee = knee;
        return hip;
    }

    const leftArm = makeArm();
    leftArm.position.set(-0.46, 1.4, 0);
    leftArm.rotation.x = -1.0;
    leftArm.rotation.z = 0.2;
    if (leftArm.userData.elbow) leftArm.userData.elbow.rotation.x = 0.7;
    group.add(leftArm);

    const rightArm = makeArm();
    rightArm.position.set(0.46, 1.4, 0);
    rightArm.rotation.x = -1.1;
    rightArm.rotation.z = -0.2;
    if (rightArm.userData.elbow) rightArm.userData.elbow.rotation.x = 0.7;
    group.add(rightArm);

    const leftLeg = makeLeg();
    leftLeg.position.set(-0.18, 0.55, 0);
    group.add(leftLeg);

    const rightLeg = makeLeg();
    rightLeg.position.set(0.18, 0.55, 0);
    group.add(rightLeg);

    group.position.set(x, 0, z);
    group.userData = {
        type: 'zombie',
        health: CONFIG.enemies.zombie.health,
        maxHealth: CONFIG.enemies.zombie.health,
        speed: CONFIG.enemies.zombie.speed * (0.85 + Math.random() * 0.3),
        damageCD: 0,
        walkCycle: Math.random() * Math.PI * 2,
        head: headGroup,
        leftArm, rightArm, leftLeg, rightLeg,
        torso: torsoGroup,
        velY: 0
    };
    return group;
}

// ─── DUMMY ENEMY FOR PRACTICE MODE ──────────────────────────────────────────
export function createDummyEnemy(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x9aa8b8 });
    const accent = new THREE.MeshLambertMaterial({ color: 0x3a4a5a });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.45), mat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), mat);
    armL.position.set(-0.46, 1.05, 0);
    armL.castShadow = true;
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), mat);
    armR.position.set(0.46, 1.05, 0);
    armR.castShadow = true;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.28), accent);
    legL.position.set(-0.18, 0.45, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.28), accent);
    legR.position.set(0.18, 0.45, 0);
    legR.castShadow = true;
    group.add(legR);

    group.position.set(x, 0, z);
    group.userData = {
        type: 'dummy',
        health: 100,
        maxHealth: 100,
        speed: 0,
        damageCD: 0,
        walkCycle: 0,
        velY: 0
    };
    return group;
}

// ─── UPDATE ENEMIES ──────────────────────────────────────────────────────────
export function updateEnemies(enemiesList, playerPos, dt, getGroundHeight) {
    for (let i = enemiesList.length - 1; i >= 0; i--) {
        const e = enemiesList[i];
        if (!e) continue;

        const ud = e.userData;
        const dx = playerPos.x - e.position.x;
        const dz = playerPos.z - e.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.001) {
            const targetYaw = Math.atan2(dx, dz);
            e.rotation.y = targetYaw;
        }

        if (dist > 1.2 && ud.speed > 0) {
            const nx = dx / dist;
            const nz = dz / dist;
            e.position.x += nx * ud.speed * dt;
            e.position.z += nz * ud.speed * dt;
            ud.walkCycle += dt * (5 + ud.speed);
        } else {
            if (ud.damageCD <= 0 && ud.speed > 0) {
                // Damage handled in main.js
                ud.damageCD = 1.0;
            }
            ud.walkCycle += dt * 8;
        }
        ud.damageCD = Math.max(0, ud.damageCD - dt);

        // Gravity
        ud.velY -= 22 * dt;
        e.position.y += ud.velY * dt;
        const groundY = getGroundHeight ? getGroundHeight(e.position.x, e.position.z) : 0;
        if (e.position.y <= groundY) {
            e.position.y = groundY;
            ud.velY = 0;
        }

        // Animate zombie limbs
        const c = ud.walkCycle;
        const swing = Math.sin(c) * 0.6;
        if (ud.leftLeg) {
            ud.leftLeg.rotation.x = swing;
            if (ud.leftLeg.userData.knee) ud.leftLeg.userData.knee.rotation.x = Math.max(0, -Math.sin(c) * 0.7);
        }
        if (ud.rightLeg) {
            ud.rightLeg.rotation.x = -swing;
            if (ud.rightLeg.userData.knee) ud.rightLeg.userData.knee.rotation.x = Math.max(0, Math.sin(c) * 0.7);
        }
        if (ud.leftArm) ud.leftArm.rotation.x = -1.0 + Math.sin(c * 0.7) * 0.15;
        if (ud.rightArm) ud.rightArm.rotation.x = -1.1 + Math.sin(c * 0.7 + 1) * 0.15;
        if (ud.torso) {
            ud.torso.position.y = 1.0 + Math.abs(Math.sin(c)) * 0.04;
            ud.torso.rotation.z = Math.sin(c * 0.5) * 0.05;
            ud.torso.rotation.x = 0.15;
        }
        if (ud.head) ud.head.rotation.z = Math.sin(c * 0.5) * 0.08;
    }
}

// ─── DAMAGE ENEMY ───────────────────────────────────────────────────────────
export function damageEnemy(enemy, dmg) {
    if (!enemy || !enemy.userData) return false;
    enemy.userData.health -= dmg;
    // Hit flash
    enemy.traverse(obj => {
        if (obj.isMesh && obj.material && obj.material.color) {
            if (!obj.userData._origColor) {
                obj.userData._origColor = obj.material.color.getHex();
            }
            obj.material.color.setHex(0xffffff);
            setTimeout(() => {
                if (obj.userData._origColor !== undefined) {
                    obj.material.color.setHex(obj.userData._origColor);
                }
            }, 60);
        }
    });
    return enemy.userData.health <= 0;
}

// ─── SPAWN WAVE ─────────────────────────────────────────────────────────────
export function spawnWave(scene, enemies, waveNumber, playerPos, getGroundHeight) {
    const count = 3 + waveNumber * 2;
    const speedMult = 1 + (waveNumber - 1) * 0.08;
    const healthMult = 1 + (waveNumber - 1) * 0.15;
    const mapBounds = CONFIG.world.groundSize / 2 - 20;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 35 + Math.random() * 50;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = getGroundHeight ? getGroundHeight(x, z) : 0;
        const zombie = createZombieEnemy(x, z);
        zombie.position.y = y;
        zombie.userData.speed *= speedMult;
        zombie.userData.health = Math.round(zombie.userData.health * healthMult);
        zombie.userData.maxHealth = zombie.userData.health;
        scene.add(zombie);
        enemies.push(zombie);
    }
    return count;
}

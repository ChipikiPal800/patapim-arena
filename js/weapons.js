// js/weapons.js
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';

let currentWeaponId = 'pistol';
let ammoLeft = GAME_CONFIG.weapons.pistol.ammoPerMag;
let canShoot = true;
let reloading = false;
let shootCooldown = 0;

export function initWeapons() {
    // nothing yet
}

export function switchWeapon(id) {
    if (reloading) return;
    if (GAME_CONFIG.weapons[id]) {
        currentWeaponId = id;
        ammoLeft = GAME_CONFIG.weapons[id].ammoPerMag;
        updateWeaponUI();
    }
}

export function reload() {
    if (reloading) return;
    const weapon = GAME_CONFIG.weapons[currentWeaponId];
    if (ammoLeft === weapon.ammoPerMag) return;
    reloading = true;
    setTimeout(() => {
        ammoLeft = weapon.ammoPerMag;
        reloading = false;
        updateWeaponUI();
    }, weapon.reloadTime * 1000);
    updateWeaponUI(true); // show reloading
}

export function shoot(raycaster, camera, scene, enemies, onHit) {
    if (!canShoot || reloading) return;
    const weapon = GAME_CONFIG.weapons[currentWeaponId];
    if (ammoLeft <= 0) {
        reload();
        return;
    }
    
    canShoot = false;
    shootCooldown = weapon.fireRate;
    ammoLeft--;
    updateWeaponUI();

    // Raycast from center of camera
    const direction = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();
    raycaster.set(origin, direction);
    const intersects = raycaster.intersectObjects(enemies, true);
    
    if (intersects.length > 0) {
        let hit = intersects[0];
        let enemyObj = hit.object;
        while (enemyObj && !enemyObj.userData.isEnemy) enemyObj = enemyObj.parent;
        if (enemyObj && enemyObj.userData.health) {
            let damage = weapon.damage;
            if (currentWeaponId === 'shotgun') {
                // shotgun pellet spread? simplified: just damage * pellets
                damage = weapon.damage * weapon.pellets;
            }
            enemyObj.userData.health -= damage;
            onHit && onHit();
            if (enemyObj.userData.health <= 0) {
                // remove enemy
                const idx = enemies.indexOf(enemyObj);
                if (idx !== -1) enemies.splice(idx,1);
                enemyObj.parent.remove(enemyObj);
                // add coins later
            } else {
                // update health bar
                updateEnemyHealthBar(enemyObj);
            }
        }
    }
}

function updateEnemyHealthBar(enemyObj) {
    // find health bar child and update scale
    const bar = enemyObj.children.find(c => c.userData.isHealthBar);
    if (bar) {
        const percent = enemyObj.userData.health / GAME_CONFIG.enemies.blob.health;
        bar.scale.x = Math.max(0, percent);
    }
}

function updateWeaponUI(reloadingFlag = false) {
    const weaponName = GAME_CONFIG.weapons[currentWeaponId].name;
    let ammoText = reloadingFlag ? "RELOADING" : `${ammoLeft}`;
    document.getElementById('weaponName').innerText = weaponName;
    document.getElementById('weaponAmmo').innerText = ammoText;
}

export function updateWeaponCooldown(deltaTime) {
    if (!canShoot) {
        shootCooldown -= deltaTime;
        if (shootCooldown <= 0) {
            canShoot = true;
        }
    }
}

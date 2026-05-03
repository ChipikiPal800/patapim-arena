import * as THREE from 'three';
import { CONFIG } from './config.js';

let currentWeapon = 'pistol';
let ammoLeft = CONFIG.weapons.pistol.ammoPerMag;
let canShoot = true;
let reloading = false;
let shootCooldown = 0;

export function initWeapons() {}

export function switchWeapon(id) {
    if (reloading) return;
    if (CONFIG.weapons[id]) {
        currentWeapon = id;
        ammoLeft = CONFIG.weapons[id].ammoPerMag;
        if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    }
}

export function reloadWeapon() {
    if (reloading) return;
    const wp = CONFIG.weapons[currentWeapon];
    if (ammoLeft === wp.ammoPerMag) return;
    reloading = true;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, true);
    setTimeout(() => {
        ammoLeft = wp.ammoPerMag;
        reloading = false;
        if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    }, wp.reloadTime * 1000);
}

export function shootWeapon(raycaster, camera, scene, enemies, onHit) {
    if (!canShoot || reloading) return;
    const wp = CONFIG.weapons[currentWeapon];
    if (ammoLeft <= 0) {
        reloadWeapon();
        return;
    }
    canShoot = false;
    shootCooldown = wp.fireRate;
    ammoLeft--;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    
    // Direction from camera center
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();
    raycaster.set(origin, dir);
    const intersects = raycaster.intersectObjects(enemies, true);
    
    if (intersects.length) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.isEnemy) obj = obj.parent;
        if (obj && obj.userData.health) {
            let dmg = wp.damage;
            if (currentWeapon === 'shotgun') dmg = wp.damage * wp.pellets;
            obj.userData.health -= dmg;
            if (onHit) onHit(obj.userData.health <= 0);
            if (obj.userData.health <= 0 && obj.parent) {
                const idx = enemies.indexOf(obj);
                if (idx !== -1) enemies.splice(idx, 1);
                obj.parent.remove(obj);
                if (window.onEnemyKilled) window.onEnemyKilled();
            } else {
                const bar = obj.children.find(c => c.userData?.isHealthBar);
                if (bar) bar.scale.x = Math.max(0, obj.userData.health / CONFIG.enemies.blob.health);
            }
        }
    }
}

export function updateWeaponCooldown(deltaTime) {
    if (!canShoot) {
        shootCooldown -= deltaTime;
        if (shootCooldown <= 0) canShoot = true;
    }
}

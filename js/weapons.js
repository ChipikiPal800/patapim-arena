import * as THREE from 'three';
import { CONFIG, SETTINGS } from './config.js';

let currentWeapon = 'pistol';
let ammoLeft = CONFIG.weapons.pistol.ammoPerMag;
let canShoot = true;
let reloading = false;
let shootCooldown = 0;
let audioCtx = null;

function initAudio() {
    if (!audioCtx && window.AudioContext) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const masterVol = SETTINGS.masterVolume * SETTINGS.sfxVolume;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch (type) {
        case 'pistol':
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.2 * masterVol, audioCtx.currentTime);
            osc.type = 'sine';
            break;
        case 'assault':
            osc.frequency.value = 600;
            gain.gain.setValueAtTime(0.15 * masterVol, audioCtx.currentTime);
            osc.type = 'square';
            break;
        case 'sniper':
            osc.frequency.value = 300;
            gain.gain.setValueAtTime(0.4 * masterVol, audioCtx.currentTime);
            osc.type = 'sawtooth';
            break;
        case 'shotgun':
            osc.frequency.value = 150;
            gain.gain.setValueAtTime(0.35 * masterVol, audioCtx.currentTime);
            osc.type = 'triangle';
            break;
        case 'hit':
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(0.1 * masterVol, audioCtx.currentTime);
            osc.type = 'sine';
            break;
        case 'kill':
            osc.frequency.value = 400;
            gain.gain.setValueAtTime(0.25 * masterVol, audioCtx.currentTime);
            osc.type = 'square';
            break;
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function switchWeapon(id) {
    if (reloading) return;
    if (CONFIG.weapons[id]) {
        currentWeapon = id;
        ammoLeft = CONFIG.weapons[id].ammoPerMag;
        canShoot = true;
        shootCooldown = 0;
        if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
        if (window.updateGunVisuals) window.updateGunVisuals(id);
    }
}

export function reloadWeapon() {
    if (reloading) return;
    const wp = CONFIG.weapons[currentWeapon];
    if (ammoLeft === wp.ammoPerMag) return;
    reloading = true;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, true);
    setTimeout(() => {
        ammoLeft = CONFIG.weapons[currentWeapon].ammoPerMag;
        reloading = false;
        if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    }, wp.reloadTime * 1000);
}

export function shootWeapon(raycaster, camera, scene, enemies, onHit, bulletTrails) {
    if (!canShoot || reloading) return;
    const wp = CONFIG.weapons[currentWeapon];
    if (ammoLeft <= 0) { reloadWeapon(); return; }

    canShoot = false;
    shootCooldown = wp.fireRate;
    ammoLeft--;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    playSound(currentWeapon);

    // Shooting direction
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();
    
    // For shotgun, fire multiple pellets
    const pelletCount = currentWeapon === 'shotgun' ? (wp.pellets || 8) : 1;
    
    for (let p = 0; p < pelletCount; p++) {
        let pelletDir = dir.clone();
        
        if (currentWeapon === 'shotgun') {
            // Add spread for shotgun
            const spread = 0.08;
            pelletDir.x += (Math.random() - 0.5) * spread;
            pelletDir.y += (Math.random() - 0.5) * spread;
            pelletDir.z += (Math.random() - 0.5) * spread;
            pelletDir.normalize();
        }
        
        raycaster.set(origin, pelletDir);
        const intersects = raycaster.intersectObjects(enemies, true);

        // Bullet trail
        const trailEnd = intersects.length
            ? intersects[0].point
            : origin.clone().add(pelletDir.clone().multiplyScalar(wp.range));
        const trailGeo = new THREE.BufferGeometry().setFromPoints([origin.clone(), trailEnd]);
        const trailMat = new THREE.LineBasicMaterial({ 
            color: currentWeapon === 'shotgun' ? 0xff6644 : 0xffaa44, 
            linewidth: 2 
        });
        const trailLine = new THREE.Line(trailGeo, trailMat);
        trailLine.userData = { spawnTime: performance.now() };
        scene.add(trailLine);
        bulletTrails.push(trailLine);

        if (intersects.length) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.isEnemy) obj = obj.parent;
            if (obj && obj.userData.health !== undefined) {
                let dmg = wp.damage;
                obj.userData.health -= dmg;
                playSound('hit');
                
                // Hit marker effect
                if (window.showHitMarker) window.showHitMarker();
                
                if (onHit) onHit(obj.userData.health <= 0);
                if (obj.userData.health <= 0 && obj.parent) {
                    playSound('kill');
                    const idx = enemies.indexOf(obj);
                    if (idx !== -1) enemies.splice(idx, 1);
                    obj.parent.remove(obj);
                    if (window.onEnemyKilled) window.onEnemyKilled();
                } else {
                    const bar = obj.children.find(c => c.userData?.isHealthBar);
                    if (bar) {
                        const maxHealth = obj.userData.maxHealth || CONFIG.enemies.zombie.health;
                        bar.scale.x = Math.max(0, obj.userData.health / maxHealth);
                    }
                }
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

export function getCurrentWeapon() { return currentWeapon; }
export function getCurrentAmmo() { return ammoLeft; }
export function isReloading() { return reloading; }

export function refreshAmmoForUpgrade() {
    ammoLeft = CONFIG.weapons[currentWeapon].ammoPerMag;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
}

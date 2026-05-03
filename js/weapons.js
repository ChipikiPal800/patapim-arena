import * as THREE from 'three';
import { CONFIG } from './config.js';

let currentWeapon = 'pistol', ammoLeft = CONFIG.weapons.pistol.ammoPerMag, canShoot = true, reloading = false, shootCooldown = 0;
let audioCtx = null;

function initAudio() { if (!audioCtx && window.AudioContext) { audioCtx = new AudioContext(); } }
function playSound(type) {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    if (type === 'pistol') { osc.frequency.value = 800; gain.gain.setValueAtTime(0.2, audioCtx.currentTime); osc.type = 'sine'; }
    else if (type === 'assault') { osc.frequency.value = 600; gain.gain.setValueAtTime(0.15, audioCtx.currentTime); osc.type = 'square'; }
    else if (type === 'sniper') { osc.frequency.value = 300; gain.gain.setValueAtTime(0.4, audioCtx.currentTime); osc.type = 'sawtooth'; }
    else if (type === 'shotgun') { osc.frequency.value = 150; gain.gain.setValueAtTime(0.35, audioCtx.currentTime); osc.type = 'triangle'; }
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function switchWeapon(id) { if (!reloading && CONFIG.weapons[id]) { currentWeapon = id; ammoLeft = CONFIG.weapons[id].ammoPerMag; if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false); if (window.updateGunVisuals) window.updateGunVisuals(id); } }
export function reloadWeapon() { if (reloading) return; const wp = CONFIG.weapons[currentWeapon]; if (ammoLeft === wp.ammoPerMag) return; reloading = true; if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, true); setTimeout(() => { ammoLeft = wp.ammoPerMag; reloading = false; if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false); }, wp.reloadTime * 1000); }

export function shootWeapon(raycaster, camera, scene, enemies, onHit, bulletTrails) {
    if (!canShoot || reloading) return;
    const wp = CONFIG.weapons[currentWeapon];
    if (ammoLeft <= 0) { reloadWeapon(); return; }
    canShoot = false; shootCooldown = wp.fireRate; ammoLeft--;
    if (window.updateWeaponUI) window.updateWeaponUI(currentWeapon, ammoLeft, false);
    playSound(currentWeapon);
    
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();
    raycaster.set(origin, dir);
    const intersects = raycaster.intersectObjects(enemies, true);
    
    // Bullet trail effect
    const trailEnd = intersects.length ? intersects[0].point : origin.clone().add(dir.clone().multiplyScalar(wp.range));
    const trailPoints = [origin.clone(), trailEnd];
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineBasicMaterial({ color: 0xffaa44, linewidth: 2 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    bulletTrails.push(trailLine);
    setTimeout(() => { if (trailLine.parent) scene.remove(trailLine); }, 150);
    
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

export function updateWeaponCooldown(deltaTime) { if (!canShoot) { shootCooldown -= deltaTime; if (shootCooldown <= 0) canShoot = true; } }
export function getCurrentWeapon() { return currentWeapon; }

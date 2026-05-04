import * as THREE from 'three';
import { CONFIG, SETTINGS } from './config.js';
import { player, input } from './player.js';
import { damageEnemy } from './enemies.js';

// Web Audio API context for gunshot SFX
let audioCtx = null;
function getAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return null; }
    }
    return audioCtx;
}

// Generate gunshot sounds (lower volume)
function playGunshot(weaponId) {
    const ctx = getAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = SETTINGS.masterVolume * SETTINGS.sfxVolume * 0.4;
    masterGain.connect(ctx.destination);

    const config = {
        pistol:  { duration: 0.12, freq: 220, noiseGain: 0.5, bodyGain: 0.3, lowpass: 2000, decay: 0.08 },
        assault: { duration: 0.10, freq: 190, noiseGain: 0.4, bodyGain: 0.25, lowpass: 2400, decay: 0.06 },
        sniper:  { duration: 0.35, freq: 90,  noiseGain: 0.7, bodyGain: 0.5, lowpass: 1300, decay: 0.25 },
        shotgun: { duration: 0.28, freq: 110, noiseGain: 0.8, bodyGain: 0.45, lowpass: 1500, decay: 0.2 },
        pickaxe: { duration: 0.08, freq: 300, noiseGain: 0.2, bodyGain: 0.15, lowpass: 3000, decay: 0.05 }
    }[weaponId] || { duration: 0.1, freq: 200, noiseGain: 0.4, bodyGain: 0.25, lowpass: 2000, decay: 0.08 };

    const bufferSize = Math.floor(ctx.sampleRate * config.duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.exp(-t * (1 / config.decay) * 4);
        data[i] = (Math.random() * 2 - 1) * env * 0.7;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = config.lowpass;
    noiseFilter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(config.noiseGain, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(config.freq, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + config.decay * 1.2);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(config.bodyGain, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + config.decay * 1.5);
    osc.connect(oscGain);
    oscGain.connect(masterGain);

    noiseSrc.start(now);
    osc.start(now);
    osc.stop(now + config.decay * 1.5);
}

// Weapon state
export const weaponState = {
    current: 'pistol',
    inventory: { pistol: true, assault: false, sniper: false, shotgun: false, pickaxe: true },
    ammo: { pistol: 15, assault: 30, sniper: 5, shotgun: 6, pickaxe: 999 },
    reserveAmmo: { pistol: 60, assault: 120, sniper: 25, shotgun: 30, pickaxe: 999 },
    cooldown: 0,
    reloading: false,
    reloadTimer: 0,
    gunModel: null,
    gunGroup: null,
    swingAnim: 0
};

// Build gun/pickaxe model
function buildWeaponModel(weaponId) {
    const cfg = CONFIG.weapons[weaponId];
    if (!cfg) return new THREE.Group();
    
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: cfg.color });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

    if (weaponId === 'pickaxe') {
        // Pickaxe model
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), darkMat);
        handle.position.set(0, -0.15, 0);
        handle.rotation.z = -0.3;
        group.add(handle);
        
        const headBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), metalMat);
        headBase.position.set(0.18, 0.05, 0);
        headBase.rotation.z = -0.3;
        group.add(headBase);
        
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), metalMat);
        point.position.set(0.32, 0.1, 0);
        point.rotation.z = -0.3;
        group.add(point);
        
        const backSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), metalMat);
        backSpike.position.set(0.05, 0.02, 0);
        backSpike.rotation.z = 0.5;
        group.add(backSpike);
    } else if (weaponId === 'pistol') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.32), bodyMat);
        body.position.set(0, 0, -0.1);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), darkMat);
        grip.position.set(0, -0.14, 0);
        group.add(grip);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), metalMat);
        barrel.position.set(0, 0.03, -0.32);
        group.add(barrel);
    } else if (weaponId === 'assault') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.6), bodyMat);
        body.position.set(0, 0, -0.2);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), darkMat);
        grip.position.set(0, -0.16, 0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.16), darkMat);
        stock.position.set(0, -0.02, 0.18);
        group.add(stock);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), metalMat);
        barrel.position.set(0, 0.04, -0.55);
        group.add(barrel);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.1), darkMat);
        mag.position.set(0, -0.16, -0.1);
        group.add(mag);
    } else if (weaponId === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.85), bodyMat);
        body.position.set(0, 0, -0.3);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), darkMat);
        grip.position.set(0, -0.16, 0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.22), darkMat);
        stock.position.set(0, -0.02, 0.22);
        group.add(stock);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metalMat);
        barrel.position.set(0, 0.04, -0.85);
        group.add(barrel);
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16), darkMat);
        scopeBody.rotation.x = Math.PI / 2;
        scopeBody.position.set(0, 0.13, -0.25);
        group.add(scopeBody);
    } else if (weaponId === 'shotgun') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.7), bodyMat);
        body.position.set(0, 0, -0.25);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.1), darkMat);
        grip.position.set(0, -0.16, 0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.2), darkMat);
        stock.position.set(0, -0.02, 0.22);
        group.add(stock);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), metalMat);
        barrel.position.set(0, 0.04, -0.65);
        group.add(barrel);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), darkMat);
        pump.position.set(0, -0.07, -0.4);
        group.add(pump);
    }

    group.position.set(0.2, -0.18, -0.4);
    group.rotation.y = -0.05;
    return group;
}

export function setupWeapons(camera) {
    const group = new THREE.Group();
    camera.add(group);
    weaponState.gunGroup = group;
    switchWeapon(weaponState.current);
}

export function switchWeapon(id) {
    if (!CONFIG.weapons[id]) return;
    weaponState.current = id;
    weaponState.reloading = false;
    weaponState.reloadTimer = 0;
    if (weaponState.gunGroup) {
        weaponState.gunGroup.clear();
        const model = buildWeaponModel(id);
        weaponState.gunGroup.add(model);
        weaponState.gunModel = model;
    }
    if (window.updateWeaponUI) {
        window.updateWeaponUI(id, weaponState.ammo[id], false);
    }
}

export function getCurrentWeapon() {
    return weaponState.current;
}

export function refreshAmmoForUpgrade() {
    const id = weaponState.current;
    const cfg = CONFIG.weapons[id];
    if (cfg && weaponState.ammo[id] > cfg.ammoPerMag) {
        weaponState.ammo[id] = cfg.ammoPerMag;
    }
}

export function startReload() {
    const id = weaponState.current;
    const cfg = CONFIG.weapons[id];
    if (!cfg || cfg.melee) return;
    if (weaponState.reloading) return;
    if (weaponState.ammo[id] >= cfg.ammoPerMag) return;
    if (weaponState.reserveAmmo[id] <= 0) return;
    weaponState.reloading = true;
    weaponState.reloadTimer = cfg.reloadTime;
}

export function reloadWeapon() {
    startReload();
}

export function updateWeaponCooldown(dt) {
    weaponState.cooldown = Math.max(0, weaponState.cooldown - dt);
    if (weaponState.swingAnim > 0) {
        weaponState.swingAnim = Math.max(0, weaponState.swingAnim - dt * 8);
        if (weaponState.gunModel) {
            const swingRot = Math.sin(weaponState.swingAnim * Math.PI) * 1.2;
            weaponState.gunModel.rotation.x = -swingRot * 0.8;
            weaponState.gunModel.position.x = 0.25 + swingRot * 0.08;
        }
    }
}

const tmpDir = new THREE.Vector3();
const meleeRaycaster = new THREE.Raycaster();

function fireWeapon(scene, enemies, id, cfg, onKill, builds) {
    if (!cfg) return;
    
    // Play sound
    if (id !== 'pickaxe') playGunshot(id);
    else playGunshot('pickaxe');
    
    // Recoil for guns
    if (!cfg.melee) {
        player.pitch += cfg.recoilV * (0.6 + Math.random() * 0.5);
        player.yaw += (Math.random() - 0.5) * cfg.recoilH * 1.5;
    }
    
    // Muzzle flash for guns
    if (!cfg.melee && weaponState.gunModel) {
        const flash = new THREE.PointLight(0xffaa66, 5, 3);
        weaponState.gunModel.add(flash);
        flash.position.set(0, 0.04, -0.85);
        setTimeout(() => { if (weaponState.gunModel) weaponState.gunModel.remove(flash); flash.dispose?.(); }, 40);
    }
    
    // Melee swing animation
    if (cfg.melee) {
        weaponState.swingAnim = 1;
    }
    
    if (cfg.melee) {
        // Melee attack
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.camera.quaternion);
        const origin = player.camera.position.clone();
        meleeRaycaster.set(origin, dir);
        meleeRaycaster.far = 2.8;
        const intersects = meleeRaycaster.intersectObjects(enemies, true);
        if (intersects.length) {
            let root = intersects[0].object;
            while (root.parent && !enemies.includes(root)) root = root.parent;
            if (enemies.includes(root)) {
                const killed = damageEnemy(root, cfg.damage);
                if (killed && onKill) onKill(root);
            }
        }
    } else if (id === 'shotgun') {
        // Shotgun spread
        const pellets = cfg.pellets || 8;
        const spread = cfg.spread || 0.12;
        for (let i = 0; i < pellets; i++) {
            const sx = (Math.random() - 0.5) * spread;
            const sy = (Math.random() - 0.5) * spread;
            castBullet(scene, enemies, cfg.damage, cfg.range, sx, sy, onKill, builds);
        }
    } else {
        // Single shot
        const inaccuracy = (player.aimBlend || 0) > 0.5 ? 0.003 : 0.015;
        const sx = (Math.random() - 0.5) * inaccuracy;
        const sy = (Math.random() - 0.5) * inaccuracy;
        castBullet(scene, enemies, cfg.damage, cfg.range, sx, sy, onKill, builds);
    }
}

function castBullet(scene, enemies, damage, range, spreadX, spreadY, onKill, builds) {
    tmpDir.set(0, 0, -1);
    tmpDir.applyQuaternion(player.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(player.camera.quaternion);
    tmpDir.addScaledVector(right, spreadX).addScaledVector(up, spreadY).normalize();

    const raycaster = new THREE.Raycaster();
    raycaster.set(player.camera.getWorldPosition(new THREE.Vector3()), tmpDir);
    raycaster.far = range;

    const intersects = raycaster.intersectObjects(enemies, true);
    let firstHit = intersects[0];

    if (builds && builds.length > 0) {
        const buildHits = raycaster.intersectObjects(builds, true);
        if (buildHits[0] && (!firstHit || buildHits[0].distance < firstHit.distance)) {
            firstHit = null;
        }
    }

    if (firstHit) {
        let root = firstHit.object;
        while (root.parent && !enemies.includes(root)) root = root.parent;
        if (enemies.includes(root)) {
            const killed = damageEnemy(root, damage);
            if (killed && onKill) onKill(root);
        }
    }
}

function animateWeapon(dt) {
    if (!weaponState.gunModel) return;
    const m = weaponState.gunModel;
    const ud = m.userData = m.userData || {};

    ud.kick = (ud.kick || 0);
    ud.kick *= Math.max(0, 1 - dt * 12);

    const speed = player.speedSmooth || 0;
    const cycle = player.walkCycle || 0;
    const bobX = Math.sin(cycle) * 0.012 * speed * (1 - (player.aimBlend || 0));
    const bobY = Math.abs(Math.sin(cycle * 2)) * 0.015 * speed * (1 - (player.aimBlend || 0));

    const baseX = THREE.MathUtils.lerp(0.2, 0, player.aimBlend || 0);
    const baseY = THREE.MathUtils.lerp(-0.18, -0.13, player.aimBlend || 0);
    const baseZ = THREE.MathUtils.lerp(-0.4, -0.35, player.aimBlend || 0);

    m.position.x = baseX + bobX;
    m.position.y = baseY + bobY;
    m.position.z = baseZ + ud.kick * 0.04;

    m.rotation.x = -ud.kick * 0.12;
    m.rotation.y = THREE.MathUtils.lerp(-0.05, 0, player.aimBlend || 0);

    if (weaponState.reloading && !CONFIG.weapons[weaponState.current]?.melee) {
        const cfg = CONFIG.weapons[weaponState.current];
        if (cfg) {
            const t = 1 - weaponState.reloadTimer / cfg.reloadTime;
            const pulse = Math.sin(t * Math.PI);
            m.position.y -= pulse * 0.15;
            m.rotation.x -= pulse * 0.4;
        }
    }

    const cfg = CONFIG.weapons[weaponState.current];
    if (cfg && player.targetFOV !== undefined) {
        player.targetFOV = input.scope && !cfg.melee ? (75 / cfg.scopeZoom) : 75;
    }
}

export function shootWeapon(raycaster, camera, scene, enemies, onKill, bulletTrails, builds) {
    const id = weaponState.current;
    const cfg = CONFIG.weapons[id];
    if (!cfg) return;
    
    if (weaponState.cooldown > 0) return;
    if (weaponState.reloading && !cfg.melee) return;
    
    if (!cfg.melee && weaponState.ammo[id] <= 0) {
        startReload();
        return;
    }
    
    fireWeapon(scene, enemies, id, cfg, onKill, builds);
    
    if (!cfg.melee) {
        weaponState.ammo[id]--;
    }
    weaponState.cooldown = cfg.fireRate;
    
    // Bullet trail for non-melee
    if (!cfg.melee) {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const origin = camera.position.clone();
        const end = origin.clone().add(dir.clone().multiplyScalar(cfg.range));
        const points = [origin, end];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffaa66, linewidth: 2 }));
        trail.userData = { spawnTime: performance.now() };
        scene.add(trail);
        bulletTrails.push(trail);
    }
}

export function updateWeapons(dt, scene, enemies, onKill, builds) {
    weaponState.cooldown = Math.max(0, weaponState.cooldown - dt);

    if (weaponState.reloading) {
        weaponState.reloadTimer -= dt;
        if (weaponState.reloadTimer <= 0) {
            const id = weaponState.current;
            const cfg = CONFIG.weapons[id];
            if (cfg && !cfg.melee) {
                const need = cfg.ammoPerMag - weaponState.ammo[id];
                const take = Math.min(need, weaponState.reserveAmmo[id]);
                weaponState.ammo[id] += take;
                weaponState.reserveAmmo[id] -= take;
            }
            weaponState.reloading = false;
        }
    }

    if (input.shoot && !weaponState.reloading && weaponState.cooldown <= 0) {
        const id = weaponState.current;
        const cfg = CONFIG.weapons[id];
        if (cfg && (cfg.melee || weaponState.ammo[id] > 0)) {
            fireWeapon(scene, enemies, id, cfg, onKill, builds);
            if (!cfg.melee) weaponState.ammo[id]--;
            weaponState.cooldown = cfg.fireRate;
            
            // Bullet trail
            if (!cfg.melee && player.camera) {
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.camera.quaternion);
                const origin = player.camera.position.clone();
                const end = origin.clone().add(dir.clone().multiplyScalar(cfg.range));
                const points = [origin, end];
                const geo = new THREE.BufferGeometry().setFromPoints(points);
                const trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffaa66, linewidth: 2 }));
                trail.userData = { spawnTime: performance.now() };
                scene.add(trail);
                if (window.bulletTrails) window.bulletTrails.push(trail);
            }
        } else if (!cfg.melee && weaponState.ammo[id] <= 0) {
            startReload();
        }
    }

    animateWeapon(dt);
}

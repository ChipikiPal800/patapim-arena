import * as THREE from 'three';
import { CONFIG, SETTINGS } from './config.js';
import { player, input } from './player.js';
import { damageEnemy } from './enemies.js';

// Web Audio API context for synthesized gunshot SFX
let audioCtx = null;
function getAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return null; }
    }
    return audioCtx;
}

// Generate gunshot sounds programmatically (no external files needed)
function playGunshot(weaponId) {
    const ctx = getAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = SETTINGS.masterVolume * SETTINGS.sfxVolume;
    masterGain.connect(ctx.destination);

    const config = {
        pistol:  { duration: 0.18, freq: 200, noiseGain: 0.7,  bodyGain: 0.4, lowpass: 1800, decay: 0.12 },
        assault: { duration: 0.14, freq: 180, noiseGain: 0.6,  bodyGain: 0.35, lowpass: 2200, decay: 0.10 },
        sniper:  { duration: 0.4,  freq: 80,  noiseGain: 0.9,  bodyGain: 0.7, lowpass: 1200, decay: 0.30 },
        shotgun: { duration: 0.32, freq: 100, noiseGain: 1.0,  bodyGain: 0.6, lowpass: 1400, decay: 0.25 }
    }[weaponId] || { duration: 0.15, freq: 200, noiseGain: 0.6, bodyGain: 0.4, lowpass: 1800, decay: 0.12 };

    // Noise burst (the "crack")
    const bufferSize = Math.floor(ctx.sampleRate * config.duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.exp(-t * (1 / config.decay) * 4);
        data[i] = (Math.random() * 2 - 1) * env;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = config.lowpass;
    noiseFilter.Q.value = 1.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(config.noiseGain, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    // Body thump (the "boom")
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

// State
export const weaponState = {
    current: 'pistol',
    inventory: { pistol: true, assault: false, sniper: false, shotgun: false },
    ammo: { pistol: 15, assault: 30, sniper: 5, shotgun: 6 },
    reserveAmmo: { pistol: 60, assault: 120, sniper: 25, shotgun: 30 },
    cooldown: 0,
    reloading: false,
    reloadTimer: 0,
    flash: null,
    gunModel: null,
    gunGroup: null  // attached to camera
};

// Build a 3D gun model attached to camera
function buildGunModel(weaponId) {
    const cfg = CONFIG.weapons[weaponId];
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: cfg.color });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    if (weaponId === 'pistol') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.32), bodyMat);
        body.position.set(0, 0, -0.1);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), accentMat);
        grip.position.set(0, -0.14, 0.0);
        group.add(grip);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), metalMat);
        barrel.position.set(0, 0.03, -0.32);
        group.add(barrel);
    } else if (weaponId === 'assault') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.6), bodyMat);
        body.position.set(0, 0, -0.2);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), accentMat);
        grip.position.set(0, -0.16, 0.0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.16), accentMat);
        stock.position.set(0, -0.02, 0.18);
        group.add(stock);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), metalMat);
        barrel.position.set(0, 0.04, -0.55);
        group.add(barrel);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.1), accentMat);
        mag.position.set(0, -0.16, -0.1);
        group.add(mag);
    } else if (weaponId === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.85), bodyMat);
        body.position.set(0, 0, -0.3);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), accentMat);
        grip.position.set(0, -0.16, 0.0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.22), accentMat);
        stock.position.set(0, -0.02, 0.22);
        group.add(stock);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metalMat);
        barrel.position.set(0, 0.04, -0.85);
        group.add(barrel);
        // Scope
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16), accentMat);
        scopeBody.rotation.x = Math.PI / 2;
        scopeBody.position.set(0, 0.13, -0.25);
        group.add(scopeBody);
    } else if (weaponId === 'shotgun') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.7), bodyMat);
        body.position.set(0, 0, -0.25);
        group.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.1), accentMat);
        grip.position.set(0, -0.16, 0.0);
        group.add(grip);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.2), accentMat);
        stock.position.set(0, -0.02, 0.22);
        group.add(stock);
        const barrel1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), metalMat);
        barrel1.position.set(0, 0.04, -0.65);
        group.add(barrel1);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), accentMat);
        pump.position.set(0, -0.07, -0.4);
        group.add(pump);
    }

    // Position the whole gun in front of camera, slightly to the right (right-handed)
    group.position.set(0.2, -0.18, -0.4);
    group.rotation.y = -0.05;
    return group;
}

export function setupWeapons(camera) {
    const group = new THREE.Group();
    camera.add(group);
    weaponState.gunGroup = group;
    swapWeapon(weaponState.current);
}

export function swapWeapon(id) {
    if (!CONFIG.weapons[id]) return;
    if (!weaponState.inventory[id]) return;
    weaponState.current = id;
    weaponState.reloading = false;
    weaponState.reloadTimer = 0;
    if (weaponState.gunGroup) {
        weaponState.gunGroup.clear();
        const model = buildGunModel(id);
        weaponState.gunGroup.add(model);
        weaponState.gunModel = model;
    }
}

const tmpDir = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

export function updateWeapons(dt, scene, enemies, onKill, builds) {
    weaponState.cooldown = Math.max(0, weaponState.cooldown - dt);

    // Reload
    if (weaponState.reloading) {
        weaponState.reloadTimer -= dt;
        if (weaponState.reloadTimer <= 0) {
            const id = weaponState.current;
            const cfg = CONFIG.weapons[id];
            const need = cfg.ammoPerMag - weaponState.ammo[id];
            const take = Math.min(need, weaponState.reserveAmmo[id]);
            weaponState.ammo[id] += take;
            weaponState.reserveAmmo[id] -= take;
            weaponState.reloading = false;
        }
    }

    // Fire
    if (input.shoot && !weaponState.reloading && weaponState.cooldown <= 0) {
        const id = weaponState.current;
        const cfg = CONFIG.weapons[id];
        if (weaponState.ammo[id] > 0) {
            fire(scene, enemies, id, cfg, onKill, builds);
            weaponState.ammo[id]--;
            weaponState.cooldown = cfg.fireRate;
        } else {
            // Auto-reload
            startReload();
        }
    }

    // Animate gun (recoil + bob + aim)
    animateGun(dt);
}

function fire(scene, enemies, id, cfg, onKill, builds) {
    playGunshot(id);

    // Apply recoil to camera (push pitch up, random horizontal)
    player.pitch += cfg.recoilV * (0.7 + Math.random() * 0.6);
    player.yaw += (Math.random() - 0.5) * cfg.recoilH * 2;
    // Visual gun kick
    if (weaponState.gunModel) {
        weaponState.gunModel.userData = weaponState.gunModel.userData || {};
        weaponState.gunModel.userData.kick = (weaponState.gunModel.userData.kick || 0) + 1;
    }

    // Muzzle flash
    spawnMuzzleFlash(scene);

    if (id === 'shotgun') {
        // 8 pellets in a spread
        const pellets = cfg.pellets || 8;
        const spread = cfg.spread || 0.10;
        for (let i = 0; i < pellets; i++) {
            const sx = (Math.random() - 0.5) * spread;
            const sy = (Math.random() - 0.5) * spread;
            castBullet(scene, enemies, cfg.damage, cfg.range, sx, sy, onKill, builds);
        }
    } else {
        // Single shot, slight inaccuracy
        const inaccuracy = player.aimBlend > 0.5 ? 0.005 : 0.02;
        const sx = (Math.random() - 0.5) * inaccuracy;
        const sy = (Math.random() - 0.5) * inaccuracy;
        castBullet(scene, enemies, cfg.damage, cfg.range, sx, sy, onKill, builds);
    }
}

function castBullet(scene, enemies, damage, range, spreadX, spreadY, onKill, builds) {
    // Direction from camera with spread
    tmpDir.set(0, 0, -1);
    tmpDir.applyQuaternion(player.camera.quaternion);
    // Apply spread in camera local right/up
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(player.camera.quaternion);
    tmpDir.addScaledVector(right, spreadX).addScaledVector(up, spreadY).normalize();

    raycaster.set(player.camera.getWorldPosition(new THREE.Vector3()), tmpDir);
    raycaster.far = range;

    // Test enemies
    const intersects = raycaster.intersectObjects(enemies, true);
    let firstHit = intersects[0];

    // Test builds (block bullets)
    if (builds && builds.length > 0) {
        const buildHits = raycaster.intersectObjects(builds, true);
        if (buildHits[0] && (!firstHit || buildHits[0].distance < firstHit.distance)) {
            // Bullet blocked by build piece
            firstHit = null;
        }
    }

    if (firstHit) {
        // Find root enemy
        let root = firstHit.object;
        while (root.parent && !enemies.includes(root)) root = root.parent;
        if (enemies.includes(root)) {
            const killed = damageEnemy(root, damage);
            if (killed) {
                if (onKill) onKill(root);
            }
        }
    }
}

function spawnMuzzleFlash(scene) {
    if (!weaponState.gunModel) return;
    const flash = new THREE.PointLight(0xffaa44, 6, 4);
    weaponState.gunModel.add(flash);
    flash.position.set(0, 0.04, -0.85);
    setTimeout(() => {
        if (weaponState.gunModel) weaponState.gunModel.remove(flash);
        flash.dispose && flash.dispose();
    }, 50);
}

export function startReload() {
    const id = weaponState.current;
    const cfg = CONFIG.weapons[id];
    if (weaponState.reloading) return;
    if (weaponState.ammo[id] >= cfg.ammoPerMag) return;
    if (weaponState.reserveAmmo[id] <= 0) return;
    weaponState.reloading = true;
    weaponState.reloadTimer = cfg.reloadTime;
}

function animateGun(dt) {
    if (!weaponState.gunModel) return;
    const m = weaponState.gunModel;
    const ud = m.userData = m.userData || {};

    // Recoil kick decay
    ud.kick = (ud.kick || 0);
    ud.kick *= Math.max(0, 1 - dt * 12);

    // Bob with movement
    const speed = player.speedSmooth || 0;
    const cycle = player.walkCycle || 0;
    const bobX = Math.sin(cycle) * 0.02 * speed * (1 - player.aimBlend);
    const bobY = Math.abs(Math.sin(cycle * 2)) * 0.025 * speed * (1 - player.aimBlend);

    // Aim position: gun moves to center when scoping
    const baseX = THREE.MathUtils.lerp(0.2, 0, player.aimBlend);
    const baseY = THREE.MathUtils.lerp(-0.18, -0.13, player.aimBlend);
    const baseZ = THREE.MathUtils.lerp(-0.4, -0.35, player.aimBlend);

    m.position.x = baseX + bobX;
    m.position.y = baseY + bobY;
    m.position.z = baseZ + ud.kick * 0.05;

    // Rotation kick (gun tips up)
    m.rotation.x = -ud.kick * 0.15;
    m.rotation.y = THREE.MathUtils.lerp(-0.05, 0, player.aimBlend);

    // Reload anim - gun drops down
    if (weaponState.reloading) {
        const cfg = CONFIG.weapons[weaponState.current];
        const t = 1 - weaponState.reloadTimer / cfg.reloadTime;
        const pulse = Math.sin(t * Math.PI);
        m.position.y -= pulse * 0.2;
        m.rotation.x -= pulse * 0.5;
    }

    // Scope FOV target
    const cfg = CONFIG.weapons[weaponState.current];
    player.targetFOV = input.scope ? (75 / cfg.scopeZoom) : 75;
}

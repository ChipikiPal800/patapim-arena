import * as THREE from 'three';
import { CONFIG, SETTINGS, applyUpgrades } from './config.js';
import { keybinds } from './keybinds.js';
import {
    createPlayerModel, initPlayerControls, updatePlayerMovement,
    updateGunVisuals, respawnPlayer, isBuildModeActive, setBuildModeActive, applyCosmetics
} from './player.js';
import { switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown, getCurrentWeapon, refreshAmmoForUpgrade, weaponState } from './weapons.js';
import { createZombieEnemy, createDummyEnemy, updateEnemies, spawnWave, updateDeathParticles } from './enemies.js';
import { initBuilding, setBuildMode, getCurrentBuildMode, clearBuildables, getBuildPieces, collideWithBuilds } from './building.js';
import {
    createUI, updateUI, updateWeaponUI, showDamageFlash, setScopedUI,
    updateBuildModeUI, updateFPS, openSettings, closeSettings, isSettingsOpen,
    openArmory, closeArmory, isArmoryOpen, openLocker, closeLocker, isLockerOpen,
    showLobby, hideLobby, updateWaveUI, addKillFeed, updateTimeOfDayUI,
    updateFlashlightUI, updateCaveIndicatorUI
} from './ui.js';

applyUpgrades();

// ─── EXPOSE GLOBALS FOR UI BUTTONS ───────────────────────────────────────────
window.updateWeaponUI = updateWeaponUI;
window.showDamageFlash = showDamageFlash;
window.updateGunVisuals = updateGunVisuals;
window.onBuildModeToggle = updateBuildModeUI;
window.applyCosmetics = applyCosmetics;
window.refreshAmmoForUpgrade = refreshAmmoForUpgrade;
window.getCurrentWeaponId = getCurrentWeapon;
window.isBuildModeActive = isBuildModeActive;
window.setBuildMode = setBuildMode;
window.setBuildModeActive = setBuildModeActive;
window.switchWeaponTo = switchWeapon;
window.setPaused = (paused) => { window.gamePaused = paused; };
window.getCoins = () => playerCoins;
window.spendCoins = (amount) => { playerCoins -= amount; updateUI(playerHealth, playerShield, playerCoins); };
window.applyShadowSettings = (level) => {
    window.currentShadowLevel = level;
    if (level === 'off') renderer.shadowMap.enabled = false;
    else {
        renderer.shadowMap.enabled = true;
        const shadowSize = level === 'high' ? 2048 : 512;
        mainLight.shadow.mapSize.width = shadowSize;
        mainLight.shadow.mapSize.height = shadowSize;
    }
};

window.gameStarted = false;
window.currentGameMode = 'zombies';
window.gamePaused = false;
let playerCoins = 0;
let playerHealth = CONFIG.player.health;
let playerShield = CONFIG.player.shield;

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.player.height, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Audio Context ────────────────────────────────────────────────────────────
let globalAudioCtx = null;
function getGlobalAudio() {
    if (!globalAudioCtx) {
        try { globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return null; }
    }
    return globalAudioCtx;
}
window.getGlobalAudio = getGlobalAudio;

// ─── Day/Night Cycle ──────────────────────────────────────────────────────────
let timeOfDay = 0.5;
const DAY_CYCLE_DURATION = 1200;
let lastTimeUpdate = performance.now();

function updateTimeOfDay(deltaSec) {
    timeOfDay += deltaSec / DAY_CYCLE_DURATION;
    if (timeOfDay >= 1) timeOfDay -= 1;
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const isNight = sunHeight < -0.2;
    const intensity = Math.max(0.15, Math.min(1.2, (sunHeight + 0.5) * 1.2));
    if (moonLight) moonLight.intensity = isNight ? 0.8 : 0.2;
    if (mainLight) {
        mainLight.intensity = intensity * 0.8;
        mainLight.color.setHex(isNight ? 0x6688aa : 0xffeedd);
    }
    if (ambientLight) ambientLight.intensity = Math.max(0.2, intensity * 0.4);
    updateTimeOfDayUI(timeOfDay, isNight);
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
mainLight.position.set(20, 30, -15);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1;
mainLight.shadow.camera.far = 200;
mainLight.shadow.camera.left = -60;
mainLight.shadow.camera.right = 60;
mainLight.shadow.camera.top = 60;
mainLight.shadow.camera.bottom = -60;
scene.add(mainLight);

const moonLight = new THREE.DirectionalLight(0x6688aa, 0.3);
moonLight.position.set(-20, 20, 15);
scene.add(moonLight);

const fillLight = new THREE.PointLight(0x4466aa, 0.25);
fillLight.position.set(0, 15, 0);
scene.add(fillLight);

const playerLight = new THREE.PointLight(0xffaa66, 0.5, 25);
playerLight.position.set(0, 2, 0);
scene.add(playerLight);

// ─── Flashlight System ───────────────────────────────────────────────────────
let flashlightActive = false;
let flashlightSpot = null;
let flashlightFill = null;

function createFlashlight() {
    const spot = new THREE.SpotLight(0xffeedd, 1.2);
    spot.angle = 0.45;
    spot.penumbra = 0.35;
    spot.distance = 28;
    spot.decay = 1.2;
    spot.castShadow = true;
    spot.shadow.mapSize.width = 512;
    spot.shadow.mapSize.height = 512;
    spot.visible = false;
    scene.add(spot);
    const fill = new THREE.PointLight(0xffaa66, 0.3, 18);
    fill.visible = false;
    scene.add(fill);
    return { spot, fill };
}

function toggleFlashlight() {
    flashlightActive = !flashlightActive;
    if (flashlightSpot) flashlightSpot.visible = flashlightActive;
    if (flashlightFill) flashlightFill.visible = flashlightActive;
    updateFlashlightUI(flashlightActive);
    const ctx = getGlobalAudio();
    if (ctx && ctx.state !== 'closed') {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 900;
        gain.gain.value = 0.12;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.stop(ctx.currentTime + 0.08);
    }
}
window.toggleFlashlight = toggleFlashlight;

function updateFlashlightPosition(cameraPos, cameraDir) {
    if (!flashlightSpot) return;
    const offset = cameraDir.clone().multiplyScalar(0.5);
    flashlightSpot.position.copy(cameraPos).add(offset);
    flashlightSpot.target.position.copy(cameraPos).add(cameraDir.clone().multiplyScalar(10));
    if (flashlightFill) flashlightFill.position.copy(cameraPos);
}

// ─── Cave Ambience System ────────────────────────────────────────────────────
let isInCave = false;
let caveAmbienceNode = null;
let caveAmbienceGain = null;

function checkCaveProximity(playerPos) {
    let inCave = false;
    for (const cave of cavesList) {
        const dx = playerPos.x - cave.position.x;
        const dz = playerPos.z - cave.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < cave.radius) { inCave = true; break; }
    }
    if (inCave !== isInCave) {
        isInCave = inCave;
        updateCaveIndicatorUI(isInCave);
        const ctx = getGlobalAudio();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            if (isInCave) {
                if (!caveAmbienceNode) {
                    const bufferSize = ctx.sampleRate * 2;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    src.loop = true;
                    const gain = ctx.createGain();
                    gain.gain.value = 0.2;
                    src.connect(gain);
                    gain.connect(ctx.destination);
                    src.start();
                    caveAmbienceNode = src;
                    caveAmbienceGain = gain;
                }
            } else {
                if (caveAmbienceGain) {
                    caveAmbienceGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
                    setTimeout(() => { if (caveAmbienceNode) caveAmbienceNode.stop(); caveAmbienceNode = null; caveAmbienceGain = null; }, 1000);
                }
            }
        }
    }
}

// ─── Terrain Collision Helpers ───────────────────────────────────────────────
let terrainHeightmap = null;
let treeColliders = [];
let cavesList = [];

function getTerrainHeight(x, z) {
    if (!terrainHeightmap) return 0;
    const dim = terrainHeightmap.length;
    const size = terrainHeightmap.size || 1200;
    const ix = Math.floor((x + size / 2) / 4);
    const iz = Math.floor((z + size / 2) / 4);
    if (ix < 0 || ix >= dim || iz < 0 || iz >= dim) return -1;
    return terrainHeightmap[ix][iz];
}

function checkTreeCollision(x, z, radius) {
    for (const tree of treeColliders) {
        const dx = x - tree.x;
        const dz = z - tree.z;
        if (Math.sqrt(dx * dx + dz * dz) < radius + tree.radius) return true;
    }
    return false;
}

// ─── Map Generators (Simplified for brevity) ─────────────────────────────────
const FOREST_SIZE = 1200;
const DESERT_SIZE = 400;

function generateForestMap() {
    const dim = FOREST_SIZE / 4;
    const heightmap = new Array(dim).fill().map(() => new Array(dim).fill(0));
    heightmap.size = FOREST_SIZE;
    for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
            const worldX = (x - dim / 2) * 4;
            const worldZ = (z - dim / 2) * 4;
            const h1 = Math.sin(worldX * 0.03) * Math.cos(worldZ * 0.03) * 4;
            const h2 = Math.sin(worldX * 0.08 + 1.2) * Math.sin(worldZ * 0.07) * 3;
            const h3 = Math.sin(worldX * 0.12 * worldZ * 0.12) * 2;
            let height = h1 + h2 + h3;
            const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
            if (dist < 60) height -= Math.sin(dist * 0.08) * 2.5;
            heightmap[x][z] = Math.max(-2, Math.min(12, height));
        }
    }
    return heightmap;
}

function generateDesertMap() {
    const dim = DESERT_SIZE / 4;
    const heightmap = new Array(dim).fill().map(() => new Array(dim).fill(0));
    heightmap.size = DESERT_SIZE;
    for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
            const worldX = (x - dim / 2) * 4;
            const worldZ = (z - dim / 2) * 4;
            const dune = Math.sin(worldX * 0.04) * Math.sin(worldZ * 0.04) * 3;
            const hill = Math.max(0, Math.sin(worldX * 0.07) * Math.sin(worldZ * 0.07)) * 4;
            let height = dune + hill;
            heightmap[x][z] = Math.max(-1, Math.min(8, height));
        }
    }
    return heightmap;
}

function createGround(heightmap, isDesert = false) {
    const size = heightmap.size;
    const dim = size / 4;
    const geometry = new THREE.PlaneGeometry(size, size, dim, dim);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const ix = Math.floor((x + size / 2) / 4);
        const iz = Math.floor((z + size / 2) / 4);
        if (ix >= 0 && ix < dim && iz >= 0 && iz < dim) positions[i + 1] = heightmap[ix][iz];
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: isDesert ? 0xc2a575 : 0x4a7a3a, roughness: 0.85, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(geometry, material);
    ground.receiveShadow = true;
    ground.position.y = -0.2;
    scene.add(ground);
    return ground;
}

// ─── Player & UI Setup ────────────────────────────────────────────────────────
const playerModel = createPlayerModel(scene);
initPlayerControls(camera, renderer.domElement);
createUI();
initBuilding(scene, () => playerModel.position.clone().add(new THREE.Vector3(0, CONFIG.player.height, 0)));
updateGunVisuals('pistol');

const flashlight = createFlashlight();
flashlightSpot = flashlight.spot;
flashlightFill = flashlight.fill;

// ─── Game State ───────────────────────────────────────────────────────────────
let enemies = [];
let mouseDown = false;
let rightMouseDown = false;
let isScoped = false;
let bulletTrails = [];
let paused = false;
let currentWave = 0;
let waveInProgress = false;
let scopeOverlay = null;

function createScopeOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'scopeOverlay';
    overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle, transparent 22%, rgba(0,0,0,0.96) 38%); pointer-events:none; z-index:50; display:none;`;
    document.body.appendChild(overlay);
    return overlay;
}
scopeOverlay = createScopeOverlay();

function updatePlayerLight() {
    playerLight.position.copy(playerModel.position);
    playerLight.position.y += 1.6;
}

function onEnemyKilled() {
    const reward = window.currentGameMode === 'zombies' ? CONFIG.enemies.zombie.coinReward : 18;
    playerCoins += reward;
    updateUI(playerHealth, playerShield, playerCoins);
    if (window.currentGameMode === 'zombies') {
        addKillFeed(`💀 +${reward} coins`);
        updateWaveUI(currentWave, enemies.length);
        if (enemies.length === 0 && waveInProgress) {
            waveInProgress = false;
            addKillFeed(`✅ Wave ${currentWave} complete!`);
            setTimeout(() => { if (window.currentGameMode === 'zombies') startNextWave(); }, 3000);
        }
    }
}
window.onEnemyKilled = onEnemyKilled;

function applyDamage(amount) {
    let remaining = amount * 0.6;
    if (playerShield > 0) {
        const sd = Math.min(playerShield, remaining);
        playerShield -= sd;
        remaining -= sd;
    }
    playerHealth -= remaining;
    updateUI(playerHealth, playerShield, playerCoins);
    showDamageFlash();
    if (playerHealth <= 0) {
        addKillFeed(`💀 You died — wave ${currentWave}`);
        playerHealth = CONFIG.player.health;
        playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        const startY = getTerrainHeight(0, 0);
        camera.position.set(0, startY + CONFIG.player.height, 0);
        playerModel.position.set(0, startY, 0);
        if (window.currentGameMode === 'zombies') {
            for (const e of enemies) if (e.parent) e.parent.remove(e);
            enemies = [];
            currentWave = 0;
            waveInProgress = false;
            setTimeout(() => startNextWave(), 2000);
        }
    }
}

function startNextWave() {
    if (window.currentGameMode !== 'zombies') return;
    currentWave++;
    waveInProgress = true;
    const count = spawnWave(scene, enemies, currentWave, playerModel.position.clone(), getTerrainHeight);
    updateWaveUI(currentWave, enemies.length);
    addKillFeed(`🌙 Wave ${currentWave} — ${count} zombies rise`);
}

function addPracticeDummies() {
    const positions = [[20, 20], [-20, 20], [20, -20], [-20, -20], [40, 0], [-40, 0], [0, 40], [0, -40]];
    positions.forEach(([x, z]) => {
        const ix = Math.floor((x + DESERT_SIZE / 2) / 4);
        const iz = Math.floor((z + DESERT_SIZE / 2) / 4);
        const y = terrainHeightmap?.[ix]?.[iz] || 0;
        const dummy = createDummyEnemy(x, z);
        dummy.position.y = y;
        enemies.push(dummy);
        scene.add(dummy);
    });
}

window.startGame = (mode) => {
    window.gameStarted = true;
    window.currentGameMode = mode;
    for (const e of enemies) if (e.parent) e.parent.remove(e);
    enemies = [];
    clearBuildables(scene);
    treeColliders = [];
    cavesList = [];
    scene.children.forEach(child => {
        if (child.isMesh && child.material && (child.material.color?.getHex() === 0x4a7a3a || child.material.color?.getHex() === 0xc2a575)) scene.remove(child);
        if (child.isGroup && child.children.some(c => c.geometry?.type === 'CylinderGeometry')) scene.remove(child);
    });
    if (mode === 'practice') {
        terrainHeightmap = generateDesertMap();
        createGround(terrainHeightmap, true);
    } else {
        terrainHeightmap = generateForestMap();
        createGround(terrainHeightmap, false);
    }
    playerHealth = CONFIG.player.health;
    playerShield = CONFIG.player.shield;
    playerCoins = mode === 'practice' ? 1000 : 0;
    respawnPlayer();
    const startY = getTerrainHeight(0, 0);
    camera.position.set(0, startY + CONFIG.player.height, 0);
    playerModel.position.set(0, startY, 0);
    updateUI(playerHealth, playerShield, playerCoins);
    if (mode === 'zombies') {
        currentWave = 0;
        waveInProgress = false;
        startNextWave();
    } else if (mode === 'practice') {
        addPracticeDummies();
    }
    hideLobby();
    renderer.domElement.requestPointerLock();
};

// ─── Input Handling ───────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.code === keybinds.settings) {
        if (isSettingsOpen()) closeSettings();
        else if (isArmoryOpen()) closeArmory();
        else if (isLockerOpen()) closeLocker();
        else openSettings();
        return;
    }
    if (e.code === 'KeyF' && window.gameStarted) { toggleFlashlight(); e.preventDefault(); }
    if (window.gamePaused || !window.gameStarted) return;
    if (e.code === keybinds.weapon1) switchWeapon('pistol');
    if (e.code === keybinds.weapon2) switchWeapon('assault');
    if (e.code === keybinds.weapon3) switchWeapon('sniper');
    if (e.code === keybinds.weapon4) switchWeapon('shotgun');
    if (e.code === keybinds.reload) reloadWeapon();
    if (e.code === 'KeyG') openArmory();
    if (e.code === 'KeyL') openLocker();
});

document.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; if (e.button === 2) { rightMouseDown = true; e.preventDefault(); } });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; if (e.button === 2) rightMouseDown = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();
let lastTime = performance.now();
let lastFPSTime = performance.now();
let frameCount = 0;

function cleanupTrails() {
    const now = performance.now();
    for (let i = bulletTrails.length - 1; i >= 0; i--) {
        const t = bulletTrails[i];
        if (t?.parent && t.userData?.spawnTime && now - t.userData.spawnTime > 350) {
            scene.remove(t);
            bulletTrails.splice(i, 1);
        }
    }
}

// ─── Animation Loop ───────────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    updateTimeOfDay(delta);
    frameCount++;
    if (now - lastFPSTime >= 500) {
        updateFPS(Math.round((frameCount * 1000) / (now - lastFPSTime)));
        frameCount = 0;
        lastFPSTime = now;
    }
    if (window.gamePaused || !window.gameStarted) { renderer.render(scene, camera); return; }
    const wp = CONFIG.weapons[getCurrentWeapon()];
    const shouldScope = rightMouseDown && !isBuildModeActive();
    if (shouldScope && !isScoped && wp.scopeZoom) {
        isScoped = true; camera.fov = 75 / wp.scopeZoom; camera.updateProjectionMatrix(); setScopedUI(true);
        if (scopeOverlay && getCurrentWeapon() === 'sniper') scopeOverlay.style.display = 'block';
    }
    if ((!shouldScope || isBuildModeActive()) && isScoped) {
        isScoped = false; camera.fov = 75; camera.updateProjectionMatrix(); setScopedUI(false);
        if (scopeOverlay) scopeOverlay.style.display = 'none';
    }
    const playerPos = updatePlayerMovement(camera, delta, null, isScoped, getTerrainHeight, checkTreeCollision, collideWithBuilds);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta, getTerrainHeight);
    updatePlayerLight();
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    updateFlashlightPosition(camera.position, cameraDir);
    checkCaveProximity(playerPos);
    if (playerPos.y < -8) {
        playerHealth = CONFIG.player.health; playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        const startY = getTerrainHeight(0, 0);
        camera.position.set(0, startY + CONFIG.player.height, 0);
        playerModel.position.set(0, startY, 0);
    }
    if (window.currentGameMode === 'zombies') {
        for (const enemy of enemies) {
            if (enemy.userData.type !== 'zombie') continue;
            const ep = enemy.position.clone(); ep.y = 0;
            const pp = playerPos.clone(); pp.y = 0;
            if (pp.distanceTo(ep) < 1.4) { applyDamage(CONFIG.enemies.zombie.damageToPlayer); break; }
        }
    }
    if (mouseDown && document.pointerLockElement === renderer.domElement && !isBuildModeActive()) {
        const buildPieces = getBuildPieces();
        shootWeapon(raycaster, camera, scene, enemies, (killed) => { if (killed) onEnemyKilled(); }, bulletTrails, buildPieces);
    }
    cleanupTrails();
    renderer.render(scene, camera);
}
animate();

window.getTerrainHeight = getTerrainHeight;
window.getBuildPieces = getBuildPieces;

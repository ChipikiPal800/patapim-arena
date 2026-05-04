import * as THREE from 'three';
import { CONFIG, SETTINGS, applyUpgrades } from './config.js';
import { keybinds } from './keybinds.js';
import {
    createPlayerModel, initPlayerControls, updatePlayerMovement,
    updateGunVisuals, respawnPlayer, isBuildModeActive, setBuildModeActive, applyCosmetics
} from './player.js';
import { switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown, getCurrentWeapon, refreshAmmoForUpgrade } from './weapons.js';
import { createZombieEnemy, createDummyEnemy, updateEnemies, spawnWave } from './enemies.js';
import { initBuilding, setBuildMode, getCurrentBuildMode, clearBuildables, getBuildPieces } from './building.js';
import {
    createUI, updateUI, updateWeaponUI, showDamageFlash, setScopedUI,
    updateBuildModeUI, updateFPS, openSettings, closeSettings, isSettingsOpen,
    openArmory, closeArmory, isArmoryOpen, openLocker, closeLocker, isLockerOpen,
    showLobby, hideLobby, updateWaveUI, addKillFeed
} from './ui.js';

applyUpgrades();

// ─── Expose globals ──────────────────────────────────────────────────────────
window.updateWeaponUI = updateWeaponUI;
window.showDamageFlash = showDamageFlash;
window.updateGunVisuals = updateGunVisuals;
window.onBuildModeToggle = updateBuildModeUI;
window.applyCosmetics = applyCosmetics;
window.refreshAmmoForUpgrade = refreshAmmoForUpgrade;
window.getCurrentWeaponId = getCurrentWeapon;
window.isBuildModeActive = isBuildModeActive;
window.setBuildMode = setBuildMode;
window.gameStarted = false;

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.003);

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

// ─── Full Moon Lighting ───────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x404060, 0.55);
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0xc8d0ff, 1.3);
moonLight.position.set(20, 30, -15);
moonLight.castShadow = true;
moonLight.receiveShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 150;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
scene.add(moonLight);

const fillLight = new THREE.PointLight(0x4466aa, 0.35);
fillLight.position.set(0, 15, 0);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xffaa66, 0.25);
rimLight.position.set(-10, 10, -15);
scene.add(rimLight);

const playerLight = new THREE.PointLight(0xffaa88, 0.45, 20);
playerLight.position.set(0, 2, 0);
scene.add(playerLight);

// ─── Procedural Forest Map ────────────────────────────────────────────────────
const MAP_SIZE = 320;
const TILE_SIZE = CONFIG.building.pieceSize || 4;
const HILL_AMPLITUDE = 7;

let heightmap = [];
let trees = [];
let caves = [];

function generateHeightmap() {
    const dim = MAP_SIZE / TILE_SIZE;
    heightmap = new Array(dim).fill().map(() => new Array(dim).fill(0));
    
    for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
            const worldX = (x - dim/2) * TILE_SIZE;
            const worldZ = (z - dim/2) * TILE_SIZE;
            
            const h1 = Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 3;
            const h2 = Math.sin(worldX * 0.15 + 1.2) * Math.sin(worldZ * 0.13) * 2.5;
            const h3 = Math.sin((worldX * 0.25) * (worldZ * 0.25)) * 1.5;
            const hill = Math.max(0, Math.sin(worldX * 0.08) * Math.sin(worldZ * 0.08)) * 4;
            
            let height = h1 + h2 + h3 + hill;
            const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
            if (dist < 45) height -= Math.sin(dist * 0.1) * 1.8;
            if (dist > 100) height += Math.sin(dist * 0.03) * 1.2;
            
            heightmap[x][z] = Math.max(-2.5, Math.min(HILL_AMPLITUDE, height));
        }
    }
}

function getGroundHeight(x, z) {
    const dim = MAP_SIZE / TILE_SIZE;
    const ix = Math.floor((x + MAP_SIZE/2) / TILE_SIZE);
    const iz = Math.floor((z + MAP_SIZE/2) / TILE_SIZE);
    if (ix < 0 || ix >= dim || iz < 0 || iz >= dim) return -0.8;
    return heightmap[ix][iz];
}
window.getGroundHeight = getGroundHeight;

function createGround() {
    const dim = MAP_SIZE / TILE_SIZE;
    const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, dim, dim);
    geometry.rotateX(-Math.PI / 2);
    
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i+2];
        const ix = Math.floor((x + MAP_SIZE/2) / TILE_SIZE);
        const iz = Math.floor((z + MAP_SIZE/2) / TILE_SIZE);
        if (ix >= 0 && ix < dim && iz >= 0 && iz < dim) {
            positions[i+1] = heightmap[ix][iz];
        }
    }
    geometry.computeVertexNormals();
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a6a2a';
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = `rgba(70, 110, 50, ${Math.random() * 0.6})`;
        ctx.fillRect(Math.floor(Math.random() * 1024), Math.floor(Math.random() * 1024), 2, 2);
    }
    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(24, 24);
    
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x4a7a3a, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(geometry, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.2;
    scene.add(ground);
    return ground;
}

function createTree(x, z) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.6 });
    
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 2.0, 6), trunkMat);
    trunk.position.y = 1.0;
    trunk.castShadow = true;
    group.add(trunk);
    
    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 8), foliageMat);
    foliage1.position.y = 2.1;
    foliage1.castShadow = true;
    group.add(foliage1);
    
    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 8), foliageMat);
    foliage2.position.y = 3.0;
    foliage2.castShadow = true;
    group.add(foliage2);
    
    const y = getGroundHeight(x, z);
    group.position.set(x, y, z);
    return group;
}

function generateTrees() {
    const radius = MAP_SIZE / 2 - 15;
    for (let i = 0; i < 500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * radius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = getGroundHeight(x, z);
        if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
        if (y < -1) continue;
        
        let tooClose = false;
        for (let t of trees) {
            if (Math.hypot(x - t.position.x, z - t.position.z) < 5) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            const tree = createTree(x, z);
            scene.add(tree);
            trees.push(tree);
        }
    }
}

function createCave(x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.7 });
    const size = 2.8;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), stoneMat);
    dome.scale.set(1.6, 0.55, 1.3);
    dome.position.y = -1.2;
    dome.castShadow = true;
    group.add(dome);
    
    const entrance = new THREE.Mesh(new THREE.TorusGeometry(size * 0.65, 0.3, 16, 32), stoneMat);
    entrance.rotation.x = Math.PI / 2;
    entrance.position.set(0, -0.6, size * 0.7);
    group.add(entrance);
    
    const y = getGroundHeight(x, z);
    group.position.set(x, y - 0.8, z);
    scene.add(group);
    caves.push(group);
}

function generateCaves() {
    const numCaves = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numCaves; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 70 + Math.random() * 90;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        createCave(x, z);
    }
}

// ─── Build World ──────────────────────────────────────────────────────────────
generateHeightmap();
createGround();
generateTrees();
generateCaves();

// ─── Player & UI ──────────────────────────────────────────────────────────────
const playerModel = createPlayerModel(scene);
initPlayerControls(camera, renderer.domElement);
createUI();
initBuilding(scene, () => playerModel.position.clone().add(new THREE.Vector3(0, CONFIG.player.height, 0)));
updateGunVisuals('pistol');

function updatePlayerLight() {
    playerLight.position.copy(playerModel.position);
    playerLight.position.y += 1.6;
}

// ─── Game State ───────────────────────────────────────────────────────────────
let enemies = [];
let playerHealth = CONFIG.player.health;
let playerShield = CONFIG.player.shield;
let playerCoins = 0;
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
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle, transparent 22%, rgba(0,0,0,0.96) 38%);
        pointer-events: none; z-index: 50; display: none;
    `;
    document.body.appendChild(overlay);
    return overlay;
}
scopeOverlay = createScopeOverlay();

window.getCoins = () => playerCoins;
window.spendCoins = (amount) => { playerCoins -= amount; updateUI(playerHealth, playerShield, playerCoins); };
window.setPaused = (val) => { paused = val; };
window.switchWeaponTo = (id) => { switchWeapon(id); };

window.startGame = (mode) => {
    window.gameStarted = true;
    CONFIG.gameMode = mode;
    for (const e of enemies) if (e.parent) e.parent.remove(e);
    enemies = [];
    clearBuildables();
    playerHealth = CONFIG.player.health;
    playerShield = CONFIG.player.shield;
    playerCoins = mode === 'practice' ? 1000 : 0;
    respawnPlayer();
    camera.position.set(0, getGroundHeight(0, 0) + CONFIG.player.height, 0);
    updateUI(playerHealth, playerShield, playerCoins);
    if (mode === 'zombies') { currentWave = 0; waveInProgress = false; startNextWave(); }
    else if (mode === 'practice') addPracticeDummies();
    renderer.domElement.requestPointerLock();
};

function addPracticeDummies() {
    const positions = [[12,12],[-12,12],[12,-12],[-12,-12],[25,0],[-25,0],[0,25],[0,-25]];
    positions.forEach(([x,z]) => {
        const y = getGroundHeight(x, z);
        const dummy = createDummyEnemy(x, z);
        dummy.position.y = y;
        enemies.push(dummy);
        scene.add(dummy);
    });
}

function startNextWave() {
    if (CONFIG.gameMode !== 'zombies') return;
    currentWave++;
    waveInProgress = true;
    const playerPos = playerModel.position.clone();
    enemiesThisWave = spawnWave(scene, enemies, currentWave, playerPos, getGroundHeight);
    updateWaveUI(currentWave, enemies.length);
    addKillFeed(`🌙 Wave ${currentWave} — ${enemiesThisWave} zombies rise`);
}

function onEnemyKilled(enemy) {
    const reward = CONFIG.gameMode === 'zombies' ? CONFIG.enemies.zombie.coinReward : 18;
    playerCoins += reward;
    updateUI(playerHealth, playerShield, playerCoins);
    if (CONFIG.gameMode === 'zombies') {
        addKillFeed(`💀 +${reward} coins`);
        updateWaveUI(currentWave, enemies.length);
        if (enemies.length === 0 && waveInProgress) {
            waveInProgress = false;
            addKillFeed(`✅ Wave ${currentWave} complete!`);
            setTimeout(() => { if (CONFIG.gameMode === 'zombies') startNextWave(); }, 3000);
        }
    } else if (CONFIG.gameMode === 'practice') {
        setTimeout(() => {
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            const y = getGroundHeight(x, z);
            const dummy = createDummyEnemy(x, z);
            dummy.position.y = y;
            enemies.push(dummy);
            scene.add(dummy);
        }, 2000);
    }
}
window.onEnemyKilled = onEnemyKilled;

function applyDamage(amount) {
    let remaining = amount;
    if (playerShield > 0) { const sd = Math.min(playerShield, remaining); playerShield -= sd; remaining -= sd; }
    playerHealth -= remaining;
    updateUI(playerHealth, playerShield, playerCoins);
    showDamageFlash();
    if (playerHealth <= 0) {
        addKillFeed(`💀 You died — wave ${currentWave}`);
        playerHealth = CONFIG.player.health; playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        camera.position.set(0, getGroundHeight(0, 0) + CONFIG.player.height, 0);
        if (CONFIG.gameMode === 'zombies') {
            for (const e of enemies) if (e.parent) e.parent.remove(e);
            enemies = [];
            currentWave = 0; waveInProgress = false;
            setTimeout(() => startNextWave(), 2000);
        }
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === keybinds.settings) {
        if (isSettingsOpen()) closeSettings();
        else if (isArmoryOpen()) closeArmory();
        else if (isLockerOpen()) closeLocker();
        else openSettings();
        return;
    }
    if (paused || !window.gameStarted) return;
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
let lastTime = performance.now(), lastFPSTime = performance.now(), frameCount = 0;

function cleanupTrails() {
    const now = performance.now();
    for (let i = bulletTrails.length-1; i>=0; i--) {
        const t = bulletTrails[i];
        if (t?.parent && t.userData?.spawnTime && now - t.userData.spawnTime > 350) {
            scene.remove(t);
            bulletTrails.splice(i,1);
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    frameCount++;
    if (now - lastFPSTime >= 500) { updateFPS(Math.round((frameCount * 1000) / (now - lastFPSTime))); frameCount = 0; lastFPSTime = now; }
    if (paused || !window.gameStarted) { renderer.render(scene, camera); return; }
    
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
    
    const playerPos = updatePlayerMovement(camera, delta, null, isScoped);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta, getGroundHeight || (() => 0));
    updatePlayerLight();
    
    if (playerPos.y < -8) {
        playerHealth = CONFIG.player.health; playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer(); camera.position.set(0, getGroundHeight(0,0) + CONFIG.player.height, 0);
    }
    
    if (CONFIG.gameMode === 'zombies') {
        for (const enemy of enemies) {
            if (enemy.userData.type !== 'zombie') continue;
            const ep = enemy.position.clone(); ep.y = 0;
            const pp = playerPos.clone(); pp.y = 0;
            if (pp.distanceTo(ep) < 1.4) { applyDamage(CONFIG.enemies.zombie.damageToPlayer * delta * 30); break; }
        }
    }
    
    if (mouseDown && document.pointerLockElement === renderer.domElement && !isBuildModeActive()) {
        const buildPieces = window.getBuildPieces ? window.getBuildPieces() : [];
        shootWeapon(raycaster, camera, scene, enemies, (killed) => { if (killed) onEnemyKilled(); }, bulletTrails, buildPieces);
    }
    
    cleanupTrails();
    renderer.render(scene, camera);
}
animate();

// ─── Final exports for building collision ─────────────────────────────────────
window.getBuildPieces = () => window.getBuildPieces?.() || [];

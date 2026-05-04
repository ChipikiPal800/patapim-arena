import * as THREE from 'three';
import { CONFIG, SETTINGS, applyUpgrades } from './config.js';
import { keybinds } from './keybinds.js';
import {
    createPlayerModel, initPlayerControls, updatePlayerMovement,
    updateGunVisuals, respawnPlayer, isBuildModeActive, setBuildModeActive, applyCosmetics
} from './player.js';
import { switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown, getCurrentWeapon, refreshAmmoForUpgrade } from './weapons.js';
import { createZombieEnemy, createDummyEnemy, updateEnemies, spawnWave } from './enemies.js';
import { initBuilding, setBuildMode, getCurrentBuildMode, clearBuildables, getBuildPieces, collideWithBuilds } from './building.js';
import {
    createUI, updateUI, updateWeaponUI, showDamageFlash, setScopedUI,
    updateBuildModeUI, updateFPS, openSettings, closeSettings, isSettingsOpen,
    openArmory, closeArmory, isArmoryOpen, openLocker, closeLocker, isLockerOpen,
    showLobby, hideLobby, updateWaveUI, addKillFeed, updateTimeOfDayUI
} from './ui.js';

applyUpgrades();

// Expose globals
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
window.currentGameMode = 'zombies';

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

// ─── Day/Night Cycle ──────────────────────────────────────────────────────────
let timeOfDay = 0.5; // 0 = midnight, 0.5 = noon, 1 = midnight
const DAY_CYCLE_DURATION = 1200; // 20 minutes in seconds (1200)
let lastTimeUpdate = performance.now();

function updateTimeOfDay(deltaSec) {
    timeOfDay += deltaSec / DAY_CYCLE_DURATION;
    if (timeOfDay >= 1) timeOfDay -= 1;
    
    // Calculate sun angle (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const isNight = sunHeight < -0.2;
    
    // Update light colors based on time
    const intensity = Math.max(0.15, Math.min(1.2, (sunHeight + 0.5) * 1.2));
    const colorTemp = isNight ? 0x4466aa : (sunHeight > 0 ? 0xffdd99 : 0xff8866);
    
    moonLight.intensity = isNight ? 0.8 : 0.2;
    moonLight.color.setHex(isNight ? 0xaaccff : 0x4466aa);
    mainLight.intensity = intensity * 0.8;
    mainLight.color.setHex(colorTemp);
    ambientLight.intensity = Math.max(0.2, intensity * 0.4);
    
    updateTimeOfDayUI(timeOfDay, isNight);
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
mainLight.position.set(20, 30, -15);
mainLight.castShadow = true;
mainLight.receiveShadow = true;
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
moonLight.castShadow = false;
scene.add(moonLight);

const fillLight = new THREE.PointLight(0x4466aa, 0.25);
fillLight.position.set(0, 15, 0);
scene.add(fillLight);

const playerLight = new THREE.PointLight(0xffaa66, 0.5, 25);
playerLight.position.set(0, 2, 0);
scene.add(playerLight);

// ─── Terrain Collision Helpers ────────────────────────────────────────────────
let terrainHeightmap = null;
let treeColliders = [];

function getTerrainHeight(x, z) {
    if (!terrainHeightmap) return 0;
    const dim = terrainHeightmap.length;
    const ix = Math.floor((x + terrainHeightmap.size / 2) / terrainHeightmap.tileSize);
    const iz = Math.floor((z + terrainHeightmap.size / 2) / terrainHeightmap.tileSize);
    if (ix < 0 || ix >= dim || iz < 0 || iz >= dim) return -1;
    return terrainHeightmap[ix][iz];
}

function checkTreeCollision(x, z, radius) {
    for (const tree of treeColliders) {
        const dx = x - tree.x;
        const dz = z - tree.z;
        if (Math.sqrt(dx*dx + dz*dz) < radius + tree.radius) return true;
    }
    return false;
}

// ─── Forest Map Generator (3x larger) ─────────────────────────────────────────
const FOREST_SIZE = 1200; // 3x larger
const DESERT_SIZE = 400;
let currentMapType = 'forest';

function generateForestMap() {
    const dim = FOREST_SIZE / 4;
    const heightmap = new Array(dim).fill().map(() => new Array(dim).fill(0));
    heightmap.size = FOREST_SIZE;
    heightmap.tileSize = 4;
    
    for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
            const worldX = (x - dim/2) * 4;
            const worldZ = (z - dim/2) * 4;
            const h1 = Math.sin(worldX * 0.03) * Math.cos(worldZ * 0.03) * 4;
            const h2 = Math.sin(worldX * 0.08 + 1.2) * Math.sin(worldZ * 0.07) * 3;
            const h3 = Math.sin((worldX * 0.12) * (worldZ * 0.12)) * 2;
            let height = h1 + h2 + h3;
            const dist = Math.sqrt(worldX*worldX + worldZ*worldZ);
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
    heightmap.tileSize = 4;
    
    for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
            const worldX = (x - dim/2) * 4;
            const worldZ = (z - dim/2) * 4;
            const dune = Math.sin(worldX * 0.04) * Math.sin(worldZ * 0.04) * 3;
            const hill = Math.max(0, Math.sin(worldX * 0.07) * Math.sin(worldZ * 0.07)) * 4;
            let height = dune + hill;
            const dist = Math.sqrt(worldX*worldX + worldZ*worldZ);
            if (dist < 50) height -= 1;
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
        const z = positions[i+2];
        const ix = Math.floor((x + size/2) / 4);
        const iz = Math.floor((z + size/2) / 4);
        if (ix >= 0 && ix < dim && iz >= 0 && iz < dim) {
            positions[i+1] = heightmap[ix][iz];
        }
    }
    geometry.computeVertexNormals();
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (isDesert) {
        ctx.fillStyle = '#c2a575';
        ctx.fillRect(0, 0, 1024, 1024);
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = `rgba(180, 140, 90, ${Math.random() * 0.5})`;
            ctx.fillRect(Math.floor(Math.random() * 1024), Math.floor(Math.random() * 1024), 2, 2);
        }
    } else {
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(0, 0, 1024, 1024);
        for (let i = 0; i < 8000; i++) {
            ctx.fillStyle = `rgba(70, 110, 50, ${Math.random() * 0.6})`;
            ctx.fillRect(Math.floor(Math.random() * 1024), Math.floor(Math.random() * 1024), 2, 2);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(isDesert ? 16 : 32, isDesert ? 16 : 32);
    
    const material = new THREE.MeshStandardMaterial({ map: texture, color: isDesert ? 0xc2a575 : 0x4a7a3a, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(geometry, material);
    ground.receiveShadow = true;
    ground.position.y = -0.2;
    scene.add(ground);
    return ground;
}

function createTree(x, z, height) {
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
    
    group.position.set(x, height, z);
    treeColliders.push({ x, z, radius: 0.8 });
    return group;
}

function generateTrees(heightmap) {
    const size = heightmap.size;
    const radius = size / 2 - 20;
    const spacing = 6;
    for (let i = 0; i < 1200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 25 + Math.random() * radius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        if (Math.abs(x) < 50 && Math.abs(z) < 50) continue;
        const ix = Math.floor((x + size/2) / 4);
        const iz = Math.floor((z + size/2) / 4);
        if (ix < 0 || ix >= heightmap.length || iz < 0 || iz >= heightmap.length) continue;
        const y = heightmap[ix][iz];
        if (y < 0) continue;
        let tooClose = false;
        for (const t of treeColliders) {
            if (Math.hypot(x - t.x, z - t.z) < spacing) { tooClose = true; break; }
        }
        if (!tooClose) {
            const tree = createTree(x, z, y);
            scene.add(tree);
        }
    }
}

function createCactus(x, z, height) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 0.7 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.5, 6), mat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 5), mat);
    arm1.position.set(0.5, 1.0, 0);
    arm1.rotation.z = 0.5;
    arm1.castShadow = true;
    group.add(arm1);
    group.position.set(x, height, z);
    return group;
}

function generateCacti(heightmap) {
    const size = heightmap.size;
    for (let i = 0; i < 400; i++) {
        const x = (Math.random() - 0.5) * (size - 40);
        const z = (Math.random() - 0.5) * (size - 40);
        const ix = Math.floor((x + size/2) / 4);
        const iz = Math.floor((z + size/2) / 4);
        if (ix < 0 || ix >= heightmap.length || iz < 0 || iz >= heightmap.length) continue;
        const y = heightmap[ix][iz];
        if (y > -0.5 && y < 3) {
            const cactus = createCactus(x, z, y);
            scene.add(cactus);
        }
    }
}

function createStalactite(x, y, z, rotation) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6a7a, roughness: 0.6 });
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 5), stoneMat);
    spike.position.y = -0.6;
    spike.castShadow = true;
    group.add(spike);
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    return group;
}

function createStalagmite(x, y, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6a7a, roughness: 0.7 });
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 5), stoneMat);
    spike.position.y = 0.5;
    spike.castShadow = true;
    group.add(spike);
    group.position.set(x, y, z);
    return group;
}

function createBloodyBody(x, y, z) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a6a6a, roughness: 0.4 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0x441111 });
    
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), bodyMat);
    torso.position.y = 0.4;
    torso.castShadow = true;
    group.add(torso);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), bodyMat);
    head.position.y = 0.9;
    head.castShadow = true;
    group.add(head);
    
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.2), bodyMat);
    armL.position.set(-0.4, 0.65, 0);
    armL.rotation.z = 0.3;
    armL.castShadow = true;
    group.add(armL);
    
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.2), bodyMat);
    armR.position.set(0.4, 0.65, 0);
    armR.rotation.z = -0.3;
    armR.castShadow = true;
    group.add(armR);
    
    // Blood drips
    const blood = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), bloodMat);
    blood.position.set(0.2, 0.5, 0.2);
    group.add(blood);
    
    group.position.set(x, y, z);
    group.rotation.z = 0.2;
    return group;
}

function generateCave(cx, cz, size, heightmap, isSuperCavern = false) {
    const caveGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
    
    const domeHeight = isSuperCavern ? 8 : 3;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), stoneMat);
    dome.scale.set(1.6, domeHeight / size, 1.4);
    dome.position.y = -1;
    dome.castShadow = true;
    caveGroup.add(dome);
    
    // Entrance arch
    const entrance = new THREE.Mesh(new THREE.TorusGeometry(size * 0.7, 0.4, 16, 32), stoneMat);
    entrance.rotation.x = Math.PI / 2;
    entrance.position.set(0, -0.5, size * 0.8);
    caveGroup.add(entrance);
    
    // Stalactites
    for (let i = 0; i < (isSuperCavern ? 30 : 8); i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * size * 0.8;
        const sx = Math.cos(angle) * rad;
        const sz = Math.sin(angle) * rad;
        const stal = createStalactite(sx, domeHeight - 0.5, sz, Math.random() * Math.PI * 2);
        caveGroup.add(stal);
    }
    
    // Stalagmites on floor
    for (let i = 0; i < (isSuperCavern ? 20 : 5); i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * size * 0.9;
        const sx = Math.cos(angle) * rad;
        const sz = Math.sin(angle) * rad;
        const stal = createStalagmite(sx, -1.2, sz);
        caveGroup.add(stal);
    }
    
    if (isSuperCavern) {
        // Water pool
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x336699, emissive: 0x224466, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(new THREE.CircleGeometry(size * 0.6, 8), waterMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = -1.3;
        pool.receiveShadow = true;
        caveGroup.add(pool);
        
        // Bloody body at the far end
        const bodyPos = new THREE.Vector3(Math.cos(0.7) * size * 0.5, -1.0, Math.sin(0.7) * size * 0.5);
        const body = createBloodyBody(bodyPos.x, bodyPos.y, bodyPos.z);
        caveGroup.add(body);
    }
    
    const y = heightmap[Math.floor((cz + heightmap.size/2) / 4)]?.[Math.floor((cx + heightmap.size/2) / 4)] || 0;
    caveGroup.position.set(cx, y - 0.8, cz);
    scene.add(caveGroup);
    return caveGroup;
}

function generateCaves(heightmap, count, isSuper = false) {
    const size = heightmap.size;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 100 + Math.random() * (size/2 - 80);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const caveSize = isSuper ? 6 + Math.random() * 3 : 2.5 + Math.random() * 2;
        generateCave(x, z, caveSize, heightmap, isSuper);
    }
}

// ─── Player & UI Setup ─────────────────────────────────────────────────────────
const playerModel = createPlayerModel(scene);
initPlayerControls(camera, renderer.domElement);
createUI();
initBuilding(scene, () => playerModel.position.clone().add(new THREE.Vector3(0, CONFIG.player.height, 0)));
updateGunVisuals('pistol');

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
    } else if (window.currentGameMode === 'practice') {
        setTimeout(() => {
            const x = (Math.random() - 0.5) * (DESERT_SIZE - 60);
            const z = (Math.random() - 0.5) * (DESERT_SIZE - 60);
            const ix = Math.floor((x + DESERT_SIZE/2) / 4);
            const iz = Math.floor((z + DESERT_SIZE/2) / 4);
            const y = terrainHeightmap?.[ix]?.[iz] || 0;
            const dummy = createDummyEnemy(x, z);
            dummy.position.y = y;
            enemies.push(dummy);
            scene.add(dummy);
        }, 2000);
    }
}
window.onEnemyKilled = onEnemyKilled;

function applyDamage(amount) {
    let remaining = amount * 0.6; // 40% damage reduction (more forgiving)
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
        camera.position.set(0, getTerrainHeight(0, 0) + CONFIG.player.height, 0);
        playerModel.position.set(0, getTerrainHeight(0, 0), 0);
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
    const positions = [[20,20],[-20,20],[20,-20],[-20,-20],[40,0],[-40,0],[0,40],[0,-40]];
    positions.forEach(([x,z]) => {
        const ix = Math.floor((x + DESERT_SIZE/2) / 4);
        const iz = Math.floor((z + DESERT_SIZE/2) / 4);
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
    
    // Clear existing terrain
    scene.children.forEach(child => {
        if (child.isMesh && (child.material?.color?.getHex() === 0x4a7a3a || child.material?.color?.getHex() === 0xc2a575)) {
            scene.remove(child);
        }
        if (child.isGroup && child.children.some(c => c.geometry?.type === 'CylinderGeometry')) {
            scene.remove(child);
        }
    });
    
    if (mode === 'practice') {
        currentMapType = 'desert';
        terrainHeightmap = generateDesertMap();
        createGround(terrainHeightmap, true);
        generateCacti(terrainHeightmap);
    } else {
        currentMapType = 'forest';
        terrainHeightmap = generateForestMap();
        createGround(terrainHeightmap, false);
        generateTrees(terrainHeightmap);
        generateCaves(terrainHeightmap, 8, false);
        generateCaves(terrainHeightmap, 1, true);
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
let lastTime = performance.now();
let lastFPSTime = performance.now();
let frameCount = 0;

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

// ─── Animation Loop ───────────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    // Update time of day
    updateTimeOfDay(delta);
    
    frameCount++;
    if (now - lastFPSTime >= 500) {
        updateFPS(Math.round((frameCount * 1000) / (now - lastFPSTime)));
        frameCount = 0;
        lastFPSTime = now;
    }
    
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
    
    const playerPos = updatePlayerMovement(camera, delta, null, isScoped, getTerrainHeight, checkTreeCollision, collideWithBuilds);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta, getTerrainHeight);
    updatePlayerLight();
    
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
            if (pp.distanceTo(ep) < 1.4) {
                applyDamage(CONFIG.enemies.zombie.damageToPlayer);
                break;
            }
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

// Exports for collision
window.getTerrainHeight = getTerrainHeight;
window.getBuildPieces = getBuildPieces;

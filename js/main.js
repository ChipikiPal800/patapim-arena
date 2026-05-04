import * as THREE from 'three';
import { CONFIG, SETTINGS, applyUpgrades } from './config.js';
import { keybinds } from './keybinds.js';
import {
    createPlayerModel, initPlayerControls, updatePlayerMovement,
    updateGunVisuals, respawnPlayer, isBuildModeActive, setBuildModeActive, applyCosmetics
} from './player.js';
import { switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown, getCurrentWeapon, refreshAmmoForUpgrade } from './weapons.js';
import { createZombieEnemy, createDummyEnemy, updateEnemies, spawnWave } from './enemies.js';
import { initBuilding, setBuildMode, getCurrentBuildMode, clearBuildables } from './building.js';
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
scene.fog = new THREE.FogExp2(0x0a1030, 0.004);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.player.height, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Shadow settings ──────────────────────────────────────────────────────────
window.applyShadowSettings = (level) => {
    renderer.shadowMap.enabled = level !== 'off';
    mainLight.castShadow = level === 'high';
    mainLight.shadow.mapSize.width = level === 'high' ? 2048 : 512;
    mainLight.shadow.mapSize.height = level === 'high' ? 2048 : 512;
    renderer.shadowMap.needsUpdate = true;
};

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
mainLight.position.set(15, 25, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1;
mainLight.shadow.camera.far = 100;
mainLight.shadow.camera.left = -50;
mainLight.shadow.camera.right = 50;
mainLight.shadow.camera.top = 50;
mainLight.shadow.camera.bottom = -50;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x4466cc, 0.4);
fillLight.position.set(0, 10, 0);
scene.add(fillLight);

const backLight = new THREE.PointLight(0xffaa66, 0.3);
backLight.position.set(-5, 5, -10);
scene.add(backLight);

// ─── Ground ───────────────────────────────────────────────────────────────────
const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a2a3a, 
    roughness: 0.8, 
    metalness: 0.1 
});

const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.groundSize, CONFIG.world.groundSize),
    groundMat
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
groundPlane.position.y = -0.5;
scene.add(groundPlane);

const thickGround = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.world.groundSize, 1, CONFIG.world.groundSize),
    groundMat
);
thickGround.position.y = -1;
scene.add(thickGround);

// Grid helper with Fortnite-style appearance
const gridHelper = new THREE.GridHelper(
    CONFIG.world.groundSize,
    CONFIG.world.groundSize / CONFIG.world.tileSize,
    0x3366aa,
    0x223355
);
gridHelper.position.y = -0.4;
scene.add(gridHelper);

// ─── Player & UI ──────────────────────────────────────────────────────────────
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
let enemiesThisWave = 0;
let waveInProgress = false;

window.getCoins = () => playerCoins;
window.spendCoins = (amount) => {
    playerCoins -= amount;
    updateUI(playerHealth, playerShield, playerCoins);
};
window.setPaused = (val) => { paused = val; };

window.switchWeaponTo = (id) => {
    switchWeapon(id);
};

// ─── Game Mode Logic ──────────────────────────────────────────────────────────
window.startGame = (mode) => {
    window.gameStarted = true;
    CONFIG.gameMode = mode;
    
    // Clear existing enemies
    for (const enemy of enemies) {
        if (enemy.parent) enemy.parent.remove(enemy);
    }
    enemies = [];
    
    // Clear builds
    clearBuildables();
    
    // Reset player
    playerHealth = CONFIG.player.health;
    playerShield = CONFIG.player.shield;
    playerCoins = mode === 'practice' ? 1000 : 0; // Give coins in practice mode
    respawnPlayer();
    camera.position.set(0, CONFIG.player.height, 0);
    updateUI(playerHealth, playerShield, playerCoins);
    
    if (mode === 'zombies') {
        currentWave = 0;
        waveInProgress = false;
        startNextWave();
    } else if (mode === 'practice') {
        // Spawn practice dummies
        const dummyPositions = [
            [10, 0], [-10, 0], [0, 10], [0, -10],
            [20, 20], [-20, 20], [20, -20], [-20, -20]
        ];
        dummyPositions.forEach(([x, z]) => {
            const dummy = createDummyEnemy(x, z);
            enemies.push(dummy);
            scene.add(dummy);
        });
    }
    
    // Request pointer lock
    renderer.domElement.requestPointerLock();
};

function startNextWave() {
    if (CONFIG.gameMode !== 'zombies') return;
    
    currentWave++;
    waveInProgress = true;
    
    const playerPos = playerModel.position.clone();
    playerPos.y = CONFIG.player.height;
    
    enemiesThisWave = spawnWave(scene, enemies, currentWave, playerPos);
    updateWaveUI(currentWave, enemies.length);
    
    addKillFeed(`Wave ${currentWave} started! ${enemiesThisWave} zombies incoming!`);
}

function onEnemyKilled() {
    const reward = CONFIG.gameMode === 'zombies' 
        ? CONFIG.enemies.zombie.coinReward 
        : CONFIG.enemies.blob.coinReward;
    playerCoins += reward;
    updateUI(playerHealth, playerShield, playerCoins);
    
    if (CONFIG.gameMode === 'zombies') {
        addKillFeed(`Zombie eliminated! +${reward} coins`);
        updateWaveUI(currentWave, enemies.length);
        
        // Check if wave is complete
        if (enemies.length === 0 && waveInProgress) {
            waveInProgress = false;
            addKillFeed(`Wave ${currentWave} complete!`);
            
            // Small delay before next wave
            setTimeout(() => {
                if (CONFIG.gameMode === 'zombies') {
                    startNextWave();
                }
            }, 3000);
        }
    } else if (CONFIG.gameMode === 'practice') {
        // Respawn dummy after a delay
        setTimeout(() => {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            const dummy = createDummyEnemy(x, z);
            enemies.push(dummy);
            scene.add(dummy);
        }, 2000);
    }
}
window.onEnemyKilled = onEnemyKilled;

function applyDamage(amount) {
    let remaining = amount;
    if (playerShield > 0) {
        const sd = Math.min(playerShield, remaining);
        playerShield -= sd;
        remaining -= sd;
    }
    playerHealth -= remaining;
    updateUI(playerHealth, playerShield, playerCoins);
    showDamageFlash();

    if (playerHealth <= 0) {
        // Death
        addKillFeed(`You died on Wave ${currentWave}!`);
        playerHealth = CONFIG.player.health;
        playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        camera.position.set(0, CONFIG.player.height, 0);
        
        if (CONFIG.gameMode === 'zombies') {
            // Reset wave on death
            for (const enemy of enemies) {
                if (enemy.parent) enemy.parent.remove(enemy);
            }
            enemies = [];
            currentWave = 0;
            waveInProgress = false;
            setTimeout(() => startNextWave(), 2000);
        }
    }
}

// ─── Input ────────────────────────────────────────────────────────────────────
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
    // Shortcut menus
    if (e.code === 'KeyG') { openArmory(); }
    if (e.code === 'KeyL') { openLocker(); }
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) { rightMouseDown = true; e.preventDefault(); }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) { rightMouseDown = false; }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();
let lastTime = performance.now();
let lastFPSTime = performance.now();
let frameCount = 0;

function cleanupTrails() {
    const now = performance.now();
    for (let i = bulletTrails.length - 1; i >= 0; i--) {
        const t = bulletTrails[i];
        if (t?.parent && t.userData?.spawnTime && now - t.userData.spawnTime > 300) {
            scene.remove(t);
            bulletTrails.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    // FPS calculation
    frameCount++;
    if (now - lastFPSTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - lastFPSTime));
        updateFPS(fps);
        frameCount = 0;
        lastFPSTime = now;
    }

    if (paused || !window.gameStarted) {
        renderer.render(scene, camera);
        return;
    }

    // Scoping
    const wp = CONFIG.weapons[getCurrentWeapon()];
    if (rightMouseDown && !isScoped && wp.scopeZoom && !isBuildModeActive()) {
        isScoped = true;
        camera.fov = 75 / wp.scopeZoom;
        camera.updateProjectionMatrix();
        setScopedUI(true);
    }
    if ((!rightMouseDown || isBuildModeActive()) && isScoped) {
        isScoped = false;
        camera.fov = 75;
        camera.updateProjectionMatrix();
        setScopedUI(false);
    }

    const playerPos = updatePlayerMovement(camera, delta, null, isScoped);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta);

    // Kill zone
    if (playerPos.y < CONFIG.world.killY) {
        playerHealth = CONFIG.player.health;
        playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        camera.position.set(0, CONFIG.player.height, 0);
    }

    // Enemy contact damage (zombies only attack)
    if (CONFIG.gameMode === 'zombies') {
        for (const enemy of enemies) {
            if (enemy.userData.type !== 'zombie') continue;
            const ep = enemy.position.clone(); ep.y = 0;
            const pp = playerPos.clone(); pp.y = 0;
            if (pp.distanceTo(ep) < 1.5) {
                applyDamage(CONFIG.enemies.zombie.damageToPlayer * delta * 30);
                break;
            }
        }
    }

    // Shooting (only when not in build mode)
    if (mouseDown && document.pointerLockElement === renderer.domElement && !isBuildModeActive()) {
        shootWeapon(raycaster, camera, scene, enemies, (killed) => {
            if (killed) onEnemyKilled();
        }, bulletTrails);
    }

    cleanupTrails();
    renderer.render(scene, camera);
}

animate();

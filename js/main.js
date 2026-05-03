import * as THREE from 'three';
import { CONFIG } from './config.js';
import { 
    createPlayerModel, initPlayerControls, updatePlayerMovement, 
    updateGunVisuals, respawnPlayer, isBuildModeActive 
} from './player.js';
import { switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown, getCurrentWeapon } from './weapons.js';
import { createBlobEnemy, updateEnemies } from './enemies.js';
import { initBuilding } from './building.js';
import { createUI, updateUI, updateWeaponUI, showDamageFlash, setScopedUI, updateBuildModeUI } from './ui.js';

// Expose global functions
window.updateWeaponUI = updateWeaponUI;
window.showDamageFlash = showDamageFlash;
window.updateGunVisuals = updateGunVisuals;
window.onBuildModeToggle = updateBuildModeUI;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.player.height, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambient = new THREE.AmbientLight(0x404060);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 5);
dirLight.castShadow = true;
scene.add(dirLight);
const fillLight = new THREE.PointLight(0x445566, 0.5);
fillLight.position.set(0, 5, 0);
scene.add(fillLight);

// Ground
const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.groundSize, CONFIG.world.groundSize),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8, side: THREE.DoubleSide })
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
groundPlane.position.y = -0.5;
scene.add(groundPlane);

const thickGround = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.world.groundSize, 1, CONFIG.world.groundSize),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 })
);
thickGround.position.y = -1;
thickGround.receiveShadow = true;
scene.add(thickGround);

const grid = new THREE.GridHelper(CONFIG.world.groundSize, 40, 0x88aaff, 0x335588);
grid.position.y = -0.4;
scene.add(grid);

// Player
const playerModel = createPlayerModel(scene);
initPlayerControls(camera, renderer.domElement);
createUI();
initBuilding(scene, () => playerModel.position.clone());
updateGunVisuals('pistol');

// Enemies
let enemies = [];
for (let i = 0; i < 3; i++) {
    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    enemies.push(createBlobEnemy(x, z));
    scene.add(enemies[enemies.length - 1]);
}

// Player state
let playerHealth = CONFIG.player.health;
let playerShield = CONFIG.player.shield;
let playerCoins = 0;
let mouseDown = false;
let rightMouseDown = false;
let isScoped = false;
let bulletTrails = [];

function onEnemyKilled() {
    playerCoins += CONFIG.enemies.blob.coinReward;
    updateUI(playerHealth, playerShield, playerCoins);
    const x = (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 120;
    const newEnemy = createBlobEnemy(x, z);
    enemies.push(newEnemy);
    scene.add(newEnemy);
}
window.onEnemyKilled = onEnemyKilled;

function applyDamage(amount) {
    let remainingDamage = amount;
    if (playerShield > 0) {
        const shieldDamage = Math.min(playerShield, remainingDamage);
        playerShield -= shieldDamage;
        remainingDamage -= shieldDamage;
    }
    playerHealth -= remainingDamage;
    updateUI(playerHealth, playerShield, playerCoins);
    showDamageFlash();
    
    if (playerHealth <= 0) {
        playerHealth = CONFIG.player.health;
        playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        if (playerModel) playerModel.position.set(0, 0, 0);
        camera.position.set(0, CONFIG.player.height, 0);
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') switchWeapon('pistol');
    if (e.code === 'Digit2') switchWeapon('assault');
    if (e.code === 'Digit3') switchWeapon('sniper');
    if (e.code === 'Digit4') switchWeapon('shotgun');
    if (e.code === 'KeyR') reloadWeapon();
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) { rightMouseDown = true; e.preventDefault(); }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) { rightMouseDown = false; e.preventDefault(); }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();
let lastTime = performance.now();

function cleanupBulletTrails() {
    const now = performance.now();
    for (let i = bulletTrails.length - 1; i >= 0; i--) {
        const trail = bulletTrails[i];
        if (trail && trail.parent && trail.userData?.spawnTime) {
            if (now - trail.userData.spawnTime > 500) {
                scene.remove(trail);
                bulletTrails.splice(i, 1);
            }
        } else if (trail && trail.parent) {
            scene.remove(trail);
            bulletTrails.splice(i, 1);
        }
    }
}

// Game loop
function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    // Scoping
    const wp = CONFIG.weapons[getCurrentWeapon()];
    if (rightMouseDown && !isScoped && wp.scopeZoom) {
        isScoped = true;
        camera.fov = 75 / wp.scopeZoom;
        camera.updateProjectionMatrix();
        setScopedUI(true);
    }
    if (!rightMouseDown && isScoped) {
        isScoped = false;
        camera.fov = 75;
        camera.updateProjectionMatrix();
        setScopedUI(false);
    }
    
    const playerPos = updatePlayerMovement(camera, delta, null, isScoped);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta);
    
    // Fall damage / respawn
    if (playerPos.y < CONFIG.world.killY) {
        playerHealth = CONFIG.player.health;
        playerShield = CONFIG.player.shield;
        updateUI(playerHealth, playerShield, playerCoins);
        respawnPlayer();
        if (playerModel) playerModel.position.set(0, CONFIG.player.height / 2, 0);
        camera.position.set(0, CONFIG.player.height, 0);
    }
    
    // Enemy collision
    for (let enemy of enemies) {
        const enemyPos = enemy.position.clone();
        enemyPos.y = 0;
        if (playerPos.distanceTo(enemyPos) < 1.2) {
            const damage = CONFIG.enemies.blob.damageToPlayer * delta * 30;
            applyDamage(damage);
            break;
        }
    }
    
    // Shooting (only if not in build mode)
    if (mouseDown && document.pointerLockElement === renderer.domElement && !isBuildModeActive()) {
        shootWeapon(raycaster, camera, scene, enemies, (killed) => {
            if (killed) onEnemyKilled();
        }, bulletTrails);
    }
    
    cleanupBulletTrails();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { initPlayerControls, updatePlayerMovement } from './player.js';
import { initWeapons, switchWeapon, reloadWeapon, shootWeapon, updateWeaponCooldown } from './weapons.js';
import { createBlobEnemy, updateEnemies } from './enemies.js';
import { createUI, updateUI, updateWeaponUI, showDamageFlash } from './ui.js';

// Expose UI functions globally so weapons can call them
window.updateWeaponUI = updateWeaponUI;
window.showDamageFlash = showDamageFlash;

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.player.height, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
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
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.groundSize, CONFIG.world.groundSize),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(CONFIG.world.groundSize, 40, 0x88aaff, 0x335588);
grid.position.y = 0.01;
scene.add(grid);

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
let playerCoins = 0;
let mouseDown = false;

function onEnemyKilled() {
    playerCoins += CONFIG.enemies.blob.coinReward;
    updateUI(playerHealth, playerCoins);
    // respawn enemy somewhere else
    const x = (Math.random() - 0.5) * 120;
    const z = (Math.random() - 0.5) * 120;
    const newEnemy = createBlobEnemy(x, z);
    enemies.push(newEnemy);
    scene.add(newEnemy);
}
window.onEnemyKilled = onEnemyKilled;

// UI & controls
createUI();
initPlayerControls(camera, renderer.domElement);
initWeapons();

document.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') switchWeapon('pistol');
    if (e.code === 'Digit2') switchWeapon('assault');
    if (e.code === 'Digit3') switchWeapon('sniper');
    if (e.code === 'Digit4') switchWeapon('shotgun');
    if (e.code === 'KeyR') reloadWeapon();
});
document.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

const raycaster = new THREE.Raycaster();
let lastTime = performance.now();

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    const playerPos = updatePlayerMovement(camera, delta);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, playerPos, delta);
    
    // Enemy collision damage
    for (let i = 0; i < enemies.length; i++) {
        const enemyPos = enemies[i].position.clone();
        enemyPos.y = 0;
        const dist = playerPos.distanceTo(enemyPos);
        if (dist < 1.2) {
            playerHealth -= CONFIG.enemies.blob.damageToPlayer * delta * 30;
            updateUI(playerHealth, playerCoins);
            showDamageFlash();
            if (playerHealth <= 0) {
                alert('You died — respawning');
                playerHealth = CONFIG.player.health;
                updateUI(playerHealth, playerCoins);
            }
            break;
        }
    }
    
    if (mouseDown && document.pointerLockElement === renderer.domElement) {
        shootWeapon(raycaster, camera, scene, enemies, (killed) => {
            if (killed) onEnemyKilled();
        });
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

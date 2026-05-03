// js/main.js
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { initPlayerControls, updatePlayerMovement } from './player.js';
import { initWeapons, shoot, updateWeaponCooldown, switchWeapon, reload } from './weapons.js';
import { createBlobEnemy, updateEnemies } from './enemies.js';
import { updateUIElement, showDamageFlash } from './utils.js';

// Setup scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, GAME_CONFIG.player.height, 0);
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
dirLight.receiveShadow = false;
scene.add(dirLight);
const fillLight = new THREE.PointLight(0x445566, 0.5);
fillLight.position.set(0, 5, 0);
scene.add(fillLight);

// Ground
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8, metalness: 0.1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GAME_CONFIG.world.groundSize, GAME_CONFIG.world.groundSize), groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper (1v1.lol style)
const gridHelper = new THREE.GridHelper(GAME_CONFIG.world.groundSize, 40, 0x88aaff, 0x335588);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Walls (invisible collision later, for now visual)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a });
const wallHeight = GAME_CONFIG.world.wallHeight;
const wallOffset = GAME_CONFIG.world.groundSize/2;
const wallThick = 1;
const walls = [
    { pos: [0, wallHeight/2, -wallOffset], size: [GAME_CONFIG.world.groundSize, wallHeight, wallThick] },
    { pos: [0, wallHeight/2, wallOffset], size: [GAME_CONFIG.world.groundSize, wallHeight, wallThick] },
    { pos: [-wallOffset, wallHeight/2, 0], size: [wallThick, wallHeight, GAME_CONFIG.world.groundSize] },
    { pos: [wallOffset, wallHeight/2, 0], size: [wallThick, wallHeight, GAME_CONFIG.world.groundSize] }
];
walls.forEach(w => {
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
    wallMesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);
});

// Enemies
let enemies = [];
for (let i = 0; i < 3; i++) {
    let x = (Math.random() - 0.5) * 80;
    let z = (Math.random() - 0.5) * 80;
    enemies.push(createBlobEnemy(x, z));
    scene.add(enemies[enemies.length-1]);
}

// UI elements (create if not exist)
const hudDiv = document.createElement('div');
hudDiv.className = 'hud';
hudDiv.innerHTML = `
    <div class="hud-panel">❤️ <span id="healthVal">100</span>  💰 <span id="coinVal">0</span></div>
    <div class="hud-panel">🔫 <span id="weaponName">Pistol</span>  📦 <span id="weaponAmmo">15</span></div>
`;
document.body.appendChild(hudDiv);
const weaponPanel = document.createElement('div');
weaponPanel.className = 'weapon-panel';
weaponPanel.innerHTML = `1 Pistol | 2 AR | 3 Sniper | 4 Shotgun | R Reload`;
document.body.appendChild(weaponPanel);
const crosshairDiv = document.createElement('div');
crosshairDiv.className = 'crosshair-container';
crosshairDiv.innerHTML = '<div class="crosshair"></div>';
document.body.appendChild(crosshairDiv);
const flashDiv = document.createElement('div');
flashDiv.id = 'damageFlash';
flashDiv.className = 'damage-flash';
document.body.appendChild(flashDiv);

// Input handling
let playerCoins = 0;
let playerHealth = GAME_CONFIG.player.health;

function updateUI() {
    updateUIElement('healthVal', Math.max(0, playerHealth));
    updateUIElement('coinVal', playerCoins);
}

// Weapon switching
document.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') switchWeapon('pistol');
    if (e.code === 'Digit2') switchWeapon('assault');
    if (e.code === 'Digit3') switchWeapon('sniper');
    if (e.code === 'Digit4') switchWeapon('shotgun');
    if (e.code === 'KeyR') reload();
});

// Raycaster
const raycaster = new THREE.Raycaster();

// Game loop
let lastTime = performance.now();
function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    updatePlayerMovement(camera, delta);
    updateWeaponCooldown(delta);
    updateEnemies(enemies, camera.position);
    
    // Check enemy collision & damage
    const playerPos = camera.position.clone();
    playerPos.y = 0;
    for (let i=0; i<enemies.length; i++) {
        const enemyPos = enemies[i].position.clone();
        enemyPos.y = 0;
        if (playerPos.distanceTo(enemyPos) < 1.2) {
            playerHealth -= GAME_CONFIG.enemies.blob.damageToPlayer;
            updateUI();
            showDamageFlash();
            if (playerHealth <= 0) {
                alert("You died! Reloading.");
                playerHealth = GAME_CONFIG.player.health;
                updateUI();
            }
            // knockback later
            break;
        }
    }
    
    // Shooting
    if (renderer.domElement === document.pointerLockElement && mouseDown) {
        shoot(raycaster, camera, scene, enemies, () => {
            // on hit callback ( add coins if kill)
        });
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

let mouseDown = false;
document.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

// Lock pointer on click
renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});
initPlayerControls(camera, renderer);
initWeapons();
updateUI();
animate();

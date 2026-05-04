import { CONFIG, SETTINGS, COSMETICS, applyUpgrades } from './config.js';
import { keybinds, setKeybind, getKeybindLabel } from './keybinds.js';

// ===== UI CREATION =====
export function createUI() {
    // Health/Shield bars (bottom left)
    const hudContainer = document.createElement('div');
    hudContainer.className = 'hud-container';
    hudContainer.innerHTML = `
        <div class="shield-bar-wrapper">
            <div class="bar-icon">🛡</div>
            <div class="bar-container"><div class="bar-fill shield-fill" id="shieldFill" style="width:100%"></div><span class="bar-text" id="shieldValue">100</span></div>
        </div>
        <div class="health-bar-wrapper">
            <div class="bar-icon">❤</div>
            <div class="bar-container"><div class="bar-fill health-fill" id="healthFill" style="width:100%"></div><span class="bar-text" id="healthValue">100</span></div>
        </div>
    `;
    document.body.appendChild(hudContainer);

    // Weapon & Build hotbar (bottom center)
    const weaponContainer = document.createElement('div');
    weaponContainer.className = 'weapon-container';
    weaponContainer.innerHTML = `
        <div class="weapon-slots" id="weaponSlots">
            <div class="weapon-slot active" data-weapon="pistol" data-key="1"><span class="weapon-slot-key">1</span><div class="weapon-slot-icon">${getPistolIcon()}</div><span class="weapon-slot-ammo" id="ammo-pistol">15</span></div>
            <div class="weapon-slot" data-weapon="assault" data-key="2"><span class="weapon-slot-key">2</span><div class="weapon-slot-icon">${getAssaultIcon()}</div><span class="weapon-slot-ammo" id="ammo-assault">30</span></div>
            <div class="weapon-slot" data-weapon="sniper" data-key="3"><span class="weapon-slot-key">3</span><div class="weapon-slot-icon">${getSniperIcon()}</div><span class="weapon-slot-ammo" id="ammo-sniper">5</span></div>
            <div class="weapon-slot" data-weapon="shotgun" data-key="4"><span class="weapon-slot-key">4</span><div class="weapon-slot-icon">${getShotgunIcon()}</div><span class="weapon-slot-ammo" id="ammo-shotgun">6</span></div>
        </div>
        <div class="build-slots" id="buildSlots">
            <div class="build-slot" data-build="wall"><span class="build-slot-key">Z</span><svg class="build-slot-icon" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/><line x1="8" y1="32" x2="56" y2="32" stroke="#4a88a4" stroke-width="2"/><line x1="32" y1="8" x2="32" y2="56" stroke="#4a88a4" stroke-width="2"/></svg></div>
            <div class="build-slot" data-build="ramp"><span class="build-slot-key">X</span><svg class="build-slot-icon" viewBox="0 0 64 64"><polygon points="8,56 56,56 56,16" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/><line x1="20" y1="56" x2="56" y2="28" stroke="#4a88a4" stroke-width="2"/><line x1="36" y1="56" x2="56" y2="40" stroke="#4a88a4" stroke-width="2"/></svg></div>
            <div class="build-slot" data-build="floor"><span class="build-slot-key">C</span><svg class="build-slot-icon" viewBox="0 0 64 64"><rect x="4" y="24" width="56" height="16" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/><line x1="20" y1="24" x2="20" y2="40" stroke="#4a88a4" stroke-width="2"/><line x1="44" y1="24" x2="44" y2="40" stroke="#4a88a4" stroke-width="2"/></svg></div>
            <div class="build-slot" data-build="cone"><span class="build-slot-key">V</span><svg class="build-slot-icon" viewBox="0 0 64 64"><polygon points="32,8 8,56 56,56" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/><line x1="32" y1="8" x2="32" y2="56" stroke="#4a88a4" stroke-width="2"/></svg></div>
        </div>
    `;
    document.body.appendChild(weaponContainer);

    // Build mode indicator
    const buildIndicator = document.createElement('div');
    buildIndicator.id = 'buildModeIndicator';
    buildIndicator.className = 'build-mode-indicator';
    buildIndicator.innerHTML = `<span class="build-mode-text">🔨 BUILD MODE</span><span class="build-mode-hint">Q to toggle | E or LMB to place</span>`;
    document.body.appendChild(buildIndicator);

    // Flashlight & Cave indicators
    const flashInd = document.createElement('div');
    flashInd.id = 'flashlightIndicator';
    flashInd.className = 'flashlight-indicator hidden';
    flashInd.innerHTML = '🔦 FLASHLIGHT ON';
    document.body.appendChild(flashInd);

    const caveInd = document.createElement('div');
    caveInd.id = 'caveIndicator';
    caveInd.className = 'cave-indicator hidden';
    caveInd.innerHTML = '🦇 DARK CAVE 🦇';
    document.body.appendChild(caveInd);

    // Coins, FPS, Crosshair, Damage flash, Wave, Kill feed
    const coinsDiv = document.createElement('div');
    coinsDiv.className = 'coins-display';
    coinsDiv.innerHTML = '💰 <span id="coinVal">0</span>';
    document.body.appendChild(coinsDiv);

    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fpsCounter';
    fpsDiv.className = 'fps-counter hidden';
    document.body.appendChild(fpsDiv);

    const crossDiv = document.createElement('div');
    crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = `<div class="crosshair" id="crosshairEl"><div class="ch-left"></div><div class="ch-right"></div><div class="ch-dot"></div></div>`;
    document.body.appendChild(crossDiv);

    const flashDiv = document.createElement('div');
    flashDiv.id = 'damageFlash';
    flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);

    const waveDiv = document.createElement('div');
    waveDiv.id = 'waveIndicator';
    waveDiv.className = 'wave-indicator hidden';
    waveDiv.innerHTML = `<span class="wave-number">WAVE <span id="waveNum">1</span></span><span class="wave-enemies">Enemies: <span id="enemyCount">0</span></span>`;
    document.body.appendChild(waveDiv);

    const killFeed = document.createElement('div');
    killFeed.id = 'killFeed';
    killFeed.className = 'kill-feed';
    document.body.appendChild(killFeed);

    // Event listeners for hotbar
    document.querySelectorAll('.weapon-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const weapon = slot.dataset.weapon;
            if (window.switchWeaponTo) window.switchWeaponTo(weapon);
        });
    });
    document.querySelectorAll('.build-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const build = slot.dataset.build;
            if (window.setBuildMode) window.setBuildMode(build);
        });
    });

    // Build menus and lobby
    buildSettingsMenu();
    buildArmoryMenu();
    buildLockerMenu();
    buildLobbyScreen();
}

// ===== GUN ICONS =====
function getPistolIcon() {
    return `<svg class="weapon-svg" viewBox="0 0 64 64"><rect x="20" y="28" width="28" height="12" rx="2" fill="#4a4a52" stroke="#2a2a32" stroke-width="2"/><rect x="40" y="26" width="12" height="16" rx="1" fill="#3a3a42" stroke="#2a2a32" stroke-width="2"/><rect x="16" y="30" width="6" height="8" rx="1" fill="#5a5a62" stroke="#2a2a32" stroke-width="1.5"/><circle cx="48" cy="32" r="2" fill="#888" stroke="#2a2a32"/></svg>`;
}
function getAssaultIcon() {
    return `<svg class="weapon-svg" viewBox="0 0 64 64"><rect x="15" y="26" width="35" height="14" rx="2" fill="#4a4a52" stroke="#2a2a32" stroke-width="2"/><rect x="42" y="22" width="14" height="22" rx="1" fill="#3a3a42" stroke="#2a2a32" stroke-width="2"/><rect x="12" y="28" width="6" height="10" rx="1" fill="#5a5a62" stroke="#2a2a32"/><rect x="18" y="36" width="25" height="3" fill="#2a2a32"/><rect x="28" y="38" width="12" height="8" rx="1" fill="#3a3a42" stroke="#2a2a32"/></svg>`;
}
function getSniperIcon() {
    return `<svg class="weapon-svg" viewBox="0 0 64 64"><rect x="12" y="28" width="40" height="10" rx="2" fill="#4a5a4a" stroke="#2a3a2a" stroke-width="2"/><rect x="44" y="22" width="16" height="22" rx="2" fill="#3a4a3a" stroke="#2a3a2a" stroke-width="2"/><circle cx="36" cy="29" r="4" fill="#88aaff" stroke="#2a3a2a" stroke-width="1.5"/><circle cx="36" cy="29" r="1.5" fill="#2266aa"/></svg>`;
}
function getShotgunIcon() {
    return `<svg class="weapon-svg" viewBox="0 0 64 64"><rect x="18" y="28" width="30" height="12" rx="2" fill="#5a4a3a" stroke="#3a2a1a" stroke-width="2"/><rect x="40" y="24" width="14" height="20" rx="1" fill="#4a3a2a" stroke="#3a2a1a" stroke-width="2"/><rect x="14" y="30" width="6" height="8" rx="1" fill="#6a5a4a" stroke="#3a2a1a"/><circle cx="20" cy="32" r="3" fill="#8a6a4a"/><circle cx="28" cy="32" r="3" fill="#8a6a4a"/></svg>`;
}

// ===== UI UPDATE FUNCTIONS =====
export function updateUI(health, shield, coins) {
    const healthFill = document.getElementById('healthFill');
    if (healthFill) healthFill.style.width = Math.max(0, health) + '%';
    const healthVal = document.getElementById('healthValue');
    if (healthVal) healthVal.innerText = Math.floor(health);
    const shieldFill = document.getElementById('shieldFill');
    if (shieldFill) shieldFill.style.width = Math.max(0, shield) + '%';
    const shieldVal = document.getElementById('shieldValue');
    if (shieldVal) shieldVal.innerText = Math.floor(shield);
    const coinSpan = document.getElementById('coinVal');
    if (coinSpan) coinSpan.innerText = coins;
}

export function updateWeaponUI(weaponId, ammo, isReloading) {
    document.querySelectorAll('.weapon-slot').forEach(slot => slot.classList.toggle('active', slot.dataset.weapon === weaponId));
    const ammoEl = document.getElementById(`ammo-${weaponId}`);
    if (ammoEl) ammoEl.innerText = isReloading ? '...' : ammo;
}

export function updateBuildSlots(activeMode) {
    document.querySelectorAll('.build-slot').forEach(slot => slot.classList.toggle('active', slot.dataset.build === activeMode));
}

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (flash) {
        flash.style.backgroundColor = 'rgba(255,0,0,0.4)';
        setTimeout(() => flash.style.backgroundColor = 'rgba(255,0,0,0)', 150);
    }
}

export function showHitMarker() {
    const crosshair = document.getElementById('crosshairEl');
    if (crosshair) {
        crosshair.style.transform = 'scale(1.3)';
        crosshair.style.filter = 'brightness(2)';
        setTimeout(() => {
            crosshair.style.transform = 'scale(1)';
            crosshair.style.filter = 'none';
        }, 100);
    }
}

export function setScopedUI(isScoped) {
    const container = document.querySelector('.crosshair-container');
    if (container) container.classList.toggle('scoped', isScoped);
}

export function updateBuildModeUI(active) {
    const indicator = document.getElementById('buildModeIndicator');
    if (indicator) indicator.classList.toggle('active', active);
}

export function updateFlashlightUI(active) {
    const indicator = document.getElementById('flashlightIndicator');
    if (indicator) indicator.classList.toggle('hidden', !active);
}

export function updateCaveIndicatorUI(inCave) {
    const indicator = document.getElementById('caveIndicator');
    if (indicator) indicator.classList.toggle('hidden', !inCave);
}

export function updateFPS(fps) {
    const el = document.getElementById('fpsCounter');
    if (el && SETTINGS.fpsCounter) {
        el.classList.remove('hidden');
        el.innerText = fps + ' FPS';
    } else if (el) el.classList.add('hidden');
}

export function updateWaveUI(wave, enemyCount) {
    const el = document.getElementById('waveIndicator');
    if (el) {
        el.classList.remove('hidden');
        const waveNum = document.getElementById('waveNum');
        const enemyCountSpan = document.getElementById('enemyCount');
        if (waveNum) waveNum.innerText = wave;
        if (enemyCountSpan) enemyCountSpan.innerText = enemyCount;
    }
}

export function addKillFeed(message) {
    const feed = document.getElementById('killFeed');
    if (feed) {
        const item = document.createElement('div');
        item.className = 'kill-item';
        item.innerText = message;
        feed.appendChild(item);
        setTimeout(() => item.remove(), 3000);
    }
}

export function updateTimeOfDayUI(timeOfDay, isNight) {
    let div = document.getElementById('timeOfDayUI');
    if (!div) {
        div = document.createElement('div');
        div.id = 'timeOfDayUI';
        div.style.cssText = 'position:fixed; top:80px; left:20px; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); border-radius:20px; padding:6px 16px; font-size:12px; font-weight:bold; color:#ffdd88; z-index:20;';
        document.body.appendChild(div);
    }
    const hour = Math.floor(timeOfDay * 24);
    const minute = Math.floor((timeOfDay * 24 - hour) * 60);
    div.innerHTML = `${isNight ? '🌙' : '☀️'} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// ===== LOBBY SCREEN (Fortnite Style) =====
let lobbyScene, lobbyCamera, lobbyRenderer, lobbyCharacter;
let lobbyAnimationId;

function buildLobbyScreen() {
    if (document.getElementById('lobbyScreen')) return;
    
    const lobby = document.createElement('div');
    lobby.id = 'lobbyScreen';
    lobby.className = 'lobby-screen';
    lobby.innerHTML = `
        <div class="lobby-background"></div>
        <div class="lobby-content">
            <div class="lobby-left">
                <div class="lobby-logo">
                    <h1>PATAPIM ARENA</h1>
                    <p>SEASON 1</p>
                </div>
                <div class="lobby-stats">
                    <div class="stat"><span>🏆</span> 0<span> Wins</span></div>
                    <div class="stat"><span>💀</span> 0<span> Kills</span></div>
                    <div class="stat"><span>⭐</span> 0<span> Level</span></div>
                </div>
                <div class="lobby-friends">
                    <div class="friends-header">🎮 FRIENDS ONLINE <span>0</span></div>
                    <div class="friends-list" id="friendsList">
                        <div class="friend">🔴 <strong>t203Korra</strong> <span class="friend-status">Leader</span></div>
                        <div class="friend">🟢 <strong>FPDeyy</strong> <span class="friend-status">Party</span></div>
                        <div class="friend">🟢 <strong>203Korra</strong> <span class="friend-status">Party</span></div>
                        <div class="friend">🟢 <strong>VECTIMXTT</strong> <span class="friend-status">Party</span></div>
                    </div>
                </div>
            </div>
            <div class="lobby-center">
                <div class="lobby-character-container" id="lobbyCharacterContainer"></div>
                <div class="lobby-username">PATAPIM</div>
            </div>
            <div class="lobby-right">
                <div class="lobby-party">
                    <div class="party-code">PARTY CODE: <span id="partyCode">USQRNR</span> <button id="copyCodeBtn" class="copy-btn">📋</button></div>
                    <button class="leave-btn">Leave</button>
                </div>
                <div class="lobby-menu-buttons">
                    <button class="menu-btn" id="lobbyLockerBtn">👕 LOCKER</button>
                    <button class="menu-btn" id="lobbyShopBtn">🛒 SHOP</button>
                    <button class="menu-btn" id="lobbyBattlePassBtn">⭐ BATTLE PASS</button>
                    <button class="menu-btn" id="lobbySettingsBtn">⚙️ SETTINGS</button>
                    <button class="menu-btn" id="lobbyArmoryBtn">🔫 ARMORY</button>
                </div>
                <div class="lobby-play">
                    <button class="play-btn" id="playBtn">▶ PLAY!</button>
                    <div class="mode-select" id="modeSelect" style="display:none">
                        <button class="mode-option" data-mode="zombies">🧟 ZOMBIES</button>
                        <button class="mode-option" data-mode="practice">🎯 PRACTICE</button>
                        <button class="mode-option disabled">🏆 BATTLE ROYALE (SOON)</button>
                    </div>
                </div>
                <div class="lobby-store-buttons">
                    <button class="store-btn">📱 Download on the App Store</button>
                    <button class="store-btn">▶️ GET IT ON Google Play</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(lobby);
    
    // Setup 3D character preview
    setupLobbyCharacter();
    
    // Event listeners
    document.getElementById('lobbySettingsBtn')?.addEventListener('click', () => openSettings());
    document.getElementById('lobbyArmoryBtn')?.addEventListener('click', () => openArmory());
    document.getElementById('lobbyLockerBtn')?.addEventListener('click', () => openLocker());
    document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
        const code = document.getElementById('partyCode')?.innerText;
        if (code) navigator.clipboard.writeText(code);
        addKillFeed('Party code copied!');
    });
    document.getElementById('playBtn')?.addEventListener('click', () => {
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect) modeSelect.style.display = modeSelect.style.display === 'none' ? 'flex' : 'none';
    });
    document.querySelectorAll('.mode-option:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode && window.startGame) window.startGame(mode);
        });
    });
    
    showLobby();
}

function setupLobbyCharacter() {
    const container = document.getElementById('lobbyCharacterContainer');
    if (!container) return;
    
    lobbyScene = new THREE.Scene();
    lobbyScene.background = new THREE.Color(0x0a0a2a);
    
    lobbyCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    lobbyCamera.position.set(0, 1.5, 3);
    lobbyCamera.lookAt(0, 1, 0);
    
    lobbyRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    lobbyRenderer.setSize(300, 400);
    lobbyRenderer.setClearColor(0x0a0a2a);
    container.appendChild(lobbyRenderer.domElement);
    
    // Lighting for lobby character
    const ambient = new THREE.AmbientLight(0x404060);
    lobbyScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 5, 3);
    lobbyScene.add(dirLight);
    const backLight = new THREE.PointLight(0x4466aa, 0.5);
    backLight.position.set(0, 2, -2);
    lobbyScene.add(backLight);
    
    // Create a simple stylized character for lobby
    const characterGroup = new THREE.Group();
    
    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6da3d4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), bodyMat);
    body.position.y = 0.85;
    characterGroup.add(body);
    
    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfdd7a8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), headMat);
    head.position.y = 1.65;
    characterGroup.add(head);
    
    // Visor
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, emissive: 0x335599 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.05), visorMat);
    visor.position.set(0, 1.64, 0.33);
    characterGroup.add(visor);
    
    // Legs
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a3550 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), pantsMat);
    leftLeg.position.set(-0.18, 0.45, 0);
    characterGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), pantsMat);
    rightLeg.position.set(0.18, 0.45, 0);
    characterGroup.add(rightLeg);
    
    lobbyCharacter = characterGroup;
    lobbyScene.add(lobbyCharacter);
    
    // Add floating particles
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        particlePositions[i * 3] = (Math.random() - 0.5) * 10;
        particlePositions[i * 3 + 1] = Math.random() * 4;
        particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x44aaff, size: 0.05 });
    const particles = new THREE.Points(particleGeometry, particleMat);
    lobbyScene.add(particles);
    
    // Animate lobby character
    let time = 0;
    function animateLobby() {
        requestAnimationFrame(animateLobby);
        time += 0.01;
        if (lobbyCharacter) {
            lobbyCharacter.rotation.y = Math.sin(time) * 0.3;
            lobbyCharacter.position.y = Math.sin(time * 1.5) * 0.02;
        }
        if (lobbyRenderer && lobbyCamera) {
            lobbyRenderer.render(lobbyScene, lobbyCamera);
        }
    }
    animateLobby();
}

export function updateLobbyCharacterColor(colors) {
    if (!lobbyCharacter) return;
    lobbyCharacter.children.forEach(child => {
        if (child.isMesh) {
            if (child.position.y > 1.5) child.material.color.set(colors.skin || 0xfdd7a8);
            else if (child.position.y < 0.7) child.material.color.set(colors.pants || 0x1a3550);
            else child.material.color.set(colors.shirt || 0x6da3d4);
        }
    });
}

export function showLobby() {
    const lobby = document.getElementById('lobbyScreen');
    if (lobby) lobby.classList.remove('hidden');
    const hud = document.querySelector('.hud-container');
    const weapon = document.querySelector('.weapon-container');
    const coins = document.querySelector('.coins-display');
    const cross = document.querySelector('.crosshair-container');
    if (hud) hud.style.display = 'none';
    if (weapon) weapon.style.display = 'none';
    if (coins) coins.style.display = 'none';
    if (cross) cross.style.display = 'none';
}

export function hideLobby() {
    const lobby = document.getElementById('lobbyScreen');
    if (lobby) lobby.classList.add('hidden');
    const hud = document.querySelector('.hud-container');
    const weapon = document.querySelector('.weapon-container');
    const coins = document.querySelector('.coins-display');
    const cross = document.querySelector('.crosshair-container');
    if (hud) hud.style.display = 'flex';
    if (weapon) weapon.style.display = 'flex';
    if (coins) coins.style.display = 'block';
    if (cross) cross.style.display = 'block';
}

// ===== SETTINGS MENU =====
let settingsOpen = false;
let rebindTarget = null;

function buildSettingsMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window">
            <div class="menu-title">SETTINGS</div>
            <div class="settings-tabs">
                <button class="tab-btn active" data-tab="controls">Controls</button>
                <button class="tab-btn" data-tab="keybinds">Keybinds</button>
                <button class="tab-btn" data-tab="graphics">Graphics</button>
                <button class="tab-btn" data-tab="audio">Audio</button>
            </div>
            <div class="tab-content" id="tab-controls">
                <div class="setting-row"><label>Mouse Sensitivity</label><input type="range" min="5" max="200" value="100" id="sensitivitySlider"><span id="sensitivityVal">1.0x</span></div>
                <div class="setting-row"><label>Scope Sensitivity</label><input type="range" min="10" max="100" value="50" id="scopeSensSlider"><span id="scopeSensVal">0.5x</span></div>
                <div class="setting-row"><label>Invert Y</label><button class="toggle-btn" id="invertYBtn">OFF</button></div>
            </div>
            <div class="tab-content hidden" id="tab-keybinds"><div class="keybinds-grid" id="keybindsGrid"></div><div class="rebind-hint" id="rebindHint" style="display:none">Press any key to rebind...</div></div>
            <div class="tab-content hidden" id="tab-graphics">
                <div class="setting-row"><label>Shadows</label><div class="btn-group"><button class="opt-btn" data-val="off">Off</button><button class="opt-btn" data-val="low">Low</button><button class="opt-btn active" data-val="high">High</button></div></div>
                <div class="setting-row"><label>FPS Counter</label><button class="toggle-btn" id="fpsBtn">OFF</button></div>
                <div class="setting-row"><label>Crosshair Color</label><input type="color" id="crosshairColorPicker" value="#ffffff"></div>
            </div>
            <div class="tab-content hidden" id="tab-audio">
                <div class="setting-row"><label>Master Volume</label><input type="range" min="0" max="100" value="80" id="masterVolSlider"><span id="masterVolVal">80</span></div>
                <div class="setting-row"><label>SFX Volume</label><input type="range" min="0" max="100" value="100" id="sfxVolSlider"><span id="sfxVolVal">100</span></div>
            </div>
            <div class="menu-footer"><button class="menu-btn primary" id="closeSettings">Resume</button></div>
        </div>`;
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            overlay.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab)?.classList.remove('hidden');
        });
    });
    
    populateKeybindsGrid();
    
    document.getElementById('sensitivitySlider')?.addEventListener('input', (e) => { SETTINGS.sensitivity = e.target.value / 100; document.getElementById('sensitivityVal').innerText = SETTINGS.sensitivity.toFixed(1) + 'x'; });
    document.getElementById('scopeSensSlider')?.addEventListener('input', (e) => { SETTINGS.scopeSensitivity = e.target.value / 100; document.getElementById('scopeSensVal').innerText = SETTINGS.scopeSensitivity.toFixed(2) + 'x'; });
    document.getElementById('invertYBtn')?.addEventListener('click', (e) => { SETTINGS.invertY = !SETTINGS.invertY; e.target.innerText = SETTINGS.invertY ? 'ON' : 'OFF'; e.target.classList.toggle('active', SETTINGS.invertY); });
    
    overlay.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SETTINGS.shadows = btn.dataset.val;
            if (window.applyShadowSettings) window.applyShadowSettings(SETTINGS.shadows);
        });
    });
    document.getElementById('fpsBtn')?.addEventListener('click', (e) => { SETTINGS.fpsCounter = !SETTINGS.fpsCounter; e.target.innerText = SETTINGS.fpsCounter ? 'ON' : 'OFF'; e.target.classList.toggle('active', SETTINGS.fpsCounter); });
    document.getElementById('crosshairColorPicker')?.addEventListener('input', (e) => { SETTINGS.crosshairColor = e.target.value; const ch = document.getElementById('crosshairEl'); if (ch) { ch.querySelectorAll('div').forEach(el => el.style.background = SETTINGS.crosshairColor); } });
    document.getElementById('masterVolSlider')?.addEventListener('input', (e) => { SETTINGS.masterVolume = e.target.value / 100; document.getElementById('masterVolVal').innerText = e.target.value; });
    document.getElementById('sfxVolSlider')?.addEventListener('input', (e) => { SETTINGS.sfxVolume = e.target.value / 100; document.getElementById('sfxVolVal').innerText = e.target.value; });
    document.getElementById('closeSettings')?.addEventListener('click', closeSettings);
}

function populateKeybindsGrid() {
    const grid = document.getElementById('keybindsGrid');
    if (!grid) return;
    const actions = [
        ['forward', 'Forward'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'],
        ['jump', 'Jump'], ['sprint', 'Sprint'], ['reload', 'Reload'],
        ['weapon1', 'Weapon 1'], ['weapon2', 'Weapon 2'], ['weapon3', 'Weapon 3'], ['weapon4', 'Weapon 4'],
        ['buildToggle', 'Build Mode'], ['pickaxe', 'Pickaxe']
    ];
    grid.innerHTML = '';
    actions.forEach(([action, label]) => {
        const row = document.createElement('div');
        row.className = 'keybind-row';
        row.innerHTML = `<span class="kb-label">${label}</span><button class="kb-btn" data-action="${action}">${getKeybindLabel(action)}</button>`;
        row.querySelector('.kb-btn').addEventListener('click', (e) => {
            if (rebindTarget) document.querySelector(`.kb-btn[data-action="${rebindTarget}"]`)?.classList.remove('rebinding');
            rebindTarget = action;
            e.target.classList.add('rebinding');
            e.target.innerText = '...';
            document.getElementById('rebindHint').style.display = 'block';
        });
        grid.appendChild(row);
    });
    document.addEventListener('keydown', (e) => {
        if (!rebindTarget) return;
        e.preventDefault();
        setKeybind(rebindTarget, e.code);
        const btn = document.querySelector(`.kb-btn[data-action="${rebindTarget}"]`);
        if (btn) { btn.innerText = getKeybindLabel(rebindTarget); btn.classList.remove('rebinding'); }
        document.getElementById('rebindHint').style.display = 'none';
        rebindTarget = null;
    }, { capture: true });
}

export function openSettings() { if (settingsOpen) return; settingsOpen = true; document.getElementById('settingsOverlay')?.classList.remove('hidden'); document.exitPointerLock(); if (window.setPaused) window.setPaused(true); }
export function closeSettings() { settingsOpen = false; document.getElementById('settingsOverlay')?.classList.add('hidden'); if (window.setPaused) window.setPaused(false); }
export function isSettingsOpen() { return settingsOpen; }

// ===== ARMORY =====
let armoryOpen = false;

function buildArmoryMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'armoryOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `<div class="menu-window"><div class="menu-title">ARMORY</div><div id="armoryWeaponList" style="display:flex; gap:10px; justify-content:center; margin-bottom:20px"></div><div id="armoryUpgradePanel" style="min-height:200px"></div><div class="menu-footer"><button class="menu-btn" id="closeArmory">Close</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('closeArmory')?.addEventListener('click', closeArmory);
}

function buildArmoryWeaponList() {
    const list = document.getElementById('armoryWeaponList');
    if (!list) return;
    list.innerHTML = '';
    const weapons = ['pistol', 'assault', 'sniper', 'shotgun'];
    weapons.forEach(wid => {
        const btn = document.createElement('button');
        btn.style.cssText = 'background:rgba(255,255,255,0.1); border:1px solid #00c8ff; border-radius:10px; padding:10px 20px; color:#fff; cursor:pointer';
        btn.innerText = CONFIG.weapons[wid].name;
        btn.onclick = () => showWeaponUpgrades(wid);
        list.appendChild(btn);
    });
}

function showWeaponUpgrades(wid) {
    const panel = document.getElementById('armoryUpgradePanel');
    if (!panel) return;
    const upgrades = CONFIG.armoryUpgrades?.[wid];
    const state = CONFIG.upgradeState[wid];
    if (!upgrades) { panel.innerHTML = '<div style="color:#888">No upgrades available</div>'; return; }
    panel.innerHTML = `<div style="font-size:20px; margin-bottom:15px">${CONFIG.weapons[wid].name} Upgrades</div>`;
    Object.entries(upgrades).forEach(([key, upg]) => {
        const tier = state[key];
        const maxTier = upg.levels.length - 1;
        const nextCost = tier < maxTier ? upg.costs[tier] : null;
        panel.innerHTML += `
            <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:10px; margin-bottom:10px">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span>${upg.label}: ${CONFIG.weapons[wid][upg.stat]} → ${tier < maxTier ? upg.levels[tier + 1] : 'MAX'}</span>
                    ${nextCost ? `<button class="upgrade-btn" data-weapon="${wid}" data-key="${key}">Upgrade - 💰${nextCost}</button>` : '<span style="color:#0f0">MAX</span>'}
                </div>
            </div>`;
    });
    panel.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const w = btn.dataset.weapon, k = btn.dataset.key;
            const cost = CONFIG.armoryUpgrades[w][k].costs[CONFIG.upgradeState[w][k]];
            if (window.getCoins?.() < cost) { btn.innerText = 'Not enough!'; setTimeout(() => showWeaponUpgrades(w), 500); return; }
            window.spendCoins?.(cost);
            CONFIG.upgradeState[w][k]++;
            applyUpgrades();
            if (window.refreshAmmoForUpgrade && w === window.getCurrentWeaponId?.()) window.refreshAmmoForUpgrade();
            showWeaponUpgrades(w);
        });
    });
}

export function openArmory() { armoryOpen = true; buildArmoryWeaponList(); document.getElementById('armoryOverlay')?.classList.remove('hidden'); document.exitPointerLock(); if (window.setPaused) window.setPaused(true); }
export function closeArmory() { armoryOpen = false; document.getElementById('armoryOverlay')?.classList.add('hidden'); if (window.setPaused) window.setPaused(false); }
export function isArmoryOpen() { return armoryOpen; }

// ===== LOCKER =====
let lockerOpen = false;

function buildLockerMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'lockerOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window">
            <div class="menu-title">LOCKER</div>
            <div class="setting-row"><label>Shirt Color</label><input type="color" id="shirtColorPicker" value="${COSMETICS.bodyColor}"></div>
            <div class="setting-row"><label>Pants Color</label><input type="color" id="pantsColorPicker" value="${COSMETICS.accentColor}"></div>
            <div class="setting-row"><label>Skin Tone</label><input type="color" id="skinColorPicker" value="${COSMETICS.headColor}"></div>
            <div class="menu-footer"><button class="menu-btn primary" id="applyLocker">Apply</button><button class="menu-btn" id="closeLocker">Cancel</button></div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('applyLocker')?.addEventListener('click', () => {
        COSMETICS.bodyColor = document.getElementById('shirtColorPicker').value;
        COSMETICS.accentColor = document.getElementById('pantsColorPicker').value;
        COSMETICS.headColor = document.getElementById('skinColorPicker').value;
        if (window.applyCosmetics) window.applyCosmetics();
        updateLobbyCharacterColor({ shirt: COSMETICS.bodyColor, pants: COSMETICS.accentColor, skin: COSMETICS.headColor });
        closeLocker();
    });
    document.getElementById('closeLocker')?.addEventListener('click', closeLocker);
}

export function openLocker() { lockerOpen = true; document.getElementById('lockerOverlay')?.classList.remove('hidden'); document.exitPointerLock(); if (window.setPaused) window.setPaused(true); }
export function closeLocker() { lockerOpen = false; document.getElementById('lockerOverlay')?.classList.add('hidden'); if (window.setPaused) window.setPaused(false); }
export function isLockerOpen() { return lockerOpen; }

// Expose functions
window.updateBuildSlots = updateBuildSlots;
window.updateFlashlightUI = updateFlashlightUI;
window.updateCaveIndicatorUI = updateCaveIndicatorUI;

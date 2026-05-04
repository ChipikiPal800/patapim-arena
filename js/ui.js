import { CONFIG, SETTINGS, COSMETICS, applyUpgrades } from './config.js';
import { keybinds, setKeybind, getKeybindLabel } from './keybinds.js';

// ─── HUD ─────────────────────────────────────────────────────────────────────
export function createUI() {
    // Health and Shield bars (bottom left - Fortnite style)
    const hudContainer = document.createElement('div');
    hudContainer.className = 'hud-container';
    hudContainer.innerHTML = `
        <div class="shield-bar-wrapper">
            <div class="bar-icon">🛡</div>
            <div class="bar-container">
                <div class="bar-fill shield-fill" id="shieldFill" style="width:100%"></div>
                <span class="bar-text" id="shieldValue">100</span>
            </div>
        </div>
        <div class="health-bar-wrapper">
            <div class="bar-icon">❤</div>
            <div class="bar-container">
                <div class="bar-fill health-fill" id="healthFill" style="width:100%"></div>
                <span class="bar-text" id="healthValue">100</span>
            </div>
        </div>
    `;
    document.body.appendChild(hudContainer);

    // Hotbar container (bottom right - Fortnite style)
    const hotbarContainer = document.createElement('div');
    hotbarContainer.className = 'hotbar-container';
    hotbarContainer.innerHTML = `
        <div class="weapon-slots" id="weaponSlots">
            <div class="weapon-slot active" data-weapon="pistol" data-key="1">
                <span class="weapon-slot-key">1</span>
                <span class="weapon-slot-icon">🔫</span>
                <span class="weapon-slot-ammo" id="ammo-pistol">15</span>
            </div>
            <div class="weapon-slot" data-weapon="assault" data-key="2">
                <span class="weapon-slot-key">2</span>
                <span class="weapon-slot-icon">⚡</span>
                <span class="weapon-slot-ammo" id="ammo-assault">30</span>
            </div>
            <div class="weapon-slot" data-weapon="sniper" data-key="3">
                <span class="weapon-slot-key">3</span>
                <span class="weapon-slot-icon">🎯</span>
                <span class="weapon-slot-ammo" id="ammo-sniper">5</span>
            </div>
            <div class="weapon-slot" data-weapon="shotgun" data-key="4">
                <span class="weapon-slot-key">4</span>
                <span class="weapon-slot-icon">💥</span>
                <span class="weapon-slot-ammo" id="ammo-shotgun">6</span>
            </div>
        </div>
        <div class="build-slots" id="buildSlots">
            <div class="build-slot" data-build="wall">
                <span class="build-slot-key">Z</span>
                <svg class="build-slot-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="48" height="48" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/>
                    <line x1="8" y1="32" x2="56" y2="32" stroke="#4a88a4" stroke-width="2"/>
                    <line x1="32" y1="8" x2="32" y2="56" stroke="#4a88a4" stroke-width="2"/>
                </svg>
            </div>
            <div class="build-slot" data-build="ramp">
                <span class="build-slot-key">X</span>
                <svg class="build-slot-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="8,56 56,56 56,16" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/>
                    <line x1="20" y1="56" x2="56" y2="28" stroke="#4a88a4" stroke-width="2"/>
                    <line x1="36" y1="56" x2="56" y2="40" stroke="#4a88a4" stroke-width="2"/>
                </svg>
            </div>
            <div class="build-slot" data-build="floor">
                <span class="build-slot-key">C</span>
                <svg class="build-slot-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="24" width="56" height="16" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/>
                    <line x1="20" y1="24" x2="20" y2="40" stroke="#4a88a4" stroke-width="2"/>
                    <line x1="44" y1="24" x2="44" y2="40" stroke="#4a88a4" stroke-width="2"/>
                </svg>
            </div>
            <div class="build-slot" data-build="cone">
                <span class="build-slot-key">V</span>
                <svg class="build-slot-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="32,8 8,56 56,56" fill="#7ab8d4" stroke="#4a88a4" stroke-width="3"/>
                    <line x1="32" y1="8" x2="32" y2="56" stroke="#4a88a4" stroke-width="2"/>
                </svg>
            </div>
        </div>
    `;
    document.body.appendChild(hotbarContainer);

    // Build mode indicator
    const buildIndicator = document.createElement('div');
    buildIndicator.id = 'buildModeIndicator';
    buildIndicator.className = 'build-mode-indicator';
    buildIndicator.innerHTML = `
        <span class="build-mode-text">BUILD MODE</span>
        <span class="build-mode-hint">Q to toggle | E or LMB to place</span>
    `;
    document.body.appendChild(buildIndicator);

    // Coins display
    const coinsDisplay = document.createElement('div');
    coinsDisplay.className = 'coins-display';
    coinsDisplay.innerHTML = `
        <span class="coins-icon">💰</span>
        <span class="coins-value" id="coinVal">0</span>
    `;
    document.body.appendChild(coinsDisplay);

    // FPS counter
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fpsCounter';
    fpsDiv.className = 'fps-counter hidden';
    document.body.appendChild(fpsDiv);

    // Crosshair
    const crossDiv = document.createElement('div');
    crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = `
        <div class="crosshair" id="crosshairEl">
            <div class="ch-left"></div>
            <div class="ch-right"></div>
            <div class="ch-dot"></div>
        </div>
    `;
    document.body.appendChild(crossDiv);

    // Damage flash
    const flashDiv = document.createElement('div');
    flashDiv.id = 'damageFlash';
    flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);

    // Wave indicator (for Zombies mode)
    const waveDiv = document.createElement('div');
    waveDiv.id = 'waveIndicator';
    waveDiv.className = 'wave-indicator hidden';
    waveDiv.innerHTML = `
        <span class="wave-number">WAVE <span id="waveNum">1</span></span>
        <span class="wave-enemies">Enemies: <span id="enemyCount">0</span></span>
    `;
    document.body.appendChild(waveDiv);

    // Kill feed
    const killFeed = document.createElement('div');
    killFeed.id = 'killFeed';
    killFeed.className = 'kill-feed';
    document.body.appendChild(killFeed);

    // Wire up weapon slot clicks
    document.querySelectorAll('.weapon-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const weapon = slot.dataset.weapon;
            if (window.switchWeaponTo) window.switchWeaponTo(weapon);
        });
    });

    // Wire up build slot clicks
    document.querySelectorAll('.build-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const build = slot.dataset.build;
            if (window.setBuildMode) window.setBuildMode(build);
        });
    });

    buildSettingsMenu();
    buildArmoryMenu();
    buildLockerMenu();
    buildLobbyScreen();
}

export function updateUI(health, shield, coins) {
    const healthFill = document.getElementById('healthFill');
    if (healthFill) healthFill.style.width = Math.max(0, (health / 100) * 100) + '%';
    const healthVal = document.getElementById('healthValue');
    if (healthVal) healthVal.innerText = Math.floor(health);

    const shieldFill = document.getElementById('shieldFill');
    if (shieldFill) shieldFill.style.width = Math.max(0, (shield / 100) * 100) + '%';
    const shieldVal = document.getElementById('shieldValue');
    if (shieldVal) shieldVal.innerText = Math.floor(shield);

    const coinSpan = document.getElementById('coinVal');
    if (coinSpan) coinSpan.innerText = coins;
}

export function updateWeaponUI(weaponId, ammo, isReloading) {
    // Update active weapon slot
    document.querySelectorAll('.weapon-slot').forEach(slot => {
        slot.classList.toggle('active', slot.dataset.weapon === weaponId);
    });
    
    // Update ammo display
    const ammoEl = document.getElementById(`ammo-${weaponId}`);
    if (ammoEl) ammoEl.innerText = isReloading ? '...' : ammo;
}

export function updateBuildSlots(activeMode) {
    document.querySelectorAll('.build-slot').forEach(slot => {
        slot.classList.toggle('active', slot.dataset.build === activeMode);
    });
}

window.updateBuildSlots = updateBuildSlots;

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (!flash) return;
    flash.style.backgroundColor = 'rgba(255,0,0,0.4)';
    setTimeout(() => { flash.style.backgroundColor = 'rgba(255,0,0,0)'; }, 150);
}

export function showHitMarker() {
    const crosshair = document.getElementById('crosshairEl');
    if (!crosshair) return;
    crosshair.style.transform = 'scale(1.3)';
    crosshair.style.filter = 'brightness(2)';
    setTimeout(() => {
        crosshair.style.transform = 'scale(1)';
        crosshair.style.filter = 'none';
    }, 100);
}

window.showHitMarker = showHitMarker;

export function setScopedUI(isScoped) {
    const container = document.querySelector('.crosshair-container');
    if (container) isScoped ? container.classList.add('scoped') : container.classList.remove('scoped');
}

export function updateBuildModeUI(active) {
    const indicator = document.getElementById('buildModeIndicator');
    if (indicator) indicator.classList.toggle('active', active);
    
    const buildSlots = document.getElementById('buildSlots');
    if (buildSlots) buildSlots.style.opacity = active ? '1' : '0.5';
}

export function updateFPS(fps) {
    const el = document.getElementById('fpsCounter');
    if (el && SETTINGS.fpsCounter) {
        el.classList.remove('hidden');
        el.innerText = fps + ' FPS';
    } else if (el) {
        el.classList.add('hidden');
    }
}

export function updateWaveUI(wave, enemyCount) {
    const waveIndicator = document.getElementById('waveIndicator');
    if (waveIndicator) {
        waveIndicator.classList.remove('hidden');
        document.getElementById('waveNum').innerText = wave;
        document.getElementById('enemyCount').innerText = enemyCount;
    }
}

export function addKillFeed(message) {
    const killFeed = document.getElementById('killFeed');
    if (!killFeed) return;
    
    const item = document.createElement('div');
    item.className = 'kill-item';
    item.innerText = message;
    killFeed.appendChild(item);
    
    setTimeout(() => item.remove(), 3000);
}

// ─── Lobby Screen ────────────────────────────────────────────────────────────
function buildLobbyScreen() {
    const lobby = document.createElement('div');
    lobby.id = 'lobbyScreen';
    lobby.className = 'lobby-screen';
    
    // Particle background
    let particles = '';
    for (let i = 0; i < 30; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 8;
        const size = 2 + Math.random() * 4;
        particles += `<div class="lobby-particle" style="left:${left}%;animation-delay:${delay}s;width:${size}px;height:${size}px;"></div>`;
    }
    
    lobby.innerHTML = `
        <div class="lobby-bg-particles">${particles}</div>
        <h1 class="lobby-title">PATAPIM ARENA</h1>
        <p class="lobby-subtitle">SELECT GAME MODE</p>
        <div class="lobby-modes">
            <div class="mode-card" data-mode="zombies">
                <span class="mode-tag new">HOT</span>
                <span class="mode-icon zombies">🧟</span>
                <span class="mode-name">Zombies</span>
                <span class="mode-desc">Survive endless waves of the undead</span>
            </div>
            <div class="mode-card" data-mode="practice">
                <span class="mode-icon practice">🎯</span>
                <span class="mode-name">Practice</span>
                <span class="mode-desc">Train your aim and building skills</span>
            </div>
            <div class="mode-card disabled" data-mode="battle-royale">
                <span class="mode-tag coming-soon">SOON</span>
                <span class="mode-icon battle-royale">🏆</span>
                <span class="mode-name">Battle Royale</span>
                <span class="mode-desc">Last one standing wins</span>
            </div>
            <div class="mode-card disabled" data-mode="1v1">
                <span class="mode-tag coming-soon">SOON</span>
                <span class="mode-icon versus">⚔</span>
                <span class="mode-name">1v1</span>
                <span class="mode-desc">Face off against another player</span>
            </div>
        </div>
        <div class="lobby-footer">
            <button class="lobby-btn" id="lobbySettings">Settings</button>
            <button class="lobby-btn" id="lobbyArmory">Armory</button>
            <button class="lobby-btn" id="lobbyLocker">Locker</button>
        </div>
    `;
    document.body.appendChild(lobby);

    // Wire up mode selection
    lobby.querySelectorAll('.mode-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            CONFIG.gameMode = mode;
            hideLobby();
            if (window.startGame) window.startGame(mode);
        });
    });

    document.getElementById('lobbySettings').addEventListener('click', openSettings);
    document.getElementById('lobbyArmory').addEventListener('click', openArmory);
    document.getElementById('lobbyLocker').addEventListener('click', openLocker);
}

export function showLobby() {
    const lobby = document.getElementById('lobbyScreen');
    if (lobby) lobby.classList.remove('hidden');
}

export function hideLobby() {
    const lobby = document.getElementById('lobbyScreen');
    if (lobby) lobby.classList.add('hidden');
}

// ─── Settings Menu ────────────────────────────────────────────────────────────
let settingsOpen = false;
let rebindTarget = null;

function buildSettingsMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window settings-window">
            <div class="menu-title">SETTINGS</div>
            <div class="settings-tabs">
                <button class="tab-btn active" data-tab="controls">Controls</button>
                <button class="tab-btn" data-tab="keybinds">Keybinds</button>
                <button class="tab-btn" data-tab="graphics">Graphics</button>
                <button class="tab-btn" data-tab="audio">Audio</button>
            </div>

            <div class="tab-content" id="tab-controls">
                <div class="setting-row">
                    <label>Mouse Sensitivity</label>
                    <input type="range" min="5" max="200" value="100" id="sensitivitySlider">
                    <span id="sensitivityVal">1.0x</span>
                </div>
                <div class="setting-row">
                    <label>Scope Sensitivity</label>
                    <input type="range" min="10" max="100" value="50" id="scopeSensSlider">
                    <span id="scopeSensVal">0.5x</span>
                </div>
                <div class="setting-row">
                    <label>Invert Y</label>
                    <button class="toggle-btn" id="invertYBtn">OFF</button>
                </div>
            </div>

            <div class="tab-content hidden" id="tab-keybinds">
                <div class="keybinds-grid" id="keybindsGrid"></div>
                <div class="rebind-hint" id="rebindHint" style="display:none">Press any key to rebind...</div>
            </div>

            <div class="tab-content hidden" id="tab-graphics">
                <div class="setting-row">
                    <label>Shadows</label>
                    <div class="btn-group">
                        <button class="opt-btn" data-val="off">Off</button>
                        <button class="opt-btn" data-val="low">Low</button>
                        <button class="opt-btn active" data-val="high">High</button>
                    </div>
                </div>
                <div class="setting-row">
                    <label>FPS Counter</label>
                    <button class="toggle-btn" id="fpsBtn">OFF</button>
                </div>
                <div class="setting-row">
                    <label>Crosshair Color</label>
                    <input type="color" id="crosshairColorPicker" value="#ffffff">
                </div>
            </div>

            <div class="tab-content hidden" id="tab-audio">
                <div class="setting-row">
                    <label>Master Volume</label>
                    <input type="range" min="0" max="100" value="80" id="masterVolSlider">
                    <span id="masterVolVal">80</span>
                </div>
                <div class="setting-row">
                    <label>SFX Volume</label>
                    <input type="range" min="0" max="100" value="100" id="sfxVolSlider">
                    <span id="sfxVolVal">100</span>
                </div>
            </div>

            <div class="menu-footer">
                <button class="menu-btn primary" id="closeSettings">Resume</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Tabs
    overlay.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            overlay.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
        });
    });

    populateKeybindsGrid(overlay);

    // Controls
    const sensSlider = document.getElementById('sensitivitySlider');
    sensSlider.addEventListener('input', () => {
        SETTINGS.sensitivity = sensSlider.value / 100;
        document.getElementById('sensitivityVal').innerText = SETTINGS.sensitivity.toFixed(1) + 'x';
    });
    
    const scopeSensSlider = document.getElementById('scopeSensSlider');
    scopeSensSlider.addEventListener('input', () => {
        SETTINGS.scopeSensitivity = scopeSensSlider.value / 100;
        document.getElementById('scopeSensVal').innerText = SETTINGS.scopeSensitivity.toFixed(2) + 'x';
    });
    
    document.getElementById('invertYBtn').addEventListener('click', (e) => {
        SETTINGS.invertY = !SETTINGS.invertY;
        e.target.innerText = SETTINGS.invertY ? 'ON' : 'OFF';
        e.target.classList.toggle('active', SETTINGS.invertY);
    });

    // Graphics
    overlay.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SETTINGS.shadows = btn.dataset.val;
            if (window.applyShadowSettings) window.applyShadowSettings(SETTINGS.shadows);
        });
    });
    
    document.getElementById('fpsBtn').addEventListener('click', (e) => {
        SETTINGS.fpsCounter = !SETTINGS.fpsCounter;
        e.target.innerText = SETTINGS.fpsCounter ? 'ON' : 'OFF';
        e.target.classList.toggle('active', SETTINGS.fpsCounter);
    });
    
    document.getElementById('crosshairColorPicker').addEventListener('input', (e) => {
        SETTINGS.crosshairColor = e.target.value;
        const ch = document.getElementById('crosshairEl');
        if (ch) {
            ch.querySelectorAll('div').forEach(el => el.style.background = SETTINGS.crosshairColor);
        }
    });

    // Audio
    document.getElementById('masterVolSlider').addEventListener('input', (e) => {
        SETTINGS.masterVolume = e.target.value / 100;
        document.getElementById('masterVolVal').innerText = e.target.value;
    });
    
    document.getElementById('sfxVolSlider').addEventListener('input', (e) => {
        SETTINGS.sfxVolume = e.target.value / 100;
        document.getElementById('sfxVolVal').innerText = e.target.value;
    });

    document.getElementById('closeSettings').addEventListener('click', closeSettings);
}

function populateKeybindsGrid(overlay) {
    const grid = document.getElementById('keybindsGrid');
    if (!grid) return;
    
    const actions = [
        ['forward', 'Forward'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'],
        ['jump', 'Jump'], ['sprint', 'Sprint'], ['reload', 'Reload'],
        ['weapon1', 'Weapon 1'], ['weapon2', 'Weapon 2'], ['weapon3', 'Weapon 3'], ['weapon4', 'Weapon 4'],
        ['buildWall', 'Wall'], ['buildRamp', 'Ramp'], ['buildFloor', 'Floor'], ['buildCone', 'Cone'],
        ['buildToggle', 'Build Mode']
    ];
    
    grid.innerHTML = '';
    actions.forEach(([action, label]) => {
        const row = document.createElement('div');
        row.className = 'keybind-row';
        row.innerHTML = `
            <span class="kb-label">${label}</span>
            <button class="kb-btn" data-action="${action}">${getKeybindLabel(action)}</button>
        `;
        row.querySelector('.kb-btn').addEventListener('click', (e) => {
            if (rebindTarget) {
                document.querySelector(`.kb-btn[data-action="${rebindTarget}"]`)?.classList.remove('rebinding');
            }
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
        if (btn) { 
            btn.innerText = getKeybindLabel(rebindTarget); 
            btn.classList.remove('rebinding'); 
        }
        document.getElementById('rebindHint').style.display = 'none';
        rebindTarget = null;
    }, { capture: true });
}

export function openSettings() {
    if (settingsOpen) return;
    settingsOpen = true;
    document.getElementById('settingsOverlay').classList.remove('hidden');
    document.exitPointerLock();
    if (window.setPaused) window.setPaused(true);
}

export function closeSettings() {
    settingsOpen = false;
    document.getElementById('settingsOverlay').classList.add('hidden');
    if (window.setPaused) window.setPaused(false);
}

export function isSettingsOpen() { return settingsOpen; }

// ─── Armory ───────────────────────────────────────────────────────────────────
let armoryOpen = false;

function buildArmoryMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'armoryOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window armory-window">
            <div class="menu-title">ARMORY</div>
            <div class="armory-layout">
                <div class="weapon-list" id="armoryWeaponList"></div>
                <div class="upgrade-panel" id="armoryUpgradePanel">
                    <div class="upgrade-placeholder">Select a weapon to view upgrades</div>
                </div>
            </div>
            <div class="menu-footer">
                <button class="menu-btn" id="closeArmory">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('closeArmory').addEventListener('click', closeArmory);
    buildArmoryWeaponList();
}

function buildArmoryWeaponList() {
    const list = document.getElementById('armoryWeaponList');
    if (!list) return;
    list.innerHTML = '';
    const weapons = ['pistol', 'assault', 'sniper', 'shotgun'];
    const icons = { pistol: '🔫', assault: '⚡', sniper: '🎯', shotgun: '💥' };
    
    weapons.forEach(wid => {
        const btn = document.createElement('button');
        btn.className = 'armory-weapon-btn';
        btn.innerHTML = `${icons[wid]}<br><span>${CONFIG.weapons[wid].name}</span>`;
        btn.addEventListener('click', () => {
            list.querySelectorAll('.armory-weapon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showWeaponUpgrades(wid);
        });
        list.appendChild(btn);
    });
}

function showWeaponUpgrades(wid) {
    const panel = document.getElementById('armoryUpgradePanel');
    if (!panel) return;
    const upgrades = CONFIG.armoryUpgrades[wid];
    const state = CONFIG.upgradeState[wid];

    panel.innerHTML = `<div class="upgrade-title">${CONFIG.weapons[wid].name} Upgrades</div>`;

    Object.entries(upgrades).forEach(([key, upg]) => {
        const currentTier = state[key];
        const maxTier = upg.levels.length - 1;

        const block = document.createElement('div');
        block.className = 'upgrade-block';

        const tierBars = upg.levels.map((val, i) => {
            const active = i <= currentTier ? 'active' : '';
            return `<div class="tier-bar ${active}" title="Tier ${i}: ${val}${upg.lower ? 's' : ''}">${val}${upg.lower ? 's' : ''}</div>`;
        }).join('');

        const nextCost = currentTier < maxTier ? upg.costs[currentTier] : null;
        const upgradeBtn = nextCost !== null
            ? `<button class="upgrade-btn" data-weapon="${wid}" data-key="${key}">Upgrade - 💰${nextCost}</button>`
            : `<button class="upgrade-btn maxed" disabled>MAX</button>`;

        block.innerHTML = `
            <div class="upgrade-header">
                <span class="upgrade-label">${upg.label}</span>
                <div class="tier-bars">${tierBars}</div>
            </div>
            ${upgradeBtn}
        `;
        panel.appendChild(block);
    });

    panel.querySelectorAll('.upgrade-btn:not(.maxed)').forEach(btn => {
        btn.addEventListener('click', () => {
            const w = btn.dataset.weapon;
            const k = btn.dataset.key;
            const upg2 = CONFIG.armoryUpgrades[w][k];
            const tier = CONFIG.upgradeState[w][k];
            if (tier >= upg2.levels.length - 1) return;
            const cost = upg2.costs[tier];
            if (window.getCoins && window.getCoins() < cost) {
                btn.innerText = 'Not enough coins!';
                setTimeout(() => showWeaponUpgrades(w), 1000);
                return;
            }
            if (window.spendCoins) window.spendCoins(cost);
            CONFIG.upgradeState[w][k]++;
            applyUpgrades();
            if (window.refreshAmmoForUpgrade && w === window.getCurrentWeaponId?.()) {
                window.refreshAmmoForUpgrade();
            }
            showWeaponUpgrades(w);
        });
    });
}

export function openArmory() {
    armoryOpen = true;
    buildArmoryWeaponList();
    document.getElementById('armoryOverlay').classList.remove('hidden');
    document.exitPointerLock();
    if (window.setPaused) window.setPaused(true);
}

export function closeArmory() {
    armoryOpen = false;
    document.getElementById('armoryOverlay').classList.add('hidden');
    if (window.setPaused) window.setPaused(false);
}

export function isArmoryOpen() { return armoryOpen; }

// ─── Locker ───────────────────────────────────────────────────────────────────
let lockerOpen = false;

function buildLockerMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'lockerOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window locker-window">
            <div class="menu-title">LOCKER</div>
            <div class="locker-layout">
                <div class="color-options">
                    <div class="color-row">
                        <label>Shirt Color</label>
                        <input type="color" id="shirtColorPicker" value="${COSMETICS.shirtColor}">
                    </div>
                    <div class="color-row">
                        <label>Pants Color</label>
                        <input type="color" id="pantsColorPicker" value="${COSMETICS.pantsColor}">
                    </div>
                    <div class="color-row">
                        <label>Skin Tone</label>
                        <input type="color" id="skinColorPicker" value="${COSMETICS.skinColor}">
                    </div>
                </div>
                <div class="locker-preview" id="lockerPreview">
                    <div class="preview-label">Preview updates in-game</div>
                </div>
            </div>
            <div class="menu-footer">
                <button class="menu-btn primary" id="applyLocker">Apply</button>
                <button class="menu-btn" id="closeLocker">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('applyLocker').addEventListener('click', () => {
        COSMETICS.shirtColor = document.getElementById('shirtColorPicker').value;
        COSMETICS.pantsColor = document.getElementById('pantsColorPicker').value;
        COSMETICS.skinColor = document.getElementById('skinColorPicker').value;
        if (window.applyCosmetics) window.applyCosmetics();
        closeLocker();
    });
    document.getElementById('closeLocker').addEventListener('click', closeLocker);
}

export function openLocker() {
    lockerOpen = true;
    document.getElementById('lockerOverlay').classList.remove('hidden');
    document.exitPointerLock();
    if (window.setPaused) window.setPaused(true);
}

export function closeLocker() {
    lockerOpen = false;
    document.getElementById('lockerOverlay').classList.add('hidden');
    if (window.setPaused) window.setPaused(false);
}

export function isLockerOpen() { return lockerOpen; }

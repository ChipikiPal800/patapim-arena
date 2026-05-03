import { CONFIG, SETTINGS, COSMETICS, applyUpgrades } from './config.js';
import { keybinds, setKeybind, getKeybindLabel } from './keybinds.js';

// ─── HUD ─────────────────────────────────────────────────────────────────────
export function createUI() {
    // Bottom panel
    const bottomPanel = document.createElement('div');
    bottomPanel.className = 'combined-panel';
    bottomPanel.innerHTML = `
        <div class="weapon-info">
            🔫 <span id="weaponName">Pistol</span>
            <span id="weaponAmmo" class="weapon-ammo">15</span>
        </div>
        <div class="build-icons">
            <img id="wallIcon"  class="build-icon active" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9gHrz0DA5XBDwfU70Z-ZBZ6KFdT1ETm7jng&s" alt="wall">
            <img id="rampIcon"  class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/f/f7/T_BuildMode_Prefab_Stair_128.png/revision/latest/scale-to-width/360?cb=20201217233630" alt="ramp">
            <img id="coneIcon"  class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/6/68/T_BuildMode_Prefab_Ceiling_128.png/revision/latest/scale-to-width/360?cb=20201217233628" alt="cone">
            <img id="floorIcon" class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/2/26/T_BuildMode_Prefab_Floor_128.png/revision/latest/scale-to-width/360?cb=20201217233629" alt="floor">
        </div>
        <div class="build-controls">Q SWAP | E PLACE | F TOGGLE</div>
        <div class="build-mode-text">BUILD: <span id="buildModeText">WALL</span></div>
    `;
    document.body.appendChild(bottomPanel);

    // Health & shield
    const statsContainer = document.createElement('div');
    statsContainer.className = 'health-shield-container';
    statsContainer.innerHTML = `
        <div class="stat-card health-card">
            <div class="stat-header"><span>❤️ HEALTH</span><span id="healthValue" class="stat-value">100</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill health-fill" id="healthFill" style="width:100%"></div></div>
        </div>
        <div class="stat-card shield-card">
            <div class="stat-header"><span>🛡️ SHIELD</span><span id="shieldValue" class="stat-value">100</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill shield-fill" id="shieldFill" style="width:100%"></div></div>
        </div>
    `;
    document.body.appendChild(statsContainer);

    // Coins + level
    const coinDiv = document.createElement('div');
    coinDiv.className = 'coin-card';
    coinDiv.innerHTML = '💰 <span id="coinVal">0</span> &nbsp; <span id="levelVal" class="level-badge">LVL 1</span>';
    document.body.appendChild(coinDiv);

    // FPS counter
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fpsCounter';
    fpsDiv.className = 'fps-counter hidden';
    document.body.appendChild(fpsDiv);

    // Crosshair
    const crossDiv = document.createElement('div');
    crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = '<div class="crosshair" id="crosshairEl"></div>';
    document.body.appendChild(crossDiv);

    // Damage flash
    const flashDiv = document.createElement('div');
    flashDiv.id = 'damageFlash';
    flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);

    // Hint
    const hintDiv = document.createElement('div');
    hintDiv.className = 'esc-hint';
    hintDiv.innerHTML = 'ESC = Settings';
    document.body.appendChild(hintDiv);

    buildSettingsMenu();
    buildArmoryMenu();
    buildLockerMenu();
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
    const nameEl = document.getElementById('weaponName');
    const ammoEl = document.getElementById('weaponAmmo');
    if (nameEl) nameEl.innerText = CONFIG.weapons[weaponId]?.name || weaponId;
    if (ammoEl) ammoEl.innerText = isReloading ? '↻ RELOAD' : ammo;
}

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (!flash) return;
    flash.style.backgroundColor = 'rgba(255,0,0,0.5)';
    setTimeout(() => { flash.style.backgroundColor = 'rgba(255,0,0,0)'; }, 150);
}

export function setScopedUI(isScoped) {
    const container = document.querySelector('.crosshair-container');
    if (container) isScoped ? container.classList.add('scoped') : container.classList.remove('scoped');
}

export function updateBuildModeUI(active) {
    const panel = document.querySelector('.combined-panel');
    if (panel) panel.style.opacity = active ? '1' : '0.6';
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

// ─── Settings Menu ────────────────────────────────────────────────────────────
let settingsOpen = false;
let rebindTarget = null;

function buildSettingsMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.className = 'menu-overlay hidden';
    overlay.innerHTML = `
        <div class="menu-window settings-window">
            <div class="menu-title">⚙️ SETTINGS</div>
            <div class="settings-tabs">
                <button class="tab-btn active" data-tab="controls">Controls</button>
                <button class="tab-btn" data-tab="keybinds">Keybinds</button>
                <button class="tab-btn" data-tab="graphics">Graphics</button>
                <button class="tab-btn" data-tab="audio">Audio</button>
            </div>

            <!-- Controls -->
            <div class="tab-content" id="tab-controls">
                <div class="setting-row">
                    <label>Mouse Sensitivity</label>
                    <input type="range" min="5" max="200" value="100" id="sensitivitySlider">
                    <span id="sensitivityVal">1.0×</span>
                </div>
                <div class="setting-row">
                    <label>Scope Sensitivity</label>
                    <input type="range" min="10" max="100" value="50" id="scopeSensSlider">
                    <span id="scopeSensVal">0.5×</span>
                </div>
                <div class="setting-row">
                    <label>Invert Y</label>
                    <button class="toggle-btn" id="invertYBtn">OFF</button>
                </div>
            </div>

            <!-- Keybinds -->
            <div class="tab-content hidden" id="tab-keybinds">
                <div class="keybinds-grid" id="keybindsGrid"></div>
                <div class="rebind-hint" id="rebindHint" style="display:none">Press any key to rebind…</div>
            </div>

            <!-- Graphics -->
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

            <!-- Audio -->
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
                <button class="menu-btn primary" id="closeSettings">Resume Game</button>
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

    // Populate keybinds grid
    populateKeybindsGrid(overlay);

    // Controls
    const sensSlider = document.getElementById('sensitivitySlider');
    sensSlider.addEventListener('input', () => {
        SETTINGS.sensitivity = sensSlider.value / 100;
        document.getElementById('sensitivityVal').innerText = SETTINGS.sensitivity.toFixed(1) + '×';
    });
    const scopeSensSlider = document.getElementById('scopeSensSlider');
    scopeSensSlider.addEventListener('input', () => {
        SETTINGS.scopeSensitivity = scopeSensSlider.value / 100;
        document.getElementById('scopeSensVal').innerText = SETTINGS.scopeSensitivity.toFixed(2) + '×';
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
            ch.style.borderColor = SETTINGS.crosshairColor;
            ch.style.setProperty('--ch-color', SETTINGS.crosshairColor);
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
        ['forward','Forward'], ['back','Back'], ['left','Left'], ['right','Right'],
        ['jump','Jump'], ['sprint','Sprint'], ['reload','Reload'],
        ['weapon1','Weapon 1'], ['weapon2','Weapon 2'], ['weapon3','Weapon 3'], ['weapon4','Weapon 4'],
        ['buildCycle','Cycle Build'], ['buildPlace','Place Build'], ['buildToggle','Build Mode']
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
            e.target.innerText = '…';
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
            <div class="menu-title">🔧 ARMORY</div>
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
    const weapons = ['pistol','assault','sniper','shotgun'];
    const icons = { pistol:'🔫', assault:'⚡', sniper:'🎯', shotgun:'💥' };
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
    const state    = CONFIG.upgradeState[wid];

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
            ? `<button class="upgrade-btn" data-weapon="${wid}" data-key="${key}">Upgrade — 💰${nextCost}</button>`
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

    // Wire upgrade buttons
    panel.querySelectorAll('.upgrade-btn:not(.maxed)').forEach(btn => {
        btn.addEventListener('click', () => {
            const w = btn.dataset.weapon;
            const k = btn.dataset.key;
            const upg2 = CONFIG.armoryUpgrades[w][k];
            const tier = CONFIG.upgradeState[w][k];
            if (tier >= upg2.levels.length - 1) return;
            const cost = upg2.costs[tier];
            if (window.getCoins && window.getCoins() < cost) {
                btn.innerText = '❌ Not enough coins';
                setTimeout(() => showWeaponUpgrades(w), 1000);
                return;
            }
            if (window.spendCoins) window.spendCoins(cost);
            CONFIG.upgradeState[w][k]++;
            applyUpgrades();
            if (window.refreshAmmoForUpgrade && w === window.getCurrentWeaponId?.()) {
                window.refreshAmmoForUpgrade();
            }
            showWeaponUpgrades(w); // refresh
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
            <div class="menu-title">🎨 LOCKER</div>
            <div class="locker-layout">
                <div class="color-options">
                    <div class="color-row">
                        <label>👕 Shirt Color</label>
                        <input type="color" id="shirtColorPicker" value="${COSMETICS.shirtColor}">
                    </div>
                    <div class="color-row">
                        <label>👖 Pants Color</label>
                        <input type="color" id="pantsColorPicker" value="${COSMETICS.pantsColor}">
                    </div>
                    <div class="color-row">
                        <label>🤚 Skin Tone</label>
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
        COSMETICS.skinColor  = document.getElementById('skinColorPicker').value;
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

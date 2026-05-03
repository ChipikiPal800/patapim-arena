import { CONFIG } from './config.js';

export function createUI() {
    // Health and Shield bars
    const statsContainer = document.createElement('div');
    statsContainer.className = 'health-shield-container';
    statsContainer.innerHTML = `
        <div class="stat-card health-card">
            <div class="stat-header">
                <span>❤️</span>
                <span class="stat-label">HEALTH</span>
                <span id="healthValue" class="stat-value">100</span>
            </div>
            <div class="stat-bar-bg"><div class="stat-bar-fill health-fill" id="healthFill" style="width:100%"></div></div>
        </div>
        <div class="stat-card shield-card">
            <div class="stat-header">
                <span>🛡️</span>
                <span class="stat-label">SHIELD</span>
                <span id="shieldValue" class="stat-value">100</span>
            </div>
            <div class="stat-bar-bg"><div class="stat-bar-fill shield-fill" id="shieldFill" style="width:100%"></div></div>
        </div>
    `;
    document.body.appendChild(statsContainer);

    // Weapon panel
    const weaponPanel = document.createElement('div');
    weaponPanel.className = 'weapon-panel';
    weaponPanel.innerHTML = `🔫 <span id="weaponName">Pistol</span> <span id="weaponAmmo" class="weapon-ammo">15</span>`;
    document.body.appendChild(weaponPanel);

    // Build panel
    const buildPanel = document.createElement('div');
    buildPanel.className = 'build-panel';
    buildPanel.innerHTML = `
        <div class="build-icons">
            <img id="wallIcon" class="build-icon active" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9gHrz0DA5XBDwfU70Z-ZBZ6KFdT1ETm7jng&s" alt="wall">
            <img id="rampIcon" class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/f/f7/T_BuildMode_Prefab_Stair_128.png/revision/latest/scale-to-width/360?cb=20201217233630" alt="ramp">
            <img id="coneIcon" class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/6/68/T_BuildMode_Prefab_Ceiling_128.png/revision/latest/scale-to-width/360?cb=20201217233628" alt="cone">
            <img id="floorIcon" class="build-icon" src="https://static.wikia.nocookie.net/fortnite/images/2/26/T_BuildMode_Prefab_Floor_128.png/revision/latest/scale-to-width/360?cb=20201217233629" alt="floor">
        </div>
        <div class="build-mode-text">CURRENT: <span id="buildModeText">WALL</span></div>
        <div class="build-controls">Q SWAP | E PLACE | F TOGGLE BUILD MODE</div>
    `;
    document.body.appendChild(buildPanel);

    // Crosshair
    const crossDiv = document.createElement('div');
    crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = '<div class="crosshair"></div>';
    document.body.appendChild(crossDiv);

    // Damage flash
    const flashDiv = document.createElement('div');
    flashDiv.id = 'damageFlash';
    flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);

    // Coins display
    const coinDiv = document.createElement('div');
    coinDiv.className = 'coin-card';
    coinDiv.innerHTML = '💰 <span id="coinVal">0</span>';
    document.body.appendChild(coinDiv);
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
    if (ammoEl) ammoEl.innerText = isReloading ? 'RELOAD' : ammo;
}

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (flash) {
        flash.style.backgroundColor = 'rgba(255,0,0,0.5)';
        setTimeout(() => flash.style.backgroundColor = 'rgba(255,0,0,0)', 150);
    }
}

export function setScopedUI(isScoped) {
    const container = document.querySelector('.crosshair-container');
    if (container) {
        if (isScoped) container.classList.add('scoped');
        else container.classList.remove('scoped');
    }
}

export function updateBuildModeUI(active) {
    const panel = document.querySelector('.build-panel');
    if (panel) {
        if (active) panel.style.opacity = '1';
        else panel.style.opacity = '0.5';
    }
}

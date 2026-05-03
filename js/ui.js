export function createUI() {
    const topLeft = document.createElement('div'); topLeft.className = 'hud-top-left';
    topLeft.innerHTML = `
        <div class="stat-container"><div class="stat-label">HEALTH</div><div class="stat-bar-bg"><div class="stat-bar-fill health-fill" id="healthFill" style="width:100%"></div></div></div>
        <div class="stat-container"><div class="stat-label">STAMINA</div><div class="stat-bar-bg"><div class="stat-bar-fill stamina-fill" id="staminaFill" style="width:100%"></div></div></div>
        <div class="weapon-card"><span id="weaponName">Pistol</span>  <span id="weaponAmmo" class="weapon-ammo">15</span></div>
    `;
    document.body.appendChild(topLeft);
    
    const topRight = document.createElement('div'); topRight.className = 'hud-top-right';
    topRight.innerHTML = `<div class="stat-container"><div class="stat-label">COINS</div><div class="stat-label" style="font-size:24px" id="coinVal">0</div></div>`;
    document.body.appendChild(topRight);
    
    const hologramDiv = document.createElement('div'); hologramDiv.className = 'hologram-container';
    hologramDiv.innerHTML = `🏗️ BUILD: <span id="buildModeText">WALL</span><br>Q SWAP | E PLACE`;
    document.body.appendChild(hologramDiv);
    
    const crossDiv = document.createElement('div'); crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = '<div class="crosshair"></div>';
    document.body.appendChild(crossDiv);
    
    const flashDiv = document.createElement('div'); flashDiv.id = 'damageFlash'; flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);
}

export function updateUI(health, coins) {
    const fill = document.getElementById('healthFill');
    if (fill) fill.style.width = Math.max(0, (health / 100) * 100) + '%';
    const coin = document.getElementById('coinVal');
    if (coin) coin.innerText = coins;
}

export function updateWeaponUI(weaponId, ammo, isReloading) {
    const nameEl = document.getElementById('weaponName');
    const ammoEl = document.getElementById('weaponAmmo');
    if (nameEl) nameEl.innerText = weaponId.charAt(0).toUpperCase() + weaponId.slice(1);
    if (ammoEl) ammoEl.innerText = isReloading ? 'RELOAD' : ammo;
}

export function updateSprintBar(percent) {
    const fill = document.getElementById('staminaFill');
    if (fill) fill.style.width = percent + '%';
}

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (flash) { flash.style.backgroundColor = 'rgba(255,0,0,0.4)'; setTimeout(() => flash.style.backgroundColor = 'rgba(255,0,0,0)', 100); }
}

export function setScopedUI(isScoped) {
    const container = document.querySelector('.crosshair-container');
    if (container) { if (isScoped) container.classList.add('scoped'); else container.classList.remove('scoped'); }
}

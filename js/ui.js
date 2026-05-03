export function createUI() {
    // HUD panels
    const hudDiv = document.createElement('div');
    hudDiv.className = 'hud';
    hudDiv.innerHTML = `
        <div class="hud-panel">❤️ <span id="healthVal">100</span>  &nbsp;💰 <span id="coinVal">0</span></div>
        <div class="hud-panel">🔫 <span id="weaponName">Pistol</span>  📦 <span id="weaponAmmo">15</span></div>
    `;
    document.body.appendChild(hudDiv);
    
    const weaponPanel = document.createElement('div');
    weaponPanel.className = 'weapon-panel';
    weaponPanel.innerHTML = `1 Pistol | 2 AR | 3 Sniper | 4 Shotgun | R Reload`;
    document.body.appendChild(weaponPanel);
    
    const crossDiv = document.createElement('div');
    crossDiv.className = 'crosshair-container';
    crossDiv.innerHTML = '<div class="crosshair"></div>';
    document.body.appendChild(crossDiv);
    
    const flashDiv = document.createElement('div');
    flashDiv.id = 'damageFlash';
    flashDiv.className = 'damage-flash';
    document.body.appendChild(flashDiv);
}

export function updateUI(health, coins) {
    const healthEl = document.getElementById('healthVal');
    const coinEl = document.getElementById('coinVal');
    if (healthEl) healthEl.innerText = Math.max(0, health);
    if (coinEl) coinEl.innerText = coins;
}

export function updateWeaponUI(weaponId, ammo, isReloading) {
    const nameEl = document.getElementById('weaponName');
    const ammoEl = document.getElementById('weaponAmmo');
    if (nameEl) nameEl.innerText = weaponId.charAt(0).toUpperCase() + weaponId.slice(1);
    if (ammoEl) ammoEl.innerText = isReloading ? 'RELOAD' : ammo;
}

export function showDamageFlash() {
    const flash = document.getElementById('damageFlash');
    if (flash) {
        flash.style.backgroundColor = 'rgba(255,0,0,0.4)';
        setTimeout(() => flash.style.backgroundColor = 'rgba(255,0,0,0)', 100);
    }
}

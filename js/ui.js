export function createUI() {
    const hud = document.createElement('div'); hud.className = 'hud'; hud.innerHTML = `<div class="hud-panel">❤️ <span id="healthVal">100</span>  💰 <span id="coinVal">0</span></div><div class="hud-panel">🔫 <span id="weaponName">Pistol</span>  📦 <span id="weaponAmmo">15</span></div>`; document.body.appendChild(hud);
    const weaponPanel = document.createElement('div'); weaponPanel.className = 'weapon-panel'; weaponPanel.innerHTML = `1 Pistol | 2 AR | 3 Sniper | 4 Shotgun | R Reload`; document.body.appendChild(weaponPanel);
    const buildPanel = document.createElement('div'); buildPanel.className = 'build-panel'; buildPanel.innerHTML = `🏗️ BUILD: <span id="buildModeText">WALL</span><br>Q SWAP | E PLACE`; document.body.appendChild(buildPanel);
    const crossDiv = document.createElement('div'); crossDiv.className = 'crosshair-container'; crossDiv.innerHTML = '<div class="crosshair"></div>'; document.body.appendChild(crossDiv);
    const sprintDiv = document.createElement('div'); sprintDiv.className = 'sprint-bar-container'; sprintDiv.innerHTML = '<div class="sprint-bar-fill" id="sprintFill" style="width:100%"></div>'; document.body.appendChild(sprintDiv);
    const flashDiv = document.createElement('div'); flashDiv.id = 'damageFlash'; flashDiv.className = 'damage-flash'; document.body.appendChild(flashDiv);
}
export function updateUI(health, coins) { const h = document.getElementById('healthVal'); const c = document.getElementById('coinVal'); if (h) h.innerText = Math.max(0, health); if (c) c.innerText = coins; }
export function updateWeaponUI(weaponId, ammo, isReloading) { const nameEl = document.getElementById('weaponName'); const ammoEl = document.getElementById('weaponAmmo'); if (nameEl) nameEl.innerText = weaponId.charAt(0).toUpperCase() + weaponId.slice(1); if (ammoEl) ammoEl.innerText = isReloading ? 'RELOAD' : ammo; }
export function updateSprintBar(percent) { const fill = document.getElementById('sprintFill'); if (fill) fill.style.width = percent + '%'; }
export function showDamageFlash() { const flash = document.getElementById('damageFlash'); if (flash) { flash.style.backgroundColor = 'rgba(255,0,0,0.4)'; setTimeout(() => flash.style.backgroundColor = 'rgba(255,0,0,0)', 100); } }

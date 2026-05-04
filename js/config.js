export const CONFIG = {
    player: {
        health: 100,
        shield: 100,
        walkSpeed: 5.0,
        runSpeed: 8.0,
        sprintDrain: 15,
        sprintRegen: 20,
        jumpPower: 8.0,
        gravity: 22.0,
        mouseSensitivity: 0.002,
        scopeSensitivityMultiplier: 0.5,
        height: 1.7,
        modelColor: 0x6da3d4
    },
    weapons: {
        pistol:  { name: "Pistol", damage: 18, fireRate: 0.20, range: 100, ammoPerMag: 15, reloadTime: 1.0, movementPenalty: 0, cost: 0, scopeZoom: 1.4, color: 0x2a2a32, recoilV: 0.018, recoilH: 0.006 },
        assault: { name: "Assault Rifle", damage: 12, fireRate: 0.08, range: 120, ammoPerMag: 30, reloadTime: 1.2, movementPenalty: 6, cost: 50, scopeZoom: 1.6, color: 0x2a3038, recoilV: 0.014, recoilH: 0.010 },
        sniper:  { name: "Sniper", damage: 100, fireRate: 1.20, range: 250, ammoPerMag: 5, reloadTime: 2.0, movementPenalty: 13, cost: 215, scopeZoom: 3.5, color: 0x303a30, recoilV: 0.060, recoilH: 0.012 },
        shotgun: { name: "Shotgun", damage: 26, pellets: 8, spread: 0.10, fireRate: 0.90, range: 60, ammoPerMag: 6, reloadTime: 2.5, movementPenalty: 18, cost: 75, scopeZoom: 1.1, color: 0x3a2820, recoilV: 0.010, recoilH: 0.005 },
        pickaxe: { name: "Pickaxe", damage: 20, fireRate: 0.6, range: 25, ammoPerMag: 999, reloadTime: 0, movementPenalty: 0, cost: 0, scopeZoom: 1.0, color: 0x8a7a5a, recoilV: 0.005, recoilH: 0.003, melee: true }
    },
    enemies: {
        zombie: { health: 45, damageToPlayer: 8, speed: 2.0, size: 1.0, coinReward: 1 }
    },
    world: { groundSize: 400, tileSize: 4.0, killY: -25 },
    building: {
        maxBuilds: 150,
        pieceSize: 4.0,
        wallHeight: 4.0,
        placeCooldown: 0.15,
        health: { wall: 120, ramp: 110, floor: 110, cone: 100 }
    },
    keybinds: {
        forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
        jump: 'Space', sprint: 'ShiftLeft', shoot: 'Mouse0', scope: 'Mouse2',
        reload: 'KeyR', weapon1: 'Digit1', weapon2: 'Digit2', weapon3: 'Digit3',
        weapon4: 'Digit4', weapon5: 'Digit5', pickaxe: 'KeyQ',
        buildWall: 'KeyZ', buildRamp: 'KeyX', buildFloor: 'KeyC', buildCone: 'KeyV',
        buildPlace: 'Mouse0', buildToggle: 'KeyQ', settings: 'Escape'
    },
    upgradeState: {
        pistol: { mag: 0, damage: 0, reload: 0 },
        assault: { mag: 0, damage: 0, reload: 0 },
        sniper: { mag: 0, damage: 0, reload: 0 },
        shotgun: { mag: 0, damage: 0, reload: 0 }
    },
    gameMode: 'zombies'
};

export function applyUpgrades() {
    for (const [wid, stats] of Object.entries(CONFIG.upgradeState)) {
        const upgrades = CONFIG.armoryUpgrades?.[wid];
        if (!upgrades) continue;
        for (const [key, tier] of Object.entries(stats)) {
            const upg = upgrades[key];
            if (upg && CONFIG.weapons[wid]) {
                CONFIG.weapons[wid][upg.stat] = upg.levels[tier];
            }
        }
    }
}

export const SETTINGS = {
    sensitivity: 1.0,
    scopeSensitivity: 0.5,
    invertY: false,
    shadows: 'high',
    fpsCounter: false,
    crosshairColor: '#ffffff',
    masterVolume: 0.4,
    sfxVolume: 0.5
};

export const COSMETICS = {
    bodyColor: '#6da3d4',
    accentColor: '#1a3550',
    headColor: '#6da3d4'
};

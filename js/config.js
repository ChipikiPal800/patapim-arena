export const CONFIG = {
    player: {
        health: 100,
        shield: 100,
        walkSpeed: 5.0,
        runSpeed: 8.0,
        sprintDrain: 15,
        sprintRegen: 20,
        jumpPower: 8.0,
        gravity: 20.0,
        mouseSensitivity: 0.002,
        scopeSensitivityMultiplier: 0.5,
        height: 1.6,
        modelColor: 0x4e7a9e
    },
    weapons: {
        pistol:  { name: "Pistol",        damage: 15,  fireRate: 0.20, range: 100, ammoPerMag: 15, reloadTime: 1.0, movementPenalty: 0,  cost: 0,   scopeZoom: 1.2, color: 0xaa8866 },
        assault: { name: "Assault Rifle", damage: 10,  fireRate: 0.08, range: 120, ammoPerMag: 30, reloadTime: 1.2, movementPenalty: 6,  cost: 50,  scopeZoom: 1.5, color: 0x6688aa },
        sniper:  { name: "Sniper",        damage: 100, fireRate: 1.20, range: 200, ammoPerMag: 5,  reloadTime: 2.0, movementPenalty: 13, cost: 215, scopeZoom: 2.5, color: 0x557766 },
        shotgun: { name: "Shotgun",       damage: 24,  pellets: 8, fireRate: 0.90, range: 50,  ammoPerMag: 6,  reloadTime: 2.5, movementPenalty: 18, cost: 75,  scopeZoom: 1.1, color: 0xaa6644 }
    },
    // Armory upgrade tiers per stat per weapon
    armoryUpgrades: {
        pistol: {
            mag:    { levels: [15, 30, 45],        costs: [30, 60],   stat: 'ammoPerMag',  label: 'Magazine' },
            damage: { levels: [15, 18, 21],        costs: [50, 100],  stat: 'damage',      label: 'Damage'   },
            reload: { levels: [1.0, 0.8, 0.6],    costs: [40, 80],   stat: 'reloadTime',  label: 'Reload',  lower: true }
        },
        assault: {
            mag:    { levels: [30, 40, 60],        costs: [40, 80],   stat: 'ammoPerMag',  label: 'Magazine' },
            damage: { levels: [10, 12, 14],        costs: [60, 120],  stat: 'damage',      label: 'Damage'   },
            reload: { levels: [1.2, 1.0, 0.8],    costs: [50, 100],  stat: 'reloadTime',  label: 'Reload',  lower: true }
        },
        sniper: {
            mag:    { levels: [5, 7, 10],          costs: [50, 100],  stat: 'ammoPerMag',  label: 'Magazine' },
            damage: { levels: [100, 120, 140],     costs: [100, 200], stat: 'damage',      label: 'Damage'   },
            reload: { levels: [2.0, 1.6, 1.2],    costs: [60, 120],  stat: 'reloadTime',  label: 'Reload',  lower: true }
        },
        shotgun: {
            mag:    { levels: [6, 8, 12],          costs: [35, 70],   stat: 'ammoPerMag',  label: 'Magazine' },
            damage: { levels: [24, 28, 32],        costs: [70, 140],  stat: 'damage',      label: 'Damage'   },
            reload: { levels: [2.5, 2.0, 1.6],    costs: [55, 110],  stat: 'reloadTime',  label: 'Reload',  lower: true }
        }
    },
    enemies: {
        blob: { health: 45, damageToPlayer: 10, speed: 2.0, size: 0.8, coinReward: 10 }
    },
    world: {
        groundSize: 200,
        tileSize: 4.0,
        killY: -10
    },
    building: {
        maxBuilds: 100,
        pieceSize: 4.0,
        placeCooldown: 0.2
    },
    // Default keybinds (rebindable)
    keybinds: {
        forward:     'KeyW',
        back:        'KeyS',
        left:        'KeyA',
        right:       'KeyD',
        jump:        'Space',
        sprint:      'ShiftLeft',
        shoot:       'Mouse0',
        scope:       'Mouse2',
        reload:      'KeyR',
        weapon1:     'Digit1',
        weapon2:     'Digit2',
        weapon3:     'Digit3',
        weapon4:     'Digit4',
        buildCycle:  'KeyQ',
        buildPlace:  'KeyE',
        buildToggle: 'KeyF',
        settings:    'Escape'
    },
    // Runtime upgrade state (mutated at runtime)
    upgradeState: {
        pistol:  { mag: 0, damage: 0, reload: 0 },
        assault: { mag: 0, damage: 0, reload: 0 },
        sniper:  { mag: 0, damage: 0, reload: 0 },
        shotgun: { mag: 0, damage: 0, reload: 0 }
    }
};

// Apply upgrade state to weapon live stats
export function applyUpgrades() {
    for (const [wid, stats] of Object.entries(CONFIG.upgradeState)) {
        const upgrades = CONFIG.armoryUpgrades[wid];
        for (const [key, tier] of Object.entries(stats)) {
            const upg = upgrades[key];
            CONFIG.weapons[wid][upg.stat] = upg.levels[tier];
        }
    }
}

// Settings (graphics, audio, controls)
export const SETTINGS = {
    sensitivity: 1.0,
    scopeSensitivity: 0.5,
    invertY: false,
    shadows: 'high',       // 'off' | 'low' | 'high'
    fpsCounter: false,
    crosshairColor: '#ffffff',
    masterVolume: 0.8,
    sfxVolume: 1.0
};

// Character cosmetics
export const COSMETICS = {
    shirtColor:  '#3a6ea5',
    pantsColor:  '#1a3a5a',
    skinColor:   '#fdd7a8'
};

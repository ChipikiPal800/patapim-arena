// config/gameConfig.js
const GAME_CONFIG = {
    // Player
    player: {
        health: 100,
        speed: 5.0,
        jumpPower: 0,           // no jump for now (ground only)
        mouseSensitivity: 0.002,
        width: 0.6,
        height: 1.6
    },

    // Weapons
    weapons: {
        pistol: {
            name: "Pistol",
            damage: 15,
            fireRate: 0.2,          // seconds
            range: 100,
            ammoPerMag: 15,
            reloadTime: 1.0,
            movementPenalty: 0,      // %
            cost: 0,
            magUpgrades: [15, 30, 45],
            magUpgradeCost: [0, 30, 60]
        },
        assault: {
            name: "Assault Rifle",
            damage: 10,
            fireRate: 0.08,
            range: 120,
            ammoPerMag: 30,
            reloadTime: 1.2,
            movementPenalty: 6,
            cost: 50,
            magUpgrades: [30, 40, 60],
            magUpgradeCost: [0, 40, 80]
        },
        sniper: {
            name: "Sniper",
            damage: 100,
            fireRate: 1.2,
            range: 200,
            ammoPerMag: 5,
            reloadTime: 2.0,
            movementPenalty: 13,
            cost: 215,
            magUpgrades: [5, 7, 10],
            magUpgradeCost: [0, 50, 100]
        },
        shotgun: {
            name: "Shotgun",
            damage: 24,          // per pellet
            pellets: 8,
            fireRate: 0.9,
            range: 50,
            ammoPerMag: 6,
            reloadTime: 2.5,
            movementPenalty: 18,
            cost: 75,
            magUpgrades: [6, 8, 12],
            magUpgradeCost: [0, 35, 70]
        }
    },

    // Enemies (blobs)
    enemies: {
        blob: {
            health: 45,
            damageToPlayer: 10,
            speed: 2.0,
            size: 0.8,
            coinReward: 10
        }
    },

    // World
    world: {
        groundSize: 200,
        wallHeight: 5
    },

    // UI
    ui: {
        crosshairColor: "#ffffff"
    }
};

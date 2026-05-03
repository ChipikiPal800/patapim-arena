export const CONFIG = {
    // Player
    player: {
        health: 100,
        shield: 100,
        walkSpeed: 4.5,
        runSpeed: 7.5,
        sprintDrain: 15,
        sprintRegen: 20,
        jumpPower: 8.0,
        gravity: 20.0,
        mouseSensitivity: 0.002,
        height: 1.6,
        modelHeight: 1.4,
        modelColor: 0x4e7a9e
    },

    // Weapons — MUST have pistol, assault, sniper, shotgun
    weapons: {
        pistol: {
            name: "Pistol",
            damage: 15,
            fireRate: 0.2,
            range: 100,
            ammoPerMag: 15,
            reloadTime: 1.0,
            movementPenalty: 0,
            cost: 0,
            scopeZoom: 1.2,
            color: 0xaa8866,
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
            scopeZoom: 1.5,
            color: 0x6688aa,
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
            scopeZoom: 2.5,
            color: 0x557766,
            magUpgrades: [5, 7, 10],
            magUpgradeCost: [0, 50, 100]
        },
        shotgun: {
            name: "Shotgun",
            damage: 24,
            pellets: 8,
            fireRate: 0.9,
            range: 50,
            ammoPerMag: 6,
            reloadTime: 2.5,
            movementPenalty: 18,
            cost: 75,
            scopeZoom: 1.1,
            color: 0xaa6644,
            magUpgrades: [6, 8, 12],
            magUpgradeCost: [0, 35, 70]
        }
    },

    // Enemies
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
        groundSize: 160,
        wallHeight: 5,
        killY: -10
    },

    // Building
    building: {
        maxBuilds: 50,
        gridSize: 3.0,
        pieceSize: 3.0
    },

    // UI
    ui: {
        crosshairColor: "#ffffff"
    }
};

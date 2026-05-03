export const CONFIG = {
    player: {
        health: 100,
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
    weapons: {
        pistol: { name: "Pistol", damage: 15, fireRate: 0.2, range: 100, ammoPerMag: 15, reloadTime: 1.0, movementPenalty: 0, cost: 0, magUpgrades: [15,30,45], scopeZoom: 1.2, color: 0xaa8866 },
        assault: { name: "AR", damage: 10, fireRate: 0.08, range: 120, ammoPerMag: 30, reloadTime: 1.2, movementPenalty: 6, cost: 50, magUpgrades: [30,40,60], scopeZoom: 1.5, color: 0x6688aa },
        sniper: { name: "Sniper", damage: 100, fireRate: 1.2, range: 200, ammoPerMag: 5, reloadTime: 2.0, movementPenalty: 13, cost: 215, magUpgrades: [5,7,10], scopeZoom: 2.5, color: 0x557766 },
        shotgun: { name: "Shotgun", damage: 24, pellets: 8, fireRate: 0.9, range: 50, ammoPerMag: 6, reloadTime: 2.5, movementPenalty: 18, cost: 75, magUpgrades: [6,8,12], scopeZoom: 1.1, color: 0xaa6644 }
    },
    enemies: { blob: { health: 45, damageToPlayer: 10, speed: 2.0, size: 0.8, coinReward: 10 } },
    world: { groundSize: 160, wallHeight: 5, killY: -10 },
    building: { maxBuilds: 50, gridSize: 2.0 }
};

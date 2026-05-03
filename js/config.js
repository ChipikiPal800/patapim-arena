// All game numbers in one place — easy to tweak
export const CONFIG = {
    player: {
        health: 100,
        speed: 5.5,
        mouseSensitivity: 0.002,
        height: 1.6,
        width: 0.6
    },
    weapons: {
        pistol: {
            name: "Pistol", damage: 15, fireRate: 0.2, range: 100, ammoPerMag: 15, reloadTime: 1.0,
            movementPenalty: 0, cost: 0
        },
        assault: {
            name: "AR", damage: 10, fireRate: 0.08, range: 120, ammoPerMag: 30, reloadTime: 1.2,
            movementPenalty: 6, cost: 50
        },
        sniper: {
            name: "Sniper", damage: 100, fireRate: 1.2, range: 200, ammoPerMag: 5, reloadTime: 2.0,
            movementPenalty: 13, cost: 215
        },
        shotgun: {
            name: "Shotgun", damage: 26, pellets: 8, fireRate: 0.9, range: 50, ammoPerMag: 6, reloadTime: 2.5,
            movementPenalty: 18, cost: 75
        }
    },
    enemies: {
        blob: { health: 45, damageToPlayer: 10, speed: 2.0, size: 0.8, coinReward: 10 }
    },
    world: {
        groundSize: 160, wallHeight: 5
    }
};

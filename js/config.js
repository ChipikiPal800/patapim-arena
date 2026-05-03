export const CONFIG = {
    player: {
        health: 100,
        shield: 100,  // added shield
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
    weapons: { /* keep your existing weapon data */ },
    enemies: { /* keep */ },
    world: { groundSize: 160, wallHeight: 5, killY: -10 },
    building: {
        maxBuilds: 50,
        gridSize: 3.0,      // larger builds (was 2.0)
        pieceSize: 3.0      // wall/floor/ramp size
    }
};

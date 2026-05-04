import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';
import { buildCharacter, animateIdle, animateWalk, animateJump, animateReset } from './character.js';

// ─── State ────────────────────────────────────────────────────────────────────
const keys = { forward:false, back:false, left:false, right:false, sprint:false, jump:false };
let yaw = 0, pitch = 0.18;
let vVel = 0, grounded = true;
let sprintPct = 100;
let swingT = 0, idleT = 0;
let buildMode = false;

export let playerPos = new THREE.Vector3(0, CONFIG.player.height, 0);

let charGroup, charRefs, gunSlot;

// ─── Create model ─────────────────────────────────────────────────────────────
export function createPlayerModel(scene) {
    const colors = {
        skin:  parseInt(COSMETICS.skinColor.replace('#',''), 16),
        shirt: parseInt(COSMETICS.shirtColor.replace('#',''), 16),
        pants: parseInt(COSMETICS.pantsColor.replace('#',''), 16),
    };
    const { group, refs } = buildCharacter(colors);
    charGroup = group;
    charRefs  = refs;
    gunSlot   = refs.gunSlot;
    scene.add(charGroup);
    return charGroup;
}

export function getGunSlot() { return gunSlot; }

// ─── Controls ─────────────────────────────────────────────────────────────────
export function initControls(camera, domEl) {
    domEl.addEventListener('click', () => domEl.requestPointerLock());

    document.addEventListener('keydown', e => {
        if (e.code === keybinds.forward) keys.forward = true;
        if (e.code === keybinds.back)    keys.back    = true;
        if (e.code === keybinds.left)    keys.left    = true;
        if (e.code === keybinds.right)   keys.right   = true;
        if (e.code === keybinds.sprint)  keys.sprint  = true;
        if (e.code === keybinds.jump)  { keys.jump = true; e.preventDefault(); }
        if (e.code === keybinds.buildToggle) {
            buildMode = !buildMode;
            if (window.onBuildModeToggle) window.onBuildModeToggle(buildMode);
        }
    });
    document.addEventListener('keyup', e => {
        if (e.code === keybinds.forward) keys.forward = false;
        if (e.code === keybinds.back)    keys.back    = false;
        if (e.code === keybinds.left)    keys.left    = false;
        if (e.code === keybinds.right)   keys.right   = false;
        if (e.code === keybinds.sprint)  keys.sprint  = false;
        if (e.code === keybinds.jump)    keys.jump    = false;
    });

    domEl.addEventListener('mousemove', e => {
        if (document.pointerLockElement !== domEl) return;
        const s = CONFIG.player.mouseSensitivity * SETTINGS.sensitivity;
        yaw   -= e.movementX * s;
        const yMult = SETTINGS.invertY ? 1 : -1;
        pitch += e.movementY * s * yMult;
        pitch  = Math.max(-0.55, Math.min(0.55, pitch));
    });
}

// ─── Per-frame update ─────────────────────────────────────────────────────────
export function updatePlayer(camera, dt, isScoped) {
    const d = Math.min(dt, 0.033);
    idleT += d;

    // Sprint
    const sprinting = keys.sprint && sprintPct > 0 && grounded && !isScoped;
    const speed = sprinting ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
    sprintPct = sprinting
        ? Math.max(0, sprintPct - CONFIG.player.sprintDrain * d)
        : Math.min(100, sprintPct + CONFIG.player.sprintRegen * d);

    // Jump
    if (keys.jump && grounded) { vVel = CONFIG.player.jumpPower; grounded = false; }

    // Gravity + vertical
    vVel -= CONFIG.player.gravity * d;
    playerPos.y += vVel * d;
    if (playerPos.y <= CONFIG.player.height) {
        playerPos.y = CONFIG.player.height;
        vVel = 0; grounded = true;
    } else { grounded = false; }

    // ── Directional move (correct WASD) ──────────────────────────────────────
    // forward  = -sin(yaw) X, -cos(yaw) Z
    // right    =  cos(yaw) X, -sin(yaw) Z
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const rgt = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
    const dir = new THREE.Vector3();
    if (keys.forward) dir.addScaledVector(fwd,  1);
    if (keys.back)    dir.addScaledVector(fwd, -1);
    if (keys.left)    dir.addScaledVector(rgt, -1); // A = strafe left  ✓
    if (keys.right)   dir.addScaledVector(rgt,  1); // D = strafe right ✓
    if (dir.length() > 0) dir.normalize();
    playerPos.addScaledVector(dir, speed * d);

    // Boundaries
    const lim = CONFIG.world.groundSize / 2 - 4;
    playerPos.x = Math.max(-lim, Math.min(lim, playerPos.x));
    playerPos.z = Math.max(-lim, Math.min(lim, playerPos.z));

    // ── Model ─────────────────────────────────────────────────────────────────
    if (charGroup) {
        charGroup.position.set(playerPos.x, 0, playerPos.z);
        charGroup.rotation.y = yaw;
    }

    // ── Animations ────────────────────────────────────────────────────────────
    if (charRefs) {
        const moving = dir.length() > 0.05 && grounded;
        if (!grounded) {
            animateJump(charRefs);
        } else if (moving) {
            swingT += d * (sprinting ? 18 : 12);
            animateWalk(charRefs, swingT, sprinting);
        } else {
            animateReset(charRefs);
            animateIdle(charRefs, idleT);
        }
        if (sprinting && charGroup) charGroup.rotation.z = -0.04;
        else if (charGroup) charGroup.rotation.z *= 0.85;
    }

    // ── Third-person camera (over-the-shoulder) ───────────────────────────────
    // Camera sits behind and above player, looking toward player's front-left
    const camDist   = isScoped ? 3.5 : 5.5;
    const camHeight = 2.4;
    // Behind = opposite of fwd
    const behindX = Math.sin(yaw) * camDist;
    const behindZ = Math.cos(yaw) * camDist;
    const targetCamPos = new THREE.Vector3(
        playerPos.x + behindX,
        playerPos.y + camHeight + pitch * 2.5,
        playerPos.z + behindZ
    );
    camera.position.lerp(targetCamPos, 0.14);

    // Look at: player head level, slightly pitched
    const lookAt = new THREE.Vector3(
        playerPos.x - Math.sin(yaw) * 1.5,
        playerPos.y + 1.0 + pitch * 1.5,
        playerPos.z - Math.cos(yaw) * 1.5
    );
    camera.lookAt(lookAt);

    return playerPos.clone();
}

// ─── Gun visuals ──────────────────────────────────────────────────────────────
export function updateGunVisuals(weaponId, gunColor) {
    if (!gunSlot) return;
    while (gunSlot.children.length) gunSlot.remove(gunSlot.children[0]);
    if (weaponId === 'pickaxe') { buildPickaxe(gunSlot); return; }

    const wp    = CONFIG.weapons[weaponId];
    const color = gunColor ? parseInt(gunColor.replace('#',''), 16) : wp.color;
    const mat   = c => new THREE.MeshLambertMaterial({ color: c });
    const m     = mat(color);
    const dark  = mat(0x1a1a1a);
    const wood  = mat(0x7a4e28);

    switch (weaponId) {
        case 'pistol':  buildPistol(gunSlot, m, dark);  break;
        case 'assault': buildAR(gunSlot, m, dark);       break;
        case 'sniper':  buildSniper(gunSlot, m, dark, wood); break;
        case 'shotgun': buildShotgun(gunSlot, m, dark, wood); break;
    }
}

function addMesh(parent, geo, mat, x,y,z, rx=0,ry=0,rz=0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x,y,z);
    m.rotation.set(rx,ry,rz);
    m.castShadow = true;
    parent.add(m);
    return m;
}
const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);
const cyl = (r1,r2,h,s=8) => new THREE.CylinderGeometry(r1,r2,h,s);

function buildPickaxe(g) {
    const m = new THREE.MeshLambertMaterial({ color:0x888888 });
    const h = new THREE.MeshLambertMaterial({ color:0x554433 });
    addMesh(g, box(0.06,0.65,0.06), h, 0,-0.1,0.12);
    addMesh(g, box(0.28,0.06,0.06), m, 0.10,0.2,0.12);
    addMesh(g, box(0.06,0.22,0.06), m, 0.22,0.26,0.12, 0,0,0.5);
}
function buildPistol(g, m, d) {
    addMesh(g, box(0.10,0.20,0.12), d, 0,-0.06,0.1);
    addMesh(g, box(0.32,0.09,0.09), m, 0.14,0.02,0.1);
    addMesh(g, box(0.22,0.07,0.07), m, 0.10,0.06,0.1);
}
function buildAR(g, m, d) {
    addMesh(g, box(0.58,0.10,0.10), m, 0.22,0,0.1);
    addMesh(g, box(0.12,0.24,0.12), d, 0.04,-0.12,0.1);
    addMesh(g, box(0.20,0.08,0.08), d, -0.22,-0.01,0.1);
    addMesh(g, box(0.07,0.20,0.07), d, 0.09,-0.16,0.1);
    addMesh(g, box(0.16,0.04,0.07), m, 0.22,0.08,0.1);
}
function buildSniper(g, m, d, wood) {
    addMesh(g, box(0.88,0.08,0.08), m, 0.38,0,0.1);
    addMesh(g, box(0.26,0.10,0.10), wood, -0.24,0,0.1);
    addMesh(g, box(0.10,0.22,0.10), d, 0.02,-0.12,0.1);
    const scopeM = new THREE.MeshLambertMaterial({ color:0x1a1a1a });
    addMesh(g, cyl(0.038,0.038,0.36,8), scopeM, 0.18,0.10,0.1, 0,0,Math.PI/2);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.038,8), new THREE.MeshLambertMaterial({color:0x88aaff}));
    lens.position.set(0.36,0.10,0.1); lens.rotation.y = Math.PI/2;
    g.add(lens);
}
function buildShotgun(g, m, d, wood) {
    addMesh(g, box(0.50,0.11,0.11), wood, 0.2,0,0.1);
    addMesh(g, cyl(0.038,0.038,0.46,8), m, 0.24,0.05,0.08, 0,0,Math.PI/2);
    addMesh(g, cyl(0.038,0.038,0.46,8), m, 0.24,-0.05,0.08, 0,0,Math.PI/2);
    addMesh(g, box(0.22,0.12,0.12), wood, -0.18,0,0.1);
}

// ─── Respawn ──────────────────────────────────────────────────────────────────
export function respawn() {
    playerPos.set(0, CONFIG.player.height, 0);
    vVel = 0; grounded = true;
}

export function isBuildMode() { return buildMode; }
export function setBuildMode(val) {
    buildMode = val;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildMode);
}

export function applyCosmetics(scene) {
    if (!charGroup || !scene) return;
    scene.remove(charGroup);
    createPlayerModel(scene);
    // Re-add gun visuals if needed
    if (window.currentWeaponId) updateGunVisuals(window.currentWeaponId);
}

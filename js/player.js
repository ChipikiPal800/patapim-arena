import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';

// ─── Input state ────────────────────────────────────────────────────────────
const keyState = { forward: false, back: false, left: false, right: false, shift: false, space: false };
let yaw   = -Math.PI / 2;
let pitch = 0.0;
let sprintPercent   = 100;
let verticalVelocity = 0;
let isGrounded = true;

// ─── Model references ────────────────────────────────────────────────────────
let playerGroup;
let leftLeg, rightLeg, leftArm, rightArm, gunModel;
let head, bodyMesh;
let legSwing = 0, armSwing = 0, idleTime = 0;

// ─── Build mode ──────────────────────────────────────────────────────────────
let buildModeActive = false;
function toggleBuildMode() {
    buildModeActive = !buildModeActive;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive);
}

let playerPosition = new THREE.Vector3(0, CONFIG.player.height, 0);

// ─── Create character ────────────────────────────────────────────────────────
export function createPlayerModel(scene) {
    playerGroup = new THREE.Group();

    const shirtColor = parseInt(COSMETICS.shirtColor.replace('#',''), 16);
    const pantsColor = parseInt(COSMETICS.pantsColor.replace('#',''), 16);
    const skinColor  = parseInt(COSMETICS.skinColor.replace('#',''), 16);

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.4 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.5 });
    const skinMat  = new THREE.MeshStandardMaterial({ color: skinColor,  roughness: 0.6 });

    // ── Torso (slimmer) ──
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.35), shirtMat);
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    playerGroup.add(bodyMesh);

    // ── Head ──
    const headGeo = new THREE.SphereGeometry(0.38, 20, 20);
    head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.62;
    head.castShadow = true;
    playerGroup.add(head);

    // Eyes
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    [-0.14, 0.14].forEach(xOff => {
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
        white.position.set(xOff, 1.67, 0.34);
        white.scale.z = 0.6;
        playerGroup.add(white);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyePupilMat);
        pupil.position.set(xOff, 1.67, 0.37);
        playerGroup.add(pupil);
    });

    // ── Arms (pivot groups for swing) ──
    const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.55, 8);
    const foreGeo = new THREE.CylinderGeometry(0.095, 0.09, 0.45, 8);

    function makeArmGroup(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.38, 1.25, 0);

        const upper = new THREE.Mesh(armGeo, shirtMat);
        upper.position.y = -0.3;
        upper.castShadow = true;
        pivot.add(upper);

        const fore = new THREE.Mesh(foreGeo, skinMat);
        fore.position.y = -0.75;
        fore.castShadow = true;
        pivot.add(fore);

        return pivot;
    }

    leftArm  = makeArmGroup(-1);
    rightArm = makeArmGroup(1);
    playerGroup.add(leftArm, rightArm);

    // ── Legs (pivot groups for swing) ──
    const upperLegGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.55, 8);
    const lowerLegGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.48, 8);

    function makeLegGroup(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.18, 0.52, 0);

        const upper = new THREE.Mesh(upperLegGeo, pantsMat);
        upper.position.y = -0.28;
        upper.castShadow = true;
        pivot.add(upper);

        const lower = new THREE.Mesh(lowerLegGeo, pantsMat);
        lower.position.y = -0.72;
        lower.castShadow = true;
        pivot.add(lower);

        // Shoe
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.32), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        shoe.position.set(0, -1.0, 0.06);
        pivot.add(shoe);

        return pivot;
    }

    leftLeg  = makeLegGroup(-1);
    rightLeg = makeLegGroup(1);
    playerGroup.add(leftLeg, rightLeg);

    // ── Gun slot (attached to right arm) ──
    gunModel = new THREE.Group();
    gunModel.position.set(0.18, -0.85, 0.22);
    rightArm.add(gunModel);

    playerGroup.position.y = 0;
    scene.add(playerGroup);
    return playerGroup;
}

// Rebuild model cosmetics (colors) without recreating geometry
export function applyCosmetics() {
    if (!playerGroup) return;
    // Rebuild model — simplest approach since it's just color
    const scene = playerGroup.parent;
    scene.remove(playerGroup);
    createPlayerModel(scene);
}

// ─── Controls ────────────────────────────────────────────────────────────────
export function initPlayerControls(camera, domElement) {
    domElement.addEventListener('click', () => domElement.requestPointerLock());

    document.addEventListener('keydown', (e) => {
        if (e.code === keybinds.forward)     keyState.forward = true;
        if (e.code === keybinds.back)        keyState.back    = true;
        if (e.code === keybinds.left)        keyState.left    = true;
        if (e.code === keybinds.right)       keyState.right   = true;
        if (e.code === keybinds.sprint)      keyState.shift   = true;
        if (e.code === keybinds.jump)      { keyState.space   = true; e.preventDefault(); }
        if (e.code === keybinds.buildToggle) toggleBuildMode();
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === keybinds.forward) keyState.forward = false;
        if (e.code === keybinds.back)    keyState.back    = false;
        if (e.code === keybinds.left)    keyState.left    = false;
        if (e.code === keybinds.right)   keyState.right   = false;
        if (e.code === keybinds.sprint)  keyState.shift   = false;
        if (e.code === keybinds.jump)    keyState.space   = false;
    });

    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== domElement) return;
        const sensMult  = SETTINGS.sensitivity;
        const baseSens  = CONFIG.player.mouseSensitivity * sensMult;
        yaw   -= e.movementX * baseSens;
        const yDir = SETTINGS.invertY ? 1 : -1;
        pitch += e.movementY * baseSens * yDir;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    });
}

// ─── Movement ────────────────────────────────────────────────────────────────
export function updatePlayerMovement(camera, deltaTime, onSprintUpdate, isScoped) {
    const dt = Math.min(deltaTime, 0.033);
    idleTime += dt;

    // Sprint logic
    const isSprinting = keyState.shift && sprintPercent > 0 && isGrounded && !isScoped;
    let currentSpeed = isSprinting ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
    if (isSprinting) {
        sprintPercent -= CONFIG.player.sprintDrain * dt;
        if (sprintPercent < 0) sprintPercent = 0;
    } else {
        sprintPercent = Math.min(100, sprintPercent + CONFIG.player.sprintRegen * dt);
    }
    if (onSprintUpdate) onSprintUpdate(sprintPercent);

    // Jump
    if (keyState.space && isGrounded) {
        verticalVelocity = CONFIG.player.jumpPower;
        isGrounded = false;
    }

    // Gravity
    verticalVelocity      -= CONFIG.player.gravity * dt;
    playerPosition.y      += verticalVelocity * dt;
    if (playerPosition.y <= CONFIG.player.height) {
        playerPosition.y   = CONFIG.player.height;
        verticalVelocity   = 0;
        isGrounded         = true;
    } else {
        isGrounded = false;
    }

    // ── Directional movement (fixed A/D) ──
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keyState.forward) moveDir.z -= 1;
    if (keyState.back)    moveDir.z += 1;
    if (keyState.left)    moveDir.x -= 1;   // A = strafe left
    if (keyState.right)   moveDir.x += 1;   // D = strafe right
    if (moveDir.length() > 0) moveDir.normalize();

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
    const move    = new THREE.Vector3();
    move.addScaledVector(forward, moveDir.z);
    move.addScaledVector(right,   moveDir.x);
    move.multiplyScalar(currentSpeed * dt);
    playerPosition.add(move);

    // Boundaries
    const limit = CONFIG.world.groundSize / 2 - 3;
    playerPosition.x = Math.max(-limit, Math.min(limit, playerPosition.x));
    playerPosition.z = Math.max(-limit, Math.min(limit, playerPosition.z));

    // ── Update model ──
    if (playerGroup) {
        playerGroup.position.copy(playerPosition);
        playerGroup.position.y = 0;
        playerGroup.rotation.y = yaw;
    }

    // ── Camera (third-person) ──
    const camDist  = isScoped ? 2.5 : 5.0;
    const camPitch = isScoped ? pitch * 0.5 : pitch;
    const behindDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const camPos = playerPosition.clone()
        .add(behindDir.multiplyScalar(camDist))
        .add(new THREE.Vector3(0, 1.4 + camPitch * 1.5, 0));
    camera.position.copy(camPos);
    camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)));

    // ── Animations ──
    const isMoving = moveDir.length() > 0.1;
    if (isMoving && isGrounded) {
        idleTime = 0;
        const swingSpeed = isSprinting ? 18 : 12;
        legSwing += dt * swingSpeed;
        armSwing += dt * swingSpeed;
        const legAngle = Math.sin(legSwing) * 0.85;
        const armAngle = Math.sin(armSwing) * 0.65;

        if (leftLeg)  leftLeg.rotation.x   =  legAngle;
        if (rightLeg) rightLeg.rotation.x  = -legAngle;
        if (leftArm)  leftArm.rotation.x   = -armAngle * 0.7;
        if (rightArm) rightArm.rotation.x  =  armAngle * 0.7;

        // Sprint lean
        if (playerGroup) playerGroup.rotation.z = isSprinting ? -0.05 : 0;

    } else if (!isGrounded) {
        // Jump pose: arms out, legs tucked
        if (leftLeg)  leftLeg.rotation.x   = -0.3;
        if (rightLeg) rightLeg.rotation.x  = -0.3;
        if (leftArm)  leftArm.rotation.x   = -0.8;
        if (rightArm) rightArm.rotation.x  = -0.8;
        if (playerGroup) playerGroup.rotation.z = 0;

    } else {
        // Idle breathing
        const breathe = Math.sin(idleTime * 1.8) * 0.025;
        if (leftLeg)  leftLeg.rotation.x   = 0;
        if (rightLeg) rightLeg.rotation.x  = 0;
        if (leftArm)  leftArm.rotation.x   = 0;
        if (rightArm) rightArm.rotation.x  = 0;
        if (bodyMesh) bodyMesh.position.y   = 0.9 + breathe;
        if (head)     head.position.y       = 1.62 + breathe;
        if (playerGroup) playerGroup.rotation.z = 0;
    }

    return playerPosition.clone();
}

// ─── Gun visuals ─────────────────────────────────────────────────────────────
export function updateGunVisuals(weaponId) {
    if (!gunModel) return;
    while (gunModel.children.length) gunModel.remove(gunModel.children[0]);

    const wp  = CONFIG.weapons[weaponId];
    const mat = new THREE.MeshStandardMaterial({ color: wp.color, roughness: 0.3, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 });

    if (weaponId === 'pistol') {
        const grip   = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), darkMat);
        grip.position.set(0, -0.08, 0.1);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.09), mat);
        barrel.position.set(0.18, 0, 0.1);
        const slide  = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), mat);
        slide.position.set(0.14, 0.04, 0.1);
        gunModel.add(grip, barrel, slide);

    } else if (weaponId === 'assault') {
        const body   = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), mat);
        body.position.set(0.25, 0, 0.1);
        const grip   = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.14), darkMat);
        grip.position.set(0.05, -0.12, 0.1);
        const stock  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.09), darkMat);
        stock.position.set(-0.27, -0.02, 0.1);
        const mag    = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), darkMat);
        mag.position.set(0.1, -0.18, 0.1);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.08), mat);
        handle.position.set(0.25, 0.09, 0.1);
        gunModel.add(body, grip, stock, mag, handle);

    } else if (weaponId === 'sniper') {
        const body   = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), mat);
        body.position.set(0.4, 0, 0.1);
        const stock  = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.12), woodMat);
        stock.position.set(-0.26, 0, 0.1);
        const grip   = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.12), darkMat);
        grip.position.set(0, -0.12, 0.1);
        // Scope
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), darkMat);
        scopeBody.rotation.z = Math.PI / 2;
        scopeBody.position.set(0.2, 0.1, 0.1);
        const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224488 }));
        scopeLens.position.set(0.39, 0.1, 0.1);
        scopeLens.rotation.y = Math.PI / 2;
        gunModel.add(body, stock, grip, scopeBody, scopeLens);

    } else if (weaponId === 'shotgun') {
        const body   = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.13, 0.13), woodMat);
        body.position.set(0.22, 0, 0.1);
        const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat);
        barrel1.rotation.z = Math.PI / 2;
        barrel1.position.set(0.28, 0.06, 0.08);
        const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat);
        barrel2.rotation.z = Math.PI / 2;
        barrel2.position.set(0.28, -0.06, 0.08);
        const stock  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.14), woodMat);
        stock.position.set(-0.19, 0, 0.1);
        gunModel.add(body, barrel1, barrel2, stock);
    }
}

// ─── Utility exports ─────────────────────────────────────────────────────────
export function respawnPlayer() {
    playerPosition.set(0, CONFIG.player.height, 0);
    verticalVelocity = 0;
    isGrounded = true;
    if (playerGroup) {
        playerGroup.position.set(0, 0, 0);
        playerGroup.rotation.set(0, -Math.PI / 2, 0);
    }
}

export function isBuildModeActive() { return buildModeActive; }

export function getPlayerGroup() { return playerGroup; }

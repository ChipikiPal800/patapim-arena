import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';

// Input state
const keyState = { forward: false, back: false, left: false, right: false, shift: false, space: false };
let yaw = -Math.PI / 2;
let pitch = 0.0;
let sprintPercent = 100;
let verticalVelocity = 0;
let isGrounded = true;

// Model references
let playerGroup;
let leftLeg, rightLeg, leftArm, rightArm, gunModel;
let head, bodyMesh;
let legSwing = 0, armSwing = 0, idleTime = 0;

// Build mode
let buildModeActive = false;

// Player position
let playerPosition = new THREE.Vector3(0, CONFIG.player.height, 0);

// Building collision
let buildables = [];

export function setBuildables(arr) {
    buildables = arr;
}

function toggleBuildMode() {
    buildModeActive = !buildModeActive;
    if (window.onBuildModeToggle) window.onBuildModeToggle(buildModeActive);
}

// Create 1v1.lol style character (humanoid dummy)
export function createPlayerModel(scene) {
    playerGroup = new THREE.Group();

    const shirtColor = parseInt(COSMETICS.shirtColor.replace('#', ''), 16);
    const pantsColor = parseInt(COSMETICS.pantsColor.replace('#', ''), 16);
    const skinColor = parseInt(COSMETICS.skinColor.replace('#', ''), 16);

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.4 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

    // Torso (slimmer, more humanoid)
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
    bodyMesh.position.y = 1.0;
    bodyMesh.castShadow = true;
    playerGroup.add(bodyMesh);

    // Head (round, smooth)
    const headGeo = new THREE.SphereGeometry(0.3, 24, 24);
    head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    playerGroup.add(head);

    // Simple eyes
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    [-0.1, 0.1].forEach(xOff => {
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeWhiteMat);
        white.position.set(xOff, 1.65, 0.26);
        white.scale.z = 0.5;
        playerGroup.add(white);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyePupilMat);
        pupil.position.set(xOff, 1.65, 0.29);
        playerGroup.add(pupil);
    });

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 8);
    const foreGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8);

    function makeArmGroup(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.32, 1.2, 0);

        const upper = new THREE.Mesh(armGeo, shirtMat);
        upper.position.y = -0.25;
        upper.castShadow = true;
        pivot.add(upper);

        const fore = new THREE.Mesh(foreGeo, skinMat);
        fore.position.y = -0.6;
        fore.castShadow = true;
        pivot.add(fore);

        return pivot;
    }

    leftArm = makeArmGroup(-1);
    rightArm = makeArmGroup(1);
    playerGroup.add(leftArm, rightArm);

    // Legs
    const upperLegGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.45, 8);
    const lowerLegGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8);

    function makeLegGroup(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.14, 0.65, 0);

        const upper = new THREE.Mesh(upperLegGeo, pantsMat);
        upper.position.y = -0.25;
        upper.castShadow = true;
        pivot.add(upper);

        const lower = new THREE.Mesh(lowerLegGeo, pantsMat);
        lower.position.y = -0.6;
        lower.castShadow = true;
        pivot.add(lower);

        // Shoe
        const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.08, 0.26),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        shoe.position.set(0, -0.85, 0.04);
        pivot.add(shoe);

        return pivot;
    }

    leftLeg = makeLegGroup(-1);
    rightLeg = makeLegGroup(1);
    playerGroup.add(leftLeg, rightLeg);

    // Gun slot
    gunModel = new THREE.Group();
    gunModel.position.set(0.15, -0.7, 0.18);
    rightArm.add(gunModel);

    playerGroup.position.y = 0;
    scene.add(playerGroup);
    return playerGroup;
}

export function applyCosmetics() {
    if (!playerGroup) return;
    const scene = playerGroup.parent;
    scene.remove(playerGroup);
    createPlayerModel(scene);
}

export function initPlayerControls(camera, domElement) {
    domElement.addEventListener('click', () => {
        if (!window.gameStarted) return;
        domElement.requestPointerLock();
    });

    document.addEventListener('keydown', (e) => {
        if (!window.gameStarted) return;
        if (e.code === keybinds.forward) keyState.forward = true;
        if (e.code === keybinds.back) keyState.back = true;
        if (e.code === keybinds.left) keyState.left = true;
        if (e.code === keybinds.right) keyState.right = true;
        if (e.code === keybinds.sprint) keyState.shift = true;
        if (e.code === keybinds.jump) { keyState.space = true; e.preventDefault(); }
        if (e.code === keybinds.buildToggle) toggleBuildMode();
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === keybinds.forward) keyState.forward = false;
        if (e.code === keybinds.back) keyState.back = false;
        if (e.code === keybinds.left) keyState.left = false;
        if (e.code === keybinds.right) keyState.right = false;
        if (e.code === keybinds.sprint) keyState.shift = false;
        if (e.code === keybinds.jump) keyState.space = false;
    });

    domElement.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== domElement) return;
        const sensMult = SETTINGS.sensitivity;
        const baseSens = CONFIG.player.mouseSensitivity * sensMult;
        yaw -= e.movementX * baseSens;
        const yDir = SETTINGS.invertY ? 1 : -1;
        pitch += e.movementY * baseSens * yDir;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    });
}

// Check collision with buildables for walking on them
function checkBuildCollision(pos, radius, height) {
    let groundY = 0;
    
    for (const build of buildables) {
        if (!build || !build.userData) continue;
        
        const bpos = build.position;
        const btype = build.userData.buildType;
        const size = CONFIG.building.pieceSize;
        
        // Check if player is within XZ bounds of this build piece
        const dx = Math.abs(pos.x - bpos.x);
        const dz = Math.abs(pos.z - bpos.z);
        
        if (btype === 'floor') {
            // Floor: flat surface
            if (dx < size / 2 && dz < size / 2) {
                const floorTop = bpos.y + 0.15;
                if (pos.y >= floorTop - 0.5 && pos.y <= floorTop + height) {
                    groundY = Math.max(groundY, floorTop);
                }
            }
        } else if (btype === 'ramp') {
            // Ramp: sloped surface
            if (dx < size / 2 && dz < size / 2) {
                // Calculate height based on position on ramp
                const rampProgress = (pos.z - bpos.z + size / 2) / size;
                const rampHeight = bpos.y + rampProgress * size * 0.5;
                if (pos.y >= rampHeight - 0.5 && pos.y <= rampHeight + height) {
                    groundY = Math.max(groundY, rampHeight);
                }
            }
        } else if (btype === 'wall') {
            // Wall: vertical barrier - push player away
            const wallHalfWidth = size / 2;
            const wallHalfDepth = 0.15;
            
            if (dx < wallHalfWidth + radius && dz < wallHalfDepth + radius) {
                if (pos.y < bpos.y + size && pos.y > bpos.y - height) {
                    // Push away from wall
                    if (dx > dz) {
                        pos.x += (pos.x > bpos.x ? 1 : -1) * 0.1;
                    } else {
                        pos.z += (pos.z > bpos.z ? 1 : -1) * 0.1;
                    }
                }
            }
        } else if (btype === 'cone') {
            // Cone: pyramid shape
            if (dx < size / 3 && dz < size / 3) {
                const coneTop = bpos.y + size * 0.8;
                if (pos.y >= bpos.y && pos.y <= coneTop + height) {
                    groundY = Math.max(groundY, coneTop);
                }
            }
        }
    }
    
    return groundY;
}

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
    verticalVelocity -= CONFIG.player.gravity * dt;
    playerPosition.y += verticalVelocity * dt;
    
    // Check build collision for ground
    const buildGroundY = checkBuildCollision(playerPosition, 0.3, CONFIG.player.height);
    const effectiveGround = Math.max(CONFIG.player.height, buildGroundY + CONFIG.player.height);
    
    if (playerPosition.y <= effectiveGround) {
        playerPosition.y = effectiveGround;
        verticalVelocity = 0;
        isGrounded = true;
    } else {
        isGrounded = false;
    }

    // Directional movement
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keyState.forward) moveDir.z -= 1;
    if (keyState.back) moveDir.z += 1;
    if (keyState.left) moveDir.x -= 1;
    if (keyState.right) moveDir.x += 1;
    if (moveDir.length() > 0) moveDir.normalize();

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();
    move.addScaledVector(forward, moveDir.z);
    move.addScaledVector(right, moveDir.x);
    move.multiplyScalar(currentSpeed * dt);
    playerPosition.add(move);

    // Boundaries
    const limit = CONFIG.world.groundSize / 2 - 3;
    playerPosition.x = Math.max(-limit, Math.min(limit, playerPosition.x));
    playerPosition.z = Math.max(-limit, Math.min(limit, playerPosition.z));

    // Update model
    if (playerGroup) {
        playerGroup.position.copy(playerPosition);
        playerGroup.position.y = playerPosition.y - CONFIG.player.height;
        playerGroup.rotation.y = yaw;
    }

    // Camera (third-person)
    const camDist = isScoped ? 2.5 : 5.0;
    const camPitch = isScoped ? pitch * 0.5 : pitch;
    const behindDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const camPos = playerPosition.clone()
        .add(behindDir.multiplyScalar(camDist))
        .add(new THREE.Vector3(0, 1.4 + camPitch * 1.5, 0));
    camera.position.copy(camPos);
    camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 0.5, 0)));

    // Animations
    const isMoving = moveDir.length() > 0.1;
    if (isMoving && isGrounded) {
        idleTime = 0;
        const swingSpeed = isSprinting ? 18 : 12;
        legSwing += dt * swingSpeed;
        armSwing += dt * swingSpeed;
        const legAngle = Math.sin(legSwing) * 0.85;
        const armAngle = Math.sin(armSwing) * 0.65;

        if (leftLeg) leftLeg.rotation.x = legAngle;
        if (rightLeg) rightLeg.rotation.x = -legAngle;
        if (leftArm) leftArm.rotation.x = -armAngle * 0.7;
        if (rightArm) rightArm.rotation.x = armAngle * 0.7;

        if (playerGroup) playerGroup.rotation.z = isSprinting ? -0.05 : 0;
    } else if (!isGrounded) {
        if (leftLeg) leftLeg.rotation.x = -0.3;
        if (rightLeg) rightLeg.rotation.x = -0.3;
        if (leftArm) leftArm.rotation.x = -0.8;
        if (rightArm) rightArm.rotation.x = -0.8;
        if (playerGroup) playerGroup.rotation.z = 0;
    } else {
        // Idle breathing animation
        const breathe = Math.sin(idleTime * 1.8) * 0.02;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (leftArm) leftArm.rotation.x = Math.sin(idleTime * 0.8) * 0.05;
        if (rightArm) rightArm.rotation.x = Math.sin(idleTime * 0.8 + 0.5) * 0.05;
        if (bodyMesh) bodyMesh.position.y = 1.0 + breathe;
        if (head) head.position.y = 1.6 + breathe;
        if (playerGroup) playerGroup.rotation.z = 0;
    }

    return playerPosition.clone();
}

export function updateGunVisuals(weaponId) {
    if (!gunModel) return;
    while (gunModel.children.length) gunModel.remove(gunModel.children[0]);

    const wp = CONFIG.weapons[weaponId];
    const mat = new THREE.MeshStandardMaterial({ color: wp.color, roughness: 0.3, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 });

    if (weaponId === 'pistol') {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.12), darkMat);
        grip.position.set(0, -0.06, 0.08);
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), mat);
        barrel.position.set(0.14, 0, 0.08);
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), mat);
        slide.position.set(0.11, 0.03, 0.08);
        gunModel.add(grip, barrel, slide);
    } else if (weaponId === 'assault') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), mat);
        body.position.set(0.2, 0, 0.08);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), darkMat);
        grip.position.set(0.04, -0.1, 0.08);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), darkMat);
        stock.position.set(-0.22, -0.02, 0.08);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), darkMat);
        mag.position.set(0.08, -0.15, 0.08);
        gunModel.add(body, grip, stock, mag);
    } else if (weaponId === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), mat);
        body.position.set(0.32, 0, 0.08);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), woodMat);
        stock.position.set(-0.2, 0, 0.08);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), darkMat);
        grip.position.set(0, -0.1, 0.08);
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), darkMat);
        scopeBody.rotation.z = Math.PI / 2;
        scopeBody.position.set(0.15, 0.08, 0.08);
        gunModel.add(body, stock, grip, scopeBody);
    } else if (weaponId === 'shotgun') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.1), woodMat);
        body.position.set(0.18, 0, 0.08);
        const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), mat);
        barrel1.rotation.z = Math.PI / 2;
        barrel1.position.set(0.22, 0.04, 0.06);
        const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), mat);
        barrel2.rotation.z = Math.PI / 2;
        barrel2.position.set(0.22, -0.04, 0.06);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.11), woodMat);
        stock.position.set(-0.15, 0, 0.08);
        gunModel.add(body, barrel1, barrel2, stock);
    }
}

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
export function setBuildModeActive(val) { 
    buildModeActive = val; 
    if (window.onBuildModeToggle) window.onBuildModeToggle(val);
}
export function getPlayerGroup() { return playerGroup; }
export function getPlayerPosition() { return playerPosition.clone(); }
export function getPlayerYaw() { return yaw; }

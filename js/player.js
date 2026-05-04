import * as THREE from 'three';
import { CONFIG, SETTINGS, COSMETICS } from './config.js';
import { keybinds } from './keybinds.js';

// Input state
export const input = {
    forward: false, back: false, left: false, right: false,
    jump: false, sprint: false, scope: false, shoot: false,
    yaw: 0, pitch: 0,
    mouseDX: 0, mouseDY: 0
};

// Player state
export const player = {
    object: null,        // root group (world position)
    rig: null,           // body rig (rotates with yaw, animates)
    head: null,
    body: null,
    leftArm: null, rightArm: null,
    leftLeg: null, rightLeg: null,
    camera: null,
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    health: 100,
    shield: 100,
    stamina: 100,
    onGround: false,
    walkCycle: 0,
    speedSmooth: 0,
    coins: 0,
    alive: true,
    targetFOV: 75,
    currentFOV: 75,
    // gun anim state
    gunBob: new THREE.Vector3(),
    gunRecoil: new THREE.Vector3(),
    gunRecoilVel: new THREE.Vector3(),
    aimBlend: 0,
    bodyHeight: CONFIG.player.height
};

// 1v1.lol style blocky character - faceless, no human features
export function buildPlayerModel() {
    const root = new THREE.Group();

    // Rig (everything that animates with the body, separate from camera)
    const rig = new THREE.Group();
    root.add(rig);

    const bodyMat = new THREE.MeshLambertMaterial({ color: COSMETICS.bodyColor });
    const accentMat = new THREE.MeshLambertMaterial({ color: COSMETICS.accentColor });
    const headMat = new THREE.MeshLambertMaterial({ color: COSMETICS.headColor });

    // Torso - blocky box (1v1.lol style)
    const torsoGroup = new THREE.Group();
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.85, 0.45),
        bodyMat
    );
    torso.position.y = 0;
    torso.castShadow = true;
    torsoGroup.add(torso);

    // Chest stripe (accent)
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.71, 0.1, 0.46),
        accentMat
    );
    stripe.position.y = 0.15;
    torsoGroup.add(stripe);

    // Belt
    const belt = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.12, 0.47),
        accentMat
    );
    belt.position.y = -0.4;
    torsoGroup.add(belt);

    torsoGroup.position.y = 1.05;
    rig.add(torsoGroup);

    // Head - blocky cube, NO face features
    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        headMat
    );
    head.castShadow = true;
    headGroup.add(head);
    headGroup.position.y = 1.75;
    rig.add(headGroup);

    // Helper to make an articulated limb (upper + lower segment with pivot)
    function makeArm(side) {
        const shoulder = new THREE.Group();
        const upperArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.42, 0.22),
            bodyMat
        );
        upperArm.position.y = -0.21;
        upperArm.castShadow = true;
        shoulder.add(upperArm);

        const elbow = new THREE.Group();
        elbow.position.y = -0.42;
        const lowerArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.42, 0.2),
            bodyMat
        );
        lowerArm.position.y = -0.21;
        lowerArm.castShadow = true;
        elbow.add(lowerArm);

        // Stripe on lower arm (accent)
        const armStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.21, 0.06, 0.21),
            accentMat
        );
        armStripe.position.y = -0.05;
        elbow.add(armStripe);

        shoulder.add(elbow);
        shoulder.userData.elbow = elbow;
        return shoulder;
    }

    function makeLeg(side) {
        const hip = new THREE.Group();
        const upperLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.45, 0.28),
            accentMat
        );
        upperLeg.position.y = -0.225;
        upperLeg.castShadow = true;
        hip.add(upperLeg);

        const knee = new THREE.Group();
        knee.position.y = -0.45;
        const lowerLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.45, 0.27),
            accentMat
        );
        lowerLeg.position.y = -0.225;
        lowerLeg.castShadow = true;
        knee.add(lowerLeg);

        // Foot
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.1, 0.36),
            new THREE.MeshLambertMaterial({ color: 0x111111 })
        );
        foot.position.set(0, -0.46, 0.04);
        foot.castShadow = true;
        knee.add(foot);

        hip.add(knee);
        hip.userData.knee = knee;
        return hip;
    }

    const leftArm = makeArm(-1);
    leftArm.position.set(-0.46, 1.4, 0);
    rig.add(leftArm);

    const rightArm = makeArm(1);
    rightArm.position.set(0.46, 1.4, 0);
    rig.add(rightArm);

    const leftLeg = makeLeg(-1);
    leftLeg.position.set(-0.18, 0.6, 0);
    rig.add(leftLeg);

    const rightLeg = makeLeg(1);
    rightLeg.position.set(0.18, 0.6, 0);
    rig.add(rightLeg);

    player.head = headGroup;
    player.body = torsoGroup;
    player.leftArm = leftArm;
    player.rightArm = rightArm;
    player.leftLeg = leftLeg;
    player.rightLeg = rightLeg;
    player.rig = rig;

    return root;
}

export function setupPlayer(scene, camera) {
    player.camera = camera;
    const model = buildPlayerModel();
    model.position.set(0, 0, 0);
    scene.add(model);
    player.object = model;
    // Hide player's own body from FPS camera (rig stays for shadow casting on ground)
    // We keep the rig but hide head and torso from in front of camera by clipping logic
    // Simple approach: hide head only (camera is inside head)
    if (player.head) player.head.visible = false;
}

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

export function updatePlayer(dt, collide) {
    if (!player.alive) return;

    // Mouse look
    const sens = CONFIG.player.mouseSensitivity * SETTINGS.sensitivity;
    const scopeSens = player.aimBlend > 0.5 ? CONFIG.player.scopeSensitivityMultiplier : 1.0;
    player.yaw -= input.mouseDX * sens * scopeSens;
    player.pitch -= input.mouseDY * sens * scopeSens * (SETTINGS.invertY ? -1 : 1);
    player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
    input.mouseDX = 0;
    input.mouseDY = 0;

    // Movement direction
    tmpForward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    tmpRight.set(Math.sin(player.yaw + Math.PI / 2), 0, Math.cos(player.yaw + Math.PI / 2));

    tmpMove.set(0, 0, 0);
    if (input.forward) tmpMove.sub(tmpForward);
    if (input.back) tmpMove.add(tmpForward);
    if (input.left) tmpMove.sub(tmpRight);
    if (input.right) tmpMove.add(tmpRight);

    if (tmpMove.lengthSq() > 0) tmpMove.normalize();

    // Speed
    let speed = CONFIG.player.walkSpeed;
    if (input.sprint && player.stamina > 0 && tmpMove.lengthSq() > 0 && !player.scoping) {
        speed = CONFIG.player.runSpeed;
        player.stamina = Math.max(0, player.stamina - CONFIG.player.sprintDrain * dt);
    } else {
        player.stamina = Math.min(100, player.stamina + CONFIG.player.sprintRegen * dt);
    }
    if (player.aimBlend > 0.5) speed *= 0.55;

    player.velocity.x = tmpMove.x * speed;
    player.velocity.z = tmpMove.z * speed;

    // Gravity & jump
    player.velocity.y -= CONFIG.player.gravity * dt;
    if (input.jump && player.onGround) {
        player.velocity.y = CONFIG.player.jumpPower;
        player.onGround = false;
    }

    // Apply movement with collision
    const next = player.object.position.clone();
    next.x += player.velocity.x * dt;
    next.z += player.velocity.z * dt;
    next.y += player.velocity.y * dt;

    if (collide) {
        const result = collide(player.object.position, next, player.velocity);
        next.copy(result.position);
        player.velocity.copy(result.velocity);
        player.onGround = result.onGround;
    } else {
        // Default: ground at y=0
        if (next.y < 0) {
            next.y = 0;
            player.velocity.y = 0;
            player.onGround = true;
        }
    }

    player.object.position.copy(next);

    // Death plane
    if (player.object.position.y < CONFIG.world.killY) {
        player.health = 0;
    }

    // Animate body & rotate with yaw
    if (player.rig) {
        player.rig.rotation.y = player.yaw;
        animateBody(dt, tmpMove.lengthSq() > 0, speed);
    }

    // Camera position - inside head
    const camY = player.object.position.y + CONFIG.player.height + Math.sin(player.walkCycle) * 0.04 * player.speedSmooth;
    player.camera.position.set(player.object.position.x, camY, player.object.position.z);
    player.camera.rotation.order = 'YXZ';
    player.camera.rotation.y = player.yaw;
    player.camera.rotation.x = player.pitch;

    // FOV / scope animation
    player.currentFOV += (player.targetFOV - player.currentFOV) * Math.min(1, dt * 12);
    player.camera.fov = player.currentFOV;
    player.camera.updateProjectionMatrix();

    // Scope blend
    const targetAim = input.scope ? 1 : 0;
    player.aimBlend += (targetAim - player.aimBlend) * Math.min(1, dt * 10);
}

function animateBody(dt, moving, speed) {
    // Smooth speed value for animation
    const targetSpeed = moving ? speed / CONFIG.player.runSpeed : 0;
    player.speedSmooth += (targetSpeed - player.speedSmooth) * Math.min(1, dt * 10);

    if (moving) {
        player.walkCycle += dt * (8 + speed * 0.6);
    } else {
        // Slow idle bob
        player.walkCycle += dt * 1.5;
    }

    const cycle = player.walkCycle;
    const intensity = player.speedSmooth;

    // Legs swing forward/back
    const legSwing = Math.sin(cycle) * 0.7 * intensity;
    if (player.leftLeg) {
        player.leftLeg.rotation.x = legSwing;
        const leftKnee = player.leftLeg.userData.knee;
        if (leftKnee) leftKnee.rotation.x = Math.max(0, -Math.sin(cycle) * 0.6) * intensity;
    }
    if (player.rightLeg) {
        player.rightLeg.rotation.x = -legSwing;
        const rightKnee = player.rightLeg.userData.knee;
        if (rightKnee) rightKnee.rotation.x = Math.max(0, Math.sin(cycle) * 0.6) * intensity;
    }

    // Arms swing - but the holding arm (right) holds the gun towards chest
    // Aim blend: when aiming, arms come up; when running, arms swing more
    const armBase = THREE.MathUtils.lerp(-0.3, -1.4, player.aimBlend);  // x rotation
    const armRunSwing = Math.sin(cycle) * 0.5 * intensity * (1 - player.aimBlend);

    if (player.leftArm) {
        player.leftArm.rotation.x = armBase + armRunSwing;
        player.leftArm.rotation.z = THREE.MathUtils.lerp(0.1, 0.4, player.aimBlend);
        const leftElbow = player.leftArm.userData.elbow;
        if (leftElbow) leftElbow.rotation.x = THREE.MathUtils.lerp(0.2, 0.9, player.aimBlend);
    }
    if (player.rightArm) {
        player.rightArm.rotation.x = armBase - armRunSwing;
        player.rightArm.rotation.z = THREE.MathUtils.lerp(-0.1, -0.4, player.aimBlend);
        const rightElbow = player.rightArm.userData.elbow;
        if (rightElbow) rightElbow.rotation.x = THREE.MathUtils.lerp(0.2, 0.9, player.aimBlend);
    }

    // Body subtle tilt when running
    if (player.body) {
        player.body.rotation.x = intensity * 0.05;
        player.body.position.y = 1.05 + Math.abs(Math.sin(cycle * 2)) * 0.03 * intensity;
    }
}

// Pointer lock + input handlers
export function setupInput(canvas) {
    canvas.addEventListener('click', () => {
        if (!document.pointerLockElement) canvas.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement) {
            input.mouseDX += e.movementX;
            input.mouseDY += e.movementY;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!document.pointerLockElement) return;
        if (e.button === 0) input.shoot = true;
        if (e.button === 2) input.scope = true;
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) input.shoot = false;
        if (e.button === 2) input.scope = false;
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
        if (!document.pointerLockElement && e.code !== 'Escape') return;
        if (e.code === keybinds.forward) input.forward = true;
        if (e.code === keybinds.back) input.back = true;
        if (e.code === keybinds.left) input.left = true;
        if (e.code === keybinds.right) input.right = true;
        if (e.code === keybinds.jump) input.jump = true;
        if (e.code === keybinds.sprint) input.sprint = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === keybinds.forward) input.forward = false;
        if (e.code === keybinds.back) input.back = false;
        if (e.code === keybinds.left) input.left = false;
        if (e.code === keybinds.right) input.right = false;
        if (e.code === keybinds.jump) input.jump = false;
        if (e.code === keybinds.sprint) input.sprint = false;
    });
}

export function damagePlayer(amount) {
    if (player.shield > 0) {
        const absorbed = Math.min(player.shield, amount);
        player.shield -= absorbed;
        amount -= absorbed;
    }
    player.health = Math.max(0, player.health - amount);
    if (player.health <= 0) {
        player.alive = false;
    }
}

export function resetPlayer(spawnPos) {
    player.health = CONFIG.player.health;
    player.shield = CONFIG.player.shield;
    player.stamina = 100;
    player.alive = true;
    player.velocity.set(0, 0, 0);
    if (player.object && spawnPos) {
        player.object.position.copy(spawnPos);
    }
}

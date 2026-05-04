import * as THREE from 'three';
import { COSMETICS } from './config.js';

// Builds the 1v1.lol style blocky character.
// Returns { group, refs } where refs has named mesh references for animation.
export function buildCharacter(colors) {
    const c = colors || {
        skin:  parseInt(COSMETICS.skinColor.replace('#',''), 16),
        shirt: parseInt(COSMETICS.shirtColor.replace('#',''), 16),
        pants: parseInt(COSMETICS.pantsColor.replace('#',''), 16),
    };

    const mat = (hex, rough=0.7, metal=0.0) =>
        new THREE.MeshLambertMaterial({ color: hex });

    const skinM  = mat(c.skin);
    const shirtM = mat(c.shirt);
    const pantsM = mat(c.pants);
    const shoeM  = mat(0x111111);
    const eyeM   = mat(0x111111);

    const group = new THREE.Group();
    const refs  = {};

    // ── Head ─────────────────────────────────────────────────
    refs.head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.85, 0.82), skinM.clone());
    refs.head.position.y = 1.98;
    refs.head.castShadow = true;
    group.add(refs.head);

    // Eyes (dark rectangles on front face)
    const eyeGeo = new THREE.BoxGeometry(0.16, 0.12, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, eyeM);
    const eyeR = new THREE.Mesh(eyeGeo, eyeM);
    eyeL.position.set(-0.18, 2.04, 0.42);
    eyeR.position.set( 0.18, 2.04, 0.42);
    group.add(eyeL, eyeR);

    // ── Torso ─────────────────────────────────────────────────
    refs.torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.42), shirtM.clone());
    refs.torso.position.y = 1.22;
    refs.torso.castShadow = true;
    group.add(refs.torso);

    // ── Arm pivots (for swing animation) ─────────────────────
    function makeArm(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.52, 1.58, 0);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), shirtM.clone());
        upper.position.y = -0.22;
        upper.castShadow = true;
        pivot.add(upper);

        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), skinM.clone());
        lower.position.y = -0.60;
        lower.castShadow = true;
        pivot.add(lower);
        pivot.userData.lower = lower;
        return pivot;
    }
    refs.armL = makeArm(-1);
    refs.armR = makeArm( 1);
    group.add(refs.armL, refs.armR);

    // ── Leg pivots ────────────────────────────────────────────
    function makeLeg(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.19, 0.84, 0);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.32), pantsM.clone());
        upper.position.y = -0.24;
        upper.castShadow = true;
        pivot.add(upper);

        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), pantsM.clone());
        lower.position.y = -0.66;
        lower.castShadow = true;
        pivot.add(lower);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), shoeM);
        shoe.position.set(0, -0.94, 0.06);
        pivot.add(shoe);

        return pivot;
    }
    refs.legL = makeLeg(-1);
    refs.legR = makeLeg( 1);
    group.add(refs.legL, refs.legR);

    // ── Gun slot on right arm ─────────────────────────────────
    refs.gunSlot = new THREE.Group();
    refs.gunSlot.position.set(0.15, -0.72, 0.22);
    refs.armR.add(refs.gunSlot);

    group.position.y = 0;
    return { group, refs };
}

// Apply cosmetics to an existing character's material colors
export function refreshCharacterColors(refs, colors) {
    const c = colors || {
        skin:  parseInt(COSMETICS.skinColor.replace('#',''), 16),
        shirt: parseInt(COSMETICS.shirtColor.replace('#',''), 16),
        pants: parseInt(COSMETICS.pantsColor.replace('#',''), 16),
    };
    const setColor = (mesh, hex) => { if (mesh?.material) mesh.material.color.setHex(hex); };
    setColor(refs.head,  c.skin);
    setColor(refs.torso, c.shirt);
    // Arms + legs: traverse and update based on position
    [refs.armL, refs.armR].forEach(arm => {
        arm.children.forEach((ch, i) => setColor(ch, i===0 ? c.shirt : c.skin));
    });
    [refs.legL, refs.legR].forEach(leg => {
        leg.children.slice(0,2).forEach(ch => setColor(ch, c.pants));
    });
}

// Animate idle breathing
export function animateIdle(refs, t) {
    if (!refs.torso) return;
    const b = Math.sin(t * 1.6) * 0.018;
    refs.torso.position.y = 1.22 + b;
    refs.head.position.y  = 1.98 + b;
}

// Animate walking / running
export function animateWalk(refs, swing, sprinting) {
    const leg  = Math.sin(swing) * (sprinting ? 1.0 : 0.72);
    const arm  = Math.sin(swing) * (sprinting ? 0.8 : 0.55);
    refs.legL.rotation.x =  leg;
    refs.legR.rotation.x = -leg;
    refs.armL.rotation.x = -arm;
    refs.armR.rotation.x =  arm;
}

// Animate jump pose
export function animateJump(refs) {
    refs.legL.rotation.x = -0.35;
    refs.legR.rotation.x = -0.35;
    refs.armL.rotation.x = -0.9;
    refs.armR.rotation.x = -0.9;
}

// Reset to idle pose
export function animateReset(refs) {
    refs.legL.rotation.x = 0;
    refs.legR.rotation.x = 0;
    refs.armL.rotation.x = 0;
    refs.armR.rotation.x = 0;
}

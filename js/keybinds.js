import { CONFIG } from './config.js';

export const keybinds = { ...CONFIG.keybinds };

export function setKeybind(action, code) {
    keybinds[action] = code;
}

export function isAction(e, action) {
    return e.code === keybinds[action];
}

export function getKeybindLabel(action) {
    const code = keybinds[action];
    if (!code) return '?';
    return code
        .replace('Key', '')
        .replace('Digit', '')
        .replace('ShiftLeft', 'Shift')
        .replace('ShiftRight', 'Shift')
        .replace('Space', 'Space')
        .replace('Escape', 'ESC')
        .replace('Mouse0', 'LMB')
        .replace('Mouse2', 'RMB');
}

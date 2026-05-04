export const CONFIG = {
    player: {
        health: 100, shield: 100,
        walkSpeed: 7.0, runSpeed: 11.0,
        sprintDrain: 12, sprintRegen: 18,
        jumpPower: 10.0, gravity: 24.0,
        mouseSensitivity: 0.0022, height: 0.9,
        modelColor: 0x4e7a9e
    },
    weapons: {
        pickaxe: { name:'Harvesting Tool', damage:20, fireRate:0.6, range:3,   ammoPerMag:999, reloadTime:0, movementPenalty:0,  cost:0,   scopeZoom:1.0, color:0xaaaaaa, melee:true },
        pistol:  { name:'Pistol',          damage:18, fireRate:0.22,range:80,  ammoPerMag:15, reloadTime:1.0, movementPenalty:0,  cost:0,   scopeZoom:1.2, color:0xaa8866 },
        assault: { name:'Assault Rifle',   damage:11, fireRate:0.09,range:120, ammoPerMag:30, reloadTime:1.2, movementPenalty:4,  cost:50,  scopeZoom:1.5, color:0x6688aa },
        sniper:  { name:'Sniper Rifle',    damage:105,fireRate:1.4, range:200, ammoPerMag:5,  reloadTime:2.2, movementPenalty:14, cost:215, scopeZoom:3.0, color:0x557766 },
        shotgun: { name:'Shotgun',         damage:26, pellets:8, fireRate:0.95,range:50,  ammoPerMag:6,  reloadTime:2.5, movementPenalty:18, cost:75,  scopeZoom:1.1, color:0xaa6644 }
    },
    enemies: {
        blob: { health:60, damageToPlayer:8, speed:2.2, size:0.9, coinReward:15 }
    },
    world: { groundSize:200, tileSize:6.0, killY:-15 },
    building: { pieceSize:6.0, maxBuilds:80, placeCooldown:0.18 },
    // Keybinds
    keybinds: {
        forward:'KeyW', back:'KeyS', left:'KeyA', right:'KeyD',
        jump:'Space', sprint:'ShiftLeft', reload:'KeyR',
        weapon1:'Digit1', weapon2:'Digit2', weapon3:'Digit3',
        weapon4:'Digit4', weapon5:'Digit5',
        buildCycle:'KeyQ', buildPlace:'Mouse0', buildToggle:'KeyF',
        settings:'Escape'
    }
};

// Battlepass tiers (50)
export const BATTLEPASS_TIERS = (() => {
    const t = [];
    const rewards = [
        {type:'coins',amount:100},{type:'fanterCoins',amount:50},{type:'coins',amount:150},
        {type:'cosmetic',id:'arctic_shirt',name:'Arctic Blue Shirt'},{type:'coins',amount:200},
        {type:'fanterCoins',amount:80},{type:'coins',amount:250},{type:'cosmetic',id:'gold_pants',name:'Gold Pants'},
        {type:'coins',amount:300},{type:'fanterCoins',amount:120},
        {type:'attachment',id:'red_dot',weapon:'all',name:'Red Dot Sight'},{type:'coins',amount:350},
        {type:'fanterCoins',amount:150},{type:'cosmetic',id:'shadow_skin',name:'Shadow Skin'},
        {type:'coins',amount:400},{type:'fanterCoins',amount:180},
        {type:'attachment',id:'suppressor',weapon:'all',name:'Suppressor'},{type:'coins',amount:450},
        {type:'cosmetic',id:'neon_shirt',name:'Neon Shirt'},{type:'fanterCoins',amount:200},
        {type:'coins',amount:500},{type:'attachment',id:'extended_mag',weapon:'all',name:'Extended Mag'},
        {type:'fanterCoins',amount:250},{type:'coins',amount:400},{type:'cosmetic',id:'phantom_skin',name:'Phantom Skin'},
        {type:'fanterCoins',amount:300},{type:'coins',amount:350},{type:'attachment',id:'angled_grip',weapon:'all',name:'Angled Grip'},
        {type:'coins',amount:500},{type:'fanterCoins',amount:350},
        {type:'cosmetic',id:'golden_shirt',name:'Golden Shirt'},{type:'coins',amount:450},
        {type:'attachment',id:'acog',weapon:'all',name:'ACOG Scope'},{type:'fanterCoins',amount:400},
        {type:'coins',amount:600},{type:'cosmetic',id:'midnight_skin',name:'Midnight Skin'},
        {type:'fanterCoins',amount:450},{type:'coins',amount:500},
        {type:'attachment',id:'heavy_barrel',weapon:'all',name:'Heavy Barrel'},{type:'fanterCoins',amount:500},
        {type:'coins',amount:600},{type:'cosmetic',id:'crimson_pants',name:'Crimson Pants'},
        {type:'fanterCoins',amount:550},{type:'coins',amount:700},
        {type:'attachment',id:'variable_scope',weapon:'all',name:'Variable Scope'},{type:'fanterCoins',amount:600},
        {type:'coins',amount:800},{type:'cosmetic',id:'elite_skin',name:'Elite Skin'},
        {type:'fanterCoins',amount:800},{type:'coins',amount:1000}
    ];
    for (let i=0;i<50;i++) t.push({ tier:i+1, reward: rewards[i] || {type:'coins',amount:100} });
    return t;
})();

// Runtime player state (mutated)
export const STATE = {
    coins: 500,
    fanterCoins: 0,
    kills: 0,
    deaths: 0,
    roundsCompleted: 0,
    username: 'Player',
    level: 1,
    currentRound: 1,
    battlepassTier: 1,
    battlepassProgress: 0, // rounds toward next tier (need 3)
    unlockedAttachments: new Set(),
    activeAttachments: { pistol:{}, assault:{}, sniper:{}, shotgun:{} },
    gunColors: { pistol:'default', assault:'default', sniper:'default', shotgun:'default' }
};

// Cosmetics
export const COSMETICS = {
    shirtColor: '#3a6ea5',
    pantsColor: '#1a3a5a',
    skinColor:  '#e8c49a'
};

// Weapon attachments catalog
export const ATTACHMENTS = {
    red_dot:       { name:'Red Dot',       slot:'optic',    fanterCost:0,   coinCost:100,  desc:'Clean sight picture',    stats:{ accuracy:+6 } },
    holographic:   { name:'Holographic',   slot:'optic',    fanterCost:80,  coinCost:0,    desc:'Wide holographic reticle',stats:{ accuracy:+8 } },
    acog:          { name:'ACOG Scope',    slot:'optic',    fanterCost:120, coinCost:0,    desc:'4× magnification',        stats:{ range:+15, mobility:-4 } },
    variable_scope:{ name:'Variable Scope',slot:'optic',    fanterCost:200, coinCost:0,    desc:'Adjustable zoom',         stats:{ range:+25, mobility:-8 } },
    suppressor:    { name:'Suppressor',    slot:'muzzle',   fanterCost:100, coinCost:0,    desc:'Sound & flash reduced',   stats:{ range:+5, damage:-3 } },
    muzzle_brake:  { name:'Muzzle Brake',  slot:'muzzle',   fanterCost:0,   coinCost:80,   desc:'Reduces recoil',          stats:{ accuracy:+5 } },
    heavy_barrel:  { name:'Heavy Barrel',  slot:'barrel',   fanterCost:150, coinCost:0,    desc:'Increased bullet velocity',stats:{ damage:+5, range:+10 } },
    extended_barrel:{ name:'Ext. Barrel',  slot:'barrel',   fanterCost:0,   coinCost:120,  desc:'Longer range',            stats:{ range:+12 } },
    extended_mag:  { name:'Extended Mag',  slot:'magazine', fanterCost:0,   coinCost:90,   desc:'+50% magazine capacity',  stats:{ magMult:1.5 } },
    drum_mag:      { name:'Drum Mag',      slot:'magazine', fanterCost:180, coinCost:0,    desc:'Double capacity',         stats:{ magMult:2.0, reload:+0.8 } },
    angled_grip:   { name:'Angled Grip',   slot:'underbarrel',fanterCost:0, coinCost:70,   desc:'Faster ADS',              stats:{ mobility:+4 } },
    vertical_grip: { name:'Vertical Grip', slot:'underbarrel',fanterCost:60, coinCost:0,   desc:'Recoil control',          stats:{ accuracy:+4 } },
};

// Gun color skins (fanter coins)
export const GUN_COLORS = {
    default: { name:'Default', fanterCost:0,   colors:null },
    gold:    { name:'Gold',    fanterCost:100,  colors:{ main:0xd4a017, accent:0xffd700 } },
    chrome:  { name:'Chrome',  fanterCost:150,  colors:{ main:0xcccccc, accent:0xffffff } },
    arctic:  { name:'Arctic',  fanterCost:200,  colors:{ main:0x9bbcd9, accent:0xddeeff } },
    lava:    { name:'Lava',    fanterCost:250,  colors:{ main:0x8b2000, accent:0xff4400 } },
    void:    { name:'Void',    fanterCost:300,  colors:{ main:0x200030, accent:0xaa44ff } },
};

// Settings
export const SETTINGS = {
    sensitivity: 1.0, scopeSensitivity: 0.45,
    invertY: false, fov: 75,
    shadows: 'high', antiAlias: true,
    fpsCounter: false, crosshairColor: '#ffffff',
    crosshairStyle: 'cross', // 'cross' | 'dot' | 'circle'
    masterVolume: 0.8, sfxVolume: 1.0,
    showBuildGrid: true
};

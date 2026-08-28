const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// HIGH-DEFINITION RETINA RENDER RATIO ENGINE
let dpr = window.devicePixelRatio || 1;
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
ctx.scale(dpr, dpr);



let coinsCount = 0;
let totalScore = 0;
let cameraY = 0; 
let isGameOver = false;
let screenShake = 0;

// States for Menu and Countdown Management
let isMenuMode = true;
let isCountingDown = false;

let isHooked = false;
let hookedPlanet = null;
let hookAngle = 0;
let hookRadius = 0;
let orbitDirection = 1; 

let particles = [];
let planets = [];
let coins = [];
let asteroids = [];
let magnets = []; 
let shields = [];    
let portals = [];    
let stars = []; // Added for realistic galaxy stars
// Moving universe backgrounds switcher configuration parameter
let isStarsEnabled = localStorage.getItem("vortex_stars_enabled") !== "false"; // Default to true if unassigned
let activeShootingStar = null; // Holds the active meteor object data structure
let asteroidTrailParticles = []; // new tracks trail asteroid

// POWERUP TRACKERS
let magnetActiveTime = 0; 
let isShieldActive = false; 

// ==========================================
// NEW SYSTEM TRACKERS (COMBOS & POPUPS)
// ==========================================

let currentCombo = 1;         // Internal consecutive streak tracker
let lastPlanetHooked = null;  // Prevents farming the exact same planet
let comboTimer = 0;          // Time window left to hit the next planet
const COMBO_WINDOW = 90;      // 1.5 seconds at 60fps (Fast, precise pacing!)
const MAX_COMBO_LIMIT = 7;    // Maximum streak layer cap (stops runaway scoring)
let floatingPopups = [];     // Array holding active drifting text labels
// ==========================================
// MILESTONE ALERT BANNER SYSTEM VARIABLES
// ==========================================
let activeBannerText = "";      // Stores the message string to draw
let bannerDisplayTimer = 0;     // Remaining frames to show the banner
let hasTriggered100Alert = false; // Prevents alert from re-triggering constantly
let hasTriggered200Alert = false; // Prevents alert from re-triggering constantly



// Volatile planet timer variable
let planetFuseTimer = 0; // Tracks frames held on Planet 4


// Progress Bar Tracker configurations
const MILESTONE_TARGET = 300; // The peak score of the bar tracker height


// ANTI-AFK TIMERS & INACTIVITY TRACKERS
let afkTimer = 0; 
const AFK_LIMIT = 210; 

// REALISTIC AERODYNAMIC STALL VARIABLES
let afkStallActive = false; 
let afkGravityForce = 0.06;  
let afkAirResistance = 0.992; 

// OPTIONS TERMINAL CONFIGURATIONS
let isSfxEnabled = localStorage.getItem("vortexSfx") !== "false";
let isShakeEnabled = localStorage.getItem("vortexShake") !== "false";

// Dynamic Background Transition State
let currentBgColors = { inner: '#0f0f23', outer: '#05050b' };

// --- SHOP ANTI-SPAM REGULATOR ENGINES ---
let isPurchaseOnCooldown = false; // Prevents double-clicking store cards

// Generate background stars array for depth
function generateBackdropStars() {

        // ====================================================
    // REFINED: DEEP SPACE SLOW-BREATHING PINPOINT STARFIELD
    // ====================================================
    stars = []; 
    for (let i = 0; i < 130; i++) {
        let depthLayer = Math.floor(randRange(1, 4));
        let speedMult = depthLayer === 1 ? 0.15 : (depthLayer === 2 ? 0.45 : 0.85);
        
        stars.push({
            x: randRange(0, window.innerWidth),
            y: randRange(0, window.innerHeight),
            radius: depthLayer === 1 ? randRange(0.4, 0.7) : (depthLayer === 2 ? randRange(0.8, 1.2) : randRange(1.3, 1.8)),
            speedFactor: speedMult, 
            baseAlpha: randRange(0.25, 0.65), // Muted starting brightness bounds
            // NEW: Ultra-slow twinkle speed multiplier (ranges from 0.003 to 0.007)
            twinkleSpeed: randRange(0.003, 0.007), 
            twinkleOffset: randRange(0, Math.PI * 2) // Drifts the wave timing so they stay out of sync
        });
    }


}
generateBackdropStars();

// ==========================================
// IMAGE MODEL ASSET PRELOAD MATRIX
// ==========================================
// Preload 16 Planet Model Images safely into memory (Expanded from 8)
const TOTAL_PLANETS = 16;
const planetModels = [];
let loadedPlanetsCount = 0;

for (let i = 1; i <= TOTAL_PLANETS; i++) {
    let img = new Image();
    img.src = `models/planet${i}.png`;
    
    img.onload = () => { loadedPlanetsCount++; };
    img.onerror = () => {
        // Fallback protection engine layout so missing higher tier assets don't freeze loading screens
        img.src = "models/planet1.png";
        loadedPlanetsCount++;
    };
    planetModels.push(img);
}



// Expanded Style Database Mapping Signature Emissions Across All 15 Spacecraft Hubs
const SHIP_STYLE_COLOR_MAP = {
    "ship1": "#00ffcc",  // Vortex Striker Neon Teal
    "ship2": "#ff66cc",  // Heartbreaker Pastel Cosmic Pink
    "ship3": "#39ff14",  // Toxic Venom Radioactive Green
    "ship4": "#9d4edd",  // Soul Reaver Ethereal Shadow Purple
    "ship5": "#00f5d4",  // Cosmo Disc Alien Cyan
    "ship6": "#ff0055",  // Skull Raider Demonic Crimson Crimson
    "ship7": "#70d6ff",  // Crystal Nova Polished Ice Azure
    "ship8": "#ffb703",  // Inferno Fang Volcanic Amber Lava
    "ship9": "#e0aaff",  // Volt Reaper High-Voltage Violet Volt
    "ship10": "#240046", // Rift Walker Dark Void Indigo Vortex
    "ship11": "#3c096c", // Void Phantom Deep Nebula Plum
    "ship12": "#d00000", // Drake Fury Ancient Ruby Flame
    "ship13": "#ff007f", // Nebula Blade Deep Asteroid Magenta
    "ship14": "#ffee32", // Solaris Legendary Gleaming Pure Gold
    "ship15": "#3a0ca3"  // Eclipse X Imperial Royal Midnight Sapphire
};


// Preload Left and Right Asteroid Directional Models
const asteroidModelLeft = new Image();
asteroidModelLeft.src = "models/asteroid1.png"; 

const asteroidModelRight = new Image();
asteroidModelRight.src = "models/asteroid2.png"; 

// Preload 15 Custom spaceships into indexed cache pools
const shipModels = {};
for (let i = 1; i <= 15; i++) {
    shipModels[`ship${i}`] = new Image();
    shipModels[`ship${i}`].src = `models/ship${i}.png`;
}

// ==========================================
// DATA INITIALIZATION LIFECYCLE (SAFE ORDER)
// ==========================================
let walletCoins = parseInt(localStorage.getItem("vortexWalletCoins") || 0);
let equippedSkin = localStorage.getItem("vortexEquippedSkin") || "ship1"; 
let unlockedSkins = JSON.parse(localStorage.getItem("vortexUnlockedSkins") || '["ship1"]'); 

updateBestScoreDisplay();
updateWalletDisplays();

// Initialize ship size chassis bounds
let ship = {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.75 - 45, 
    radius: 10, // <--- Ship radius bounds
    angle: 0,
    spinSpeed: 0.06,
    speedX: 0,
    speedY: 0,
    // --- NEW DASH PROPERTIES ---
    isDashing: false,
    dashSpeedMultiplier: 2.8,
    dashDuration: 180, // milliseconds
    dashTimer: 0,
    dashCooldown: 1200, // milliseconds
    lastDashTime: 0,
    dashDirX: 0,
    dashDirY: 0
};

// Particle array for custom dynamic trails
let engineTrailParticles = [];


window.addEventListener("resize", () => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    generateBackdropStars();
    if (isMenuMode || isGameOver) {
        ship.x = window.innerWidth / 2;
        ship.y = (window.innerHeight * 0.75) - 45;
        cameraY = 0;
    }
});

// ====================================================
// CORE CANVAS RESIZER: ENSURES ENTIRE SCREEN COVERAGE
// ====================================================
function resizeCanvas() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;

    // Forces canvas grid matrix size to match physical pixel ratios perfectly
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // If your code updates special engine coordinates bounds variables, sync them:
    // e.g., screenWidth = window.innerWidth;
}

// Ensure resizer initializes on boot up and window shifts
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Launch initial layout sizing mapping pass


function randRange(min, max) {
    return Math.random() * (max - min) + min;
}

document.getElementById("sfx-toggle-btn").innerText = isSfxEnabled ? "ON" : "OFF";
document.getElementById("sfx-toggle-btn").className = isSfxEnabled ? "toggle-active" : "";
document.getElementById("shake-toggle-btn").innerText = isShakeEnabled ? "ON" : "OFF";
document.getElementById("shake-toggle-btn").className = isShakeEnabled ? "toggle-active" : "";

// ==========================================
// MP3 AUDIO ROUTERS (REAL FILES SUPPORT)
// ==========================================
const soundMenuBg = new Audio("sounds/ambience-mainmenu.mp3");
const soundGameBg = new Audio("sounds/ambience.mp3");

soundMenuBg.loop = true;
soundGameBg.loop = true;
soundMenuBg.volume = 0.4;
soundGameBg.volume = 0.3;

function initAudioEngine() {
    if (!isSfxEnabled) return;
    if (isMenuMode && soundMenuBg.paused) {
        soundMenuBg.play().catch(e => console.log("Audio waiting for interaction..."));
    }
}

const fxClick = new Audio("sounds/click.mp3");
const fxCountdown = new Audio("sounds/touchdown-start.mp3");
const fxSwing = new Audio("sounds/swing.mp3");
const fxCrash = new Audio("sounds/crash.mp3");

fxClick.volume = 0.6;
fxCountdown.volume = 0.5;
fxSwing.volume = 0.5;
fxCrash.volume = 0.7;


function soundClick() {
    if (!isSfxEnabled) return;
    fxClick.currentTime = 0;
    fxClick.play().catch(e => {});
}
function soundCountdown() {
    if (!isSfxEnabled) return;
    fxCountdown.currentTime = 0;
    fxCountdown.play().catch(e => {});
}
function soundSwing() {
    if (!isSfxEnabled) return;
    fxSwing.currentTime = 0;
    fxSwing.play().catch(e => {});
}
function soundCrash() {
    if (!isSfxEnabled) return;
    fxCrash.currentTime = 0;
    fxCrash.play().catch(e => {});
}


// SCORE-STAGED PLANET IMAGE MATRIX LOOKUPS
function getAvailablePlanetImageIndex(currentScore) {
    if (currentScore < 100) {
        // Planets 1-8 (Index range 0-7)
        return Math.floor(Math.random() * 8);
    } else if (currentScore >= 100 && currentScore < 200) {
        // Add 4 more new planets -> 1-12 (Index range 0-11)
        return Math.floor(Math.random() * 12);
    } else {
        // Complete spectrum map -> 1-16 (Index range 0-15)
        return Math.floor(Math.random() * TOTAL_PLANETS);
    }
}

// ==========================================
// LEVEL GENERATION & ASSET INDEX BINDINGS
// ==========================================
function spawnWorldElements(startY, endY) {
    for (let y = startY; y > endY; y -= 160) {
        let pX = randRange(60, window.innerWidth - 60);
        
        // LOGICAL SIZING: 85% chance for a small planet, 15% chance for a massive gas giant
        let pRadius;
        if (Math.random() > 0.15) {
            pRadius = randRange(15, 28); // Smaller, precision targets
        } else {
            pRadius = randRange(40, 60); // Occasional large planet
        }
        
        let modelIndex = getAvailablePlanetImageIndex(totalScore);
        
        planets.push({ 
            x: pX, y: y, baseX: pX, waveOffset: Math.random() * Math.PI * 2,
            radius: pRadius, modelID: modelIndex 
        });

        // 40% chance for a planet to have any coins around it
        if (Math.random() < 0.40) {
            for (let i = 0; i < 2; i++) {
                let cAngle = randRange(0, Math.PI * 2);
                let cDist = pRadius + randRange(20, 45); 
                coins.push({ x: pX + Math.cos(cAngle) * cDist, y: y + Math.sin(cAngle) * cDist, radius: 5, collected: false });
            }
        }

        // ====================================================
        // ANTI-PLANET SPAWNING FIX FOR MAGNETS, SHIELDS & PORTALS
        // ====================================================
        let safeX = pX > window.innerWidth / 2 
            ? randRange(40, pX - pRadius - 40)             
            : randRange(pX + pRadius + 40, window.innerWidth - 40); 

        // 1. Safe Magnets Spawning
        if (Math.random() > 0.8 && y < (window.innerHeight * 0.75 - 400)) {
            magnets.push({ x: safeX, y: y - 50, radius: 12, collected: false });
        }

        // 2. Safe Shields Spawning
        if (Math.random() > 0.88 && y < (window.innerHeight * 0.75 - 500)) {
            shields.push({ x: safeX, y: y - 20, radius: 14, collected: false });
        }

        // 3. Safe Portals Spawning
        if (Math.random() > 0.90 && y < (window.innerHeight * 0.75 - 700)) {
            portals.push({ x: safeX, y: y - 90, radius: 22, active: true });
        }

        // ====================================================
        // DYNAMIC PROGRESSIVE ASTEROID SPAWNING
        // ====================================================
        let spawnChance = 0.05; // 5% chance to see an asteroid right from the start (0 to 100)
        
        if (totalScore >= 100 && totalScore < 300) {
            spawnChance = 0.15; // 15% chance
        } else if (totalScore >= 300 && totalScore < 600) {
            spawnChance = 0.30; // 30% chance
        } else if (totalScore >= 600 && totalScore < 1000) {
            spawnChance = 0.45; // 45% chance
        } else if (totalScore >= 1000) {
            spawnChance = 0.60; // 60% chance (Maximum density)
        }

        // Spawn asteroids using the calculated chance
        if (Math.random() < spawnChance && y < (window.innerHeight * 0.75 - 200)) {
            asteroids.push({ 
                x: randRange(30, window.innerWidth - 30), 
                y: y - 80, 
                radius: randRange(14, 20), 
                baseSpeedX: randRange(-1.2, 1.2) 
            });
        }
    }
}

function createSparks(x, y, color, count = 8) {
    // Lifted the 12 particle limit rule to support huge game over explosions safely
    for (let i = 0; i < count; i++) {
        particles.push({ 
            x: x, 
            y: y, 
            vx: randRange(-4, 4), // Expanded velocity ranges slightly for speedier spreads
            vy: randRange(-4, 4), 
            radius: randRange(2, 5), 
            alpha: 1, 
            color: color, 
            isFire: false 
        });
    }
}


function createFireTrail(x, y, vx) {
    let fireColors = ["#ff3300", "#ff6600", "#ffcc00", "#ff9900"];
    let randomColor = fireColors[Math.floor(Math.random() * fireColors.length)];
    let backwardForceX = -vx * randRange(0.6, 1.2); 
    particles.push({ x: x, y: y, vx: backwardForceX + randRange(-0.2, 0.2), vy: randRange(-0.2, 0.5), radius: randRange(2, 5), alpha: 1, color: randomColor, isFire: true });
}

// ==========================================
// TERMINAL SYNC STRINGS & HANGAR BUY CORES
// ==========================================
function updateBestScoreDisplay() {
    let currentHigh = localStorage.getItem("stickyOrbitBestScore") || 0;
    const bestScoreSpan = document.getElementById("best-score-val");
    if (bestScoreSpan) bestScoreSpan.innerText = currentHigh;
}

function updateWalletDisplays() {
    const wVal = document.getElementById("wallet-val");
    const swVal = document.getElementById("shop-wallet-val");
    if (wVal) wVal.innerText = walletCoins;
    if (swVal) swVal.innerText = walletCoins;
    
    for (let i = 1; i <= 15; i++) {
        let skinKey = "ship" + i;
        let card = document.getElementById("skin-" + skinKey);
        
        if (card) {
            if (unlockedSkins.includes(skinKey)) {
                card.className = "shop-card unlocked";
                let statusSpan = card.querySelector(".skin-status");
                if (statusSpan) statusSpan.innerText = "EQUIP";
            } else {
                card.className = "shop-card locked";
            }
        }
    }
    
    let activeCard = document.getElementById("skin-" + equippedSkin);
    if (activeCard) {
        activeCard.className = "shop-card active";
        let statusSpan = activeCard.querySelector(".skin-status");
        if (statusSpan) statusSpan.innerText = "EQUIPPED";
    }
}

document.getElementById("shop-toggle-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("shop-menu").classList.remove("hidden");
    updateWalletDisplays();
});

document.getElementById("shop-close-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("shop-menu").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
});



function buyOrEquipSkin(skinName, cost) {
    const alertCard = document.getElementById("shop-alert");

    // 1. STRIP AND CLEAN INBOUND VARIANT EMISSIONS
    let cleanKey = String(skinName).trim().toLowerCase().replace(/[\s_-]+/g, "");
    let normalizedSkinId = "ship1";
    let explicitDisplayName = "New Spaceship Fleet Craft";

    // 2. AUTOMATED TRANSLATION DICTIONARY DIALECTS
    if (cleanKey === "ship1" || cleanKey === "vortexstriker" || cost === 0) {
        normalizedSkinId = "ship1"; explicitDisplayName = "🚀 Vortex Striker";
    } else if (cleanKey === "ship2" || cleanKey === "heartbreaker") {
        normalizedSkinId = "ship2"; explicitDisplayName = "💗 Heartbreaker";
    } else if (cleanKey === "ship3" || cleanKey === "toxicvenom") {
        normalizedSkinId = "ship3"; explicitDisplayName = "🟢 Toxic Venom";
    } else if (cleanKey === "ship4" || cleanKey === "soulreaver") {
        normalizedSkinId = "ship4"; explicitDisplayName = "👻 Soul Reaver";
    } else if (cleanKey === "ship5" || cleanKey === "cosmodisc") {
        normalizedSkinId = "ship5"; explicitDisplayName = "👽 Cosmo Disc";
    } else if (cleanKey === "ship6" || cleanKey === "skullraider") {
        normalizedSkinId = "ship6"; explicitDisplayName = "💀 Skull Raider";
    } else if (cleanKey === "ship7" || cleanKey === "crystalnova") {
        normalizedSkinId = "ship7"; explicitDisplayName = "💎 Crystal Nova";
    } else if (cleanKey === "ship8" || cleanKey === "infernofang") {
        normalizedSkinId = "ship8"; explicitDisplayName = "🔥 Inferno Fang";
    } else if (cleanKey === "ship9" || cleanKey === "voltreaper") {
        normalizedSkinId = "ship9"; explicitDisplayName = "⚡ Volt Reaper";
    } else if (cleanKey === "ship10" || cleanKey === "riftwalker") {
        normalizedSkinId = "ship10"; explicitDisplayName = "🌀 Rift Walker";
    } else if (cleanKey === "ship11" || cleanKey === "voidphantom") {
        normalizedSkinId = "ship11"; explicitDisplayName = "🌌 Void Phantom";
    } else if (cleanKey === "ship12" || cleanKey === "drakefury") {
        normalizedSkinId = "ship12"; explicitDisplayName = "🐉 Drake Fury";
    } else if (cleanKey === "ship13" || cleanKey === "nebulablade") {
        normalizedSkinId = "ship13"; explicitDisplayName = "🌠 Nebula Blade";
    } else if (cleanKey === "ship14" || cleanKey === "solaris") {
        normalizedSkinId = "ship14"; explicitDisplayName = "☀ Solaris";
    } else if (cleanKey === "ship15" || cleanKey === "eclipsex") {
        normalizedSkinId = "ship15"; explicitDisplayName = "🌑 Eclipse X";
    } else {
        let numericExtraction = cleanKey.match(/\d+/);
        if (numericExtraction) { normalizedSkinId = "ship" + numericExtraction; }
    }

    // 3. EQUIP PIPELINE ROUTE (For already owned vehicles)
    if (unlockedSkins.includes(normalizedSkinId) || normalizedSkinId === "ship1") {
        if (!unlockedSkins.includes("ship1")) {
            unlockedSkins.push("ship1");
            localStorage.setItem("vortexUnlockedSkins", JSON.stringify(unlockedSkins));
        }
        equippedSkin = normalizedSkinId; 
        localStorage.setItem("vortexEquippedSkin", equippedSkin);
        updateWalletDisplays(); 
        
        if (isSfxEnabled) {
            let equipSound = new Audio("sounds/equip_ship.mp3");
            equipSound.volume = 0.6; 
            equipSound.play().catch(e => {});
        }
        return; 
    }

    // 4. INTERACTION COOLDOWN GATE REJECTOR WITH DYNAMIC WARNING POPUP
    if (isPurchaseOnCooldown) {
        if (alertCard) {
            alertCard.innerText = "Wait 3 seconds before buying another one";
            alertCard.style.backgroundColor = "#eab308"; // Warning amber yellow background matrix
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #fef08a";
            alertCard.style.boxShadow = "0 0 10px rgba(234, 179, 8, 0.4)";
            alertCard.style.display = "block";
            
            // Auto hide the warning message cleanly after 1.5 seconds
            setTimeout(() => { alertCard.style.display = "none"; }, 1500);
        }
        return;
    }

    // 5. TRANSACTION VALIDATION PIPELINE (Fresh Store Purchases)
    if (walletCoins >= cost) {
        isPurchaseOnCooldown = true; // Engage anti-spam block
        
        walletCoins -= cost;
        unlockedSkins.push(normalizedSkinId);
        equippedSkin = normalizedSkinId; 
        
        localStorage.setItem("vortexWalletCoins", walletCoins);
        localStorage.setItem("vortexEquippedSkin", equippedSkin);
        localStorage.setItem("vortexUnlockedSkins", JSON.stringify(unlockedSkins));
        
        updateWalletDisplays(); 
        
        // Green Success Label Overlay Activation
        if (alertCard) {
            alertCard.innerText = `You bought ${explicitDisplayName}`;
            alertCard.style.backgroundColor = "#22c55e"; // Success green color layout configuration
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #00ffcc";
            alertCard.style.boxShadow = "0 0 14px #22c55e";
            alertCard.style.display = "block";
            
            setTimeout(() => { alertCard.style.display = "none"; }, 2000);
        }
        
        if (isSfxEnabled) {
            let successSound = new Audio("sounds/purchasesound.mp3");
            successSound.volume = 0.6; successSound.play().catch(e => {});
        }
        createSparks(window.innerWidth / 2, window.innerHeight / 2, "#00ffcc", 12);
        
        // Anti-spam release gate opens up exactly after 3 seconds have passed
        setTimeout(() => { isPurchaseOnCooldown = false; }, 3000);
        
    } else {
        // 6. BALANCE INSUFFICIENT FUNDS ROUTE (Failure red state)
        soundClick(); 
        if (alertCard) {
            alertCard.innerText = "Insufficient coins";
            alertCard.style.backgroundColor = "#dc2626"; // Failure red color layout configuration
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #ff3333";
            alertCard.style.boxShadow = "0 0 10px rgba(220, 38, 38, 0.4)";
            alertCard.style.display = "block";
            
            setTimeout(() => { alertCard.style.display = "none"; }, 2000);
        }
    }
}




function selectSkin(skinName) {
    if (unlockedSkins.includes(skinName)) {
        equippedSkin = skinName; 
        localStorage.setItem("vortexEquippedSkin", equippedSkin);
        updateWalletDisplays(); 
    }
}

document.getElementById("options-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("options-menu").classList.remove("hidden");
});

document.getElementById("options-close-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("options-menu").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
});

document.getElementById("sfx-toggle-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    isSfxEnabled = !isSfxEnabled;
    localStorage.setItem("vortexSfx", isSfxEnabled);
    e.target.innerText = isSfxEnabled ? "ON" : "OFF";
    e.target.className = isSfxEnabled ? "toggle-active" : "";
    if (!isSfxEnabled) { soundMenuBg.pause(); soundGameBg.pause(); } else { initAudioEngine(); }
    soundClick();
});

document.getElementById("shake-toggle-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    isShakeEnabled = !isShakeEnabled;
    localStorage.setItem("vortexShake", isShakeEnabled);
    e.target.innerText = isShakeEnabled ? "ON" : "OFF";
    e.target.className = isShakeEnabled ? "toggle-active" : "";
});

// ====================================================
// SAFE RETRO OPTIONS COMPONENT OVERRIDE (NO CRASH)
// ====================================================
const legacyWipeButton = document.getElementById("wipe-data-btn");
if (legacyWipeButton) {
    legacyWipeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if(confirm("Are you sure you want to reset all unlocked ships, records, and coins?")) {
            localStorage.clear(); 
            location.reload();
        }
    });
}

document.getElementById("premium-toggle-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("premium-menu").classList.remove("hidden");
});

document.getElementById("premium-close-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    document.getElementById("premium-menu").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
});


function simulatePurchase(amount, price) {
    if (isPurchaseOnCooldown) {
        alert("Please wait before starting another purchase processing request.");
        return;
    }

    soundClick();
    const alertCard = document.getElementById("shop-alert");
    
    // Explicit Product Databank Registry explicitly clears out 'undefined' outputs
    let explicitPackageName = "Premium Pack Cargo";
    if (amount === 500) explicitPackageName = "🪙 500 Credits Core Pack";
    else if (amount === 2000) explicitPackageName = "🪙 2,000 Credits Advanced Vault";
    else if (amount === 10000) explicitPackageName = "🪙 10,000 Credits Galactic Freight";
    else if (price) explicitPackageName = `🪙 ${amount} Premium Credits Bundle`;

    let simulationRoute = prompt(
        `[BANK SIMULATION MATRIX GATEWAY]\nConnecting to external merchant line: ${explicitPackageName} ($${price})\n\nChoose verification code:\n1 - Approved Settlement Clear\n2 - Bank Account Balance Declined\n3 - Terminate Live Gateway Prompt`
    );

    if (simulationRoute === "1") {
        isPurchaseOnCooldown = true; // Engage 3-second lockout lock
        
        walletCoins += amount; 
        localStorage.setItem("vortexWalletCoins", walletCoins); 
        updateWalletDisplays();
        
        if (alertCard) {
            alertCard.innerText = `You bought ${explicitPackageName}`;
            alertCard.style.background = "#00cc66";
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #00ffcc";
            alertCard.style.boxShadow = "0 0 12px #22c55e";
            alertCard.classList.add("show-alert");
            setTimeout(() => { alertCard.classList.remove("show-alert"); }, 2000);
        }
        if (isSfxEnabled) {
            let successSound = new Audio("sounds/purchasesound.mp3");
            successSound.volume = 0.6; successSound.play().catch(e => {});
        }
        createSparks(window.innerWidth / 2, window.innerHeight / 2, "#ffcc00", 15);
        
        setTimeout(() => {
            isPurchaseOnCooldown = false;
        }, 3000);
        
    } else if (simulationRoute === "2") {
        if (alertCard) {
            alertCard.innerText = "Payment declined";
            alertCard.style.background = "#dc2626";
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #ff3333";
            alertCard.style.boxShadow = "none";
            alertCard.classList.add("show-alert");
            setTimeout(() => { alertCard.classList.remove("show-alert"); }, 2000);
        }
    } else {
        if (alertCard) {
            alertCard.innerText = "Payment didn't go thru";
            alertCard.style.background = "#dc2626";
            alertCard.style.color = "#ffffff";
            alertCard.style.border = "2px solid #ff3333";
            alertCard.style.boxShadow = "none";
            alertCard.classList.add("show-alert");
            setTimeout(() => { alertCard.classList.remove("show-alert"); }, 2000);
        }
    }
}

document.getElementById("menu-quit-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    if(confirm("Do you want to exit Vortex Sling?")) {
        if (navigator && navigator.app && navigator.app.exitApp) { navigator.app.exitApp(); } 
        else { alert("Simply close your running browser window tab to terminate active sessions."); }
    }
});

document.getElementById("start-btn").addEventListener("click", (e) => {
    e.stopPropagation(); initAudioEngine(); soundClick(); 
    document.getElementById("main-menu").classList.add("hidden"); runStartupCountdown();
});

function runStartupCountdown() {
    isCountingDown = true; isMenuMode = false; let countVal = 3;
    const countDisplay = document.getElementById("countdown-display");
    countDisplay.innerText = countVal; countDisplay.classList.remove("hidden");
    soundCountdown(); initGameStructure();

    let countInterval = setInterval(() => {
        countVal--;
        if (countVal > 0) { countDisplay.innerText = countVal; soundCountdown(); } 
        else if (countVal === 0) { countDisplay.innerText = "GO!"; soundCountdown(); } 
        else {
            clearInterval(countInterval); countDisplay.classList.add("hidden"); isCountingDown = false; 
            if (soundMenuBg && !soundMenuBg.paused) { soundMenuBg.pause(); soundMenuBg.currentTime = 0; }
            if (soundGameBg && isSfxEnabled) { soundGameBg.play().catch(e => console.log("Audio online.")); }
            ship.speedY = -2.0; // Slower initial launch profile for accessible starting pacing
            document.getElementById("ui-layer").classList.remove("hidden");
        }
    }, 1000);
}

// ==========================================
// GAME MATRIX RESETS & TOUCH CAPTURING
// ==========================================
function initGameStructure() {
    coinsCount = 0; totalScore = 0; cameraY = 0; isGameOver = false; isHooked = false; screenShake = 0; particles = [];
    document.getElementById("coins-score").innerText = "0"; document.getElementById("score").innerText = "0";
    document.getElementById("game-over-screen").classList.add("hidden");
    
    // NEW RESET MECHANICS: Wipe everything cleanly on a fresh retry!
    currentCombo = 1;
    comboTimer = 0;
    lastPlanetHooked = null;
    floatingPopups = []; // Empty out any active text popup elements immediately
    
        // Wipe milestone banner tokens cleanly on a fresh retry!
    activeBannerText = "";
    bannerDisplayTimer = 0;
    hasTriggered100Alert = false;
    hasTriggered200Alert = false;

    activeShootingStar = null; // Clear out any active shooting stars on retry


    let spawnPlanetY = window.innerHeight * 0.75;
    ship.x = window.innerWidth / 2; ship.y = spawnPlanetY - 45; ship.speedX = 0; ship.speedY = 0; ship.angle = 0;

    
    planets = [{ x: window.innerWidth / 2, y: spawnPlanetY, baseX: window.innerWidth / 2, waveOffset: 0, radius: 35, modelID: 0 }]; 
    coins = []; asteroids = []; magnets = []; shields = []; portals = [];
    magnetActiveTime = 0; isShieldActive = false; afkTimer = 0; afkStallActive = false;
    
    document.getElementById("powerup-status").classList.add("hidden-hud");
    document.getElementById("shield-display").classList.add("hidden-hud");
    
    spawnWorldElements(spawnPlanetY - 160, -2000);
}

// --- DYNAMIC VEHICLE RELEASES PLUME ENGINE ---
function emitCustomPlumeParticles(shipX, shipY, releaseVx, releaseVy) {
    // Look up the unique aesthetic neon trace hash mapped to the active ship skin index
    let dynamicChassisColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#ffffff";
    
    // Generate fire trails using the ship's custom color profile
    for (let i = 0; i < 9; i++) {
        // Drive spark positions back away from your linear travel launch path vectors
        let spreadVx = -releaseVx * randRange(0.4, 0.9) + randRange(-1.5, 1.5);
        let spreadVy = -releaseVy * randRange(0.4, 0.9) + randRange(-1.5, 1.5);
        
        particles.push({
            x: shipX,
            y: shipY,
            vx: spreadVx,
            vy: spreadVy,
            radius: randRange(2.5, 5.0),
            alpha: 1.0,
            color: dynamicChassisColor,
            isFire: true // Ensures dynamic trace sizing runs calculations smoothly
        });
    }
}

// To trigger this cleanly, update your handleTap() function's release path like this:
// Replace your old handleTap code block segment where isHooked transitions from true to false:
/*
    } else {
        isHooked = false; 
        let tangentAngle = hookAngle + (Math.PI / 2) * orbitDirection;
        let baseMinSpeed = 6.2 * speedFactor; 
        let currentVelocity = Math.hypot(ship.speedX, ship.speedY);
        let releaseSpeed = Math.max(currentVelocity * 1.12, baseMinSpeed); 
        
        ship.speedX = Math.cos(tangentAngle) * releaseSpeed; 
        ship.speedY = Math.sin(tangentAngle) * releaseSpeed;

        // BLAST THE COORDINATED CHASSIS PLASMA PLUME TRAIL INSTANTLY ON RELEASE
        emitCustomPlumeParticles(ship.x, ship.y, ship.speedX, ship.speedY);

        if (isShakeEnabled) screenShake = 3; 
        soundSwing(); 
    }
*/

function drawGalacticTethers(ctx) {
    planets.forEach((planet, index) => {
        // Draw constellation lines connecting adjacent planets
        if (index > 0) {
            const prev = planets[index - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(planet.x, planet.y);
            ctx.strokeStyle = "rgba(0, 243, 255, 0.15)"; 
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]); // Neon dashed energy line
            ctx.stroke();
            ctx.setLineDash([]); 
        }

        // Render an ambient gravity orbit ring
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius * 2.2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 0, 128, 0.05)"; 
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}


function handleTap() {
    if (isGameOver || isMenuMode || isCountingDown) return;
    afkTimer = 0; 

    // Smooth, gradual speed pacing engine scaling
    let speedFactor = 1 + (totalScore / 320); 

    if (!isHooked) {
        let nearest = null; let minDist = Infinity;
        planets.forEach(p => {
            let dist = Math.hypot(ship.x - p.x, ship.y - p.y);
            if (dist < minDist) { minDist = dist; nearest = p; }
        });

        let maxGrappleReach = 150;

                if (nearest && minDist < maxGrappleReach) {
            isHooked = true; hookedPlanet = nearest; hookRadius = minDist;
            hookAngle = Math.atan2(ship.y - nearest.y, ship.x - nearest.x);
            
            // ====================================================
            // INVERTED INTELLIGENT ORBIT DIRECTION CONTROLLER
            // ====================================================
            let isShipOnRightSide = ship.x > nearest.x;
            let isMovingUpward = ship.speedY < 0;

            if (isShipOnRightSide) {
                // Inverted right side physics rules
                orbitDirection = isMovingUpward ? -1 : 1;
            } else {
                // Inverted left side physics rules
                orbitDirection = isMovingUpward ? 1 : -1;
            }

            // ====================================================
            // REBALANCED COMBO MECHANIC (WITH DYNAMIC CEILINGS)
            // ====================================================
            if (nearest !== lastPlanetHooked) {
                if (comboTimer > 0) {
                    if (currentCombo < MAX_COMBO_LIMIT) { currentCombo++; }
                } else {
                    currentCombo = 1; 
                }
                
                if (currentCombo >= 3) {
                    let displayMultiplier = currentCombo - 2;
                    floatingPopups.push({
                        x: ship.x,
                        y: ship.y,
                        text: `COMBO x${displayMultiplier}`,
                        color: SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00ffcc",
                        alpha: 1.0,
                        scale: 0.85 + (displayMultiplier * 0.04)
                    });
                }
                
                comboTimer = COMBO_WINDOW; 
                lastPlanetHooked = nearest; 
            }

            createSparks(ship.x, ship.y, "#ffffff", 6); if (isShakeEnabled) screenShake = 2; soundSwing(); 
        } else {
            // NEW: Punish blind swings! Tapping empty space breaks combo instantly
            currentCombo = 1;
            comboTimer = 0;
            lastPlanetHooked = null;
        }
    // Locate this exact section inside your handleTap() function's release path:
} else {
    isHooked = false; 
    let tangentAngle = hookAngle + (Math.PI / 2) * orbitDirection;
    
    // UPDATE THIS: Increase baseline speed from 6.2 to 7.5 for a lighter launch feel
    let baseMinSpeed = 7.5 * speedFactor; 
    
    // 1. Calculate how fast the ship is flying
    let currentVelocity = Math.hypot(ship.speedX, ship.speedY);


    
    // UPDATE THIS: Boost the speed multiplier from 1.12 to 1.25 for explosive agility
    let releaseSpeed = Math.max(currentVelocity * 1.25, baseMinSpeed); 
    
    ship.speedX = Math.cos(tangentAngle) * releaseSpeed; 
    ship.speedY = Math.sin(tangentAngle) * releaseSpeed;

    createSparks(ship.x, ship.y, "#00ffcc", 5); 
    if (isShakeEnabled) screenShake = 3; 
    soundSwing(); 
}

}


// Paste the call right here:
drawGalacticTethers(ctx);

// Your existing code that draws the planets will look something like this:
planets.forEach(planet => {
    // ctx.drawImage(...) or ctx.arc(...)
});


window.addEventListener("mousedown", (e) => {
    if (e.target.tagName !== "BUTTON" && !isMenuMode && document.getElementById("shop-menu").classList.contains("hidden") && document.getElementById("options-menu").classList.contains("hidden") && document.getElementById("premium-menu").classList.contains("hidden")) handleTap();
});
window.addEventListener("touchstart", (e) => {
    if (e.target.tagName !== "BUTTON" && !isMenuMode && document.getElementById("shop-menu").classList.contains("hidden") && document.getElementById("options-menu").classList.contains("hidden") && document.getElementById("premium-menu").classList.contains("hidden")) {
        e.preventDefault(); handleTap();
    }
}, { passive: false });

// HEX EXTRACTOR FOR SMOOTH CELL FADEOUT INTERPOLATION
function parseHexToRgb(hex) {
    if(hex.startsWith('rgb')) {
        let parts = hex.match(/\d+/g);
        return { r: parseInt(parts[0]), g: parseInt(parts[1]), b: parseInt(parts[2]) };
    }
    let num = parseInt(hex.replace("#",""), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// ==========================================
// MAIN REFRESH TICKER & ENVIRONMENT DRAWS
// ==========================================
function update() {
    ctx.save();
    
    // Dynamic Speed Pacing Rules
    let speedFactor = 1 + (totalScore / 320);

    if (screenShake > 0 && isShakeEnabled) {
        let dx = randRange(-screenShake, screenShake); let dy = randRange(-screenShake, screenShake);
        ctx.translate(dx, dy); screenShake *= 0.9; if (screenShake < 0.2) screenShake = 0;
    }

    // ----------------------------------------------------
    // GALAXY BACKGROUND & STAR RENDERING SYSTEM
    // ----------------------------------------------------
    let targetInner, targetOuter;
    if (totalScore < 100) {
        // Initial Stage: Midnight Space Blue Galaxy
        targetInner = { r: 15, g: 15, b: 35 };   
        targetOuter = { r: 5, g: 5, b: 11 };     
    } else {
        // Post-100 Score Trigger: Scary Dark Red Nebula Void
        targetInner = { r: 32, g: 6, b: 10 };    
        targetOuter = { r: 5, g: 1, b: 2 };      
    }

    let currInner = parseHexToRgb(currentBgColors.inner);
    let currOuter = parseHexToRgb(currentBgColors.outer);

    currInner.r += (targetInner.r - currInner.r) * 0.02;
    currInner.g += (targetInner.g - currInner.g) * 0.02;
    currInner.b += (targetInner.b - currInner.b) * 0.02;

    currOuter.r += (targetOuter.r - currOuter.r) * 0.02;
    currOuter.g += (targetOuter.g - currOuter.g) * 0.02;
    currOuter.b += (targetOuter.b - currOuter.b) * 0.02;

    currentBgColors.inner = `rgb(${Math.round(currInner.r)}, ${Math.round(currInner.g)}, ${Math.round(currInner.b)})`;
    currentBgColors.outer = `rgb(${Math.round(currOuter.r)}, ${Math.round(currOuter.g)}, ${Math.round(currOuter.b)})`;

    let gradient = ctx.createRadialGradient(window.innerWidth/2, window.innerHeight/2, 0, window.innerWidth/2, window.innerHeight/2, Math.max(window.innerWidth, window.innerHeight));
    gradient.addColorStop(0, currentBgColors.inner);
    gradient.addColorStop(1, currentBgColors.outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);



    // ====================================================
    // RENDER: PARALLAX MOVABLE TWINKLING STARFIELD Galaxy
    // ====================================================
    // NEW SAFETY TOGGLE: Only paint stars if enabled in options parameters!
    if (isStarsEnabled) {
        ctx.save();
        stars.forEach(star => {
            let starDrawY = (star.y - cameraY * (star.speedFactor || 0.45)) % window.innerHeight;
            if (starDrawY < 0) starDrawY += window.innerHeight;

            let speed = star.twinkleSpeed || 0.005;
            let offset = star.twinkleOffset || 0;
            let base = star.baseAlpha || 0.4;
            
            let currentAlpha = base + Math.sin(Date.now() * speed + offset) * 0.12;
            currentAlpha = Math.max(0.15, Math.min(0.85, currentAlpha));

            ctx.beginPath();
            ctx.arc(star.x, starDrawY, star.radius || 1.0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
            ctx.shadowBlur = 0; 
            ctx.fill();
        });
        ctx.restore();
    }


        // ====================================================
    // RENDER & ANIMATE: REALISTIC COSMIC METEOR SMOKE PLUMES
    // ====================================================
    ctx.save();
    for (let i = asteroidTrailParticles.length - 1; i >= 0; i--) {
        let p = asteroidTrailParticles[i];
        
        // 1. Advance position metrics and apply friction degradation values
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay; // Burn out visibility over time
        p.radius += 0.08;   // Dissipate and expand outward like a real gas cloud!

        // Purge dead particle arrays instantly out of memory to preserve high framework frame rates
        if (p.alpha <= 0 || p.radius <= 0) {
            asteroidTrailParticles.splice(i, 1);
            continue;
        }

        // 2. Adjust coordinate tracks using your active cameraY viewport scroll positioning
        let drawY = p.y - cameraY;

        // Skip drawing if the dust segment drifts completely off device window bounds
        if (drawY < -50 || drawY > window.innerHeight + 50) continue;

        // 3. Draw the glowing gas particle node shell
        ctx.beginPath();
        ctx.arc(p.x, drawY, p.radius, 0, Math.PI * 2);
        
        // Premium dynamic thermal alpha blending layout configuration
        ctx.fillStyle = p.baseColor;
        ctx.globalAlpha = p.alpha;
        
        // Apply an ambient cosmic neon blur glow only to thermal high heat particle heads
        if (p.baseColor === "#ffffff") {
            ctx.shadowColor = "#ffaa00";
            ctx.shadowBlur = 4;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fill();
    }
    ctx.restore();



        // ====================================================
    // RENDER: RARE COSMIC SHOOTING STAR (METEOR FLARE)
    // ====================================================
    // 1. If no shooting star is currently on screen, roll a dice to spawn one!
    if (!activeShootingStar && Math.random() < 0.003) { // Roughly a 0.3% chance per frame (Every 5-10 seconds)
        let themeColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#ffffff";
        
        activeShootingStar = {
            x: randRange(-50, window.innerWidth - 100), // Start from the left or off-screen
            y: randRange(-50, window.innerHeight * 0.4), // Spawn in the upper half of screen view
            speedX: randRange(8, 15),                    // Fast horizontal velocity glide
            speedY: randRange(4, 9),                     // Fast downward velocity glide
            length: randRange(60, 110),                  // Length of the glowing cosmic trail
            alpha: 1.0,                                  // Starting opacity levels
            color: Math.random() > 0.4 ? "#ffffff" : themeColor // 60% white flash, 40% matching ship neon
        };
    }

    // 2. If a shooting star is active, animate, step, and paint it!
    if (activeShootingStar) {
        let s = activeShootingStar;
        
        // Advance position coordinates by velocity pacing parameters
        s.x += s.speedX;
        s.y += s.speedY;
        
        // Gently fade out the opacity trail as it flies across space
        s.alpha -= 0.015;

        // If it flies completely off-screen or fades out, purge it so a new one can spawn
        if (s.x > window.innerWidth + 100 || s.y > window.innerHeight + 100 || s.alpha <= 0) {
            activeShootingStar = null;
        } else {
            ctx.save();
            ctx.globalAlpha = s.alpha;
            
            // Create a gorgeous linear gradient trail that fades away at the back end
            let starGradient = ctx.createLinearGradient(
                s.x, s.y, 
                s.x - s.speedX * (s.length / 10), s.y - s.speedY * (s.length / 10)
            );
            starGradient.addColorStop(0, s.color);           // Bright core meteor head tip
            starGradient.addColorStop(0.3, s.color + "aa");   // Muted mid-trail blend
            starGradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Fading ghost trail tail

            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            // Draw a line backward matching its trajectory angle vector path
            ctx.lineTo(s.x - s.speedX * 2, s.y - s.speedY * 2);
            ctx.strokeStyle = starGradient;
            ctx.lineWidth = randRange(1.5, 2.5); // Pinpoint line thickness
            
            // Give the shooting star a bright cosmic neon blur glow!
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 6;
            
            ctx.stroke();
            ctx.restore();
        }
    }




    if (!isMenuMode) {
        if (ship.y - cameraY < window.innerHeight * 0.5) {
            let targetCameraY = ship.y - window.innerHeight * 0.5; cameraY += (targetCameraY - cameraY) * 0.1;
        }
    } else { cameraY = 0; }

    let highestPlanetY = planets.length > 0 ? planets[planets.length - 1].y : 0;
    if (cameraY < highestPlanetY + 1000) { spawnWorldElements(highestPlanetY - 160, highestPlanetY - 2000); }


            // ====================================================
    // RENDER & OSCILLATE: DIRECTORY FILE-MATCHED PLANET GLOW ENGINE
    // ====================================================
    planets.forEach(p => {
        if (totalScore >= 150) {
            let swaySpeed = 0.005; // Ultra-slow gentle glide speed profile
            let swayRange = 40;   // Controlled lateral width
            p.x = p.baseX + Math.sin(Date.now() * swaySpeed + p.waveOffset) * swayRange;
        }

        // Skip drawing entirely if the planet is off-screen
        if (p.y - cameraY > window.innerHeight + 100 || p.y - cameraY < -100) return;

        let imgAsset = planetModels[p.modelID];
        
        if (imgAsset && imgAsset.complete) {
            ctx.save();

            let compactGlowRadius = p.radius + 14;
            
            let atmosphereGlow = ctx.createRadialGradient(
                p.x, p.y - cameraY, p.radius * 0.82, 
                p.x, p.y - cameraY, compactGlowRadius 
            );
            
            // ====================================================
            // MATCHING COLOR ENGINE MAPPER (INCLUDES DIRECTORY PATHS)
            // ====================================================
            let themeHex = "#b500ff"; // Fallback for planet9 to planet15 (Purple)
            let currentPath = String(p.modelID).toLowerCase().trim();

            // Uses .includes() to find the filename inside the /models/ folder path perfectly
            if (currentPath.includes("planet1.png")) {
                themeHex = "#00b5ff"; // Blue Ocean
            } else if (currentPath.includes("planet2.png") || currentPath.includes("planet8.png")) {
                themeHex = "#ffaa00"; // Sun Color / Golden Solar
            } else if (currentPath.includes("planet3.png") || currentPath.includes("planet7.png")) {
                themeHex = "#b1723e"; // Brown like Mars
            } else if (currentPath.includes("planet4.png")) {
                themeHex = "#ff1e00"; // Red like Sun
            } else if (currentPath.includes("planet5.png")) {
                themeHex = "#ff66cc"; // Pink
            } else if (currentPath.includes("planet6.png")) {
                themeHex = "#a8f5ff"; // Blue Ice
            } else if (
                currentPath.includes("planet9.png") || 
                currentPath.includes("planet10.png") || 
                currentPath.includes("planet11.png") ||
                currentPath.includes("planet12.png") ||
                currentPath.includes("planet13.png") ||
                currentPath.includes("planet14.png") ||
                currentPath.includes("planet15.png")
            ) {
                themeHex = "#a600ff"; // Pure Cosmic Purple
            }

            // Extract the core numerical Red, Green, and Blue light channels from Hex securely
            let cleanHex = themeHex.replace('#', '');
            if(cleanHex.length === 3) {
                cleanHex = cleanHex.split('').map(char => char + char).join('');
            }
            let r = parseInt(cleanHex.substring(0, 2), 16) || 0;
            let g = parseInt(cleanHex.substring(2, 4), 16) || 255;
            let b = parseInt(cleanHex.substring(4, 6), 16) || 204;

            // Apply your subtle 15% and 4% transparent backlighting glow backdrops smoothly
            // Apply your subtle 15% and 4% transparent backlighting glow backdrops smoothly
            // NEW: Slow breathing wave formula (keeps the phase offsets out of sync)
            let breathingAlpha = 0.14 + Math.sin(Date.now() * 0.003 + p.waveOffset) * 0.04;
            let secondaryAlpha = breathingAlpha * 0.28;

            // Apply the dynamic, breathing alpha channels smoothly over time
            atmosphereGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${breathingAlpha})`); 
            atmosphereGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${secondaryAlpha})`); 


            atmosphereGlow.addColorStop(1, "rgba(0, 0, 0, 0)"); 

            ctx.beginPath();
            ctx.arc(p.x, p.y - cameraY, compactGlowRadius, 0, Math.PI * 2);
            ctx.fillStyle = atmosphereGlow;
            ctx.fill();

            // 2. DRAW UNTOUCHED ORIGINAL IMAGERY Directly over the backlighting layer
            ctx.drawImage(imgAsset, p.x - p.radius, p.y - cameraY - p.radius, p.radius * 2, p.radius * 2);

            ctx.restore();
        } else {
            // Invisible safety backup fallback path
            ctx.save();
            ctx.beginPath(); 
            ctx.arc(p.x, p.y - cameraY, p.radius, 0, Math.PI * 2); 
            ctx.fillStyle = "rgba(0,0,0,0)"; 
            ctx.fill();
            ctx.restore();
        }
    });


    // RENDER: Dynamic directional slow-moving asteroids
    asteroids.forEach(ast => {
        // Slowed down travel modifier logic for asteroid horizontal movement
        let currentAstSpeed = ast.baseSpeedX * (isMenuMode ? 0.3 : speedFactor * 0.7); 
        ast.x += currentAstSpeed;
        if (ast.x - ast.radius < 0 || ast.x + ast.radius > window.innerWidth) { ast.baseSpeedX *= -1; }
        
        // ====================================================
        // REFINED: COMPACT SLOW-DRIFT HORIZONTAL TRAIL ENGINE
        // ====================================================
        // Balanced density loop: lower chance and smaller pinpoint thermal nodes
        if (!isMenuMode && !isGameOver && Math.random() < 0.38) { 
            let targetBaseAngle = (currentAstSpeed > 0) ? Math.PI : 0;
            
            // Ultra-tight horizontal variance for a focused, streamlined trail jet
            let sprayAngle = targetBaseAngle + randRange(-0.08, 0.08);
            
            // NEW VALUE: Lower velocity boundaries (from 4.5 down to 1.4) makes smoke bleed out slower
            let exhaustSpeed = randRange(0.8, 1.4); 

            if (typeof asteroidTrailParticles !== 'undefined') {
                // FIXED INTERNAL ORIGIN: Particles now spawn directly INSIDE the rock's core radius bounds
                let spawnOffsetX = (currentAstSpeed > 0) ? -ast.radius * 0.4 : ast.radius * 0.4;

                asteroidTrailParticles.push({
                    x: ast.x + spawnOffsetX,
                    y: ast.y + randRange(-3, 3), // Internal tight vertical dispersion
                    vx: Math.cos(sprayAngle) * exhaustSpeed,
                    vy: Math.sin(sprayAngle) * 0.15, // Muted vertical bleed expansion
                    // Organic cooling thermal values
                    baseColor: Math.random() > 0.65 ? "#ffaa00" : (Math.random() > 0.35 ? "#ff3300" : "#ffffff"),
                    // NEW VALUE: Shrunk the maximum radius ranges so fire nodes don't look blocky or giant
                    radius: randRange(ast.radius * 0.06, ast.radius * 0.16),
                    alpha: 0.8,
                    decay: randRange(0.012, 0.024) // Soft fading lifespan
                });
            }
        }

        let activeAsteroidImg = (ast.baseSpeedX < 0) ? asteroidModelLeft : asteroidModelRight;

        if (activeAsteroidImg && activeAsteroidImg.complete) {
            ctx.drawImage(activeAsteroidImg, ast.x - ast.radius, ast.y - cameraY - ast.radius, ast.radius * 2, ast.radius * 2);
        } else {
            ctx.beginPath(); ctx.arc(ast.x, ast.y - cameraY, ast.radius, 0, Math.PI * 2); 
            ctx.fillStyle = (ast.baseSpeedX < 0) ? "#ff3300" : "#ffcc00"; ctx.fill();
        }

        if (!isGameOver && !isMenuMode && !isCountingDown) {
            let distToShip = Math.hypot(ship.x - ast.x, ship.y - ast.y);
            if (distToShip < ship.radius + ast.radius) {
                if (isShieldActive) {
                    isShieldActive = false; document.getElementById("shield-display").classList.add("hidden-hud");
                    ast.y += 9999; createSparks(ship.x, ship.y, "#00b5ff", 15);
                    if (isShakeEnabled) screenShake = 6;
                    let shkSound = new Audio("sounds/click.mp3"); shkSound.volume = 0.5; shkSound.play().catch(e=>{});
                } else { triggerGameOver(); }
            }
            // ====================================================
            // BALANCED "NEAR MISS" CLOSE CALL SYSTEM
            // ====================================================
            else if (distToShip < ship.radius + ast.radius + 25) {
                if (Math.random() > 0.97) { 
                    let activeMultiplier = currentCombo >= 3 ? (currentCombo - 2) : 1;
                    let bonusPoints = 3 * activeMultiplier; 
                    
                    totalScore += bonusPoints; 
                    document.getElementById("score").innerText = totalScore;
                    
                    floatingPopups.push({
                        x: ship.x,
                        y: ship.y,
                        text: `CLOSE CALL! +${bonusPoints}`,
                        color: "#ffcc00", 
                        alpha: 1.0,
                        scale: 0.9
                    });
                    
                    createSparks(ship.x, ship.y, "#ffcc00", 2); 
                }
            }
        }
    });



    if (magnetActiveTime > 0 && !isGameOver && !isMenuMode && !isCountingDown) {
        magnetActiveTime--; let secondsLeft = (magnetActiveTime / 60).toFixed(1);
        document.getElementById("magnet-timer-val").innerText = secondsLeft;
        if (magnetActiveTime <= 0) { document.getElementById("powerup-status").classList.add("hidden-hud"); }
    }

    // Powerup Node Drawing Layouts
    magnets.forEach(mag => {
        if (mag.collected) return;
        ctx.beginPath(); ctx.arc(mag.x, mag.y - cameraY, mag.radius + 6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255, 0, 150, 0.15)"; ctx.fill();
        ctx.beginPath(); ctx.arc(mag.x, mag.y - cameraY, mag.radius, 0, Math.PI * 2); ctx.fillStyle = "#ff0096"; ctx.fill();
        if (!isMenuMode && !isCountingDown && !isGameOver) {
            let dist = Math.hypot(ship.x - mag.x, ship.y - mag.y);
            if (dist < ship.radius + mag.radius) {
                mag.collected = true; magnetActiveTime = 300; document.getElementById("powerup-status").classList.remove("hidden-hud");
                createSparks(mag.x, mag.y, "#ff0096", 12); let pUpAudio = new Audio("sounds/click.mp3"); pUpAudio.volume = 0.4; pUpAudio.play().catch(e => {});
            }
        }
    });

    shields.forEach(shd => {
        if (shd.collected) return;
        ctx.beginPath(); ctx.arc(shd.x, shd.y - cameraY, shd.radius + 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 181, 255, 0.15)"; ctx.fill();
        ctx.beginPath(); ctx.arc(shd.x, shd.y - cameraY, shd.radius, 0, Math.PI * 2); ctx.fillStyle = "#00b5ff"; ctx.fill();
        if (!isMenuMode && !isCountingDown && !isGameOver) {
            let d = Math.hypot(ship.x - shd.x, ship.y - shd.y);
            if (d < ship.radius + shd.radius) {
                shd.collected = true; isShieldActive = true; document.getElementById("shield-display").classList.remove("hidden-hud");
                createSparks(shd.x, shd.y, "#00b5ff", 12); let sdAud = new Audio("sounds/click.mp3"); sdAud.volume = 0.4; sdAud.play().catch(e=>{});
            }
        }
    });

    portals.forEach(port => {
        ctx.beginPath(); ctx.arc(port.x, port.y - cameraY, port.radius + (Math.sin(Date.now()/100)*3), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(181, 0, 255, 0.2)"; ctx.strokeStyle = "#b500ff"; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
        if (port.active && !isMenuMode && !isCountingDown && !isGameOver) {
            let d = Math.hypot(ship.x - port.x, ship.y - port.y);
            if (d < ship.radius + port.radius) {
                port.active = false; isHooked = false;
                ship.y -= 1800; cameraY -= 1800; ship.speedY = -8; ship.speedX = 0;
                const fl = document.getElementById("warp-flash"); fl.classList.remove("hidden-flash"); fl.classList.add("flash-active");
                setTimeout(() => { fl.classList.remove("flash-active"); }, 400);
                createSparks(ship.x, ship.y, "#b500ff", 25); let wpAu = new Audio("sounds/touchdown-start.mp3"); wpAu.volume = 0.6; wpAu.play().catch(e=>{});
            }
        }
    });

        coins.forEach(c => {
        if (c.collected) return;
        if (magnetActiveTime > 0 && !isGameOver && !isMenuMode && !isCountingDown) {
            let dx = ship.x - c.x; let dy = ship.y - c.y; let distance = Math.hypot(dx, dy);
            if (distance < 250) { let pullStrength = 6.5; c.x += (dx / distance) * pullStrength; c.y += (dy / distance) * pullStrength; }
        }
        ctx.beginPath(); ctx.arc(c.x, c.y - cameraY, c.radius, 0, Math.PI * 2); ctx.fillStyle = "#ffff00"; ctx.fill();

        if (!isMenuMode && !isCountingDown && !isGameOver) {
            let d = Math.hypot(ship.x - c.x, ship.y - c.y);
            if (d < ship.radius + c.radius + 6) {
                c.collected = true; 
                
                // ====================================================
                // FEATURE 4: PREMIUM COMBO-LINKED COIN POPUP SYSTEM
                // ====================================================
                // Determine active multiplier based on combo streak layer (3 planets = 1x, 4 = 2x...)
                let currentComboMultiplier = currentCombo >= 3 ? (currentCombo - 2) : 1;
                
                // Check for skin multipliers (like your Legendary Eclipse x3 passive!)
                let skinBonus = (equippedSkin === "ship15" || equippedSkin === "Eclipse") ? 3 : 1;
                
                // Calculate final combined coin payout for this pickup
                let coinGain = 1 * currentComboMultiplier * skinBonus;
                coinsCount += coinGain;
                
                document.getElementById("coins-score").innerText = coinsCount;
                
                // 1. Explosive gold starburst sparks exactly where the coin was
                createSparks(c.x, c.y, "#ffd700", 12); 
                
                // 2. Launch an expanding, floating text popup above the coin
                floatingPopups.push({
                    x: c.x,
                    y: c.y,
                    text: coinGain > 1 ? `+${coinGain} COINS! 🔥` : `+1 COIN`,
                    color: coinGain > 1 ? "#ff007f" : "#ffd700", // Pink fire flash for combos, bright gold for normal
                    alpha: 1.0,
                    scale: 1.0 + (currentComboMultiplier * 0.08) // Text is physically larger based on your combo streak!
                });

                let coinAudio = new Audio("sounds/click.mp3"); 
                coinAudio.volume = 0.3; 
                coinAudio.play().catch(e => {});
            }
        }
    });


        if (!isGameOver && !isMenuMode && !isCountingDown) {
        afkTimer++;
        if (afkTimer >= AFK_LIMIT) {
            if (!afkStallActive) { afkStallActive = true; isHooked = false; }
            ship.speedY += afkGravityForce; ship.speedX *= afkAirResistance; ship.speedY *= afkAirResistance;  
            let flightAngle = Math.atan2(ship.speedY, ship.speedX);
            let angleDiff = (flightAngle + Math.PI / 2) - ship.angle; ship.angle += angleDiff * 0.05; 
            ship.x += ship.speedX; ship.y += ship.speedY;
        } else {
            afkStallActive = false;
                        if (isHooked && hookedPlanet) {
                let currentModel = String(hookedPlanet.modelID).toLowerCase().trim();
                
                // ====================================================
                // BEHAVIOR A: OVERCHARGED SUN PLANETS (planet2 / planet8)
                // Spins your ship twice as fast for a hyper-speed slingshot!
                // ====================================================
                let baseOrbitSpeed = 0.038 + (totalScore / 5800);
                // FIXED REFERENCE LINE: Removed currentFile entirely to prevent the error crash!
                if (currentModel.includes("planet2.png") || currentModel.includes("planet8.png")) {
                    baseOrbitSpeed *= 2.0; // Double the rotational velocity!
                }

                let orbitSpeed = Math.min(baseOrbitSpeed, 0.14); // Raised cap limit to support solar slingshots
                hookAngle += orbitSpeed * orbitDirection; 
                ship.x = hookedPlanet.x + Math.cos(hookAngle) * hookRadius; ship.y = hookedPlanet.y + Math.sin(hookAngle) * hookRadius;
                
                                // ====================================================
                // BEHAVIOR B: UNSTABLE VOLATILE RED SUN (planet4)
                // Starts ticking down a fuse. Explodes after 1.5 seconds (90 frames)
                // ====================================================
                // FIXED REFERENCE LINE: Removed currentFile from here as well!
                if (currentModel.includes("planet4.png")) {
                    planetFuseTimer++;
                    
                    // 1. Draw a shrinking, flashing warning circle around the planet
                    ctx.save();
                    ctx.beginPath();
                    let warningRadius = hookedPlanet.radius * (1 + (1 - planetFuseTimer / 90) * 1.5);
                    ctx.arc(hookedPlanet.x, hookedPlanet.y - cameraY, Math.max(hookedPlanet.radius, warningRadius), 0, Math.PI * 2);
                    ctx.strokeStyle = planetFuseTimer % 10 < 5 ? "#ff3300" : "rgba(255, 51, 0, 0.3)"; // Pulse flashing red
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();

                    // 2. FUSE TRIGGER DEADLINE OVERLAP
                    if (planetFuseTimer >= 90) { 
                        // EXPLODED! Force break the tether line immediately
                        isHooked = false;
                        planetFuseTimer = 0;
                        currentCombo = 1; // Break combo chain layout markers
                        
                        // Launch the ship outward/downward violently away from the blast zone
                        let blastAngle = hookAngle + (Math.PI / 2) * orbitDirection;
                        ship.speedX = Math.cos(blastAngle) * 12;
                        ship.speedY = Math.sin(blastAngle) * 12 + 4; // Extra gravity push downward
                        
                        // Flash explosive sparks and screen shake
                        createSparks(hookedPlanet.x, hookedPlanet.y, "#ff1e00", 25);
                        if (isShakeEnabled) screenShake = 18;
                        
                        // Play a sound if you have a crash noise asset mapping ready
                        let boom = new Audio("sounds/click.mp3"); boom.volume = 0.6; boom.play().catch(e=>{});
                        
                        // Throw up an arcade UI warning notification pop label over the ship layout
                        floatingPopups.push({
                            x: ship.x,
                            y: ship.y,
                            text: "💥 DETONATED! 💥",
                            color: "#ff3300",
                            alpha: 1.0,
                            scale: 1.2
                        });
                    }
                } else {
                    planetFuseTimer = 0; // Safe reset if you stay on non-volatile nodes
                }


                // ====================================================
                // PREMIUM NEON GRAPPLE LINE RENDERER
                // ====================================================
                ctx.save();
                ctx.beginPath(); 
                ctx.fillStyle = "rgba(0,0,0,0)";
                ctx.moveTo(hookedPlanet.x, hookedPlanet.y - cameraY); 
                ctx.lineTo(ship.x, ship.y - cameraY);
                
                let ropeColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00fffe";
                ctx.strokeStyle = ropeColor; 
                ctx.lineWidth = 2.5; 
                ctx.shadowColor = ropeColor;
                ctx.shadowBlur = 8;
                
                ctx.stroke();
                ctx.restore();
                        } else {
                planetFuseTimer = 0; // Safe reset when drifting cleanly through space voids
                ship.x += ship.speedX; 
                ship.y += ship.speedY; 
                ship.speedX *= 0.993; 
                ship.speedY *= 0.993; 
                ship.angle += ship.spinSpeed;

                // ====================================================
                // NEW: Physics-Based Afterburner Embers Spark System
                // ====================================================
                if (Math.random() < 0.35 && Math.hypot(ship.speedX, ship.speedY) > 2) {
                    let engineColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00ffcc";
                    particles.push({
                        x: ship.x + randRange(-3, 3),
                        y: ship.y + randRange(-3, 3),
                        vx: -ship.speedX * 0.4 + randRange(-0.5, 0.5),
                        vy: -ship.speedY * 0.4 + randRange(-0.5, 0.5),
                        radius: randRange(1, 2.5),
                        alpha: 0.8,
                        color: engineColor,
                        isFire: true
                    });
                }
            }



        }



                    let calculatedScore = Math.floor(Math.max(0, (550 - ship.y) / 50));
        if (calculatedScore > totalScore) { 
            let scoreDifference = calculatedScore - totalScore;
            
            // Map internal planet streak thresholds over to display multipliers (3 planets = 1x, 4 = 2x...)
            let activeMultiplier = currentCombo >= 3 ? (currentCombo - 2) : 1;
            let finalGain = scoreDifference * activeMultiplier;
            
            totalScore += finalGain; 
            document.getElementById("score").innerText = totalScore; 

            // NEW SAFETY RULE: Only spawn the floating score popup text if a 3-planet streak is active!
            if (currentCombo >= 3) {
                floatingPopups.push({
                    x: ship.x,
                    y: ship.y - 15,
                    text: `+${finalGain}`,
                    color: SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00ffcc",
                    alpha: 1.0,
                    scale: 1.0 + (activeMultiplier * 0.05)
                });
            }

            // ====================================================
            // TRACKER: MILESTONE NOTIFICATION BANNER ENGINE
            // ====================================================
            if (totalScore >= 100 && totalScore < 200 && !hasTriggered100Alert) {
                hasTriggered100Alert = true;
                activeBannerText = "⚠️ WARNING: ASTEROID STREAK INCOMING ⚠️";
                bannerDisplayTimer = 150; // Display alert for 2.5 seconds at 60fps
                if (isShakeEnabled) screenShake = 12; // Shake screen for dramatic tension!
                let alertSound = new Audio("sounds/click.mp3"); alertSound.volume = 0.5; alertSound.play().catch(e=>{});
            } 
            else if (totalScore >= 200 && !hasTriggered200Alert) {
                hasTriggered200Alert = true;
                activeBannerText = "🔥 STAGE 2: WARP ORBIT ENGAGED 🔥";
                bannerDisplayTimer = 150; 
                if (isShakeEnabled) screenShake = 15;
                let alertSound = new Audio("sounds/click.mp3"); alertSound.volume = 0.5; alertSound.play().catch(e=>{});
            }
        }

        if (ship.x - ship.radius < 0) { ship.x = ship.radius; ship.speedX *= -0.8; if (isShakeEnabled) screenShake = 3; }
        else if (ship.x + ship.radius > window.innerWidth) { ship.x = window.innerWidth - ship.radius; ship.speedX *= -0.8; if (isShakeEnabled) screenShake = 3; }
        if (ship.y - cameraY > window.innerHeight + 100) { triggerGameOver(); }
    }



   for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; 
    p.y += p.vy; 
    p.alpha -= p.isFire ? 0.045 : 0.025;
    
    if (p.alpha <= 0) {
        particles.splice(i, 1);
    } else {
        ctx.save(); 
        ctx.globalAlpha = p.alpha; 
        ctx.beginPath();
        let dynamicRadius = p.isFire ? p.radius * p.alpha : p.radius;
        ctx.arc(p.x, p.y - cameraY, Math.max(0.2, dynamicRadius), 0, Math.PI * 2); 
        ctx.fillStyle = p.color; 
        ctx.fill(); 
        ctx.restore();
    }
}


            // ====================================================
    // ====================================================
    // EXPLOSION SHOCKWAVE RING EFFECT
    // ====================================================
    if (isGameOver && screenShake > 0) {
        ctx.save();
        ctx.beginPath();
        let waveRadius = (22 - screenShake) * 6; 
        ctx.arc(ship.x, ship.y - cameraY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#ffffff";
        ctx.lineWidth = Math.max(0.5, screenShake * 0.5); 
        ctx.globalAlpha = Math.min(1, Math.max(0, screenShake / 22)); 
        ctx.stroke();
        ctx.restore();
    }

    // ====================================================
    // RENDER: Spaceship model graphic overlays
    // ====================================================
    ctx.save(); 
    ctx.translate(ship.x, ship.y - cameraY);
    if (isHooked) { 
        ctx.rotate(hookAngle + (Math.PI / 2) * orbitDirection); 
    } else { 
        ctx.rotate(ship.angle); 
    }
    

        // VERIFIED RE-RENDER ENGINE FIX: Draws the ship perfectly if alive
    if (!isGameOver) {
        // ==========================================
        // NEW: Snappy Engine Exhaust Plume Component
        // ==========================================
        let currentVelocity = Math.hypot(ship.speedX, ship.speedY);
        if (currentVelocity > 0.5 || isHooked) {
            ctx.save();
            ctx.rotate(Math.PI); // Flips the flare backwards
            
            let exhaustLength = 12 + currentVelocity * 2.5 + Math.sin(Date.now() * 0.05) * 4;
            let flameGrad = ctx.createLinearGradient(0, 0, 0, exhaustLength);
            let engineColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00ffcc";
            
            flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)"); // Hot white core
            flameGrad.addColorStop(0.2, engineColor);
            flameGrad.addColorStop(1, "rgba(0, 0, 0, 0)"); // Fades out
            
            ctx.beginPath();
            ctx.moveTo(-4, ship.radius - 2);
            ctx.lineTo(4, ship.radius - 2);
            ctx.lineTo(0, ship.radius + exhaustLength);
            ctx.closePath();
            
            ctx.fillStyle = flameGrad;
            ctx.fill();
            ctx.restore();
        }

        // Standard image layout paths continue below cleanly
        let activeShipImg = shipModels[equippedSkin];
        if (activeShipImg && activeShipImg.complete) {
            ctx.drawImage(activeShipImg, -ship.radius - 4, -ship.radius - 4, ship.radius * 2 + 8, ship.radius * 2 + 8);
        } else {
            ctx.beginPath(); 
            ctx.moveTo(0, -ship.radius - 3); 
            ctx.lineTo(-ship.radius, ship.radius); 
            ctx.lineTo(ship.radius, ship.radius); 
            ctx.closePath();
            ctx.fillStyle = "#ffffff"; 
            ctx.fill();
        }

        if (isShieldActive) {
            ctx.beginPath(); 
            ctx.arc(0, 0, ship.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 181, 255, 0.7)"; 
            ctx.lineWidth = 3; 
            ctx.stroke();
        }
    } 
    
    ctx.restore();


      // ====================================================
    // FEATURE 2: VERTICAL LEVEL PROGRESS BAR HUD TRACKER
    // ====================================================
    if (!isMenuMode) {
        ctx.save();
        
        let barWidth = 6;
        let barHeight = window.innerHeight * 0.4; // Spans 40% of screen height
        let barX = 20; // 20 pixels away from the left edge of the screen
        let barY = (window.innerHeight - barHeight) / 2; // Center it vertically
        
        let themeColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#00ffcc";

        // 1. Draw the background track path
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(barX, barY, barWidth, barHeight, 3);
        } else {
            ctx.rect(barX, barY, barWidth, barHeight);
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();

        // 2. Calculate current player progress percentage cap (Milestone max = 300)
        let progressPercent = Math.min(1, totalScore / 300);
        let filledHeight = barHeight * progressPercent;

        // 3. Draw the active glowing progress fill level
        if (filledHeight > 0) {
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(barX, barY + barHeight - filledHeight, barWidth, filledHeight, 3);
            } else {
                ctx.rect(barX, barY + barHeight - filledHeight, barWidth, filledHeight);
            }
            ctx.fillStyle = themeColor;
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = 6;
            ctx.fill();
        }

                // 4. Draw milestone indicator notch lines (100 and 200 difficulty marks)
                // 4. Draw milestone indicator notch lines (100 and 200 difficulty marks)
        let marks = Array.of(100, 200); // Fixed! This creates the list without using brackets
        marks.forEach(m => {
            let markPercent = m / 300;
            let markY = barY + barHeight - (barHeight * markPercent);
            
            ctx.beginPath();
            ctx.moveTo(barX - 2, markY);
            ctx.lineTo(barX + barWidth + 2, markY);
            ctx.strokeStyle = totalScore >= m ? themeColor : "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });


        // 5. Draw the Mini-Ship Icon Head Tracker tracking right on the fill edge
        let handleY = barY + barHeight - filledHeight;
        ctx.beginPath();
        ctx.arc(barX + barWidth / 2, handleY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.restore();
    }

        // ====================================================
    // RENDER: ANIMATED ARCADE MILESTONE ALERT BANNERS
    // ====================================================
    if (bannerDisplayTimer > 0 && !isMenuMode && !isGameOver) {
        bannerDisplayTimer--;
        ctx.save();

        // Calculate a smooth fade-in and fade-out opacity curve
        let bannerAlpha = 1.0;
        if (bannerDisplayTimer > 130) {
            bannerAlpha = (150 - bannerDisplayTimer) / 20; // Smooth fade-in
        } else if (bannerDisplayTimer < 30) {
            bannerAlpha = bannerDisplayTimer / 30; // Smooth fade-out
        }

        ctx.globalAlpha = bannerAlpha;

        // Draw a dark neon backdrop horizontal ribbon strap across the middle of the screen
        let centerY = window.innerHeight * 0.35; // Positioned slightly above absolute center
        ctx.fillStyle = "rgba(10, 10, 20, 0.75)";
        ctx.fillRect(0, centerY - 30, window.innerWidth, 60);

        // Render the pulsing glowing banner announcement text
        let accentColor = totalScore >= 200 ? "#ff007f" : "#ffcc00"; // Pink warning for 200, Yellow for 100
        ctx.fillStyle = accentColor;
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 12;

        // Apply a subtle oscillation scaling effect using Date.now() to make text pulse!
        let textPulseFactor = 1 + Math.sin(Date.now() * 0.01) * 0.04;
        ctx.save();
        ctx.translate(window.innerWidth / 2, centerY);
        ctx.scale(textPulseFactor, textPulseFactor);
        ctx.fillText(activeBannerText, 0, 0);
        ctx.restore();

        ctx.restore();
    }


    // ====================================================
    // FEATURE: DRAW FLOATING COMBO POPUPS OVER HEAD
    // ====================================================
    if (typeof floatingPopups !== 'undefined') {
        for (let i = floatingPopups.length - 1; i >= 0; i--) {
            let pop = floatingPopups[i];
            
            pop.y -= 0.8;       
            pop.alpha -= 0.022; 
            
            if (pop.alpha <= 0) {
                floatingPopups.splice(i, 1); 
            } else {
                ctx.save();
                ctx.globalAlpha = pop.alpha;
                ctx.fillStyle = pop.color;
                
                // NEW: Scaled down default bases (Combo is 14px instead of 20px, regular points are 10px)
                let isCombo = pop.text.includes("COMBO");
                let baseSize = isCombo ? 14 : 10; 
                
                ctx.font = `bold ${Math.round(baseSize * pop.scale)}px 'Courier New', monospace`;
                ctx.textAlign = "center";
                ctx.shadowColor = "rgba(0,0,0,0.6)";
                ctx.shadowBlur = 4;
                
                ctx.fillText(pop.text, pop.x, pop.y - cameraY);
                ctx.restore();
            }
        }
    }

    if (isMenuMode) { ctx.fillStyle = "rgba(5, 5, 15, 0.25)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight); }
    ctx.restore(); 

        // ====================================================
    // MEMORY MANAGEMENT: SAFE POSITION-BASED CLEANUP
    // ====================================================
    // Planets will now ONLY delete if they fall 400 pixels below the bottom edge of the screen!
    if (planets.length > 35) {
        // Replace your old planet cleaner with this immediate array filter:
        planets = planets.filter(p => p.y < cameraY + window.innerHeight + 200);
        coins = coins.filter(c => c.y < cameraY + window.innerHeight + 200);
        asteroids = asteroids.filter(ast => ast.y < cameraY + window.innerHeight + 200);
        magnets = magnets.filter(mag => mag.y < cameraY + window.innerHeight + 200);
        shields = shields.filter(shd => shd.y < cameraY + window.innerHeight + 200);

    }

    requestAnimationFrame(update);
}


// ==========================================
// SCENE ROUTERS & INITIAL BOOT ENGINES
// ==========================================
document.getElementById("menu-back-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick();
    soundGameBg.pause(); soundGameBg.currentTime = 0; if (isSfxEnabled) soundMenuBg.play().catch(e => {});
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
    isMenuMode = true; isCountingDown = false; isGameOver = false;
    
    let initialPlanetY = window.innerHeight * 0.75;
    ship.x = window.innerWidth / 2; ship.y = initialPlanetY - 45; cameraY = 0;
    updateBestScoreDisplay();
});

document.getElementById("restart-btn").addEventListener("click", (e) => {
    e.stopPropagation(); soundClick(); document.getElementById("game-over-screen").classList.add("hidden"); runStartupCountdown();
});


function triggerGameOver() {
    if (isGameOver) return; 
    isGameOver = true; 
    
    if (isShakeEnabled) screenShake = 22; // Keep the intense camera shake
    
    // 1. AUTOMATED COLOR LOOKUP: Grabs the exact neon trace color map from line 96!
    let shipColor = SHIP_STYLE_COLOR_MAP[equippedSkin] || "#ffffff"; 

    // 2. Create the customized explosion using your ship's exact neon profile
    createSparks(ship.x, ship.y, shipColor, 50); // 50 sparks matching your exact ship color
    createSparks(ship.x, ship.y, "#ffffff", 20);  // 20 bright white core flash sparks
    createSparks(ship.x, ship.y, "#ff3300", 15);  // 15 trailing fire debris sparks

    // 3. Stop ship movement instantly 
    ship.speedX = 0; 
    ship.speedY = 0; 
    soundCrash();

    // 4. Wait 1.2 seconds for the colored explosion to finish before showing the main menu
    setTimeout(() => {
        soundGameBg.pause(); 
        soundGameBg.currentTime = 0;
        
        walletCoins += coinsCount; 
        localStorage.setItem("vortexWalletCoins", walletCoins);

        // ====================================================
        // ENGAGE HIGH-SCORE LEADERBOARD ENGINE
        // ====================================================
        let isNewAllTimeHigh = updateLeaderboardRegistry(totalScore);

        let previousHigh = parseInt(localStorage.getItem("stickyOrbitBestScore") || 0);
        if (totalScore > previousHigh) { 
            localStorage.setItem("stickyOrbitBestScore", totalScore); 
            updateBestScoreDisplay(); 
        }
        
        document.getElementById("final-coins").innerText = coinsCount; 
        
        // Display score and append a pulsing flare badge if they hit an all-time Rank #1
        let scoreLabel = document.getElementById("final-score");
        if (isNewAllTimeHigh) {
            scoreLabel.innerHTML = `${totalScore} <span style="color:#ffaa00; font-size:12px; display:block; margin-top:4px; font-weight:bold;">🔥 NEW ALL-TIME RECORD! 🔥</span>`;
        } else {
            scoreLabel.innerText = totalScore;
        }

        document.getElementById("game-over-screen").classList.remove("hidden"); 
        document.getElementById("ui-layer").classList.add("hidden");
    }, 1200); 
}


window.addEventListener("load", () => {
    setTimeout(() => {
        const introCard = document.getElementById("intro-screen"); const mainMenuCard = document.getElementById("main-menu");
        if (introCard) introCard.classList.add("fade-away");
        if (mainMenuCard) { mainMenuCard.classList.remove("hidden-menu"); mainMenuCard.style.opacity = "1"; mainMenuCard.style.visibility = "visible"; }
        
        // ====================================================
        // NEW ACTION: Wait exactly 1 second after intro ends, then show profile box
        // ====================================================
        setTimeout(() => {
            checkUserProfileRegistration();
        }, 1000); // 1000 milliseconds = 1 second delay buffer!
    }, 3000);
});


// Boot title screen background parameter anchors cleanly
let initialPlanetY = window.innerHeight * 0.75;
planets = [{ x: window.innerWidth / 2, y: initialPlanetY, baseX: window.innerWidth / 2, waveOffset: 0, radius: 35, modelID: 0 }];
spawnWorldElements(initialPlanetY - 160, -1000);
ship.x = window.innerWidth / 2; ship.y = initialPlanetY - 45;



// ====================================================
// PROFILE ENGINE: ULTIMATE SEAMLESS MULTI-ACCOUNT WORKER
// ====================================================
let currentPilotName = localStorage.getItem("vortexPilotName") || "VORTEX";

function checkUserProfileRegistration() {
    let textSlot = document.getElementById("display-pilot-name");
    let floatingTag = document.getElementById("floating-pilot-widget");
    let topScoreSlot = document.getElementById("display-top-score");
    let profileModal = document.getElementById("profile-modal");
    
    if (topScoreSlot) topScoreSlot.innerText = localStorage.getItem("stickyOrbitBestScore") || 0;
    if (textSlot) textSlot.innerText = currentPilotName;
    if (floatingTag) floatingTag.classList.remove("hidden-panel"); 

    if (!localStorage.getItem("vortexPilotName") || localStorage.getItem("vortexPilotName") === "VORTEX") {
        if (profileModal) profileModal.classList.remove("hidden-panel");
    } else {
        if (typeof updateLeaderboardRegistry === "function") updateLeaderboardRegistry(); 
    }
}

// ====================================================
// FIX: WELCOME PROFILE LOGIN WITH CHOSEN LIVE RELOAD
// ====================================================
function saveNewUserProfile() {
    let inputField = document.getElementById("username-input");
    let cleanName = "VORTEX";
    
    if (inputField && inputField.value) {
        cleanName = inputField.value.trim().toUpperCase();
    }
    if (cleanName === "" || cleanName === "VORTEX") cleanName = "VORTEX";

    let savedProfilesRegistry = {};
    try {
        savedProfilesRegistry = JSON.parse(localStorage.getItem("vortex_all_profiles_manifest") || "{}");
    } catch(e) {
        savedProfilesRegistry = {};
    }
    
    // 1. CHOOSE DATA: RECOVER HISTORICAL ACCOUNTS PRECISELY
    if (savedProfilesRegistry[cleanName]) {
        let data = savedProfilesRegistry[cleanName];
        
        localStorage.setItem("stickyOrbitBestScore", data.bestScore || 0);
        localStorage.setItem("vortexWalletCoins", data.coins || 0);
        localStorage.setItem("walletCoins", data.coins || 0); 
        localStorage.setItem("stickyOrbitEquippedSkin", data.equippedSkin || "default");

        if (typeof totalScore !== 'undefined') totalScore = 0; 
        if (typeof coinsCount !== 'undefined') coinsCount = 0;
        if (typeof walletCoins !== 'undefined') walletCoins = parseInt(data.coins) || 0;
        if (typeof unlockedSkins !== 'undefined') unlockedSkins = data.unlockedSkins || ["default"];
        if (typeof equippedSkin !== 'undefined') equippedSkin = data.equippedSkin || "default";
        
    } else {
        // FRESH ACCOUNT CREATION ONLY: No overwriting old entries!
        let localDeviceCoins = parseInt(localStorage.getItem("vortexWalletCoins")) || 0;
        let localDeviceBest = parseInt(localStorage.getItem("stickyOrbitBestScore")) || 0;
        
        // If they have 0 on the device (due to log out), give them a 750 starter kit profile
        if (localDeviceCoins === 0 && cleanName !== "VORTEX") localDeviceCoins = 750;

        savedProfilesRegistry[cleanName] = {
            bestScore: localDeviceBest,
            coins: localDeviceCoins,
            unlockedSkins: (typeof unlockedSkins !== 'undefined' ? unlockedSkins : ["default"]),
            equippedSkin: (typeof equippedSkin !== 'undefined' ? equippedSkin : "default")
        };
        localStorage.setItem("vortex_all_profiles_manifest", JSON.stringify(savedProfilesRegistry));

        localStorage.setItem("vortexWalletCoins", localDeviceCoins);
        localStorage.setItem("stickyOrbitBestScore", localDeviceBest);
        if (typeof walletCoins !== 'undefined') walletCoins = localDeviceCoins;
    }

    localStorage.setItem("vortexPilotName", cleanName);
    currentPilotName = cleanName;

    let profileModal = document.getElementById("profile-modal");
    if (profileModal) profileModal.classList.add("hidden-panel");
    
    let textSlot = document.getElementById("display-pilot-name");
    if (textSlot) textSlot.innerText = currentPilotName;

    // Refresh visual text counters on screen right before reload
    if (typeof refreshAllVisualInterfaceCounters === "function") refreshAllVisualInterfaceCounters();

    // ====================================================
    // HIGH-PRIORITY REBOOT TRANSITION
    // Gives the hard drive 80ms to lock the data before hard refreshing!
    // ====================================================
    setTimeout(() => {
        window.location.reload();
    }, 80);
}


// ====================================================
// FIX: DROPDOWN INLINE "SAVE" BUTTON WITH CHOSEN LIVE RELOAD
// ====================================================
function updateProfileNameFromDropdown() {
    let editField = document.getElementById("edit-username-input");
    if (!editField) return;

    let updatedName = editField.value.trim().toUpperCase();
    if (updatedName === "" || updatedName === "VORTEX") return; 

    let savedProfilesRegistry = {};
    try {
        savedProfilesRegistry = JSON.parse(localStorage.getItem("vortex_all_profiles_manifest") || "{}");
    } catch(e) {
        savedProfilesRegistry = {};
    }

    // Backup current data under your old profile name BEFORE switching!
    if (localStorage.getItem("vortexPilotName") && currentPilotName !== "VORTEX") {
        savedProfilesRegistry[currentPilotName] = {
            bestScore: parseInt(localStorage.getItem("stickyOrbitBestScore")) || 0,
            coins: parseInt(localStorage.getItem("vortexWalletCoins")) || 0,
            unlockedSkins: (typeof unlockedSkins !== 'undefined' ? unlockedSkins : ["default"]),
            equippedSkin: (typeof equippedSkin !== 'undefined' ? equippedSkin : "default")
        };
    }

    // 1. CHOOSE DATA: DOWNLOAD ARCHIVED METRICS
    if (savedProfilesRegistry[updatedName]) {
        let data = savedProfilesRegistry[updatedName];
        
        localStorage.setItem("stickyOrbitBestScore", data.bestScore || 0);
        localStorage.setItem("vortexWalletCoins", data.coins || 0);
        localStorage.setItem("walletCoins", data.coins || 0); 
        localStorage.setItem("stickyOrbitEquippedSkin", data.equippedSkin || "default");
        
        if (typeof totalScore !== 'undefined') totalScore = 0; 
        if (typeof coinsCount !== 'undefined') coinsCount = 0;
        if (typeof walletCoins !== 'undefined') walletCoins = parseInt(data.coins) || 0;
        if (typeof unlockedSkins !== 'undefined') unlockedSkins = data.unlockedSkins || ["default"];
        if (typeof equippedSkin !== 'undefined') equippedSkin = data.equippedSkin || "default";
    } else {
        // Create a new blank profile row folder layout securely
        savedProfilesRegistry[updatedName] = {
            bestScore: 0,
            coins: 750, // Starter credits package
            unlockedSkins: ["default"],
            equippedSkin: "default"
        };
        localStorage.setItem("stickyOrbitBestScore", 0);
        localStorage.setItem("vortexWalletCoins", 750);
        if (typeof walletCoins !== 'undefined') walletCoins = 750;
        if (typeof unlockedSkins !== 'undefined') unlockedSkins = ["default"];
        if (typeof equippedSkin !== 'undefined') equippedSkin = "default";
    }

    localStorage.setItem("vortex_all_profiles_manifest", JSON.stringify(savedProfilesRegistry));
    localStorage.setItem("vortexPilotName", updatedName);
    currentPilotName = updatedName;

    let textSlot = document.getElementById("display-pilot-name");
    if (textSlot) textSlot.innerText = updatedName;
    editField.value = ""; 

    let profileDropdown = document.getElementById("pilot-profile-dropdown");
    if (profileDropdown) profileDropdown.classList.add("hidden-panel");

    if (typeof refreshAllVisualInterfaceCounters === "function") refreshAllVisualInterfaceCounters();

    // ====================================================
    // HIGH-PRIORITY REBOOT TRANSITION
    // Gives the hard drive 80ms to lock the data before hard refreshing!
    // ====================================================
    setTimeout(() => {
        window.location.reload();
    }, 80);
}

// ====================================================
// USER SIGN-OUT SYSTEM ROUTINE (WITH DEPLOYED PAGE RELOAD)
// ====================================================
function confirmAndDisconnectProfile() {
    let checkChoice = confirm("🚀 DISCONNECT DOSSIER?\nYour active coins and high records will be backed up under your current name profile before signing out.");
    if (!checkChoice) return; 

    // A. LOCK AND ACCUMULATE BACKUPS FIRST
    let savedProfilesRegistry = {};
    try {
        savedProfilesRegistry = JSON.parse(localStorage.getItem("vortex_all_profiles_manifest") || "{}");
    } catch(e) {
        savedProfilesRegistry = {};
    }
    
    let activeBestRun = localStorage.getItem("stickyOrbitBestScore") || 0;
    let activeWalletCoins = localStorage.getItem("vortexWalletCoins") || localStorage.getItem("walletCoins") || 0;

    if (localStorage.getItem("vortexPilotName") && currentPilotName !== "VORTEX") {
        savedProfilesRegistry[currentPilotName] = {
            bestScore: parseInt(activeBestRun) || 0,
            coins: parseInt(activeWalletCoins) || 0,
            unlockedSkins: (typeof unlockedSkins !== 'undefined' ? unlockedSkins : ["default"]),
            equippedSkin: (typeof equippedSkin !== 'undefined' ? equippedSkin : "default")
        };
        localStorage.setItem("vortex_all_profiles_manifest", JSON.stringify(savedProfilesRegistry));
    }

    // B. RE-INITIALIZATION WIPE: Drops values instantly before rebooting
    localStorage.removeItem("vortexPilotName");
    currentPilotName = "VORTEX"; 
    
    localStorage.setItem("stickyOrbitBestScore", 0);
    localStorage.setItem("vortexWalletCoins", 0);
    localStorage.setItem("walletCoins", 0);
    localStorage.setItem("coins", 0);
    localStorage.setItem("stickyOrbitEquippedSkin", "default");
    
    if (typeof totalScore !== 'undefined') totalScore = 0;
    if (typeof coinsCount !== 'undefined') coinsCount = 0;
    if (typeof walletCoins !== 'undefined') walletCoins = 0;
    if (typeof coins !== 'undefined') coins = 0;

    if (typeof unlockedSkins !== 'undefined') unlockedSkins = ["default"];
    if (typeof equippedSkin !== 'undefined') equippedSkin = "default";

    // C. INSTANT HARD ELEMENT RESET
    let coinElements = ["coins-score", "shop-wallet-value", "final-coins", "wallet-coins", "coins-display", "score"];
    coinElements.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerText = "0"; 
    });

    let menuBestScoreHUD = document.getElementById("best-score-display"); 
    if (menuBestScoreHUD) menuBestScoreHUD.innerText = "0";
    
    let topScoreSlot = document.getElementById("display-top-score");
    if (topScoreSlot) topScoreSlot.innerText = "0";

    if (typeof equipSpaceshipModel === "function") {
        try { equipSpaceshipModel("default"); } catch(e) {}
    }

    // D. HIGH-PRIORITY REBOOT TRANSITION
    // Gives the hard drive 80 milliseconds to register the zero state, then reloads!
    setTimeout(() => {
        window.location.reload();
    }, 80);
}


// GLOBAL HELPER: Pushes numbers to HTML nodes seamlessly with no reload flickers
function refreshAllVisualInterfaceCounters() {
    let activeCoinsValue = localStorage.getItem("vortexWalletCoins") || "0";
    let activeBestValue = localStorage.getItem("stickyOrbitBestScore") || "0";
    
    let coinElements = ["coins-score", "shop-wallet-value", "final-coins", "wallet-coins", "coins-display", "score"];
    coinElements.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.innerText = activeCoinsValue;
});

let topScoreSlot = document.getElementById("display-top-score");
if (topScoreSlot) topScoreSlot.innerText = activeBestValue;

let menuBestScoreHUD = document.getElementById("best-score-display");
if (menuBestScoreHUD) menuBestScoreHUD.innerText = activeBestValue;

if (typeof updateBestScoreDisplay === "function") {
    try { updateBestScoreDisplay(); } catch(e) {}
}

if (typeof equipSpaceshipModel === "function") {
    try { equipSpaceshipModel(typeof equippedSkin !== 'undefined' ? equippedSkin : "default"); } catch(e) {}
}

if (typeof updateLeaderboardRegistry === "function") updateLeaderboardRegistry();
}



// 1. TOGGLE HALL OF FAME SYSTEM DROPDOWN OVERLAY
function toggleHallOfFameDropdown(event) {
    if (event) event.stopPropagation();
    
    let hofDropdown = document.getElementById("hof-dropdown-card");
    let profileDropdown = document.getElementById("pilot-profile-dropdown");
    
    // Safety close your profile window if it's already open to avoid overlapping layers
    if (profileDropdown) profileDropdown.classList.add("hidden-panel");

    if (hofDropdown) {
        if (hofDropdown.classList.contains("hidden-panel")) {
            // Re-render and populate rows inside the container right before fading up
            updateLeaderboardRegistry();
            hofDropdown.classList.remove("hidden-panel");
        } else {
            hofDropdown.classList.add("hidden-panel");
        }
    }
}

// 2. TOGGLE USER ACCOUNT DOSSIER DROPDOWN OVERLAY
function togglePilotProfileDropdown(event) {
    if (event) event.stopPropagation();
    
    let hofDropdown = document.getElementById("hof-dropdown-card");
    let profileDropdown = document.getElementById("pilot-profile-dropdown");
    
    // Safety close your Hall Of Fame window if it's open to avoid overlaps
    if (hofDropdown) hofDropdown.classList.add("hidden-panel");

    if (profileDropdown) {
        if (profileDropdown.classList.contains("hidden-panel")) {
            document.getElementById("stats-best-score").innerText = localStorage.getItem("stickyOrbitBestScore") || 0;
            document.getElementById("stats-total-coins").innerText = localStorage.getItem("vortexWalletCoins") || 0;
            profileDropdown.classList.remove("hidden-panel");
        } else {
            profileDropdown.classList.add("hidden-panel");
        }
    }
}

// 3. UPDATED CORE LEADERBOARD PRINTER: Maps records into dropdowns cleanly
function updateLeaderboardRegistry(newScore) {
    let leaderboardData = JSON.parse(localStorage.getItem("vortexLeaderboardRecords") || "[]");

    if (newScore !== undefined && newScore > 0) {
        let newEntry = {
            name: currentPilotName,
            score: newScore,
            date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
        leaderboardData.push(newEntry);
        leaderboardData.sort((a, b) => b.score - a.score);
        leaderboardData = leaderboardData.slice(0, 5); 
        localStorage.setItem("vortexLeaderboardRecords", JSON.stringify(leaderboardData));
        
        // Update header button badge numbers immediately on score break
        let topScoreSlot = document.getElementById("display-top-score");
        if (topScoreSlot) topScoreSlot.innerText = leaderboardData[0].score;
    }

    // Bind data rows layout to the dropdown sub-container div elements
    let rowContainer = document.getElementById("menu-leaderboard-rows-container");
    if (!rowContainer) return false;

    if (leaderboardData.length === 0) {
        rowContainer.innerHTML = "<div style='text-align:center; padding:10px; opacity:0.5;'>No records recorded yet!</div>";
        return false;
    }

    let rowsHTML = "";
    leaderboardData.forEach((record, index) => {
        let rankBadge = ["1st", "2nd", "3rd", "4th", "5th"][index];
        let themeColor = index === 0 ? "#ffd700" : (index === 1 ? "#c0c0c0" : (index === 2 ? "#cd7f32" : "#ffffff"));
        
        let dName = record.name || "PILOT";
        if (dName.length > 7) dName = dName.substring(0, 6) + ".";

        rowsHTML += `
            <div class="menu-leaderboard-row" style="color: ${themeColor}">
                <span>${rankBadge} ${dName}</span>
                <span class="menu-leaderboard-score">${record.score} pts</span>
            </div>
        `;
    });

    rowContainer.innerHTML = rowsHTML;
    
    // Also update your Game Over list container if active
    let gameOverBoard = document.getElementById("leaderboard-container");
    if (gameOverBoard) gameOverBoard.innerHTML = rowsHTML;

    return leaderboardData && leaderboardData[0] && leaderboardData[0].score === newScore;
}

// ====================================================
// DROPDOWN NAME MODIFIER: MULTI-ACCOUNT ACCOUNT RECOVERY
// ====================================================
function updateProfileNameFromDropdown() {
    let editField = document.getElementById("edit-username-input");
    if (!editField) return;

    let updatedName = editField.value.trim().toUpperCase();
    if (updatedName === "") return; // Terminate if left blank

    // 1. Fetch your master tracking database manifest safely
    let savedProfilesRegistry = {};
    try {
        savedProfilesRegistry = JSON.parse(localStorage.getItem("vortex_all_profiles_manifest") || "{}");
    } catch(e) {
        savedProfilesRegistry = {};
    }

    // Backup whatever you just did under your OLD name before switching
    if (localStorage.getItem("vortexPilotName") && currentPilotName !== "VORTEX") {
        let activeBestRun = localStorage.getItem("stickyOrbitBestScore") || 0;
        let activeWalletCoins = localStorage.getItem("vortexWalletCoins") || localStorage.getItem("walletCoins") || 0;
        
        savedProfilesRegistry[currentPilotName] = {
            bestScore: parseInt(activeBestRun) || 0,
            coins: parseInt(activeWalletCoins) || 0,
            unlockedSkins: (typeof unlockedSkins !== 'undefined' ? unlockedSkins : ["default"]),
            equippedSkin: (typeof equippedSkin !== 'undefined' ? equippedSkin : "default")
        };
    }

    // 2. TARGET PROFILE LOOKUP & RECOVERY BRIDGE
    if (savedProfilesRegistry[updatedName]) {
        let data = savedProfilesRegistry[updatedName];
        
        localStorage.setItem("stickyOrbitBestScore", data.bestScore || 0);
        localStorage.setItem("vortexWalletCoins", data.coins || 0);
        localStorage.setItem("walletCoins", data.coins || 0); 
        localStorage.setItem("stickyOrbitEquippedSkin", data.equippedSkin || "default");
        
        if (typeof totalScore !== 'undefined') totalScore = 0; 
        if (typeof coinsCount !== 'undefined') coinsCount = 0;
        if (typeof walletCoins !== 'undefined') walletCoins = parseInt(data.coins) || 0;
        if (typeof unlockedSkins !== 'undefined') unlockedSkins = data.unlockedSkins || ["default"];
        if (typeof equippedSkin !== 'undefined') equippedSkin = data.equippedSkin || "default";

    } else {
        // BRAND NEW NAME PROFILE: Give them whatever scores/coins are currently on the device
        let localDeviceCoins = parseInt(localStorage.getItem("vortexWalletCoins")) || parseInt(localStorage.getItem("walletCoins")) || 0;
        let localDeviceBest = parseInt(localStorage.getItem("stickyOrbitBestScore")) || 0;
        
        savedProfilesRegistry[updatedName] = {
            bestScore: localDeviceBest,
            coins: localDeviceCoins,
            unlockedSkins: (typeof unlockedSkins !== 'undefined' ? unlockedSkins : ["default"]),
            equippedSkin: (typeof equippedSkin !== 'undefined' ? equippedSkin : "default")
        };
        
        localStorage.setItem("vortexWalletCoins", localDeviceCoins);
        localStorage.setItem("stickyOrbitBestScore", localDeviceBest);
        if (typeof walletCoins !== 'undefined') walletCoins = localDeviceCoins;
    }

    // 3. SECURE ACTIVE NAME MANIFEST IN STORAGE
    localStorage.setItem("vortex_all_profiles_manifest", JSON.stringify(savedProfilesRegistry));
    localStorage.setItem("vortexPilotName", updatedName);
    currentPilotName = updatedName;

    // 4. SYNCHRONIZE OVERLAY TEXT BOXES AND HIDE PANELS
    let textSlot = document.getElementById("display-pilot-name");
    if (textSlot) textSlot.innerText = updatedName;
    editField.value = ""; 

    let profileDropdown = document.getElementById("pilot-profile-dropdown");
    if (profileDropdown) profileDropdown.classList.add("hidden-panel");

    // 5. LIVE RE-BIND MATRIX: Pre-flush data numbers to UI elements
    let activeCoinsValue = localStorage.getItem("vortexWalletCoins") || "0";
    let activeBestValue = localStorage.getItem("stickyOrbitBestScore") || "0";
    
    let coinElements = ["coins-score", "shop-wallet-value", "final-coins", "wallet-coins", "coins-display"];
    coinElements.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerText = activeCoinsValue; 
    });

    let topScoreSlot = document.getElementById("display-top-score");
    if (topScoreSlot) topScoreSlot.innerText = activeBestValue;

    let menuBestScoreHUD = document.getElementById("best-score-display"); 
    if (menuBestScoreHUD) menuBestScoreHUD.innerText = activeBestValue;

    if (typeof updateLeaderboardRegistry === "function") updateLeaderboardRegistry();

    // ====================================================
    // 6. FIXED REBOOT BRIDGE: Forces an instant page refresh to lock assets!
    // ====================================================
    setTimeout(() => {
        window.location.reload();
    }, 80);
}

// ====================================================
// PROFILE ENGINE: Relocated Master Database Cleaner
// ====================================================
function executeFullSystemProfileWipe() {
    // 1. Throw up a high-level security verification alert prompt check
    let firstCheck = confirm("🚨 MASTER CORE DESTRUCTION REQUESTED 🚨\nThis will permanently delete ALL saved pilots, custom ship skins, credit wallets, and high score rankings from this computer. This cannot be undone!\n\nAre you absolutely sure?");
    if (!firstCheck) return;

    let secondCheck = confirm("🛑 FINAL SECURITY VERIFICATION 🛑\nConfirming this choice will clear local browser cache storage files completely. Proceed with complete database wipe?");
    if (!secondCheck) return;

    // 2. Erase the entire profile catalog registry manifest
    localStorage.removeItem("vortex_all_profiles_manifest");
    localStorage.removeItem("vortexLeaderboardRecords");
    localStorage.removeItem("vortexPilotName");
    
    // 3. Clear base game tracking metrics down to absolute zero
    localStorage.setItem("stickyOrbitBestScore", 0);
    localStorage.setItem("vortexWalletCoins", 0);
    localStorage.setItem("walletCoins", 0);
    localStorage.setItem("coins", 0);
    localStorage.setItem("stickyOrbitEquippedSkin", "default");

    // 4. Fire off an immediate 80ms delayed page refresh loop
    // This wipes away all active gameplay script array numbers and boots the intro clean at zero records!
    setTimeout(() => {
        window.location.reload();
    }, 80);
}





function signoutUserProfileSystem() {
    localStorage.removeItem("vortexPilotName");
    currentPilotName = "GUEST";
    document.getElementById("pilot-profile-dropdown").classList.add("hidden-panel");
    document.getElementById("floating-pilot-widget").classList.add("hidden-panel");
    document.getElementById("profile-modal").classList.remove("hidden-panel");
}

// ====================================================
// SMART UI SAFEGUARD: DROPDOWN CLOSER WITH SAVE PROTECTION
// ====================================================
window.addEventListener("click", (event) => {
    let hDropdown = document.getElementById("hof-dropdown-card");
    let pDropdown = document.getElementById("pilot-profile-dropdown");
    
    let hWidget = document.getElementById("floating-hof-widget");
    let pWidget = document.getElementById("floating-pilot-widget");

    // Add a tiny 50ms delay to let click actions (like the SAVE button) finish processing 
    // and write their data to memory before the dropdown is forced closed!
    setTimeout(() => {
        // 1. Safe Hall of Fame check: Close only if clicking outside the button and the card
        if (hDropdown && !hDropdown.contains(event.target) && hWidget && !hWidget.contains(event.target)) {
            hDropdown.classList.add("hidden-panel");
        }

        // 2. Safe Pilot Profile check: Close only if clicking outside the button and the card
        if (pDropdown && !pDropdown.contains(event.target) && pWidget && !pWidget.contains(event.target)) {
            pDropdown.classList.add("hidden-panel");
        }
    }, 50);
});



// ====================================================
// ARCADE OPTION CONTROLLER: BACKGROUND STARS DECK
// ====================================================
// 1. Core switch tracking variable (Loads from browser disk memory)
// FIXED: Removed 'let' so it reuses your existing global variable instead of crashing!
isStarsEnabled = localStorage.getItem("vortex_stars_enabled") !== "false"; 
// 2. Click Handler: Connects your HTML click events to the game memory loops
function registerStarsToggleClickEvent() {
    const starsBtn = document.getElementById("stars-toggle-btn");
    if (!starsBtn) return;

    starsBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Stops clicks from bleeding into game input tracks

        // Flip the boolean configuration tracking state
        isStarsEnabled = !isStarsEnabled;
        localStorage.setItem("vortex_stars_enabled", isStarsEnabled);

        // Dynamically toggle texts and glowing classes exactly like the sound button!
        if (isStarsEnabled) {
            starsBtn.innerText = "ON";
            starsBtn.classList.add("toggle-active");
            starsBtn.classList.remove("toggle-inactive"); // Adjust class names if your template uses different toggles
        } else {
            starsBtn.innerText = "OFF";
            starsBtn.classList.remove("toggle-active");
            starsBtn.classList.add("toggle-inactive");
        }
    });
}

// 3. Startup Synchronization: Sets the button text correctly when the webpage loads up
function syncStarsButtonOnStartup() {
    const starsBtn = document.getElementById("stars-toggle-btn");
    if (starsBtn) {
        if (isStarsEnabled) {
            starsBtn.innerText = "ON";
            starsBtn.classList.add("toggle-active");
        } else {
            starsBtn.innerText = "OFF";
            starsBtn.classList.remove("toggle-active");
            starsBtn.classList.add("toggle-inactive");
        }
    }
}




// RUN IMMEDIATELY ON SITE BOOT
registerStarsToggleClickEvent();
syncStarsButtonOnStartup();


// BOOT ENGINE INTERCEPT: Executes our profile checking router at startup
checkUserProfileRegistration();



update();

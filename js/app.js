// Main Application Controller & UI State

let currentRocketKey = "sls";
let currentEngineKey = "hydrolox";
let currentTargetKey = "leo";
let sim = null;
let roverSim = null;
let asteroidSim = null;
let lastTime = 0;

document.addEventListener("DOMContentLoaded", () => {
  sim = new FlightSimulator("flight-canvas", "orbit-minimap");

  initRocketSelector();
  initCustomUpload();
  initPropulsionOptions();
  initTargetSelector();
  initFlightControls();
  initRoleSwitcher();
  initMarsMode();
  initAsteroidMode();
  if (typeof initQRModal === "function") initQRModal();
  if (typeof initBankUI === "function") initBankUI();
  if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
    NASA_BANK.resetUpgrades();
  }
  updateSpecs();
  renderVabRocket();

  const btnHeaderReset = document.getElementById("btn-header-reset");
  if (btnHeaderReset) {
    btnHeaderReset.addEventListener("click", () => {
      resetEntireMission();
    });
  }

  const btnClaimGrant = document.getElementById("btn-claim-grant");
  if (btnClaimGrant) {
    btnClaimGrant.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") NASA_BANK.claimNasaGrant();
    });
  }

  // Kick off render/physics loop
  requestAnimationFrame(gameLoop);
});

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000.0, 0.1);
  lastTime = timestamp;

  const isFlightBayActive = document.getElementById("flight-bay") && document.getElementById("flight-bay").classList.contains("active");

  if (sim) {
    if (isFlightBayActive) {
      if (keysHeld["ArrowLeft"]) {
        sim.turnLeft(dt);
        updatePitchUI();
      }
      if (keysHeld["ArrowRight"]) {
        sim.turnRight(dt);
        updatePitchUI();
      }
      if (keysHeld["ArrowUp"]) {
        sim.throttle = Math.min(1.0, sim.throttle + 0.6 * dt);
        document.getElementById("throttle-slider").value = sim.throttle * 100;
        document.getElementById("throttle-readout").textContent = `${Math.round(sim.throttle * 100)}%`;
      }
      if (keysHeld["ArrowDown"]) {
        sim.throttle = Math.max(0.0, sim.throttle - 0.6 * dt);
        document.getElementById("throttle-slider").value = sim.throttle * 100;
        document.getElementById("throttle-readout").textContent = `${Math.round(sim.throttle * 100)}%`;
      }
    } else {
      // Silence flight engine immediately when outside flight bay
      if (typeof NASA_AUDIO !== "undefined") {
        NASA_AUDIO.stopEngine();
      }
    }
    sim.update(dt);
    sim.render();
    updateHudTelemetry();
  }

  // Mars Gale Crater Curiosity Rover loop
  if (roverSim && document.getElementById("mars-bay") && document.getElementById("mars-bay").classList.contains("active")) {
    roverSim.update(dt);
    roverSim.render();
    const countEl = document.getElementById("rover-samples-count");
    if (countEl) countEl.textContent = `${roverSim.samplesCollected} / 12`;
    const ptsEl = document.getElementById("rover-points-earned");
    if (ptsEl) ptsEl.textContent = `+${roverSim.pointsEarned.toLocaleString()} PTS`;
  }

  // Deep Space Asteroid Belt loop
  if (asteroidSim && document.getElementById("asteroid-bay") && document.getElementById("asteroid-bay").classList.contains("active")) {
    asteroidSim.update(dt);
    asteroidSim.render();
    const roversEl = document.getElementById("asteroid-rovers-count");
    if (roversEl) roversEl.textContent = asteroidSim.roversDeployed;
    const minEl = document.getElementById("asteroid-minerals-count");
    if (minEl) minEl.textContent = `${asteroidSim.mineralsHarvested} (+${asteroidSim.pointsEarned.toLocaleString()} PTS)`;
  }

  requestAnimationFrame(gameLoop);
}

const keysHeld = {};

function initRoleSwitcher() {
  const btnPilot = document.getElementById("btn-role-pilot");
  const btnGround = document.getElementById("btn-role-ground");
  const pilotPanel = document.getElementById("pilot-controls-panel");
  const groundPanel = document.getElementById("ground-controls-panel");
  const btnGroundStage = document.getElementById("btn-ground-stage");
  const btnGroundPrograde = document.getElementById("btn-ground-prograde");
  const btnGroundCut = document.getElementById("btn-ground-cut");

  btnPilot.addEventListener("click", () => {
    btnPilot.classList.add("active");
    btnGround.classList.remove("active");
    pilotPanel.style.display = "block";
    groundPanel.style.display = "none";
    logCapcom("[ROLE SWITCH] Switched to ASTRONAUT PILOT Cockpit Controls.");
  });

  btnGround.addEventListener("click", () => {
    btnGround.classList.add("active");
    btnPilot.classList.remove("active");
    groundPanel.style.display = "block";
    pilotPanel.style.display = "none";
    logCapcom("[ROLE SWITCH] Switched to NASA GROUND MISSION CONTROL Console.");
  });

  if (btnGroundStage) {
    btnGroundStage.addEventListener("click", () => {
      sim.separateStage();
      logCapcom("[GROUND UPLINK] Flight Director commanded STAGE SEPARATION.");
    });
  }

  if (btnGroundPrograde) {
    btnGroundPrograde.addEventListener("click", () => {
      const speed = Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy);
      if (speed > 5) {
        sim.pitch = Math.max(0, (Math.atan2(sim.vy, sim.vx) * 180) / Math.PI);
        updatePitchUI();
        logCapcom("[GROUND UPLINK] Guidance Officer uploaded optimal gravity turn trajectory.");
      }
    });
  }

  if (btnGroundCut) {
    btnGroundCut.addEventListener("click", () => {
      sim.throttle = 0.0;
      document.getElementById("throttle-slider").value = 0;
      document.getElementById("throttle-readout").textContent = "0%";
      logCapcom("[GROUND UPLINK] Main Engine Cutoff (MECO) commanded by Flight Director.");
    });
  }
}

// 01. Rocket Presets Selector
function initRocketSelector() {
  const cards = document.querySelectorAll(".selector-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentRocketKey = card.dataset.rocket;
      updateSpecs();
      renderVabRocket();
    });
  });
}

// 02. Custom Rocket Image Upload System
function initCustomUpload() {
  const dropZone = document.getElementById("image-drop-zone");
  const fileInput = document.getElementById("rocket-file-input");
  const placeholder = document.getElementById("drop-placeholder");
  const previewWrapper = document.getElementById("upload-preview-wrapper");
  const previewImg = document.getElementById("custom-image-preview");
  const clearBtn = document.getElementById("btn-clear-custom");
  const selectCustomBtn = document.getElementById("btn-select-custom");

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.value = "";
    previewImg.src = "";
    previewWrapper.style.display = "none";
    placeholder.style.display = "flex";
    selectCustomBtn.style.display = "none";
    ROCKET_CATALOG.custom.imageElement = null;

    // Reset to SLS if custom was active
    if (currentRocketKey === "custom") {
      const slsCard = document.querySelector('[data-rocket="sls"]');
      if (slsCard) slsCard.click();
    }
  });

  function handleImageFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WebP, or SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        ROCKET_CATALOG.custom.imageElement = img;
        previewImg.src = event.target.result;
        placeholder.style.display = "none";
        previewWrapper.style.display = "flex";
        selectCustomBtn.style.display = "block";

        // Deselect other cards and activate custom rocket
        document.querySelectorAll(".selector-card").forEach(c => c.classList.remove("active"));
        currentRocketKey = "custom";
        updateSpecs();
        renderVabRocket();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// 03. Propulsion Engine Options
function initPropulsionOptions() {
  const container = document.getElementById("engine-options");
  container.innerHTML = "";

  Object.values(PROPULSION_SYSTEMS).forEach(eng => {
    const card = document.createElement("div");
    card.className = `engine-card ${eng.id === currentEngineKey ? "active" : ""}`;
    card.dataset.engine = eng.id;
    card.innerHTML = `
      <div class="engine-info">
        <strong>${eng.name}</strong>
        <span>${eng.engineModel}</span>
      </div>
      <div class="engine-stats">
        <div>Cost: $${(eng.cost / 1000000).toFixed(1)}M • ${(eng.thrustSL / 1000).toLocaleString()} kN</div>
        <div>Isp: ${eng.ispSL} s</div>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".engine-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentEngineKey = eng.id;
      updateSpecs();
      renderVabRocket();
    });

    container.appendChild(card);
  });
}

// 04. Mission Target Selector
function initTargetSelector() {
  const radios = document.querySelectorAll('input[name="target"]');
  radios.forEach(r => {
    r.addEventListener("change", (e) => {
      currentTargetKey = e.target.value;
      updateSpecs();
    });
  });
}

// 05. Live Physics Specifications Update
function updateSpecs() {
  const rocket = ROCKET_CATALOG[currentRocketKey];
  const engine = PROPULSION_SYSTEMS[currentEngineKey];
  const target = MISSION_TARGETS[currentTargetKey];

  const totalMassKg = rocket.dryMass + rocket.fuelMass;
  const totalMassTons = (totalMassKg / 1000).toFixed(0);
  const fuelTons = (rocket.fuelMass / 1000).toFixed(0);
  const thrustKn = (engine.thrustSL / 1000).toFixed(0);

  // TWR = Thrust / (TotalMass * g0)
  const weightAtSL = totalMassKg * NASA_PHYSICS.STANDARD_GRAVITY;
  const twr = (engine.thrustSL / weightAtSL).toFixed(2);

  // Delta-V
  const deltaV = Math.round(NASA_PHYSICS.calculateDeltaV(engine.ispSL, totalMassKg, rocket.dryMass));

  document.getElementById("spec-total-mass").textContent = `${Number(totalMassTons).toLocaleString()} t`;
  document.getElementById("spec-fuel-mass").textContent = `${Number(fuelTons).toLocaleString()} t`;
  document.getElementById("spec-thrust").textContent = `${Number(thrustKn).toLocaleString()} kN`;
  document.getElementById("spec-isp").textContent = `${engine.ispSL} s`;
  document.getElementById("spec-twr").textContent = twr;
  document.getElementById("spec-deltav").textContent = `${deltaV.toLocaleString()} m/s`;

  // Pre-flight checks
  const checkTwr = document.getElementById("check-twr");
  if (twr >= 1.15) {
    checkTwr.className = "check-item ok";
    checkTwr.innerHTML = `<span class="check-icon">✓</span><span>TWR: ${twr} (Positive Liftoff Guaranteed)</span>`;
  } else {
    checkTwr.className = "check-item warn";
    checkTwr.innerHTML = `<span class="check-icon">⚠️</span><span>TWR: ${twr} (Low Liftoff Margin! Upgrade Propulsion)</span>`;
  }

  const checkDv = document.getElementById("check-deltav");
  if (deltaV >= target.requiredDeltaV) {
    checkDv.className = "check-item ok";
    checkDv.innerHTML = `<span class="check-icon">✓</span><span>ΔV: ${deltaV.toLocaleString()} m/s (Exceeds ${target.name} requirement)</span>`;
  } else {
    checkDv.className = "check-item warn";
    checkDv.innerHTML = `<span class="check-icon">⚠️</span><span>ΔV: ${deltaV.toLocaleString()} m/s (Under target: ${target.requiredDeltaV.toLocaleString()} m/s needed)</span>`;
  }

  const checkAero = document.getElementById("check-aerodynamics");
  const finsEquipped = (typeof NASA_BANK !== "undefined" && NASA_BANK.upgrades && NASA_BANK.upgrades.finStabilizers && NASA_BANK.upgrades.finStabilizers.purchased);
  if (checkAero) {
    if (finsEquipped) {
      checkAero.className = "check-item ok";
      checkAero.innerHTML = `<span class="check-icon">✓</span><span>Fin Stabilizers Equipped (-20% Drag & Peak Ascent Stability)</span>`;
    } else {
      checkAero.className = "check-item ok";
      checkAero.innerHTML = `<span class="check-icon">✓</span><span>Aerodynamic Center of Pressure Aligned (Fins available in Bank)</span>`;
    }
  }

  document.getElementById("preview-rocket-name").textContent = rocket.name;
  document.getElementById("preview-propulsion-name").textContent = `${engine.name} (${engine.engineModel})`;
}

// 06. Render Rocket in VAB (Assembly Bay)
function renderVabRocket() {
  const container = document.getElementById("vab-rocket-render");
  container.innerHTML = "";

  const rocket = ROCKET_CATALOG[currentRocketKey];

  if (rocket.isCustomImage && rocket.imageElement) {
    // Show uploaded image on the launch stand!
    const imgClone = rocket.imageElement.cloneNode();
    imgClone.style.maxHeight = "360px";
    imgClone.style.maxWidth = "200px";
    imgClone.style.objectFit = "contain";
    imgClone.style.filter = "drop-shadow(0 0 16px rgba(0, 229, 255, 0.4))";
    container.appendChild(imgClone);
  } else {
    // Render dynamic SVG representation of preset rocket
    const svg = createRocketSvg(rocket);
    container.appendChild(svg);
  }
}

function createRocketSvg(rocket) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "160");
  svg.setAttribute("height", "360");
  svg.setAttribute("viewBox", "0 0 160 360");

  let inner = "";
  if (rocket.id === "sls") {
    inner = `
      <!-- Core Tank -->
      <rect x="65" y="60" width="30" height="250" rx="4" fill="#d47a32" />
      <polygon points="65,60 80,10 95,60" fill="#ffffff" />
      <!-- Left Booster -->
      <rect x="42" y="110" width="16" height="200" rx="3" fill="#f5f5f5" stroke="#333" />
      <polygon points="42,110 50,85 58,110" fill="#f5f5f5" />
      <!-- Right Booster -->
      <rect x="102" y="110" width="16" height="200" rx="3" fill="#f5f5f5" stroke="#333" />
      <polygon points="102,110 110,85 118,110" fill="#f5f5f5" />
      <!-- Engine Bells -->
      <rect x="70" y="310" width="20" height="15" fill="#444" />
    `;
  } else if (rocket.id === "saturn_v") {
    inner = `
      <rect x="60" y="45" width="40" height="265" rx="4" fill="#ffffff" stroke="#222" />
      <rect x="60" y="90" width="40" height="35" fill="#111111" />
      <rect x="60" y="210" width="40" height="30" fill="#111111" />
      <polygon points="60,45 80,15 100,45" fill="#ffffff" />
      <line x1="80" y1="15" x2="80" y2="0" stroke="#ff4d4d" stroke-width="2" />
      <rect x="65" y="310" width="30" height="15" fill="#333" />
    `;
  } else if (rocket.id === "starship") {
    inner = `
      <rect x="62" y="55" width="36" height="255" rx="6" fill="#c5c9ce" />
      <polygon points="62,55 80,15 98,55" fill="#c5c9ce" />
      <!-- Flaps -->
      <polygon points="50,70 62,55 62,85" fill="#222" />
      <polygon points="110,70 98,55 98,85" fill="#222" />
      <polygon points="46,280 62,250 62,295" fill="#222" />
      <polygon points="114,280 98,250 98,295" fill="#222" />
      <rect x="68" y="310" width="24" height="15" fill="#222" />
    `;
  } else {
    // Falcon 9
    inner = `
      <rect x="68" y="60" width="24" height="250" rx="3" fill="#ffffff" stroke="#ccc" />
      <polygon points="68,60 80,30 92,60" fill="#ffffff" />
      <rect x="68" y="140" width="24" height="15" fill="#111" />
      <rect x="72" y="310" width="16" height="12" fill="#333" />
    `;
  }

  // Draw purchased aerodynamic fin stabilizers on schematic
  const finsEquipped = (typeof NASA_BANK !== "undefined" && NASA_BANK.upgrades && NASA_BANK.upgrades.finStabilizers && NASA_BANK.upgrades.finStabilizers.purchased);
  if (finsEquipped) {
    inner += `
      <!-- Equipped Fin Stabilizers -->
      <polygon points="65,275 28,310 65,304" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
      <polygon points="95,275 132,310 95,304" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
    `;
  }

  svg.innerHTML = inner;
  return svg;
}

// 07. Flight Controls & Transition to Launchpad
function initFlightControls() {
  const btnStartLaunch = document.getElementById("btn-start-launch");
  const btnAbort = document.getElementById("btn-abort-mission");
  const btnIgnite = document.getElementById("btn-ignite");
  const throttleSlider = document.getElementById("throttle-slider");
  const btnPitchLeft = document.getElementById("btn-pitch-left");
  const btnPitchCenter = document.getElementById("btn-pitch-center");
  const btnPitchRight = document.getElementById("btn-pitch-right");
  const btnStage = document.getElementById("btn-stage");

  btnStartLaunch.addEventListener("click", () => {
    NASA_AUDIO.init();
    NASA_AUDIO.stopAll();

    const rocket = ROCKET_CATALOG[currentRocketKey];
    const engine = PROPULSION_SYSTEMS[currentEngineKey];
    const target = MISSION_TARGETS[currentTargetKey];

    document.getElementById("assembly-bay").classList.remove("active");
    document.getElementById("flight-bay").classList.add("active");
    
    // Ensure rocket is locked to the pad with 100% fresh propellant
    const ignitionBox = document.getElementById("ignition-action-container");
    ignitionBox.style.display = "block";
    const igniteBtn = document.getElementById("btn-ignite");
    igniteBtn.disabled = false;
    igniteBtn.textContent = "IGNITION & LIFTOFF";
    igniteBtn.classList.add("btn-pulse");

    document.getElementById("system-status").textContent = "SYS STAT: LAUNCH PAD ACTIVE (GROUNDED)";

    // Force clean reset of all state & 100% fuel refill
    sim.setupMission(rocket, engine, target);
    sim.state = "STANDBY"; // Must remain firmly grounded on Pad 39B
    sim.altitude = 0.0;
    sim.vx = 0.0;
    sim.vy = 0.0;
    sim.throttle = 1.0;
    sim.pitch = 90.0;
    sim.currentFuel = rocket.fuelMass;
    sim.boosterFuel = rocket.fuelMass * 0.45;
    sim.mainFuel = rocket.fuelMass * 0.55;
    sim.boosterBurnout = false;
    sim.isStaged = false;
    sim.separatedStages = [];
    sim.particles = [];

    // Immediately display 100% propellant across all stage meters (no 0% glitch!)
    document.getElementById("hud-fuel").textContent = "100%";
    const bFuelEl = document.getElementById("hud-booster-fuel");
    if (bFuelEl) {
      bFuelEl.textContent = "100%";
      bFuelEl.style.color = "#ffaa00";
    }
    const mFuelEl = document.getElementById("hud-main-fuel");
    if (mFuelEl) {
      mFuelEl.textContent = "100%";
      mFuelEl.style.color = "#00e5ff";
    }

    const stageBtn = document.getElementById("btn-stage");
    if (stageBtn) {
      stageBtn.textContent = "STAGE 1: SIDE BOOSTERS BURNING (FIRST) [SPACE]";
      stageBtn.style.background = "linear-gradient(135deg, #0b3d91 0%, #1e3a8a 100%)";
      stageBtn.style.borderColor = "var(--border-cyan)";
    }
    
    sim.resizeCanvas();
    logCapcom("Pad 39B: " + rocket.name + " pre-flight checks complete. Standing by for IGNITION.");
  });

  btnAbort.addEventListener("click", () => {
    sim.abort();
    if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
      NASA_BANK.resetUpgrades();
    }
    document.getElementById("flight-bay").classList.remove("active");
    document.getElementById("assembly-bay").classList.add("active");
    document.getElementById("system-status").textContent = "SYS STAT: VEHICLE ASSEMBLY READY";
  });

  btnIgnite.addEventListener("click", () => {
    try {
      NASA_AUDIO.init();
      NASA_AUDIO.resume();
    } catch (err) {}
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.getElementById("ignition-action-container").style.display = "none";
    sim.state = "FLIGHT";
    sim.throttle = Number(throttleSlider.value) / 100.0;
    try { NASA_AUDIO.playCountdownBeep(true); } catch (err) {}
    logCapcom("LIFTOFF! We have cleared the tower!");
  });

  throttleSlider.addEventListener("input", (e) => {
    const val = Number(e.target.value) / 100.0;
    sim.throttle = val;
    document.getElementById("throttle-readout").textContent = `${Math.round(val * 100)}%`;
  });

  document.querySelectorAll(".t-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = Number(btn.dataset.t);
      throttleSlider.value = t;
      sim.throttle = t / 100.0;
      document.getElementById("throttle-readout").textContent = `${t}%`;
    });
  });

  btnPitchLeft.addEventListener("click", () => {
    sim.pitch = Math.min(90, sim.pitch + 5);
    updatePitchUI();
  });

  btnPitchRight.addEventListener("click", () => {
    sim.pitch = Math.max(0, sim.pitch - 5);
    updatePitchUI();
  });

  btnPitchCenter.addEventListener("click", () => {
    // Prograde pitch alignment
    const speed = Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy);
    if (speed > 5) {
      sim.pitch = (Math.atan2(sim.vy, sim.vx) * 180) / Math.PI;
      updatePitchUI();
    }
  });

  btnStage.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (sim.separateStage()) {
      logCapcom("Stage Separation Confirmed! Side boosters jettisoned.");
    }
  });

  const btnDispatchRover = document.getElementById("btn-dispatch-rover");
  if (btnDispatchRover) {
    btnDispatchRover.addEventListener("click", () => {
      dispatchFlightRover();
    });
  }

  const btnMarsCapsule = document.getElementById("btn-dispatch-mars-capsule");
  if (btnMarsCapsule) {
    btnMarsCapsule.addEventListener("click", () => {
      if (sim) sim.initiateMarsDescent();
    });
  }

  const btnFlightReset = document.getElementById("btn-flight-reset");
  if (btnFlightReset) {
    btnFlightReset.addEventListener("click", () => {
      resetEntireMission();
    });
  }

  const btnEnterAsteroid = document.getElementById("btn-enter-asteroid");
  if (btnEnterAsteroid) {
    btnEnterAsteroid.addEventListener("click", () => {
      const btnAst = document.getElementById("btn-nav-asteroid");
      if (btnAst) btnAst.click();
    });
  }

  function dispatchFlightRover() {
    if (sim) {
      sim.dispatchRover();
    }
  }

  // Audio Mute Toggle system
  const btnAudioMute = document.getElementById("btn-audio-mute");
  const btnFlightMute = document.getElementById("btn-flight-mute");

  function toggleAudioState() {
    if (typeof NASA_AUDIO !== "undefined") {
      const isMuted = NASA_AUDIO.toggleMute();
      const label = isMuted ? "🔇 SOUND: MUTED [M]" : "🔊 SOUND: ON [M]";
      if (btnAudioMute) btnAudioMute.textContent = label;
      if (btnFlightMute) btnFlightMute.textContent = label;
    }
  }
  window.toggleAudioState = toggleAudioState;

  function unlockAudioOnInteraction() {
    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.init();
      NASA_AUDIO.resume();
      if (NASA_AUDIO.ctx && NASA_AUDIO.ctx.state === "running") {
        window.removeEventListener("pointerdown", unlockAudioOnInteraction);
        window.removeEventListener("click", unlockAudioOnInteraction);
        window.removeEventListener("keydown", unlockAudioOnInteraction);
        window.removeEventListener("touchstart", unlockAudioOnInteraction);
      }
    }
  }
  window.addEventListener("pointerdown", unlockAudioOnInteraction);
  window.addEventListener("click", unlockAudioOnInteraction);
  window.addEventListener("keydown", unlockAudioOnInteraction);
  window.addEventListener("touchstart", unlockAudioOnInteraction);

  if (btnAudioMute) btnAudioMute.addEventListener("click", toggleAudioState);
  if (btnFlightMute) btnFlightMute.addEventListener("click", toggleAudioState);

  window.addEventListener("keydown", (e) => {
    const isSpace = (e.code === "Space" || e.key === " " || e.key === "Spacebar" || e.keyCode === 32);
    const keyName = e.code || e.key;
    if (e.code === "KeyM" || e.key === "m" || e.key === "M") {
      toggleAudioState();
    }
    const flightBay = document.getElementById("flight-bay");
    if (flightBay && flightBay.classList.contains("active")) {
      if (isSpace || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyR"].includes(keyName) || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.code) keysHeld[e.code] = true;
      if (e.key) keysHeld[e.key] = true;
      if (isSpace) {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        if (sim && sim.separateStage()) {
          logCapcom("Stage Separation Confirmed! Side boosters jettisoned.");
        }
      }
      if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
        if (sim && sim.altitude >= 10000) {
          sim.initiateMarsDescent();
        } else {
          dispatchFlightRover();
        }
      }
    }
  }, { capture: true });

  window.addEventListener("keyup", (e) => {
    if (e.code) keysHeld[e.code] = false;
    if (e.key) keysHeld[e.key] = false;
  });

  document.getElementById("btn-modal-restart").addEventListener("click", () => {
    document.getElementById("mission-modal").style.display = "none";
    if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
      NASA_BANK.resetUpgrades();
    }
    btnAbort.click();
  });

  document.getElementById("btn-modal-continue").addEventListener("click", () => {
    document.getElementById("mission-modal").style.display = "none";
  });
}

function updatePitchUI() {
  document.getElementById("hud-pitch").textContent = `${Math.round(sim.pitch)}°`;
}

// 08. Flight Telemetry HUD Updates
function updateHudTelemetry() {
  if (!sim || !document.getElementById("flight-bay").classList.contains("active")) return;

  const altKm = (sim.altitude / 1000).toFixed(1);
  const currentSpeed = Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy);
  const mach = (currentSpeed / NASA_PHYSICS.getSpeedOfSound(sim.altitude)).toFixed(2);
  const qKpa = (NASA_PHYSICS.getDynamicPressure(sim.altitude, currentSpeed) / 1000).toFixed(1);

  // Apoapsis
  const pitchRad = (sim.pitch * Math.PI) / 180.0;
  const ap = NASA_PHYSICS.calculateApoapsis(sim.altitude, currentSpeed, pitchRad);
  const apKm = isFinite(ap) ? (ap / 1000).toFixed(0) : "ESCAPE";

  // Mission Elapsed Time
  const mins = Math.floor(sim.missionTime / 60);
  const secs = Math.floor(sim.missionTime % 60);
  const metStr = `T+ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  document.getElementById("hud-met").textContent = metStr;
  document.getElementById("hud-alt").textContent = `${altKm} km`;
  document.getElementById("hud-vel").textContent = `${Math.round(currentSpeed).toLocaleString()} m/s`;
  document.getElementById("hud-mach").textContent = `Mach ${mach}`;
  document.getElementById("hud-q").textContent = `${qKpa} kPa`;
  const gEl = document.getElementById("hud-gforce");
  if (gEl) gEl.textContent = `${sim.gForce.toFixed(1)} G`;
  document.getElementById("hud-apoapsis").textContent = `${apKm} km`;

  // Dual Stage Propellant Telemetry Readouts
  const fuelPct = Math.max(0, Math.min(100, Math.round((sim.currentFuel / (sim.initialFuel || 1)) * 100)));
  const fuelEl = document.getElementById("hud-fuel");
  if (fuelEl) fuelEl.textContent = `${fuelPct}%`;

  const bFuelEl = document.getElementById("hud-booster-fuel");
  if (bFuelEl) {
    if (sim.isStaged) {
      bFuelEl.textContent = "DISPATCHED";
      bFuelEl.style.color = "var(--text-secondary)";
    } else if (sim.boosterBurnout) {
      bFuelEl.textContent = "BURNOUT";
      bFuelEl.style.color = "var(--accent-red)";
    } else {
      const bPct = Math.max(0, Math.min(100, Math.round((sim.boosterFuel / (sim.boosterFuelInitial || 1)) * 100)));
      bFuelEl.textContent = `${bPct}%`;
      bFuelEl.style.color = "#ffaa00";
    }
  }

  const mFuelEl = document.getElementById("hud-main-fuel");
  if (mFuelEl) {
    const mPct = Math.max(0, Math.min(100, Math.round((sim.mainFuel / (sim.mainFuelInitial || 1)) * 100)));
    mFuelEl.textContent = `${mPct}%`;
  }

  // Dynamic Sequential Staging Button State & Styling
  const stageBtn = document.getElementById("btn-stage");
  const groundStageBtn = document.getElementById("btn-ground-stage");
  if (stageBtn) {
    if (!sim.isStaged && !sim.boosterBurnout) {
      stageBtn.textContent = "STAGE 1: SIDE BOOSTERS BURNING (FIRST) [SPACE]";
      stageBtn.style.background = "linear-gradient(135deg, #0b3d91 0%, #1e3a8a 100%)";
      stageBtn.style.borderColor = "var(--border-cyan)";
      stageBtn.style.boxShadow = "none";
    } else if (sim.boosterBurnout && !sim.isStaged) {
      stageBtn.textContent = "⚠️ BOOSTER BURNOUT! DISPATCH SIDE BOOSTERS [SPACE]";
      stageBtn.style.background = "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)";
      stageBtn.style.borderColor = "#facc15";
      stageBtn.style.boxShadow = "0 0 18px rgba(234, 88, 12, 0.85)";
    } else {
      stageBtn.textContent = "STAGE 2: MAIN ENGINE ACTIVE (SECOND)";
      stageBtn.style.background = "linear-gradient(135deg, #065f46 0%, #047857 100%)";
      stageBtn.style.borderColor = "#34d399";
      stageBtn.style.boxShadow = "none";
    }
  }
  if (groundStageBtn && stageBtn) {
    groundStageBtn.textContent = `UPLINK: ${stageBtn.textContent}`;
  }

  // Max-Q capcom alert
  if (!sim.maxQDetected && sim.maxQVal > 30000 && qKpa < (sim.maxQVal / 1000) * 0.95) {
    sim.maxQDetected = true;
    logCapcom("MAX-Q! Maximum aerodynamic pressure passed.");
  }

  // Karman line crossing
  if (sim.altitude >= 100000 && !sim.karmanReported) {
    sim.karmanReported = true;
    logCapcom("100 km crossed: Welcome to space! Karman line boundary passed.");
  }

  // Orbit status indicator
  const orbitStatus = document.getElementById("hud-orbit-status");
  if (sim.orbitAchieved) {
    orbitStatus.className = "status-orbit";
    orbitStatus.textContent = "STABLE ORBIT INSERTION";
    if (typeof NASA_BANK !== "undefined" && !sim.bankAwarded) {
      sim.bankAwarded = true;
      NASA_BANK.awardMissionSuccess(currentTargetKey);
    }
    showMissionSuccessModal();
  } else {
    orbitStatus.className = "status-suborbital";
    orbitStatus.textContent = "ASCENT TRAJECTORY";
  }

  // Space GPS & Deep Space Network (DSN) Telemetry
  const gpsLat = 28.5721 + (sim.downrange / 111000.0) * 0.22;
  const gpsLon = -80.6480 + (sim.downrange / 111000.0) * 0.94;
  const latEl = document.getElementById("hud-gps-lat");
  if (latEl) latEl.textContent = `${gpsLat.toFixed(4)}° N`;
  const lonEl = document.getElementById("hud-gps-lon");
  if (lonEl) lonEl.textContent = `${Math.abs(gpsLon).toFixed(4)}° W`;

  const distEl = document.getElementById("hud-gps-dist");
  if (distEl) distEl.textContent = `${altKm} km`;

  const rangeEl = document.getElementById("hud-gps-target-range");
  if (rangeEl) {
    if (currentTargetKey === "mars") rangeEl.textContent = "225.4 M km (Mars)";
    else if (currentTargetKey === "moon") rangeEl.textContent = "384,400 km (Moon)";
    else rangeEl.textContent = "250 km (LEO)";
  }

  const bearingEl = document.getElementById("hud-gps-bearing");
  if (bearingEl) bearingEl.textContent = `${Math.round(sim.pitch)}° (Prograde Vector)`;

  const lockEl = document.getElementById("hud-gps-lock");
  if (lockEl) {
    if (sim.altitude < 160000) {
      lockEl.textContent = "4/4 NAVSTAR LOCK";
      lockEl.style.color = "#06d6a0";
      lockEl.style.borderColor = "#06d6a0";
    } else {
      lockEl.textContent = "3/3 DSN DEEP SPACE LOCK";
      lockEl.style.color = "#a78bfa";
      lockEl.style.borderColor = "#a78bfa";
    }
  }
}

function initBankUI() {
  const btnOpen = document.getElementById("btn-open-bank");
  const modal = document.getElementById("bank-modal");
  const btnClose = document.getElementById("btn-close-bank");
  const btnDone = document.getElementById("btn-done-bank");
  const btnDeposit = document.getElementById("btn-deposit-points");

  if (!btnOpen || !modal) return;

  btnOpen.addEventListener("click", () => {
    modal.style.display = "flex";
    if (typeof NASA_BANK !== "undefined") NASA_BANK.updateUI();
  });

  if (btnClose) btnClose.addEventListener("click", () => { modal.style.display = "none"; });
  if (btnDone) btnDone.addEventListener("click", () => { modal.style.display = "none"; });

  if (btnDeposit) {
    btnDeposit.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") NASA_BANK.depositPoints();
    });
  }

  document.querySelectorAll(".btn-quick-withdraw").forEach(btn => {
    btn.addEventListener("click", () => {
      const amt = Number(btn.dataset.amt);
      if (typeof NASA_BANK !== "undefined") NASA_BANK.withdrawMoney(amt);
    });
  });

  const btnBuyFins = document.getElementById("btn-buy-finStabilizers");
  if (btnBuyFins) {
    btnBuyFins.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") {
        NASA_BANK.buyUpgrade("finStabilizers");
        if (NASA_BANK.upgrades.finStabilizers.purchased) {
          NASA_BANK.upgrades.finStabilizers.apply(ROCKET_CATALOG[currentRocketKey]);
          updateSpecs();
          renderVabRocket();
        }
      }
    });
  }

  const btnBuyRCS = document.getElementById("btn-buy-rcsWheels");
  if (btnBuyRCS) {
    btnBuyRCS.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") {
        NASA_BANK.buyUpgrade("rcsWheels");
        if (sim && NASA_BANK.upgrades.rcsWheels.purchased) {
          NASA_BANK.upgrades.rcsWheels.apply(sim);
        }
      }
    });
  }

  const btnClaimModal = document.getElementById("btn-modal-claim-grant");
  if (btnClaimModal) {
    btnClaimModal.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") NASA_BANK.claimNasaGrant();
    });
  }

  const btnBuyBoosters = document.getElementById("btn-buy-sideBoosters");
  if (btnBuyBoosters) {
    btnBuyBoosters.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") {
        NASA_BANK.buyUpgrade("sideBoosters");
        if (sim && NASA_BANK.upgrades.sideBoosters.purchased) {
          NASA_BANK.upgrades.sideBoosters.apply(sim);
        }
      }
    });
  }

  const btnBuyCapsule = document.getElementById("btn-buy-roverCapsule");
  if (btnBuyCapsule) {
    btnBuyCapsule.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") {
        NASA_BANK.buyUpgrade("roverCapsule");
      }
    });
  }

  const btnBuyLCPX = document.getElementById("btn-buy-liquidCrystalEngine");
  if (btnBuyLCPX) {
    btnBuyLCPX.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined") {
        NASA_BANK.buyUpgrade("liquidCrystalEngine");
      }
    });
  }

  if (typeof NASA_BANK !== "undefined") NASA_BANK.updateUI();
}

function logCapcom(msg) {
  const container = document.getElementById("capcom-log");
  if (!container) return;
  const p = document.createElement("p");
  p.className = "log-entry event";
  p.textContent = `[T+${Math.floor(sim ? sim.missionTime : 0)}s] ${msg}`;
  container.appendChild(p);
  container.scrollTop = container.scrollHeight;
}

function showMissionSuccessModal() {
  const modal = document.getElementById("mission-modal");
  if (modal.style.display === "flex") return;
  modal.style.display = "flex";

  const stats = document.getElementById("modal-stats");
  stats.innerHTML = `
    <div>🚀 Vehicle: <strong>${sim.rocket.name}</strong></div>
    <div>🔥 Propulsion: <strong>${sim.engine.name}</strong></div>
    <div>🛰️ Final Altitude: <strong>${(sim.altitude / 1000).toFixed(1)} km</strong></div>
    <div>⚡ Orbital Velocity: <strong>${Math.round(Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy)).toLocaleString()} m/s</strong></div>
    <div>⏱️ Insertion Time: <strong>${Math.round(sim.missionTime)} seconds</strong></div>
  `;
}

// 09. Mars Surface Exploration & Curiosity Rover Mode
function initMarsMode() {
  const btnNavMars = document.getElementById("btn-nav-mars");
  const btnReturnVab = document.getElementById("btn-return-vab");
  const btnDrillManual = document.getElementById("btn-drill-manual");
  const btnRoverDeposit = document.getElementById("btn-rover-deposit");

  if (btnNavMars) {
    btnNavMars.addEventListener("click", () => {
      document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
      const marsBay = document.getElementById("mars-bay");
      if (marsBay) marsBay.classList.add("active");
      document.getElementById("system-status").textContent = "SYS STAT: MARS SURFACE EXPLORATION ACTIVE (CURIOSITY ROVER)";

      if (!roverSim) {
        roverSim = new MarsCuriosityRover("mars-canvas");
      }
      const mCanvas = document.getElementById("mars-canvas");
      if (mCanvas && mCanvas.parentElement) {
        mCanvas.width = mCanvas.parentElement.clientWidth || 900;
        mCanvas.height = mCanvas.parentElement.clientHeight || 520;
      }
    });
  }

  if (btnReturnVab) {
    btnReturnVab.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
        NASA_BANK.resetUpgrades();
      }
      document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
      document.getElementById("assembly-bay").classList.add("active");
      document.getElementById("system-status").textContent = "SYS STAT: VEHICLE ASSEMBLY READY";
    });
  }

  if (btnDrillManual) {
    btnDrillManual.addEventListener("click", () => {
      if (roverSim) roverSim.drillSample();
    });
  }

  if (btnRoverDeposit) {
    btnRoverDeposit.addEventListener("click", () => {
      const modal = document.getElementById("bank-modal");
      if (modal) {
        modal.style.display = "flex";
        if (typeof NASA_BANK !== "undefined") NASA_BANK.updateUI();
      }
    });
  }

  const btnMarsReset = document.getElementById("btn-mars-reset");
  if (btnMarsReset) {
    btnMarsReset.addEventListener("click", () => {
      resetEntireMission();
    });
  }
}

// 10. Deep Space Asteroid Belt Mode & Rover Dispatch System
function initAsteroidMode() {
  const btnNavAsteroid = document.getElementById("btn-nav-asteroid");
  const btnReturnVab = document.getElementById("btn-asteroid-return-vab");
  const btnDispatch = document.getElementById("btn-asteroid-dispatch");
  const btnToMars = document.getElementById("btn-asteroid-to-mars");

  if (btnNavAsteroid) {
    btnNavAsteroid.addEventListener("click", () => {
      document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
      const astBay = document.getElementById("asteroid-bay");
      if (astBay) astBay.classList.add("active");
      document.getElementById("system-status").textContent = "SYS STAT: ASTEROID BELT EXPLORATION & ROVER DISPATCH";

      if (!asteroidSim) {
        asteroidSim = new AsteroidBeltSimulator("asteroid-canvas");
      }
      asteroidSim.resize();
    });
  }

  if (btnReturnVab) {
    btnReturnVab.addEventListener("click", () => {
      if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
        NASA_BANK.resetUpgrades();
      }
      document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
      document.getElementById("assembly-bay").classList.add("active");
      document.getElementById("system-status").textContent = "SYS STAT: VEHICLE ASSEMBLY READY";
    });
  }

  if (btnDispatch) {
    btnDispatch.addEventListener("click", () => {
      if (asteroidSim) asteroidSim.dispatchRover();
    });
  }

  if (btnToMars) {
    btnToMars.addEventListener("click", () => {
      const marsBtn = document.getElementById("btn-nav-mars");
      if (marsBtn) marsBtn.click();
    });
  }
}

// 11. Mission Reset System (Full Pad 39B Standby & 100% Propellant Refill)
function resetEntireMission() {
  try {
    if (sim) {
      sim.abort();
    }
  } catch (e) {
    console.error("Error aborting sim:", e);
  }

  try {
    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.stopAll();
    }
  } catch (e) {
    console.error("Error stopping audio:", e);
  }

  try {
    if (typeof NASA_BANK !== "undefined" && typeof NASA_BANK.resetUpgrades === "function") {
      NASA_BANK.resetUpgrades();
    }
  } catch (e) {
    console.error("Error resetting bank upgrades:", e);
  }

  try {
    if (roverSim && typeof roverSim.reset === "function") {
      roverSim.reset();
    }
  } catch (e) {
    console.error("Error resetting rover:", e);
  }

  // Hide modals if open
  const missionModal = document.getElementById("mission-modal");
  if (missionModal) missionModal.style.display = "none";
  const bankModal = document.getElementById("bank-modal");
  if (bankModal) bankModal.style.display = "none";

  // Switch back to Assembly Bay (VAB / Pad 39B)
  document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
  const vab = document.getElementById("assembly-bay");
  if (vab) vab.classList.add("active");

  const statusEl = document.getElementById("system-status");
  if (statusEl) statusEl.textContent = "SYS STAT: MISSION RESET COMPLETE • READY AT PAD 39B";

  // Re-enable Pad 39B ignition container
  const ignitionBox = document.getElementById("ignition-action-container");
  if (ignitionBox) ignitionBox.style.display = "block";
  const igniteBtn = document.getElementById("btn-ignite");
  if (igniteBtn) {
    igniteBtn.disabled = false;
    igniteBtn.textContent = "IGNITION & LIFTOFF";
    igniteBtn.classList.add("btn-pulse");
  }

  // Refill HUD fuel meters to 100%
  const fuelEl = document.getElementById("hud-fuel");
  if (fuelEl) fuelEl.textContent = "100%";
  const bFuelEl = document.getElementById("hud-booster-fuel");
  if (bFuelEl) {
    bFuelEl.textContent = "100%";
    bFuelEl.style.color = "#ffaa00";
  }
  const mFuelEl = document.getElementById("hud-main-fuel");
  if (mFuelEl) {
    mFuelEl.textContent = "100%";
    mFuelEl.style.color = "#00e5ff";
  }

  const stageBtn = document.getElementById("btn-stage");
  if (stageBtn) {
    stageBtn.textContent = "STAGE 1: SIDE BOOSTERS BURNING (FIRST) [SPACE]";
    stageBtn.style.background = "linear-gradient(135deg, #0b3d91 0%, #1e3a8a 100%)";
    stageBtn.style.borderColor = "var(--border-cyan)";
  }

  const throttleSlider = document.getElementById("throttle-slider");
  if (throttleSlider) throttleSlider.value = 100;
  const throttleReadout = document.getElementById("throttle-readout");
  if (throttleReadout) throttleReadout.textContent = "100%";

  logCapcom("🔄 Pad 39B: Rocket reset to launch stand with 100% propellant refill.");
  if (typeof showGameNotification === "function") {
    showGameNotification("🔄 Mission Reset", "Rocket reset to Launch Pad 39B with 100% propellant refill!");
  }
}
window.resetEntireMission = resetEntireMission;

// 12. Cinematic Mars Landing & Surface View Transition
function transitionToMarsSurfaceView() {
  document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active"));
  const marsBay = document.getElementById("mars-bay");
  if (marsBay) marsBay.classList.add("active");
  document.getElementById("system-status").textContent = "SYS STAT: MARS SURFACE MISSION ACTIVE • 12 DRILL SITES AVAILABLE";

  if (!roverSim) {
    roverSim = new MarsCuriosityRover("mars-canvas");
  }
  if (typeof roverSim.resizeCanvas === "function") {
    roverSim.resizeCanvas();
  }
  logCapcom("🔴 [TOUCHDOWN CONFIRMED] Heat-shielded entry capsule touched down in Gale Crater! Curiosity rover ramp deployed.");
  if (typeof showGameNotification === "function") {
    showGameNotification("🔴 Mars Landing Confirmed!", "Aeroshell capsule landed safely. Curiosity rover deployed onto Martian regolith! Drive to the 12 survey sites to collect rock samples.");
  }
}
window.transitionToMarsSurfaceView = transitionToMarsSurfaceView;

function showGameNotification(title, message) {
  let banner = document.getElementById("in-game-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "in-game-banner";
    banner.style.position = "fixed";
    banner.style.top = "70px";
    banner.style.left = "50%";
    banner.style.transform = "translateX(-50%)";
    banner.style.zIndex = "9999";
    banner.style.minWidth = "320px";
    banner.style.maxWidth = "90vw";
    banner.style.padding = "12px 20px";
    banner.style.borderRadius = "8px";
    banner.style.background = "rgba(11, 61, 145, 0.95)";
    banner.style.border = "1px solid #38bdf8";
    banner.style.boxShadow = "0 8px 32px rgba(0, 229, 255, 0.35)";
    banner.style.backdropFilter = "blur(10px)";
    banner.style.color = "#ffffff";
    banner.style.fontFamily = "var(--font-mono, monospace)";
    banner.style.fontSize = "13px";
    banner.style.textAlign = "center";
    banner.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    banner.style.pointerEvents = "none";
    document.body.appendChild(banner);
  }
  banner.innerHTML = `<strong style="color: #38bdf8; font-size: 14px; display: block; margin-bottom: 4px;">${title}</strong><span>${message}</span>`;
  banner.style.opacity = "1";
  banner.style.transform = "translateX(-50%) translateY(0)";
  if (window._bannerTimer) clearTimeout(window._bannerTimer);
  window._bannerTimer = setTimeout(() => {
    banner.style.opacity = "0";
    banner.style.transform = "translateX(-50%) translateY(-10px)";
  }, 4500);
}

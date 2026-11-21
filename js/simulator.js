// 3D/2.5D Canvas Flight Simulator with Particle Plumes & Custom Rocket Sprite Rendering

class FlightSimulator {
  constructor(canvasId, minimapId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.minimap = document.getElementById(minimapId);
    this.mctx = this.minimap.getContext("2d");

    // Flight Dynamics State
    this.altitude = 0.0;           // meters
    this.downrange = 0.0;          // meters
    this.vx = 0.0;                 // horizontal velocity (m/s)
    this.vy = 0.0;                 // vertical velocity (m/s)
    this.pitch = 90.0;             // degrees (90 = vertical up, 0 = horizontal)
    this.throttle = 1.0;           // 0.0 to 1.0
    this.currentFuel = 0;          // kg
    this.dryMass = 0;              // kg
    this.initialFuel = 0;
    this.thrustMax = 0;
    this.isp = 300;
    this.engine = null;
    this.rocket = null;
    this.target = null;

    // Simulation Flow
    this.state = "STANDBY";        // STANDBY, COUNTDOWN, FLIGHT, STAGED, ORBIT, CRASHED
    this.missionTime = 0.0;        // seconds
    this.countdown = 5.0;
    this.maxQDetected = false;
    this.maxQVal = 0.0;
    this.orbitAchieved = false;

    // Camera & Visuals
    this.camY = 0.0;
    this.stars = [];
    this.particles = [];
    this.separatedStages = [];
    this.spaceAsteroids = [];
    this.dispatchedRovers = [];
    this.nebulaClouds = [];

    this.initStars();
    this.initNebulaClouds();
    this.initSpaceAsteroids();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2.2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  initNebulaClouds() {
    this.nebulaClouds = [
      { xRel: -0.22, yRel: 0.22, r: 240, color: "rgba(56, 189, 248, 0.08)" }, // Interstellar Cyan Veil
      { xRel: 0.32, yRel: 0.18, r: 270, color: "rgba(168, 85, 247, 0.07)" }, // Orion Violet Dust
      { xRel: -0.08, yRel: 0.55, r: 210, color: "rgba(244, 63, 94, 0.05)" }  // Carina Rose Nebula
    ];
  }

  initSpaceAsteroids() {
    this.spaceAsteroids = [];
    const asteroidData = [
      { name: "16 Psyche", mineral: "Nickel-Iron & Platinum Core", color: "#e2e8f0", pts: 25000, value: "$25M", r: 26 },
      { name: "433 Eros", mineral: "Silicate & Gold Deposit", color: "#f59e0b", pts: 12000, value: "$12M", r: 22 },
      { name: "101955 Bennu", mineral: "Carbonaceous & Water Ice", color: "#38bdf8", pts: 15000, value: "$15M", r: 19 },
      { name: "4 Vesta", mineral: "Basaltic Crust & Heavy Metals", color: "#94a3b8", pts: 18000, value: "$18M", r: 28 },
      { name: "1 Ceres", mineral: "Subsurface Ice Ocean", color: "#67e8f9", pts: 30000, value: "$30M", r: 34 },
      { name: "243 Ida", mineral: "Olivine & Metallic Iron", color: "#facc15", pts: 16000, value: "$16M", r: 23 },
      { name: "253 Mathilde", mineral: "Carbonaceous Chondrite", color: "#cbd5e1", pts: 14000, value: "$14M", r: 21 },
      { name: "951 Gaspra", mineral: "S-Type Metallic Nickel", color: "#fb923c", pts: 17000, value: "$17M", r: 24 }
    ];

    for (let i = 0; i < 20; i++) {
      const data = asteroidData[i % asteroidData.length];
      const r = (data.r * (0.8 + Math.random() * 0.45));
      const craters = [];
      for (let c = 0; c < 4; c++) {
        craters.push({
          rx: (Math.random() - 0.5) * r * 0.8,
          ry: (Math.random() - 0.5) * r * 0.8,
          cr: Math.random() * (r * 0.3) + 2.5
        });
      }

      this.spaceAsteroids.push({
        name: `${data.name}${i >= 8 ? `-${i}` : ""}`,
        mineral: data.mineral,
        mineralColor: data.color,
        pts: data.pts,
        value: data.value,
        relX: (Math.random() - 0.5) * 650, // Perfectly positioned within visible canvas
        relY: (Math.random() - 0.5) * 450 - 60, // Centered around spacecraft in flight
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 12,
        r: r,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.4,
        craters: craters,
        sampled: false
      });
    }
  }

  dispatchRover() {
    if (this.altitude < 10000) {
      if (typeof logCapcom === "function") {
        logCapcom("⚠️ Spacecraft in dense lower atmosphere (<10 km). Climb to upper space or orbit to deploy surface rovers!");
      }
      if (typeof showGameNotification === "function") {
        showGameNotification("⚠️ Launch Phase Active", "Climb past 10 km into upper atmosphere/space before deploying rovers.");
      }
      return;
    }

    // Find closest unsampled asteroid
    let closest = null;
    let minDist = 999999;
    for (const a of this.spaceAsteroids) {
      const dist = Math.hypot(a.relX, a.relY);
      if (dist < minDist) {
        minDist = dist;
        closest = a;
      }
    }

    const targetAsteroid = closest || this.spaceAsteroids[0];
    const roverNum = this.dispatchedRovers.length + 1;

    this.dispatchedRovers.push({
      id: roverNum,
      relX: 0,
      relY: 0,
      target: targetAsteroid,
      targetX: targetAsteroid.relX,
      targetY: targetAsteroid.relY,
      progress: 0.0,
      landed: false
    });

    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.playStageSeparation();
    }

    if (typeof logCapcom === "function") {
      logCapcom(`🛸 [PAYLOAD DEPLOY] Planetary Exploration Rover #${roverNum} dispatched! Aeroshell thrusters firing toward ${targetAsteroid.name}.`);
    }

    if (typeof showGameNotification === "function") {
      showGameNotification(`🛸 Rover #${roverNum} Dispatched!`, `Payload hatch opened. Robotic Aeroshell en route to ${targetAsteroid.name} (${targetAsteroid.mineral.split("&")[0]}). Touchdown imminent!`);
    }
  }

  initiateMarsDescent() {
    if (this.altitude < 10000) {
      if (typeof showGameNotification === "function") {
        showGameNotification("⚠️ Atmospheric Launch Phase", "Fly past 10 km through the asteroid field towards Mars before deploying entry capsule!");
      }
      return;
    }

    if (this.isMarsDescentActive) return;
    this.isMarsDescentActive = true;

    if (typeof logCapcom === "function") {
      logCapcom("🔴 [MARS ARRIVAL] Spacecraft on Mars intercept trajectory! Payload bay opened: Deploying Mars Atmospheric Entry Capsule!");
    }

    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.playStageSeparation();
    }

    this.marsCapsule = {
      x: 0,
      y: 0,
      vy: 55,
      timer: 0.0
    };

    if (typeof showGameNotification === "function") {
      showGameNotification("🔴 Mars Entry Capsule Dispatched!", "Aeroshell atmospheric entry initiated! Touchdown & Rover egress underway...");
    }
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width || window.innerWidth;
      this.canvas.height = rect.height || window.innerHeight;
    } else {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  setupMission(rocket, engine, target) {
    this.rocket = rocket;
    this.engine = engine;
    this.target = target;

    this.altitude = 0.0;
    this.downrange = 0.0;
    this.vx = 0.0;
    this.vy = 0.0;
    this.pitch = 90.0;
    this.throttle = 1.0;
    this.dryMass = rocket.dryMass;

    // SEQUENTIAL STAGING CONFIGURATION:
    // Boosters (Stage 1) burn FIRST with massive liftoff thrust and high fuel flow!
    // Main Engine (Stage 2) continues or burns second to orbit.
    this.boosterFuelInitial = rocket.fuelMass * 0.45;
    this.boosterFuel = this.boosterFuelInitial;
    this.mainFuelInitial = rocket.fuelMass * 0.55;
    this.mainFuel = this.mainFuelInitial;

    this.initialFuel = rocket.fuelMass;
    this.currentFuel = rocket.fuelMass;

    // Boosters deliver ~78% of liftoff thrust (burns first!)
    this.boosterThrustMax = engine.thrustSL * 0.78;
    this.boosterIsp = 275; // Solid propellant specific impulse
    this.boosterBurnout = false;
    this.boosterBurnoutAlerted = false;

    // Main Engine delivers core and vacuum insertion thrust (burns second)
    this.mainThrustMax = engine.thrustSL * 0.55;
    this.mainIsp = engine.ispSL;
    this.thrustMax = engine.thrustSL;
    this.isp = engine.ispSL;

    this.state = "COUNTDOWN";
    this.countdown = 5.0;
    this.missionTime = 0.0;
    this.maxQDetected = false;
    this.maxQVal = 0.0;
    this.orbitAchieved = false;
    this.particles = [];
    this.separatedStages = [];
    this.isStaged = false;
    this.gForce = 1.0;
    this.rcsActive = null;
    this.rcsTimer = 0.0;
    this.camY = 0.0;
    this.dispatchedRovers = [];
    this.isMarsDescentActive = false;
    this.marsTransitioned = false;
    this.marsCapsule = null;
    this.initSpaceAsteroids();
  }

  turnLeft(dt) {
    this.pitch = Math.min(90.0, this.pitch + 28.0 * dt);
    this.rcsActive = "left";
    this.rcsTimer = 0.15;
  }

  turnRight(dt) {
    this.pitch = Math.max(0.0, this.pitch - 28.0 * dt);
    this.rcsActive = "right";
    this.rcsTimer = 0.15;
  }

  abort() {
    this.state = "STANDBY";
    this.throttle = 0.0;
    this.altitude = 0.0;
    this.downrange = 0.0;
    this.vx = 0.0;
    this.vy = 0.0;
    this.pitch = 90.0;
    this.missionTime = 0.0;
    this.particles = [];
    this.separatedStages = [];
    this.isStaged = false;
    this.boosterBurnout = false;
    this.boosterBurnoutAlerted = false;
    this.isMarsDescentActive = false;
    this.marsCapsule = null;
    this.marsTransitioned = false;
    if (this.rocket) {
      this.currentFuel = this.rocket.fuelMass;
      this.boosterFuel = this.rocket.fuelMass * 0.45;
      this.mainFuel = this.rocket.fuelMass * 0.55;
    }
    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.stopAll();
    }
  }

  update(dt) {
    if (this.state === "STANDBY") {
      NASA_AUDIO.stopEngine();
      return;
    }

    if (this.state === "COUNTDOWN") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = "FLIGHT";
        NASA_AUDIO.playCountdownBeep(true);
      }
      return;
    }

    if (this.state !== "FLIGHT" && this.state !== "ORBIT") return;

    this.missionTime += dt;

    // Calculate forces
    const totalMass = this.dryMass + this.currentFuel;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const g = NASA_PHYSICS.getGravity(this.altitude);
    const rho = NASA_PHYSICS.getAirDensity(this.altitude);
    const dragForce = NASA_PHYSICS.getDragForce(this.altitude, currentSpeed, this.rocket.cd, this.rocket.crossArea);
    const q = NASA_PHYSICS.getDynamicPressure(this.altitude, currentSpeed);

    if (q > this.maxQVal) this.maxQVal = q;

    // SEQUENTIAL STAGING LOGIC:
    // 1. Stage 1: Side Boosters (SRBs) burn FIRST!
    let boosterThrust = 0.0;
    if (!this.isStaged && !this.boosterBurnout && this.throttle > 0.001) {
      if (this.boosterFuel > 0) {
        boosterThrust = this.boosterThrustMax * this.throttle;
        const boosterFlow = boosterThrust / (this.boosterIsp * NASA_PHYSICS.STANDARD_GRAVITY);
        const boosterUsed = boosterFlow * dt;
        if (boosterUsed >= this.boosterFuel) {
          this.boosterFuel = 0;
          this.boosterBurnout = true;
          boosterThrust = 0;
        } else {
          this.boosterFuel -= boosterUsed;
        }
      } else {
        this.boosterBurnout = true;
      }

      // Check for booster burnout transition alert & automatic stage separation
      if (this.boosterBurnout && !this.boosterBurnoutAlerted) {
        this.boosterBurnoutAlerted = true;
        if (typeof logCapcom === "function") {
          logCapcom("⚠️ BOOSTER BURNOUT! Detachable 1st stage boosters exhausted. Clean pyrotechnic separation initiated!");
        }
        this.separateStage();
      }
    }

    // 2. Stage 2: Main Engine burns SECOND (core stage continuing or taking over to orbital insertion)
    let mainThrust = 0.0;
    if (this.mainFuel > 0 && this.throttle > 0.001) {
      // Once side boosters detach, main engine operates at peak vacuum expansion thrust & Isp!
      const curMainThrustMax = this.isStaged ? this.mainThrustMax * 1.45 : this.mainThrustMax;
      const curMainIsp = this.isStaged ? this.mainIsp * 1.18 : this.mainIsp;
      mainThrust = curMainThrustMax * this.throttle;
      const mainFlow = mainThrust / (curMainIsp * NASA_PHYSICS.STANDARD_GRAVITY);
      const mainUsed = mainFlow * dt;
      if (mainUsed >= this.mainFuel) {
        this.mainFuel = 0;
        mainThrust = 0;
      } else {
        this.mainFuel -= mainUsed;
      }
    }

    const thrust = boosterThrust + mainThrust;
    this.currentFuel = this.boosterFuel + this.mainFuel;
    if (this.currentFuel <= 0 && thrust <= 0) {
      this.throttle = 0;
      NASA_AUDIO.stopEngine();
    }

    if (thrust > 0 && this.throttle > 0.01) {
      NASA_AUDIO.setThrottle(this.throttle);
    } else {
      NASA_AUDIO.stopEngine();
    }

    // Thrust components
    const pitchRad = (this.pitch * Math.PI) / 180.0;
    const thrustX = thrust * Math.cos(pitchRad);
    const thrustY = thrust * Math.sin(pitchRad);

    // Drag components (opposing velocity vector)
    let dragX = 0, dragY = 0;
    if (currentSpeed > 0.1) {
      dragX = -dragForce * (this.vx / currentSpeed);
      dragY = -dragForce * (this.vy / currentSpeed);
    }

    // Accelerations (F = m * a)
    const ax = (thrustX + dragX) / totalMass;
    const ay = (thrustY + dragY) / totalMass - g;

    // Calculate real G-force
    this.gForce = Math.max(1.0, Math.sqrt(ax * ax + (ay + g) * (ay + g)) / NASA_PHYSICS.STANDARD_GRAVITY);

    // RCS timer
    if (this.rcsTimer > 0) this.rcsTimer -= dt;

    // Integrate velocity and position
    this.vx += ax * dt;
    this.vy += ay * dt;

    this.altitude += this.vy * dt;
    this.downrange += this.vx * dt;

    if (this.altitude < 0.0) {
      this.altitude = 0.0;
      this.vy = 0.0;
    }

    // Update separated falling stages (cinematic screen displacement)
    for (let i = this.separatedStages.length - 1; i >= 0; i--) {
      const s = this.separatedStages[i];
      s.relX += s.vx * dt;
      s.relY += s.vy * dt;
      s.vy += 80 * dt; // gravity drag pulling stage downward
      s.rot += s.vRot * dt;
      if (s.relY > 900) this.separatedStages.splice(i, 1);
    }

    // Spawning realistic engine exhaust particles
    // 1. STAGE 1: Solid Side Boosters Exhaust (Burns first with fiery golden blaze and dense smoke trail)
    if (boosterThrust > 0) {
      const bPlumeCount = Math.floor(this.throttle * 4) + 2;
      for (let i = 0; i < bPlumeCount; i++) {
        const spreadAngleL = (Math.random() - 0.5) * 0.22;
        const spreadAngleR = (Math.random() - 0.5) * 0.22;
        const pSpeed = 150 + Math.random() * 140;

        // Left Booster Exhaust (Smoky blinding white-gold)
        this.particles.push({
          x: this.downrange - 4.5,
          y: this.altitude,
          vx: -Math.cos(pitchRad + spreadAngleL) * pSpeed,
          vy: -Math.sin(pitchRad + spreadAngleL) * pSpeed,
          size: Math.random() * 7 + 8,
          life: 1.2,
          decay: Math.random() * 0.025 + 0.014,
          color: i % 2 === 0 ? "rgba(255, 240, 190, 0.95)" : "rgba(255, 130, 25, 0.9)"
        });

        // Right Booster Exhaust
        this.particles.push({
          x: this.downrange + 4.5,
          y: this.altitude,
          vx: -Math.cos(pitchRad + spreadAngleR) * pSpeed,
          vy: -Math.sin(pitchRad + spreadAngleR) * pSpeed,
          size: Math.random() * 7 + 8,
          life: 1.2,
          decay: Math.random() * 0.025 + 0.014,
          color: i % 2 === 0 ? "rgba(255, 240, 190, 0.95)" : "rgba(255, 130, 25, 0.9)"
        });
      }
    }

    // 2. STAGE 2: Central Main Engine Exhaust (Burns second with supersonic shock diamonds & vacuum expansion)
    if (mainThrust > 0) {
      const plumeExpansion = 1.0 + Math.min(3.8, this.altitude / 25000.0);
      const mPlumeCount = Math.floor(this.throttle * 4) + 2;
      for (let i = 0; i < mPlumeCount; i++) {
        const spreadAngle = (Math.random() - 0.5) * (0.32 * plumeExpansion);
        const pSpeed = 170 + Math.random() * 150;
        this.particles.push({
          x: this.downrange,
          y: this.altitude,
          vx: -Math.cos(pitchRad + spreadAngle) * pSpeed,
          vy: -Math.sin(pitchRad + spreadAngle) * pSpeed,
          size: (Math.random() * 5 + 4) * plumeExpansion,
          life: 1.0,
          decay: Math.random() * 0.03 + 0.016,
          color: this.engine ? this.engine.plumeColor : "rgba(100, 180, 255, 0.9)"
        });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += 15 * dt;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update Space Asteroids when in upper atmosphere / space (>= 12 km)
    if (this.altitude > 12000) {
      const boundX = Math.max(380, (this.canvas ? this.canvas.width * 0.52 : 450));
      const boundY = Math.max(260, (this.canvas ? this.canvas.height * 0.52 : 320));
      for (const a of this.spaceAsteroids) {
        a.relX += a.vx * dt;
        a.relY += a.vy * dt;
        a.rot += a.vRot * dt;

        // Wrap around rocket viewport
        if (a.relX < -boundX) a.relX = boundX;
        if (a.relX > boundX) a.relX = -boundX;
        if (a.relY < -boundY) a.relY = boundY;
        if (a.relY > boundY) a.relY = -boundY;
      }
    }

    // Update Dispatched Rovers in space flight
    for (let i = this.dispatchedRovers.length - 1; i >= 0; i--) {
      const r = this.dispatchedRovers[i];
      if (!r.landed) {
        r.progress += 0.35 * dt;
        r.relX += (r.target.relX - r.relX) * 0.08;
        r.relY += (r.target.relY - r.relY) * 0.08;

        // Retro-thruster spark particles from the descending rover
        this.particles.push({
          x: this.downrange,
          y: this.altitude,
          vx: (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 35,
          size: 3,
          color: "rgba(255, 210, 120, 0.8)",
          life: 0.6,
          decay: 0.04
        });

        if (r.progress >= 1.0 || Math.hypot(r.relX - r.target.relX, r.relY - r.target.relY) < 24) {
          r.landed = true;
          r.target.sampled = true;
          const pts = r.target.pts;

          if (typeof NASA_BANK !== "undefined") {
            NASA_BANK.pendingPoints += pts;
            NASA_BANK.updateUI();
          }

          if (typeof NASA_AUDIO !== "undefined") {
            NASA_AUDIO.playOrbitAchieved();
          }

          if (typeof logCapcom === "function") {
            logCapcom(`🎉 [TOUCHDOWN CONFIRMED] Rover #${r.id} landed on ${r.target.name}! Drilled: ${r.target.mineral}. (+${pts.toLocaleString()} NASA Points)`);
          }

          if (typeof showGameNotification === "function") {
            showGameNotification(`🎉 Asteroid Touchdown Confirmed!`, `Rover landed on ${r.target.name}! Drilled ${r.target.mineral}. +${pts.toLocaleString()} PTS deposited to NASA Bank!`);
          }
        }
      }
    }

    // Update Mars Entry Capsule descent sequence
    if (this.isMarsDescentActive && this.marsCapsule) {
      this.marsCapsule.timer += dt;
      this.marsCapsule.y += this.marsCapsule.vy * dt;

      // Fiery entry plasma sparks
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: this.downrange,
          y: this.altitude,
          vx: (Math.random() - 0.5) * 35,
          vy: 50 + Math.random() * 35,
          size: Math.random() * 5 + 3,
          color: i % 2 === 0 ? "rgba(255, 110, 25, 0.9)" : "rgba(255, 220, 90, 0.95)",
          life: 0.6,
          decay: 0.05
        });
      }

      // Transition to Mars surface view after 3.2 seconds
      if (this.marsCapsule.timer >= 3.2 && !this.marsTransitioned) {
        this.marsTransitioned = true;
        if (typeof NASA_AUDIO !== "undefined") {
          NASA_AUDIO.playOrbitAchieved();
        }
        if (typeof transitionToMarsSurfaceView === "function") {
          transitionToMarsSurfaceView();
        }
      }
    }

    // Check orbit achievement
    const targetOrbitAlt = this.target.targetAlt;
    const circularSpeed = NASA_PHYSICS.getCircularOrbitSpeed(this.altitude);
    if (!this.orbitAchieved && this.altitude >= 160000 && this.vx >= circularSpeed * 0.94) {
      this.orbitAchieved = true;
      this.state = "ORBIT";
      NASA_AUDIO.playOrbitAchieved();
    }
  }

  separateStage() {
    if (this.isStaged) return false;
    if (this.state !== "FLIGHT" && this.state !== "ORBIT") {
      if (typeof showGameNotification === "function") {
        showGameNotification("⚠️ Launch Required", "Click IGNITION & LIFTOFF first before separating Stage 1 boosters!");
      }
      return false;
    }
    this.isStaged = true;
    this.boosterBurnout = true;
    this.boosterThrustMax = 0;
    try {
      if (typeof NASA_AUDIO !== "undefined") NASA_AUDIO.playStageSeparation();
    } catch (err) {
      console.warn("Stage separation audio skipped:", err);
    }

    const type = this.rocket ? this.rocket.svgType : "sls";

    // Eject detachable twin side boosters (SRBs)
    this.separatedStages.push({
      type: "srb_left",
      relX: -24,
      relY: -45,
      vx: -55,      // fast sideways outward ejection
      vy: 30,       // aerodynamic deceleration
      rot: -0.05,
      vRot: -1.5,
      w: 11, h: 76,
      color: "#f8fafc"
    });
    this.separatedStages.push({
      type: "srb_right",
      relX: 24,
      relY: -45,
      vx: 55,       // fast sideways outward ejection
      vy: 30,
      rot: 0.05,
      vRot: 1.5,
      w: 11, h: 76,
      color: "#f8fafc"
    });

    if (type === "saturn_v" || type === "falcon9" || type === "starship") {
      // First stage massive booster core tumbling backwards
      this.separatedStages.push({
        type: "first_stage",
        relX: 0,
        relY: -15,
        vx: 0,
        vy: 65,
        rot: 0,
        vRot: 0.8,
        w: type === "saturn_v" ? 28 : (type === "starship" ? 26 : 18),
        h: 58,
        color: type === "starship" ? "#a1a1aa" : (type === "saturn_v" ? "#ffffff" : "#f1f5f9")
      });
    }

    if (typeof showGameNotification === "function") {
      showGameNotification("💥 STAGE SEPARATION", "1st Stage Boosters cleanly decoupled! Stage 2 Core Active.");
    }

    // Huge pyrotechnic explosive separation cloud
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: this.downrange,
        y: this.altitude,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        size: Math.random() * 12 + 10,
        life: 1.3,
        decay: 0.03,
        color: i % 2 === 0 ? "rgba(255, 230, 150, 0.95)" : "rgba(255, 120, 30, 0.9)"
      });
    }

    // Upper stage ignition boost
    this.dryMass *= 0.5;
    this.isp = Math.round(this.isp * 1.2);
    return true;
  }

  render() {
    if (!this.canvas.width || !this.canvas.height || this.canvas.width <= 10) {
      this.resizeCanvas();
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Camera targets rocket with smooth vertical and horizontal centering
    const rocketScreenX = w * 0.45;
    const rocketScreenY = h * 0.65;

    // Background sky color interpolation based on altitude (0 km -> 100 km)
    const skyProgress = Math.min(1.0, this.altitude / 80000.0);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);

    if (skyProgress < 0.25) {
      // Sea level to 20 km (Troposphere)
      skyGrad.addColorStop(0, "#194a8d");
      skyGrad.addColorStop(1, "#6eb5ff");
    } else if (skyProgress < 0.6) {
      // Stratosphere (Dark navy to twilight violet)
      skyGrad.addColorStop(0, "#081026");
      skyGrad.addColorStop(1, "#1e355b");
    } else {
      // Mesosphere & Space (pitch black cosmos)
      skyGrad.addColorStop(0, "#020408");
      skyGrad.addColorStop(1, "#070d18");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars in upper atmosphere & space
    if (skyProgress > 0.3) {
      const starAlpha = Math.min(1.0, (skyProgress - 0.3) / 0.5);
      ctx.save();
      for (const s of this.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * starAlpha})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 1. COSMIC DEEP SPACE NEBULA VEILS (Carina & Orion glowing dust)
    if (this.altitude > 14000) {
      const cosmosAlpha = Math.min(1.0, (this.altitude - 14000) / 28000);
      ctx.save();
      for (const neb of this.nebulaClouds) {
        const nx = w * (0.5 + neb.xRel);
        const ny = h * neb.yRel;
        const ng = ctx.createRadialGradient(nx, ny, 10, nx, ny, neb.r);
        ng.addColorStop(0, neb.color.replace("0.08", `${0.18 * cosmosAlpha}`));
        ng.addColorStop(0.6, neb.color.replace("0.08", `${0.08 * cosmosAlpha}`));
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(nx, ny, neb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. CURVATURE OF THE EARTH HORIZON (Blue Marble Limb with Rayleigh Atmosphere Glow)
    if (this.altitude > 20000) {
      const earthCurveY = rocketScreenY + 220 + Math.max(0, 140000 - this.altitude) * 0.0035;
      ctx.save();
      // Glowing blue atmospheric rim (Rayleigh scattering)
      const atmoGlow = ctx.createRadialGradient(rocketScreenX, earthCurveY + 920, 800, rocketScreenX, earthCurveY + 920, 1020);
      atmoGlow.addColorStop(0, "#0284c7");
      atmoGlow.addColorStop(0.25, "rgba(56, 189, 248, 0.45)");
      atmoGlow.addColorStop(0.4, "rgba(56, 189, 248, 0.12)");
      atmoGlow.addColorStop(0.6, "rgba(0,0,0,0)");
      ctx.fillStyle = atmoGlow;
      ctx.fillRect(0, earthCurveY - 80, w, 220);

      // Curved Earth Surface
      ctx.beginPath();
      ctx.arc(rocketScreenX, earthCurveY + 950, 1000, 0, Math.PI * 2);
      const earthGrad = ctx.createRadialGradient(rocketScreenX, earthCurveY + 200, 100, rocketScreenX, earthCurveY + 950, 1000);
      earthGrad.addColorStop(0, "#0c4a6e"); // deep Atlantic ocean
      earthGrad.addColorStop(0.7, "#082f49");
      earthGrad.addColorStop(1, "#030712");
      ctx.fillStyle = earthGrad;
      ctx.fill();

      // Atmospheric limb bright rim highlight
      ctx.strokeStyle = "rgba(186, 230, 253, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rocketScreenX, earthCurveY + 950, 1000, Math.PI * 1.3, Math.PI * 1.7);
      ctx.stroke();
      ctx.restore();
    }

    // 2.5 CELESTIAL MARS APPROACH DISC IN SPACE (Grows larger as rocket climbs)
    if (this.altitude > 20000) {
      const marsProgress = Math.min(1.0, (this.altitude - 20000) / 45000);
      const marsRadius = 26 + marsProgress * 68; // Expands dynamically as spacecraft approaches Mars!
      const marsScreenX = w * 0.74;
      const marsScreenY = h * 0.22;

      ctx.save();
      // Glowing reddish-orange Martian atmosphere rim
      const marsAtmo = ctx.createRadialGradient(marsScreenX, marsScreenY, marsRadius * 0.85, marsScreenX, marsScreenY, marsRadius * 1.25);
      marsAtmo.addColorStop(0, "rgba(234, 88, 12, 0.45)");
      marsAtmo.addColorStop(0.5, "rgba(249, 115, 22, 0.15)");
      marsAtmo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = marsAtmo;
      ctx.beginPath();
      ctx.arc(marsScreenX, marsScreenY, marsRadius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 3D Spherical Mars Surface (Sunlit upper-left, dark Syrtis Major volcanic plains)
      const marsGrad = ctx.createRadialGradient(marsScreenX - marsRadius * 0.35, marsScreenY - marsRadius * 0.35, marsRadius * 0.08, marsScreenX, marsScreenY, marsRadius);
      marsGrad.addColorStop(0, "#ea580c");   // sunlit rusty red
      marsGrad.addColorStop(0.5, "#c2410c"); // ochre regolith
      marsGrad.addColorStop(0.8, "#7c2d12"); // dark volcanic plains
      marsGrad.addColorStop(1, "#1c0a04");   // shadow side
      ctx.fillStyle = marsGrad;
      ctx.beginPath();
      ctx.arc(marsScreenX, marsScreenY, marsRadius, 0, Math.PI * 2);
      ctx.fill();

      // White Polar Ice Cap
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.beginPath();
      ctx.ellipse(marsScreenX, marsScreenY - marsRadius * 0.82, marsRadius * 0.32, marsRadius * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mars Destination HUD Tag
      ctx.fillStyle = "#f97316";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🔴 DESTINATION: MARS", marsScreenX, marsScreenY - marsRadius - 14);
      ctx.fillStyle = "#fed7aa";
      ctx.font = "9px monospace";
      const kmDist = Math.max(0, Math.round((65000 - this.altitude) * 0.12));
      ctx.fillText(kmDist > 0 ? `RANGE: ${kmDist.toLocaleString()} km • ORBIT INSERTION` : `ORBITAL INSERTION CONFIRMED`, marsScreenX, marsScreenY - marsRadius - 3);
      ctx.restore();
    }

    // 3. DRIFTING SPACE ASTEROIDS IN ORBIT & DEEP SPACE (>= 12 km)
    if (this.altitude > 12000) {
      const astAlpha = Math.min(1.0, (this.altitude - 12000) / 12000);
      for (const a of this.spaceAsteroids) {
        const ax = rocketScreenX + a.relX;
        const ay = rocketScreenY + a.relY;

        // Skip if off screen
        if (ax < -120 || ax > w + 120 || ay < -120 || ay > h + 120) continue;

        ctx.save();
        ctx.globalAlpha = astAlpha;
        ctx.translate(ax, ay);
        ctx.rotate(a.rot);

        // 3D Directional Lighting on Asteroid (Sunlit top-left, shadowed bottom-right)
        const rockGrad = ctx.createRadialGradient(-a.r * 0.35, -a.r * 0.35, 2, 0, 0, a.r);
        rockGrad.addColorStop(0, "#cbd5e1");   // sunlit metallic specular
        rockGrad.addColorStop(0.65, "#475569"); // rugged basalt
        rockGrad.addColorStop(1, "#0f172a");   // dark shadow side

        ctx.fillStyle = rockGrad;
        ctx.beginPath();
        ctx.arc(0, 0, a.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = a.sampled ? "#10b981" : "#334155";
        ctx.lineWidth = a.sampled ? 2 : 1;
        ctx.stroke();

        // Impact Craters
        for (const c of a.craters) {
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(c.rx, c.ry, c.cr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        // Mineral Vein Glimmer
        ctx.fillStyle = a.mineralColor;
        ctx.beginPath();
        ctx.arc(-a.r * 0.3, -a.r * 0.2, 2.8, 0, Math.PI * 2);
        ctx.arc(a.r * 0.25, a.r * 0.3, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Asteroid HUD Targeting Tag & Proximity Lock
        ctx.save();
        ctx.globalAlpha = astAlpha;
        ctx.fillStyle = a.sampled ? "#34d399" : "#38bdf8";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(a.sampled ? `✓ ${a.name} [MINED]` : `☄️ ${a.name}`, ax, ay - a.r - 8);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "8px monospace";
        ctx.fillText(`${a.mineral.split("&")[0]}`, ax, ay - a.r - 18);

        // Proximity targeting lock-on reticle
        const dist = Math.hypot(a.relX, a.relY);
        if (dist < 260 && !a.sampled) {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(ax, ay, a.r + 8, 0, Math.PI * 2);
          ctx.stroke();

          // Laser targeting line to spacecraft
          ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(rocketScreenX, rocketScreenY);
          ctx.lineTo(ax, ay);
          ctx.stroke();
          ctx.setLineDash([]);

          // Lock-on status label
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 9px monospace";
          ctx.fillText(`[ 🎯 LOCK: PRESS [R] TO DISPATCH ROVER ]`, ax, ay + a.r + 14);
        }
        ctx.restore();
      }
    }

    // 4. DRAW DISPATCHED ROVERS IN SPACE FLIGHT
    for (const r of this.dispatchedRovers) {
      const rx = rocketScreenX + r.relX;
      const ry = rocketScreenY + r.relY;

      ctx.save();
      ctx.translate(rx, ry);
      // Small lander capsule
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = "#f59e0b"; // gold heat shield
      ctx.fillRect(-7, 5, 14, 3);
      // Solar panel wings
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(-12, -2, 5, 4);
      ctx.fillRect(7, -2, 5, 4);
      ctx.restore();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(r.landed ? `[LANDED ROVER]` : `[ROVER DESCENT ${Math.round(r.progress * 100)}%]`, rx, ry - 12);
    }

    // 4.5 DRAW CINEMATIC DESCENDING MARS CAPSULE
    if (this.isMarsDescentActive && this.marsCapsule) {
      const capX = rocketScreenX + this.marsCapsule.x;
      const capY = rocketScreenY + 35 + this.marsCapsule.y;

      ctx.save();
      ctx.translate(capX, capY);

      // Atmospheric entry plasma shock layer
      ctx.fillStyle = "rgba(255, 120, 20, 0.85)";
      ctx.beginPath();
      ctx.ellipse(0, 15, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aeroshell Entry Capsule Base
      ctx.fillStyle = "#f59e0b"; // gold heat shield
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(16, -10);
      ctx.lineTo(19, 10);
      ctx.lineTo(-19, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // White Backshell
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-12, -18, 24, 8);

      // Trailing entry plasma flame
      ctx.fillStyle = "rgba(255, 220, 80, 0.9)";
      ctx.beginPath();
      ctx.moveTo(-10, -18); ctx.lineTo(10, -18); ctx.lineTo(0, -45 - Math.random() * 15);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Mission Status Tag
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🛸 MARS ENTRY CAPSULE DISPATCHED", capX, capY - 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px monospace";
      ctx.fillText("ATMOSPHERIC ENTRY & SKY-CRANE TOUCHDOWN...", capX, capY - 34);
    }

    // ==========================================
    // KENNEDY SPACE CENTER LAUNCH COMPLEX 39B (FLORIDA)
    // ==========================================
    const groundPixelY = rocketScreenY + this.altitude * 0.25;
    if (groundPixelY < h + 300) {
      // 1. Florida Atlantic Coastline & Ocean Horizon
      const oceanGrad = ctx.createLinearGradient(0, groundPixelY - 60, 0, groundPixelY);
      oceanGrad.addColorStop(0, "#0284c7"); // Atlantic coastal waters
      oceanGrad.addColorStop(1, "#0369a1");
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(w * 0.65, groundPixelY - 40, w * 0.35, 40);

      // Shimmering animated waves on the Atlantic
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      const waveT = Date.now() * 0.003;
      for (let wy = groundPixelY - 32; wy < groundPixelY; wy += 8) {
        ctx.beginPath();
        for (let wx = w * 0.65; wx <= w; wx += 15) {
          const dy = Math.sin(wx * 0.06 + waveT + wy) * 2;
          if (wx === w * 0.65) ctx.moveTo(wx, wy + dy);
          else ctx.lineTo(wx, wy + dy);
        }
        ctx.stroke();
      }

      // Merritt Island marshland shoreline
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.moveTo(w * 0.65, groundPixelY - 40);
      ctx.quadraticCurveTo(w * 0.62, groundPixelY - 20, w * 0.60, groundPixelY);
      ctx.lineTo(w, groundPixelY);
      ctx.lineTo(w, groundPixelY - 40);
      ctx.closePath();
      ctx.fill();

      // Distant NASA Vehicle Assembly Building (VAB) & High-Bay skyline
      const vabX = Math.min(w - 95, rocketScreenX + 160);
      const vabW = 78;
      const vabH = 72;
      const vabY = groundPixelY - vabH - 10;
      ctx.fillStyle = "#64748b"; // VAB monolithic concrete
      ctx.fillRect(vabX, vabY, vabW, vabH);
      // High bay vertical doors
      ctx.fillStyle = "#334155";
      ctx.fillRect(vabX + 12, vabY + 16, 22, vabH - 16);
      ctx.fillRect(vabX + 44, vabY + 16, 22, vabH - 16);
      // VAB roof trim
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(vabX, vabY, vabW, 4);
      // NASA Meatball & American Flag on VAB facade
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(vabX + 16, vabY + 5, 14, 8);
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(vabX + 16, vabY + 5, 6, 4);

      // 2. Concrete Launch Complex 39B Hardstand & Crawlerway
      ctx.fillStyle = "#334155"; // Concrete launch mount hardstand
      ctx.fillRect(0, groundPixelY, w, h - groundPixelY);

      // High-intensity Xenon Pad Floodlights (illuminating rocket vertically)
      if (this.altitude < 160) {
        const spotAlpha = Math.max(0.08, 0.45 - (this.altitude / 300));
        ctx.save();
        const beamL = ctx.createLinearGradient(rocketScreenX - 60, groundPixelY, rocketScreenX, rocketScreenY);
        beamL.addColorStop(0, `rgba(220, 245, 255, ${spotAlpha})`);
        beamL.addColorStop(1, "rgba(220, 245, 255, 0.0)");
        ctx.fillStyle = beamL;
        ctx.beginPath();
        ctx.moveTo(rocketScreenX - 65, groundPixelY);
        ctx.lineTo(rocketScreenX - 52, groundPixelY);
        ctx.lineTo(rocketScreenX + 10, rocketScreenY - 80);
        ctx.lineTo(rocketScreenX - 10, rocketScreenY - 80);
        ctx.closePath();
        ctx.fill();

        const beamR = ctx.createLinearGradient(rocketScreenX + 60, groundPixelY, rocketScreenX, rocketScreenY);
        beamR.addColorStop(0, `rgba(220, 245, 255, ${spotAlpha})`);
        beamR.addColorStop(1, "rgba(220, 245, 255, 0.0)");
        ctx.fillStyle = beamR;
        ctx.beginPath();
        ctx.moveTo(rocketScreenX + 52, groundPixelY);
        ctx.lineTo(rocketScreenX + 65, groundPixelY);
        ctx.lineTo(rocketScreenX + 10, rocketScreenY - 80);
        ctx.lineTo(rocketScreenX - 10, rocketScreenY - 80);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Crushed River Rock Crawlerway (leading to pad)
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(rocketScreenX - 70, groundPixelY, 140, h - groundPixelY);
      ctx.fillStyle = "#475569";
      ctx.fillRect(rocketScreenX - 6, groundPixelY, 12, h - groundPixelY); // crawler center median

      // Reinforced Concrete Flame Trench Deflector (Directly under rocket)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(rocketScreenX - 35, groundPixelY, 70, 25);
      ctx.strokeStyle = "#ffedd5";
      ctx.lineWidth = 1;

      // 3. NASA Mobile Launcher Gantry Tower (KSC Pad 39B)
      const towerX = rocketScreenX - 75;
      const towerW = 28;
      const towerH = 260;
      const towerTopY = groundPixelY - towerH;

      // Tower Red Structural Steel Columns
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(towerX, towerTopY, towerW, towerH);

      // Lattice Cross-Bracing Girders (Steel Truss Pattern)
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      for (let ty = towerTopY; ty < groundPixelY; ty += 22) {
        ctx.beginPath();
        ctx.moveTo(towerX, ty);
        ctx.lineTo(towerX + towerW, ty + 22);
        ctx.moveTo(towerX + towerW, ty);
        ctx.lineTo(towerX, ty + 22);
        ctx.stroke();

        // Horizontal catwalk platforms
        ctx.fillStyle = "#475569";
        ctx.fillRect(towerX - 4, ty, towerW + 8, 3);
      }

      // Crew Access Arm (Swings back upon liftoff!)
      const armRetract = Math.min(1.0, this.altitude / 8.0);
      const armAngle = -armRetract * 0.8;
      ctx.save();
      ctx.translate(towerX + towerW, towerTopY + 70);
      ctx.rotate(armAngle);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, -5, 45, 10);
      // White cleanroom vestibule at end of arm
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(40, -9, 14, 18);
      ctx.restore();

      // Umbilical Cryo Fuel Line Bridges
      if (this.altitude < 4.0) {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(towerX + towerW, towerTopY + 140, 48, 5);
        ctx.fillRect(towerX + towerW, towerTopY + 200, 52, 5);
      }

      // 400-ft Lightning Mast on top of Pad 39B
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(towerX + towerW / 2, towerTopY);
      ctx.lineTo(towerX + towerW / 2, towerTopY - 70);
      ctx.stroke();
      // Lightning stay-cables
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(226, 232, 240, 0.5)";
      ctx.beginPath();
      ctx.moveTo(towerX + towerW / 2, towerTopY - 65);
      ctx.lineTo(towerX - 30, towerTopY);
      ctx.moveTo(towerX + towerW / 2, towerTopY - 65);
      ctx.lineTo(towerX + towerW + 30, towerTopY);
      ctx.stroke();

      // 4. WATER SOUND SUPPRESSION STEAM DELUGE (Ignition Steam Billows)
      if (this.state === "FLIGHT" && this.altitude < 120.0) {
        const steamIntensity = Math.min(1.0, this.missionTime / 2.0);
        const steamExpansion = Math.min(180, this.missionTime * 45);

        // Billowing rolling clouds of sound suppression water steam across the pad
        const cloudGrad = ctx.createRadialGradient(rocketScreenX, groundPixelY, 10, rocketScreenX, groundPixelY, steamExpansion);
        cloudGrad.addColorStop(0, "rgba(255, 237, 213, 0.95)"); // illuminated fiery inner steam
        cloudGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.85)"); // white water deluge steam
        cloudGrad.addColorStop(1, "rgba(226, 232, 240, 0.0)");

        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.ellipse(rocketScreenX - steamExpansion * 0.6, groundPixelY - 15, steamExpansion * 0.7, 45, 0, 0, Math.PI * 2);
        ctx.ellipse(rocketScreenX + steamExpansion * 0.6, groundPixelY - 15, steamExpansion * 0.7, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pad 39B IOP/SSWS Rainbird spray droplets
        ctx.fillStyle = "rgba(224, 242, 254, 0.8)";
        for (let i = 0; i < 16; i++) {
          const rx = rocketScreenX - 50 + Math.random() * 100;
          const ry = groundPixelY - Math.random() * 22;
          ctx.beginPath();
          ctx.arc(rx, ry, Math.random() * 3 + 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Exhaust Plume Particles
    for (const p of this.particles) {
      const px = rocketScreenX + (p.x - this.downrange) * 0.25;
      const py = rocketScreenY - (p.y - this.altitude) * 0.25;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Mach 1 Transonic Shock Cone (Atmospheric vapor envelope)
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const mach = speed / NASA_PHYSICS.getSpeedOfSound(this.altitude);
    if (mach >= 0.95 && mach <= 1.25 && this.altitude < 40000) {
      ctx.save();
      ctx.translate(rocketScreenX, rocketScreenY - 20);
      ctx.rotate(((90 - this.pitch) * Math.PI) / 180.0);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // DRAW DECOUPLED FALLING BOOSTERS / STAGES
    const pitchRad = ((90 - this.pitch) * Math.PI) / 180.0;
    const cosP = Math.cos(pitchRad);
    const sinP = Math.sin(pitchRad);

    for (const stage of this.separatedStages) {
      // Displace outward along rocket's rotated body axis
      const rotX = stage.relX * cosP - stage.relY * sinP;
      const rotY = stage.relX * sinP + stage.relY * cosP;
      const sx = rocketScreenX + rotX;
      const sy = rocketScreenY + rotY;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(pitchRad + stage.rot);

      // Smoke and fiery sparks coming from decoupled stage
      ctx.fillStyle = "rgba(255, 120, 30, 0.7)";
      ctx.beginPath();
      ctx.arc(0, stage.h / 2 + 5, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();

      // Stage body
      ctx.fillStyle = stage.color;
      ctx.fillRect(-stage.w / 2, -stage.h / 2, stage.w, stage.h);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-stage.w / 2, -stage.h / 2, stage.w, stage.h);

      // Pointed nosecone on SRB stages
      if (stage.type && stage.type.startsWith("srb")) {
        ctx.beginPath();
        ctx.moveTo(-stage.w / 2, -stage.h / 2);
        ctx.lineTo(0, -stage.h / 2 - 14);
        ctx.lineTo(stage.w / 2, -stage.h / 2);
        ctx.closePath();
        ctx.fillStyle = stage.color;
        ctx.fill();
        ctx.stroke();
      }

      // Decoupled interstage ring
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-stage.w / 2, -stage.h / 2, stage.w, 8);
      ctx.restore();
    }

    // DRAW THE ROCKET (Custom User Image or Built-in Vector)
    ctx.save();
    ctx.translate(rocketScreenX, rocketScreenY);
    ctx.rotate(((90 - this.pitch) * Math.PI) / 180.0);

    // RCS Steering Jet Puffs
    if (this.rcsTimer > 0) {
      ctx.fillStyle = "rgba(180, 240, 255, 0.9)";
      if (this.rcsActive === "left") {
        ctx.beginPath();
        ctx.arc(14, -110, 4 + Math.random() * 4, 0, Math.PI * 2);
        ctx.arc(-14, -20, 3 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.rcsActive === "right") {
        ctx.beginPath();
        ctx.arc(-14, -110, 4 + Math.random() * 4, 0, Math.PI * 2);
        ctx.arc(14, -20, 3 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.rocket && this.rocket.isCustomImage && this.rocket.imageElement) {
      // RENDER USER-UPLOADED CUSTOM ROCKET IMAGE!
      const img = this.rocket.imageElement;
      const targetHeight = 130;
      const aspect = img.naturalWidth / (img.naturalHeight || 1);
      const targetWidth = Math.max(30, targetHeight * aspect);

      ctx.drawImage(img, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);

      // Render purchased aerodynamic fins on custom rocket
      if (typeof NASA_BANK !== "undefined" && NASA_BANK.upgrades && NASA_BANK.upgrades.finStabilizers && NASA_BANK.upgrades.finStabilizers.purchased) {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(-targetWidth / 2, -28);
        ctx.lineTo(-targetWidth / 2 - 20, 2);
        ctx.lineTo(-targetWidth / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(targetWidth / 2, -28);
        ctx.lineTo(targetWidth / 2 + 20, 2);
        ctx.lineTo(targetWidth / 2, 0);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Built-in NASA Rocket Vector Rendering
      this.drawVectorRocket(ctx);
    }

    // Rocket Thruster Bell Glow & Plume Dynamics
    if (this.throttle > 0.05 && this.currentFuel > 0 && this.state === "FLIGHT") {
      if (this.engine && this.engine.flameType === "liquid_crystal") {
        // Crystalline Photonic Liquid Crystal Plume (LCPX)
        ctx.fillStyle = "rgba(168, 85, 247, 0.95)";
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(11, 0);
        ctx.lineTo(0, 42 * this.throttle + Math.random() * 8);
        ctx.closePath();
        ctx.fill();

        // Inner electric cyan photon matrix
        ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 26 * this.throttle);
        ctx.closePath();
        ctx.fill();

        // Prismatic Photonic Shock Diamonds
        ctx.fillStyle = "#ffffff";
        for (let i = 1; i <= 4; i++) {
          const dY = i * 8.5 * this.throttle;
          ctx.beginPath();
          ctx.moveTo(0, dY - 3.5); ctx.lineTo(3.5, dY); ctx.lineTo(0, dY + 3.5); ctx.lineTo(-3.5, dY);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.engine ? this.engine.plumeColor : "orange";
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 35 * this.throttle + Math.random() * 8);
        ctx.closePath();
        ctx.fill();

        // Supersonic Shock Diamonds inside core exhaust
        ctx.fillStyle = "#ffffff";
        for (let i = 1; i <= 3; i++) {
          const dY = i * 10 * this.throttle;
          ctx.beginPath();
          ctx.moveTo(0, dY - 3);
          ctx.lineTo(3, dY);
          ctx.lineTo(0, dY + 3);
          ctx.lineTo(-3, dY);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Render Minimap
    this.renderMinimap();
  }

  drawVectorRocket(ctx) {
    const type = this.rocket ? this.rocket.svgType : "sls";

    if (type === "sls") {
      // 3D Cylindrical lighting gradient for Core Tank
      const coreGrad = ctx.createLinearGradient(-14, 0, 14, 0);
      coreGrad.addColorStop(0, "#873805");     // dark shadow side
      coreGrad.addColorStop(0.35, "#ea7a2d");  // realistic SLS orange insulation foam
      coreGrad.addColorStop(0.65, "#ff9a4d");  // specular highlight
      coreGrad.addColorStop(1, "#6d2b02");     // shadow side

      // Core Fuselage (Seamless down to engine boat-tail: Y=-105 to -8)
      ctx.fillStyle = coreGrad;
      ctx.fillRect(-13, -105, 26, 97);

      // Liquid Hydrogen/Oxygen Feedline Pipe (running down the right side)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, -100, 2.5, 92);
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(10, -50, 2.5, 4); // Systems tunnel markings

      // Interstage structural rings
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(-13, -75, 26, 2);
      ctx.fillRect(-13, -40, 26, 2);

      // Orion Capsule & Service Module (Upper Stage)
      const capGrad = ctx.createLinearGradient(-13, 0, 13, 0);
      capGrad.addColorStop(0, "#cbd5e1");
      capGrad.addColorStop(0.5, "#ffffff");
      capGrad.addColorStop(1, "#94a3b8");

      // Service Module
      ctx.fillStyle = capGrad;
      ctx.fillRect(-11, -118, 22, 13);
      // Orion Conical Command Module
      ctx.beginPath();
      ctx.moveTo(-11, -118);
      ctx.lineTo(0, -135);
      ctx.lineTo(11, -118);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Launch Abort System (LAS) tower on top (jettisons at high altitude)
      if (this.altitude < 60000) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -135);
        ctx.lineTo(0, -150);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-1.5, -152, 3, 4);
      }

      // Solid Rocket Boosters (SRBs) - Photorealistic Twin Boosters
      if (!this.isStaged) {
        const srbGradL = ctx.createLinearGradient(-24, 0, -14, 0);
        srbGradL.addColorStop(0, "#94a3b8");
        srbGradL.addColorStop(0.4, "#ffffff");
        srbGradL.addColorStop(1, "#64748b");

        const srbGradR = ctx.createLinearGradient(14, 0, 24, 0);
        srbGradR.addColorStop(0, "#64748b");
        srbGradR.addColorStop(0.6, "#ffffff");
        srbGradR.addColorStop(1, "#94a3b8");

        // Left 5-Segment SRB
        ctx.fillStyle = srbGradL;
        ctx.fillRect(-23, -88, 9, 82);
        // Left Nosecone
        ctx.beginPath();
        ctx.moveTo(-23, -88);
        ctx.lineTo(-18.5, -104);
        ctx.lineTo(-14, -88);
        ctx.closePath();
        ctx.fill();
        // Left Aft Skirt
        ctx.fillStyle = "#334155";
        ctx.fillRect(-24, -6, 11, 6);

        // Right 5-Segment SRB
        ctx.fillStyle = srbGradR;
        ctx.fillRect(14, -88, 9, 82);
        // Right Nosecone
        ctx.beginPath();
        ctx.moveTo(14, -88);
        ctx.lineTo(18.5, -104);
        ctx.lineTo(23, -88);
        ctx.closePath();
        ctx.fill();
        // Right Aft Skirt
        ctx.fillStyle = "#334155";
        ctx.fillRect(13, -6, 11, 6);

        // STAGE 1 BOOSTER FLAMES: Detachable Side Thrusters Burn First!
        if (!this.boosterBurnout && this.state === "FLIGHT" && this.throttle > 0.05) {
          ctx.fillStyle = "rgba(255, 240, 180, 0.98)";
          // Left booster fiery flame
          ctx.beginPath();
          ctx.moveTo(-23, 0);
          ctx.lineTo(-14, 0);
          ctx.lineTo(-18.5, 36 * this.throttle + Math.random() * 8);
          ctx.closePath();
          ctx.fill();
          // Right booster fiery flame
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(23, 0);
          ctx.lineTo(18.5, 36 * this.throttle + Math.random() * 8);
          ctx.closePath();
          ctx.fill();
        } else if (this.boosterBurnout) {
          // Burnout state: Hot dark ember nozzles, flames extinguished!
          ctx.fillStyle = "rgba(255, 80, 0, 0.8)";
          ctx.fillRect(-22, 0, 7, 2);
          ctx.fillRect(15, 0, 7, 2);
        }
      }

      // AERODYNAMIC FIN STABILIZERS (Purchased from NASA Virtual Bank Upgrade Shop)
      const finsEquipped = (typeof NASA_BANK !== "undefined" && NASA_BANK.upgrades && NASA_BANK.upgrades.finStabilizers && NASA_BANK.upgrades.finStabilizers.purchased);
      if (finsEquipped) {
        ctx.save();
        // Left Titanium Aerodynamic Delta Fin
        ctx.fillStyle = "#dc2626"; // NASA Red leading edge
        ctx.beginPath();
        ctx.moveTo(-13, -28);
        ctx.lineTo(-34, -4);
        ctx.lineTo(-34, 4);
        ctx.lineTo(-13, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Left Fin Control Actuator Trim Tab
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-34, -2, 4, 6);

        // Right Titanium Aerodynamic Delta Fin
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(13, -28);
        ctx.lineTo(34, -4);
        ctx.lineTo(34, 4);
        ctx.lineTo(13, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Right Fin Control Actuator Trim Tab
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(30, -2, 4, 6);

        // Aerodynamic Fin Tip Vortices in Dense Atmosphere
        const curSpd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (this.altitude < 35000 && this.state === "FLIGHT" && curSpd > 60) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
          ctx.beginPath();
          ctx.arc(-34, 6 + Math.random() * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.arc(34, 6 + Math.random() * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Aft Boat-tail Fuselage Adapter (Seamless transition from -8 to 0)
      ctx.beginPath();
      ctx.moveTo(-13, -8);
      ctx.lineTo(13, -8);
      ctx.lineTo(9, 0);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fillStyle = "#451a03";
      ctx.fill();

      // 4x RS-25 Main Engine Cluster Bells (Mounted flush into boat-tail at Y=0 to +8)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-8, 0, 5, 8);
      ctx.fillRect(3, 0, 5, 8);
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(-8, 0, 5, 8);
      ctx.strokeRect(3, 0, 5, 8);

      // Glowing hot engine throat interior
      if (this.throttle > 0.05 && this.currentFuel > 0) {
        ctx.fillStyle = "#ffedd5";
        ctx.fillRect(-7, 6, 3, 2);
        ctx.fillRect(4, 6, 3, 2);
      }

    } else if (type === "saturn_v") {
      // Photorealistic Saturn V Apollo
      const satGrad = ctx.createLinearGradient(-15, 0, 15, 0);
      satGrad.addColorStop(0, "#94a3b8");
      satGrad.addColorStop(0.35, "#ffffff");
      satGrad.addColorStop(0.7, "#f8fafc");
      satGrad.addColorStop(1, "#64748b");

      if (!this.isStaged) {
        // Full Body with Stage 1 S-IC booster attached
        ctx.fillStyle = satGrad;
        ctx.fillRect(-15, -118, 30, 110);

        // Roll markings (USA Black and White Roll Patterns)
        ctx.fillStyle = "#09090b";
        ctx.fillRect(-15, -90, 30, 22);
        ctx.fillRect(-15, -45, 30, 14);

        ctx.fillStyle = "#18181b";
        ctx.fillRect(-15, -25, 30, 25);

        // Engine mount (Flush at Y=-8 to 0)
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-10, -8, 20, 8);
        // F-1 Engine bells (Y=0 to 8)
        ctx.fillStyle = "#52525b";
        ctx.fillRect(-11, 0, 7, 8);
        ctx.fillRect(4, 0, 7, 8);
      } else {
        // Upper Stages only (S-II / S-IVB / Apollo CSM) - Stage 1 S-IC detached!
        ctx.fillStyle = satGrad;
        ctx.fillRect(-14, -118, 28, 68);

        // Roll markings
        ctx.fillStyle = "#09090b";
        ctx.fillRect(-14, -90, 28, 22);

        // S-II J-2 Engine Cluster
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-10, -50, 20, 6);
        ctx.fillStyle = "#52525b";
        ctx.fillRect(-8, -44, 6, 8);
        ctx.fillRect(2, -44, 6, 8);
      }

      // Apollo Command & Service Module + Escape Tower
      ctx.beginPath();
      ctx.moveTo(-15, -118);
      ctx.lineTo(0, -142);
      ctx.lineTo(15, -118);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();

    } else if (type === "starship") {
      // Photorealistic Stainless Steel Mirror Shading
      const steelGrad = ctx.createLinearGradient(-14, 0, 14, 0);
      steelGrad.addColorStop(0, "#71717a");
      steelGrad.addColorStop(0.3, "#e4e4e7");
      steelGrad.addColorStop(0.5, "#ffffff"); // metallic chrome gleam
      steelGrad.addColorStop(0.8, "#a1a1aa");
      steelGrad.addColorStop(1, "#52525b");

      if (!this.isStaged) {
        // Full Stack: Starship + Super Heavy Booster
        ctx.fillStyle = steelGrad;
        ctx.fillRect(-14, -115, 28, 107);

        // Black Ceramic Hexagonal Heatshield Tiles (Windward Side)
        ctx.fillStyle = "#18181b";
        ctx.fillRect(-14, -115, 7, 107);

        // Aerodynamic Flaps
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-22, -98, 9, 20);
        ctx.fillRect(13, -98, 9, 20);
        ctx.fillRect(-24, -28, 11, 26);
        ctx.fillRect(13, -28, 11, 26);

        // Raptor Engine Skirt & Bells (Flush at Y=-8 to 8)
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-12, -8, 24, 8);
        ctx.fillStyle = "#71717a";
        ctx.fillRect(-8, 0, 5, 8);
        ctx.fillRect(3, 0, 5, 8);
      } else {
        // Starship Spacecraft Only (Super Heavy detached!)
        ctx.fillStyle = steelGrad;
        ctx.fillRect(-14, -115, 28, 55);

        // Windward heatshield
        ctx.fillStyle = "#18181b";
        ctx.fillRect(-14, -115, 7, 55);

        // Forward Flaps
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-22, -98, 9, 20);
        ctx.fillRect(13, -98, 9, 20);

        // Vacuum Raptor Engines
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-10, -60, 20, 6);
        ctx.fillStyle = "#71717a";
        ctx.fillRect(-7, -54, 5, 8);
        ctx.fillRect(2, -54, 5, 8);
      }

      // Smooth Gothic Arch Nosecone
      ctx.beginPath();
      ctx.moveTo(-14, -115);
      ctx.quadraticCurveTo(0, -145, 14, -115);
      ctx.closePath();
      ctx.fillStyle = steelGrad;
      ctx.fill();

    } else {
      // Falcon 9 (Photorealistic Clean White Carbon Composite)
      const f9Grad = ctx.createLinearGradient(-9, 0, 9, 0);
      f9Grad.addColorStop(0, "#cbd5e1");
      f9Grad.addColorStop(0.4, "#ffffff");
      f9Grad.addColorStop(1, "#94a3b8");

      if (!this.isStaged) {
        ctx.fillStyle = f9Grad;
        ctx.fillRect(-9, -100, 18, 92);

        // Carbon Interstage Ring
        ctx.fillStyle = "#09090b";
        ctx.fillRect(-9, -60, 18, 10);
        // Titanium Grid Fins
        ctx.fillStyle = "#334155";
        ctx.fillRect(-15, -60, 6, 8);
        ctx.fillRect(9, -60, 6, 8);

        // Octaweb Engine Section (Flush at Y=-8 to 8)
        ctx.fillStyle = "#18181b";
        ctx.fillRect(-8, -8, 16, 8);
        ctx.fillStyle = "#52525b";
        ctx.fillRect(-6, 0, 12, 8);
      } else {
        // Second stage only (First stage booster detached!)
        ctx.fillStyle = f9Grad;
        ctx.fillRect(-9, -100, 18, 42);

        // Vacuum Merlin Engine Section
        ctx.fillStyle = "#18181b";
        ctx.fillRect(-6, -58, 12, 6);
        ctx.fillStyle = "#52525b";
        ctx.fillRect(-5, -52, 10, 8);
      }

      // Fairing Nosecone
      ctx.beginPath();
      ctx.moveTo(-9, -100);
      ctx.lineTo(0, -122);
      ctx.lineTo(9, -100);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }

  renderMinimap() {
    const mc = this.mctx;
    const w = this.minimap.width;
    const h = this.minimap.height;

    mc.clearRect(0, 0, w, h);

    // Draw stylized Earth curvature
    const earthCenterX = w / 2;
    const earthCenterY = h + 180;
    const earthRadius = 260;

    mc.beginPath();
    mc.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
    mc.fillStyle = "#0b3d91";
    mc.fill();
    mc.strokeStyle = "#00e5ff";
    mc.lineWidth = 2;
    mc.stroke();

    // Target orbit guide ring
    mc.beginPath();
    mc.arc(earthCenterX, earthCenterY, earthRadius + 45, 0, Math.PI * 2);
    mc.strokeStyle = "rgba(6, 214, 160, 0.4)";
    mc.setLineDash([4, 4]);
    mc.stroke();
    mc.setLineDash([]);

    // Rocket marker on minimap
    const mapScale = 0.0002;
    const angle = (this.downrange * mapScale) - Math.PI / 2;
    const r = earthRadius + (this.altitude * mapScale * 1.5);

    const rx = earthCenterX + r * Math.cos(angle);
    const ry = earthCenterY + r * Math.sin(angle);

    mc.fillStyle = "#ffb703";
    mc.beginPath();
    mc.arc(rx, ry, 4, 0, Math.PI * 2);
    mc.fill();
    mc.strokeStyle = "#fff";
    mc.lineWidth = 1;
    mc.stroke();
  }
}

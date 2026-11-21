// Deep Space Asteroid Belt Simulator, Space GPS, and Rover Deployment System

class AsteroidBeltSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    // Rocket Physics in Deep Space (Zero Gravity / Newtonian)
    this.x = 450;
    this.y = 280;
    this.vx = 0.0;
    this.vy = 0.0;
    this.heading = -Math.PI / 2; // Facing upward
    this.throttle = 0.0;
    this.fuel = 100;
    this.speed = 0;
    this.maxSpeed = 8.0;

    // Space GPS & Navigation
    this.solarDistAU = 2.77;    // Asteroid Belt distance from Sun in AU
    this.earthDistMkm = 385.2;  // Millions of km from Earth
    this.marsDistMkm = 94.6;
    this.dsnStations = ["Goldstone (CA)", "Madrid (Spain)", "Canberra (Aus)"];
    this.activeDsn = "Goldstone (CA)";

    // Asteroids Field
    this.asteroids = [];
    this.numAsteroids = 28;
    this.initAsteroids();

    // Dispatched Rovers / Surface Probes
    this.dispatchedRovers = [];
    this.particles = [];
    this.nebulaStars = [];
    this.initStars();

    // Stats
    this.mineralsHarvested = 0;
    this.pointsEarned = 0;
    this.roversDeployed = 0;

    this.keys = {};
    this.initControls();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 900;
      this.canvas.height = parent.clientHeight || 540;
    }
  }

  initStars() {
    this.nebulaStars = [];
    for (let i = 0; i < 180; i++) {
      this.nebulaStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        color: i % 5 === 0 ? "#38bdf8" : (i % 7 === 0 ? "#c084fc" : "#ffffff")
      });
    }
  }

  initAsteroids() {
    this.asteroids = [];
    const minerals = [
      { name: "Nickel-Iron Core", color: "#94a3b8", pts: 8000, value: "$8,000,000" },
      { name: "Platinum-Group Metals", color: "#e2e8f0", pts: 15000, value: "$15,000,000" },
      { name: "Water Ice & Volatiles", color: "#38bdf8", pts: 12000, value: "$12,000,000" },
      { name: "Rare-Earth Silicates", color: "#f59e0b", pts: 10000, value: "$10,000,000" }
    ];

    for (let i = 0; i < this.numAsteroids; i++) {
      const min = minerals[i % minerals.length];
      const r = Math.random() * 32 + 14;
      const numCrater = Math.floor(Math.random() * 5) + 2;
      const craters = [];
      for (let c = 0; c < numCrater; c++) {
        craters.push({
          relX: (Math.random() - 0.5) * r * 1.2,
          relY: (Math.random() - 0.5) * r * 1.2,
          cr: Math.random() * (r * 0.3) + 3
        });
      }

      this.asteroids.push({
        x: Math.random() * 1200 - 150,
        y: Math.random() * 800 - 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        r: r,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.015,
        mineral: min,
        craters: craters,
        sampled: false,
        name: `Asteroid-${1000 + i}`
      });
    }
  }

  initControls() {
    window.addEventListener("keydown", (e) => {
      const bay = document.getElementById("asteroid-bay");
      if (bay && bay.classList.contains("active")) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyR"].includes(e.code)) {
          e.preventDefault();
        }
        this.keys[e.code] = true;
        if (e.code === "KeyR" || e.code === "Space") {
          this.dispatchRover();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  dispatchRover() {
    // Find closest asteroid
    let closest = null;
    let minDist = 999999;
    for (const a of this.asteroids) {
      const dist = Math.hypot(this.x - a.x, this.y - a.y);
      if (dist < minDist) {
        minDist = dist;
        closest = a;
      }
    }

    if (minDist > 250) {
      alert("No asteroid within dispatch range! Maneuver your spacecraft closer to one of the target asteroids before ejecting a rover.");
      return;
    }

    // Deploy robotic rover probe
    this.roversDeployed++;
    const roverName = `Asteroid-Rover ${this.roversDeployed}`;
    const targetAsteroid = closest;

    this.dispatchedRovers.push({
      x: this.x,
      y: this.y,
      targetX: targetAsteroid.x,
      targetY: targetAsteroid.y,
      target: targetAsteroid,
      progress: 0.0,
      name: roverName,
      landed: false
    });

    if (typeof NASA_AUDIO !== "undefined") {
      NASA_AUDIO.playStageSeparation();
    }

    const log = document.getElementById("asteroid-mission-log");
    if (log) {
      const p = document.createElement("p");
      p.className = "text-cyan-400 font-mono text-xs";
      p.textContent = `[PAYLOAD DEPLOY] ${roverName} dispatched from spacecraft! Retrorockets firing towards ${targetAsteroid.name}.`;
      log.prepend(p);
    }
  }

  update(dt) {
    // Rotation & Steering
    if (this.keys["ArrowLeft"]) this.heading -= 2.2 * dt;
    if (this.keys["ArrowRight"]) this.heading += 2.2 * dt;

    // Throttle & Main Thruster
    if (this.keys["ArrowUp"]) {
      this.throttle = Math.min(1.0, this.throttle + 1.5 * dt);
      const accel = 120.0 * this.throttle;
      this.vx += Math.cos(this.heading) * accel * dt;
      this.vy += Math.sin(this.heading) * accel * dt;
      this.fuel = Math.max(0, this.fuel - 0.8 * dt);

      // Thruster exhaust particles
      this.particles.push({
        x: this.x - Math.cos(this.heading) * 22,
        y: this.y - Math.sin(this.heading) * 22,
        vx: -Math.cos(this.heading) * 90 + (Math.random() - 0.5) * 20,
        vy: -Math.sin(this.heading) * 90 + (Math.random() - 0.5) * 20,
        size: Math.random() * 5 + 3,
        color: "#38bdf8",
        life: 1.0
      });
    } else {
      this.throttle = Math.max(0, this.throttle - 2.0 * dt);
    }

    // Retro-brake thruster
    if (this.keys["ArrowDown"]) {
      this.vx *= 0.96;
      this.vy *= 0.96;
    }

    // In space: zero drag, slight drift damping
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.speed = Math.hypot(this.vx, this.vy);

    // Toroidal space wrapping
    if (this.canvas) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (this.x < -40) this.x = w + 40;
      if (this.x > w + 40) this.x = -40;
      if (this.y < -40) this.y = h + 40;
      if (this.y > h + 40) this.y = -40;
    }

    // Update Asteroids
    for (const a of this.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.vRot;

      if (this.canvas) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (a.x < -80) a.x = w + 80;
        if (a.x > w + 80) a.x = -80;
        if (a.y < -80) a.y = h + 80;
        if (a.y > h + 80) a.y = -80;
      }
    }

    // Update Dispatched Rovers
    for (let i = this.dispatchedRovers.length - 1; i >= 0; i--) {
      const r = this.dispatchedRovers[i];
      if (!r.landed) {
        r.progress += 0.4 * dt;
        r.x = r.x + (r.target.x - r.x) * 0.05;
        r.y = r.y + (r.target.y - r.y) * 0.05;

        // Descent smoke puffs
        this.particles.push({
          x: r.x,
          y: r.y,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          size: 3,
          color: "rgba(255, 200, 100, 0.7)",
          life: 0.6
        });

        if (r.progress >= 1.0 || Math.hypot(r.x - r.target.x, r.y - r.target.y) < 20) {
          r.landed = true;
          r.target.sampled = true;
          this.mineralsHarvested++;
          const pts = r.target.mineral.pts;
          this.pointsEarned += pts;

          if (typeof NASA_BANK !== "undefined") {
            NASA_BANK.pendingPoints += pts;
            NASA_BANK.updateUI();
          }

          const log = document.getElementById("asteroid-mission-log");
          if (log) {
            const entry = document.createElement("p");
            entry.className = "text-emerald-400 font-mono text-xs";
            entry.textContent = `[LANDING CONFIRMED] ${r.name} successfully touched down on ${r.target.name}! Drilled mineral vein: ${r.target.mineral.name}. (+${pts.toLocaleString()} NASA Points)`;
            log.prepend(entry);
          }

          if (typeof NASA_AUDIO !== "undefined") {
            NASA_AUDIO.playOrbitAchieved();
          }

          if (typeof showGameNotification === "function") {
            showGameNotification(`🎉 Asteroid Landing Confirmed!`, `${r.name} drilled ${r.target.mineral.name} on ${r.target.name}! +${pts.toLocaleString()} PTS credited to NASA Bank.`);
          }
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.8;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Dynamic Space GPS updates
    this.solarDistAU = 2.77 + Math.sin(Date.now() * 0.0001) * 0.05;
    this.earthDistMkm = 385.2 + (this.x * 0.01);
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Deep Cosmic Void & Nebular Cloud (Eagle Nebula violet-cyan gradient)
    const spaceGrad = ctx.createRadialGradient(w * 0.4, h * 0.5, 50, w * 0.5, h * 0.5, w * 0.8);
    spaceGrad.addColorStop(0, "#0a0a1f"); // dark cosmos
    spaceGrad.addColorStop(0.5, "#060914");
    spaceGrad.addColorStop(1, "#020308");
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Colorful Nebular Dust Veils
    ctx.save();
    ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.4, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(168, 85, 247, 0.03)";
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.6, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cosmic Stars
    for (const s of this.nebulaStars) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;

    // Draw Asteroids
    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      // Asteroid Body (Craggy, textured rock)
      const rockGrad = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, 2, 0, 0, a.r);
      rockGrad.addColorStop(0, "#94a3b8");
      rockGrad.addColorStop(0.7, "#475569");
      rockGrad.addColorStop(1, "#1e293b");

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
        ctx.arc(c.relX, c.relY, c.cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Mineral Vein Glimmer
      ctx.fillStyle = a.mineral.color;
      ctx.beginPath();
      ctx.arc(-a.r * 0.4, -a.r * 0.2, 3, 0, Math.PI * 2);
      ctx.arc(a.r * 0.3, a.r * 0.3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Label & Target Beacon
      ctx.fillStyle = a.sampled ? "#34d399" : "#cbd5e1";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(a.sampled ? `✓ ${a.name} [MINED]` : `${a.name} (${a.mineral.name.split(" ")[0]})`, a.x, a.y - a.r - 6);

      // Range line to closest asteroid
      const dist = Math.hypot(this.x - a.x, this.y - a.y);
      if (dist < 180 && !a.sampled) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Dispatched Rovers (Aeroshell landers descending to asteroids)
    for (const r of this.dispatchedRovers) {
      ctx.save();
      ctx.translate(r.x, r.y);
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
      ctx.fillText(r.landed ? `[LANDED ROVER]` : `[DESCENT ${Math.round(r.progress * 100)}%]`, r.x, r.y - 10);
    }

    // Draw Rocket Spacecraft
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading + Math.PI / 2);

    // Selected Rocket representation
    const rocketGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    rocketGrad.addColorStop(0, "#71717a");
    rocketGrad.addColorStop(0.5, "#ffffff");
    rocketGrad.addColorStop(1, "#52525b");

    // Hull
    ctx.fillStyle = rocketGrad;
    ctx.fillRect(-8, -25, 16, 50);

    // Nosecone
    ctx.beginPath();
    ctx.moveTo(-8, -25);
    ctx.lineTo(0, -42);
    ctx.lineTo(8, -25);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Payload Bay Door Hatch (Opens when rover deployed)
    ctx.fillStyle = this.roversDeployed > 0 ? "#0f172a" : "#334155";
    ctx.fillRect(-6, -15, 12, 18);
    ctx.strokeStyle = "#00e5ff";
    ctx.strokeRect(-6, -15, 12, 18);

    // Aerodynamic / Solar Wings
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-22, -4, 14, 10);
    ctx.fillRect(8, -4, 14, 10);

    // Engine Nozzle & Plume
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-6, 25, 12, 6);

    if (this.throttle > 0.05) {
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(-6, 31);
      ctx.lineTo(6, 31);
      ctx.lineTo(0, 31 + 25 * this.throttle + Math.random() * 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

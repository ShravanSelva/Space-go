// Mars Gale Crater Exploration & NASA Curiosity Rover Simulator with Real Sand Tracks

class MarsCuriosityRover {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    // Rover State
    this.x = 185;
    this.y = 140;
    this.heading = 0;       // radians (0 = facing right, driving down ramp from capsule)
    this.speed = 0;
    this.maxSpeed = 1.8;
    this.steerAngle = 0;
    this.samplesCollected = 0;
    this.pointsEarned = 0;

    // Landed Mars Entry Capsule location
    this.capsuleX = 95;
    this.capsuleY = 120;

    // Persistent Sand Tracks Buffer (Matching NASA Curiosity Navcam/Mastcam photo datasets)
    this.tracks = []; // Array of {x1, y1, x2, y2, angle, age}
    this.maxTracks = 1200;

    // EXACTLY 12 NASA Martian Geological Sample Sites (Clean full-width layout with ZERO HUD overlap!)
    this.rockTargets = [
      { rx: 0.34, ry: 0.16, x: 260, y: 90,  name: "1. Yellowknife Bay", science: "Ancient freshwater lake clay & organic carbon", points: 5000, sampled: false },
      { rx: 0.59, ry: 0.16, x: 430, y: 90,  name: "2. Cumberland Clay", science: "Smectite clay minerals with trapped argon", points: 6000, sampled: false },
      { rx: 0.83, ry: 0.16, x: 590, y: 90,  name: "3. Windjana Sandstone", science: "Cemented basaltic magnetite and titanomagnetite", points: 7000, sampled: false },
      { rx: 0.15, ry: 0.39, x: 120, y: 185, name: "4. Pahrump Hills", science: "Iron oxide crystalline precipitate from groundwater", points: 8000, sampled: false },
      { rx: 0.38, ry: 0.37, x: 280, y: 180, name: "5. Confidence Hills", science: "Phyllosilicates and cross-bedded olivine sands", points: 7500, sampled: false },
      { rx: 0.62, ry: 0.37, x: 440, y: 180, name: "6. Mount Sharp Sulfate", science: "Late-stage hydrated calcium sulfate evaporites", points: 12000, sampled: false },
      { rx: 0.85, ry: 0.39, x: 600, y: 185, name: "7. Mojave 2 Basalt", science: "Jarosite volcanic mineral indicating acid lake phases", points: 8500, sampled: false },
      { rx: 0.17, ry: 0.60, x: 140, y: 270, name: "8. Telegraph Peak", science: "Tridymite & cristobalite high-temperature silica", points: 9000, sampled: false },
      { rx: 0.40, ry: 0.58, x: 290, y: 265, name: "9. Buckskin Tridymite", science: "Explosive volcanic silicic magma signature", points: 9500, sampled: false },
      { rx: 0.63, ry: 0.58, x: 450, y: 265, name: "10. Okoruso Vein", science: "Fluorite-bearing bedrock with groundwater leaching", points: 8000, sampled: false },
      { rx: 0.84, ry: 0.60, x: 600, y: 270, name: "11. Duluth Bedrock", science: "Central crater floor uplift ancient basaltic crust", points: 10000, sampled: false },
      { rx: 0.50, ry: 0.78, x: 360, y: 340, name: "12. Kilmarie Shales", science: "High-grade clay mineral cache from Gale ancient lake", points: 11000, sampled: false }
    ];

    this.keys = {};
    this.targetX = null;
    this.targetY = null;
    this.hasTarget = false;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.initControls();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const w = (parent && parent.clientWidth > 100) ? parent.clientWidth : (window.innerWidth || 960);
    const h = (parent && parent.clientHeight > 100) ? parent.clientHeight : (Math.max(460, window.innerHeight - 130));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.updateSitePositions();
  }

  updateSitePositions() {
    if (!this.canvas) return;
    const w = this.canvas.width || 960;
    const h = this.canvas.height || 520;
    // Keep capsule in clear upper-left landing zone
    this.capsuleX = Math.max(72, Math.round(w * 0.11));
    this.capsuleY = Math.max(68, Math.round(h * 0.17));
    // Map all 12 rock sites evenly across the full unobstructed terrain
    // Top log is now outside the canvas; keep clear of bottom controls (y <= h - 145 except centered site 12)
    const padX = 76;
    const padTop = 58;
    const usableW = Math.max(240, w - padX * 2);
    const usableH = Math.max(200, h - padTop - 48);
    for (const rock of this.rockTargets) {
      rock.x = Math.round(padX + ((rock.rx - 0.15) / 0.70) * usableW);
      rock.y = Math.round(padTop + ((rock.ry - 0.16) / 0.64) * (usableH - 90));
      rock.x = Math.max(padX, Math.min(w - padX, rock.x));
      rock.y = Math.max(padTop, Math.min(h - 90, rock.y));
    }
    // Keep Site 12 centered cleanly between bottom-left controls and bottom-right D-Pad
    const site12 = this.rockTargets[11];
    if (site12) {
      site12.x = Math.round(w * 0.50);
      site12.y = Math.min(h - 62, Math.max(padTop + 140, Math.round(h * 0.76)));
    }
    // Keep rover within bounds too
    this.x = Math.max(40, Math.min(w - 40, this.x));
    this.y = Math.max(50, Math.min(h - 40, this.y));
  }

  initControls() {
    window.addEventListener("keydown", (e) => {
      if (document.getElementById("mars-bay") && document.getElementById("mars-bay").classList.contains("active")) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyE", "Space"].includes(e.code)) {
          e.preventDefault();
        }
        this.keys[e.code] = true;
        this.hasTarget = false;
        if (e.code === "KeyE" || e.code === "Space") {
          this.drillSample();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Touchscreen Canvas Tap-to-Drive
    if (this.canvas) {
      const handlePointer = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / (rect.width || 1);
        const scaleY = this.canvas.height / (rect.height || 1);
        this.targetX = (clientX - rect.left) * scaleX;
        this.targetY = (clientY - rect.top) * scaleY;
        this.hasTarget = true;
      };

      this.canvas.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) {
          handlePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      this.canvas.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) {
          handlePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      this.canvas.addEventListener("mousedown", (e) => {
        handlePointer(e.clientX, e.clientY);
      });
    }

    // On-Screen Touch D-Pad for iPad & Tablets
    const bindBtn = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => {
        if (e.cancelable) e.preventDefault();
        this.keys[keyName] = true;
        this.hasTarget = false;
      };
      const stop = (e) => {
        if (e.cancelable) e.preventDefault();
        this.keys[keyName] = false;
      };
      btn.addEventListener("touchstart", start, { passive: false });
      btn.addEventListener("touchend", stop, { passive: false });
      btn.addEventListener("mousedown", start);
      btn.addEventListener("mouseup", stop);
      btn.addEventListener("mouseleave", stop);
    };

    bindBtn("btn-touch-forward", "ArrowUp");
    bindBtn("btn-touch-reverse", "ArrowDown");
    bindBtn("btn-touch-left", "ArrowLeft");
    bindBtn("btn-touch-right", "ArrowRight");

    const drillBtn = document.getElementById("btn-touch-drill");
    if (drillBtn) {
      const doDrill = (e) => {
        if (e.cancelable) e.preventDefault();
        this.drillSample();
      };
      drillBtn.addEventListener("touchstart", doDrill, { passive: false });
      drillBtn.addEventListener("click", doDrill);
    }
  }

  update(dt) {
    // Touch Navigation Autopilot to Tap Target
    if (this.hasTarget && this.targetX != null && this.targetY != null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 18) {
        const desiredHeading = Math.atan2(dy, dx);
        let diff = desiredHeading - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += Math.sign(diff) * Math.min(Math.abs(diff), 2.8 * dt);
        this.speed = Math.min(this.maxSpeed, this.speed + 1.6 * dt);
      } else {
        this.hasTarget = false;
        this.speed *= 0.5;
        this.drillSample();
      }
    }

    // Steering & Speed
    if (this.keys["ArrowUp"]) {
      this.speed = Math.min(this.maxSpeed, this.speed + 1.2 * dt);
    } else if (this.keys["ArrowDown"]) {
      this.speed = Math.max(-this.maxSpeed * 0.6, this.speed - 1.2 * dt);
    } else {
      this.speed *= 0.92; // Martian friction deceleration
    }

    if (Math.abs(this.speed) > 0.05) {
      if (this.keys["ArrowLeft"]) this.heading -= 1.8 * dt;
      if (this.keys["ArrowRight"]) this.heading += 1.8 * dt;
    }

    // Previous wheel positions for track deposition
    const trackWidth = 26; // distance between left and right wheel sets
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);

    const oldLeftX = this.x - sinH * (trackWidth / 2);
    const oldLeftY = this.y + cosH * (trackWidth / 2);
    const oldRightX = this.x + sinH * (trackWidth / 2);
    const oldRightY = this.y - cosH * (trackWidth / 2);

    // Move Rover
    this.x += cosH * this.speed * 60 * dt;
    this.y += sinH * this.speed * 60 * dt;

    // Keep within bounds
    if (this.canvas) {
      this.x = Math.max(40, Math.min(this.canvas.width - 40, this.x));
      this.y = Math.max(80, Math.min(this.canvas.height - 40, this.y));
    }

    // Deposit Sand Tracks if moving
    if (Math.abs(this.speed) > 0.1) {
      const newLeftX = this.x - sinH * (trackWidth / 2);
      const newLeftY = this.y + cosH * (trackWidth / 2);
      const newRightX = this.x + sinH * (trackWidth / 2);
      const newRightY = this.y - cosH * (trackWidth / 2);

      this.tracks.push({
        x1: oldLeftX, y1: oldLeftY, x2: newLeftX, y2: newLeftY,
        angle: this.heading,
        side: "left"
      });
      this.tracks.push({
        x1: oldRightX, y1: oldRightY, x2: newRightX, y2: newRightY,
        angle: this.heading,
        side: "right"
      });

      if (this.tracks.length > this.maxTracks) {
        this.tracks.splice(0, 2);
      }
    }
  }

  drillSample() {
    // Check if near any scientific rock site
    for (const rock of this.rockTargets) {
      const dist = Math.hypot(this.x - rock.x, this.y - rock.y);
      if (dist < 55 && !rock.sampled) {
        rock.sampled = true;
        this.samplesCollected++;
        this.pointsEarned += rock.points;

        if (typeof NASA_BANK !== "undefined") {
          NASA_BANK.pendingPoints += rock.points;
          NASA_BANK.updateUI();
        }

        if (typeof NASA_AUDIO !== "undefined") {
          NASA_AUDIO.playOrbitAchieved();
        }

        const log = document.getElementById("rover-science-log");
        if (log) {
          const entry = document.createElement("p");
          entry.className = "text-emerald-400 font-mono text-xs";
          entry.textContent = `[SAMPLE ${this.samplesCollected}/12] Drilled ${rock.name}! Discovery: ${rock.science}. (+${rock.points.toLocaleString()} NASA Points)`;
          log.prepend(entry);
        }

        const countEl = document.getElementById("rover-samples-count");
        if (countEl) countEl.textContent = `${this.samplesCollected} / 12`;
        const pointsEl = document.getElementById("rover-points-earned");
        if (pointsEl) pointsEl.textContent = `+${this.pointsEarned.toLocaleString()} PTS`;

        if (typeof showGameNotification === "function") {
          showGameNotification(`🔬 Mars Sample ${this.samplesCollected}/12 Acquired!`, `${rock.name}: ${rock.science} (+${rock.points.toLocaleString()} PTS credited).`);
        }
        return;
      }
    }
    if (typeof showGameNotification === "function") {
      showGameNotification("⚠️ Target Out of Range", "Drive Curiosity closer to one of the 12 marked geological survey sites to drill!");
    }
  }

  reset() {
    this.x = 185;
    this.y = 140;
    this.heading = 0;
    this.speed = 0;
    this.tracks = [];
    this.samplesCollected = 0;
    this.pointsEarned = 0;
    for (const rock of this.rockTargets) {
      rock.sampled = false;
    }
    const countEl = document.getElementById("rover-samples-count");
    if (countEl) countEl.textContent = "0 / 12";
    const pointsEl = document.getElementById("rover-points-earned");
    if (pointsEl) pointsEl.textContent = "+0 PTS";
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    if (this.canvas.parentElement && this.canvas.parentElement.clientWidth > 100) {
      if (this.canvas.width !== this.canvas.parentElement.clientWidth || this.canvas.height !== this.canvas.parentElement.clientHeight) {
        this.resizeCanvas();
      }
    }
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Martian Surface Regolith (Gale Crater Sedimentary Clay)
    const redSandGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w);
    redSandGrad.addColorStop(0, "#c2542a");   // Martian oxidized hematite red
    redSandGrad.addColorStop(0.6, "#9e3d1b"); // Deep crater red-brown
    redSandGrad.addColorStop(1, "#66240d");   // Shadowed crater rim
    ctx.fillStyle = redSandGrad;
    ctx.fillRect(0, 0, w, h);

    // Sand dune ripples (textured Mars ground)
    ctx.fillStyle = "rgba(130, 40, 15, 0.25)";
    for (let r = 0; r < h; r += 24) {
      ctx.beginPath();
      ctx.ellipse(w / 2, r, w * 0.7, 4, 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. REALISTIC CURIOSITY WHEEL SAND TRACKS (NASA Mastcam Tread Pattern)
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    for (let i = 0; i < this.tracks.length; i++) {
      const t = this.tracks[i];
      // Dark subsurface basalt sand exposed by wheel displacement
      ctx.strokeStyle = "rgba(50, 16, 8, 0.65)";
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();

      // Tire tread chevrons (Curiosity's distinct wheel pattern)
      if (i % 3 === 0) {
        ctx.strokeStyle = "rgba(30, 8, 4, 0.85)";
        ctx.lineWidth = 2;
        const perpX = -Math.sin(t.angle) * 3;
        const perpY = Math.cos(t.angle) * 3;
        ctx.beginPath();
        ctx.moveTo(t.x1 - perpX, t.y1 - perpY);
        ctx.lineTo(t.x1 + perpX, t.y1 + perpY);
        ctx.stroke();
        ctx.lineWidth = 4.5;
      }
    }

    // 2. LANDED NASA MARS ENTRY CAPSULE (Aeroshell, Parachute & Deploy Ramp)
    const capX = this.capsuleX;
    const capY = this.capsuleY;

    // Ground scorch marks from retro-thruster landing burn
    ctx.fillStyle = "rgba(20, 8, 4, 0.65)";
    ctx.beginPath();
    ctx.ellipse(capX, capY, 52, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Supersonic orange-and-white descent parachute lying on Martian sand
    ctx.fillStyle = "rgba(245, 245, 245, 0.85)";
    ctx.beginPath();
    ctx.ellipse(capX - 58, capY - 24, 28, 16, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(234, 88, 12, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(capX - 40, capY - 18); ctx.lineTo(capX - 18, capY - 8);
    ctx.moveTo(capX - 48, capY - 12); ctx.lineTo(capX - 18, capY - 4);
    ctx.stroke();

    // Hexagonal Titanium Entry Capsule & Gold Thermal Mylar Blanket
    ctx.save();
    ctx.translate(capX, capY);
    ctx.fillStyle = "#f59e0b"; // gold thermal foil
    ctx.beginPath();
    ctx.moveTo(-30, -18);
    ctx.lineTo(30, -18);
    ctx.lineTo(36, 18);
    ctx.lineTo(-36, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Capsule Inner White Bay & Open Hatchway
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-20, -11, 40, 22);

    // Egress Ramp lowered to regolith surface
    const rampGrad = ctx.createLinearGradient(0, 0, 48, 0);
    rampGrad.addColorStop(0, "#475569");
    rampGrad.addColorStop(1, "#94a3b8");
    ctx.fillStyle = rampGrad;
    ctx.beginPath();
    ctx.moveTo(20, -7);
    ctx.lineTo(50, -7);
    ctx.lineTo(50, 7);
    ctx.lineTo(20, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.stroke();

    // Ramp tread grips
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let rx = 24; rx < 48; rx += 6) {
      ctx.beginPath();
      ctx.moveTo(rx, -7); ctx.lineTo(rx, 7);
      ctx.stroke();
    }

    // NASA Meatball & American Flag on Capsule Hull
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(-8, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(4, -8, 8, 5);

    ctx.restore();

    // Capsule Status Tag
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("🛸 LANDED MARS ENTRY CAPSULE", capX, capY - 28);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "8px monospace";
    ctx.fillText("[ROVER DISPATCHED TO SURFACE]", capX, capY - 18);

    // 3. Geological Rock Science Sites (All 12 clearly marked with high-contrast labels)
    for (const rock of this.rockTargets) {
      // Survey beacon circle
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = rock.sampled ? "#10b981" : "#facc15";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Martian Rock
      ctx.fillStyle = rock.sampled ? "#64748b" : "#451a03";
      ctx.beginPath();
      ctx.ellipse(rock.x, rock.y, 12, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // High-contrast label pill so every site name (1-12) is unmistakable
      const labelText = rock.sampled ? `✓ ${rock.name}` : `🔬 ${rock.name}`;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      const tw = ctx.measureText(labelText).width;
      ctx.fillStyle = "rgba(10, 15, 26, 0.78)";
      ctx.fillRect(rock.x - tw / 2 - 5, rock.y - 31, tw + 10, 15);
      ctx.fillStyle = rock.sampled ? "#34d399" : "#fef08a";
      ctx.fillText(labelText, rock.x, rock.y - 20);
    }

    // 4. DRAW CURIOSITY ROVER (NASA High-Fidelity Vector Sprite)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);

    // Rover Shadow
    ctx.fillStyle = "rgba(40, 10, 5, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 3, 26, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6x Aluminum Machined Wheels with Cleats
    ctx.fillStyle = "#1e293b"; // dark anodized rim
    const wheels = [
      { x: -16, y: -14 }, { x: 0, y: -15 }, { x: 16, y: -14 },
      { x: -16, y: 14 },  { x: 0, y: 15 },  { x: 16, y: 14 }
    ];
    for (const wPos of wheels) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(wPos.x - 4, wPos.y - 3, 8, 6);
      ctx.strokeStyle = "#0f172a";
      ctx.strokeRect(wPos.x - 4, wPos.y - 3, 8, 6);
    }

    // Rocker-Bogie Titanium Suspension Tubes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -14); ctx.lineTo(0, -5); ctx.lineTo(16, -14);
    ctx.moveTo(-16, 14);  ctx.lineTo(0, 5);  ctx.lineTo(16, 14);
    ctx.stroke();

    // Rover Main Equipment Deck (Gold Thermal Foil / White Deck)
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-14, -10, 28, 20);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.strokeRect(-14, -10, 28, 20);

    // Multi-Mission Radioisotope Thermoelectric Generator (MMRTG Nuclear Core at Aft)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-22, -6, 8, 12);
    // Cooling fins
    ctx.strokeStyle = "#e2e8f0";
    ctx.strokeRect(-22, -6, 8, 12);

    // Robotic Sampling Arm (Front Right)
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 5);
    ctx.lineTo(24, 7);
    ctx.lineTo(27, 2);
    ctx.stroke();
    // Drill turret head
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(25, 0, 5, 5);

    // Remote Sensing Mast (Mastcam Camera Head)
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(4, -8, 5, 5);
    // Twin Mastcam lenses
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(9, -8, 2, 0, Math.PI * 2);
    ctx.arc(9, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

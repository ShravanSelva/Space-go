// NASA Virtual Bank & Equipment Upgrade Shop

const NASA_BANK = {
  accountBalance: 880000000, // $880M in NASA Federal Reserve Bank Account
  walletBalance: 880000000,  // $880M in Active Vehicle & Launch Budget
  pendingPoints: 0,          // Mission Points earned from flights & rover sampling
  lastMissionReward: 0,
  
  upgrades: {
    finStabilizers: {
      id: "finStabilizers",
      name: "Aerodynamic Delta Fin Stabilizers",
      cost: 1000000, // $1.0M
      desc: "Reduces aerodynamic drag and atmospheric wobble during ascent.",
      purchased: false,
      apply(rocket) { rocket.cd = Math.max(0.18, rocket.cd * 0.8); }
    },
    sideBoosters: {
      id: "sideBoosters",
      name: "Detachable Side Thrusters (Stage 1 Boosters)",
      cost: 1000000, // $1.0M
      desc: "High-thrust detachable side thrusters that burn first and decouple cleanly.",
      purchased: false,
      apply(sim) { sim.boosterThrustMax *= 1.1; }
    },
    roverCapsule: {
      id: "roverCapsule",
      name: "Mars Entry Aeroshell Capsule & Curiosity Rover",
      cost: 2000000, // $2.0M
      desc: "Heat-shielded atmospheric entry capsule with sky-crane descent and rover payload.",
      purchased: false
    },
    liquidCrystalEngine: {
      id: "liquidCrystalEngine",
      name: "Liquid Crystal Propellant Engine (LCPX)",
      cost: 1500000, // $1.5M
      desc: "Pre-inbuilt photonic liquid crystal propulsion with 1,850s specific impulse.",
      purchased: false
    },
    standardEngines: {
      id: "standardEngines",
      name: "Secondary Chemical & NTP Propellant Engines",
      cost: 1000000, // $1.0M
      desc: "Hydrolox, Methalox, and Nuclear Thermal auxiliary thrusters.",
      purchased: false
    },
    rcsWheels: {
      id: "rcsWheels",
      name: "Titanium RCS Reaction Wheels",
      cost: 800000,
      desc: "Doubles steering sensitivity and attitude control authority.",
      purchased: false,
      apply(sim) { sim.turnRate = 45.0; }
    }
  },

  // Reset all upgrades so player owns nothing on return/restart
  resetUpgrades() {
    Object.values(this.upgrades).forEach(up => {
      up.purchased = false;
    });
    this.pendingPoints = 0;
    this.walletBalance = 880000000;
    this.accountBalance = 880000000;

    // Reset rocket drag coefficients in case fin stabilizers were applied
    if (typeof ROCKET_CATALOG !== "undefined") {
      if (ROCKET_CATALOG.sls) ROCKET_CATALOG.sls.cd = 0.32;
      if (ROCKET_CATALOG.saturn_v) ROCKET_CATALOG.saturn_v.cd = 0.35;
      if (ROCKET_CATALOG.starship) ROCKET_CATALOG.starship.cd = 0.29;
      if (ROCKET_CATALOG.falcon9) ROCKET_CATALOG.falcon9.cd = 0.27;
      if (ROCKET_CATALOG.custom) ROCKET_CATALOG.custom.cd = 0.30;
    }
    if (typeof sim !== "undefined" && sim) {
      sim.turnRate = 22.0;
    }

    this.updateUI();
    if (typeof updateSpecs === "function") updateSpecs();
    if (typeof renderVabRocket === "function") renderVabRocket();
  },

  // Claim NASA standard exploration grant (+$8.5 Million)
  claimNasaGrant() {
    const grant = 8500000; // $8.5M standard grant
    this.accountBalance += grant;
    this.walletBalance += grant;
    this.updateUI();
    if (typeof showGameNotification === "function") {
      showGameNotification("💵 NASA Grant Approved!", `+$8,500,000 ($8.5M) credited to Active Launch Budget!`);
    } else {
      alert("NASA Grant Approved: +$8,500,000 credited to account!");
    }
  },

  // Award points on successful orbit insertion or Mars landing
  awardMissionSuccess(targetKey) {
    let points = 5000;
    if (targetKey === "moon") points = 12000;
    if (targetKey === "mars") points = 25000;

    this.pendingPoints += points;
    this.lastMissionReward = points;
    this.updateUI();
  },

  depositPoints() {
    if (this.pendingPoints <= 0) {
      alert("No pending mission points! Successfully achieve orbit or sample Mars rocks first.");
      return;
    }
    const cashValue = this.pendingPoints * 1000; // $1,000 per point
    this.accountBalance += cashValue;
    this.walletBalance += cashValue;
    const deposited = this.pendingPoints;
    this.pendingPoints = 0;
    this.updateUI();
    if (typeof showGameNotification === "function") {
      showGameNotification("🏦 Points Deposited!", `Deposited ${deposited.toLocaleString()} PTS (+$${cashValue.toLocaleString()}) to Bank!`);
    } else {
      alert(`Success! Deposited ${deposited.toLocaleString()} NASA Mission Points and credited $${cashValue.toLocaleString()} to your Virtual Bank Account!`);
    }
  },

  withdrawMoney(amount) {
    if (amount <= 0) return;
    if (amount > this.accountBalance) {
      alert("Insufficient funds in your NASA Virtual Bank Account!");
      return;
    }
    this.accountBalance -= amount;
    this.walletBalance += amount;
    this.updateUI();
  },

  buyUpgrade(upgradeId) {
    const up = this.upgrades[upgradeId];
    if (!up) return;
    if (up.purchased) {
      alert("You already own this upgrade!");
      return;
    }
    if (this.walletBalance < up.cost) {
      alert(`Insufficient Active Wallet funds! You need $${up.cost.toLocaleString()} to buy ${up.name}.`);
      return;
    }

    this.walletBalance -= up.cost;
    up.purchased = true;
    this.updateUI();
    if (typeof showGameNotification === "function") {
      showGameNotification("🛒 Upgrade Equipped!", `Purchased ${up.name} for $${up.cost.toLocaleString()}!`);
    } else {
      alert(`Purchased: ${up.name}! This upgrade is now equipped on your rocket missions.`);
    }
  },

  updateUI() {
    const bankDisplay = document.getElementById("bank-balance-display");
    const walletDisplay = document.getElementById("wallet-balance-display");
    const pointsDisplay = document.getElementById("pending-points-display");
    const headerBudget = document.getElementById("nasa-budget-display");
    const bankWalletDisp = document.getElementById("bank-wallet-disp");

    if (bankDisplay) bankDisplay.textContent = `$${this.accountBalance.toLocaleString()}`;
    if (walletDisplay) walletDisplay.textContent = `$${this.walletBalance.toLocaleString()}`;
    if (headerBudget) headerBudget.textContent = `$${this.walletBalance.toLocaleString()}`;
    if (bankWalletDisp) bankWalletDisp.textContent = `$${this.walletBalance.toLocaleString()}`;
    if (pointsDisplay) {
      pointsDisplay.textContent = `${this.pendingPoints.toLocaleString()} PTS`;
      const depositBtn = document.getElementById("btn-deposit-points");
      if (depositBtn) {
        if (this.pendingPoints > 0) {
          depositBtn.classList.add("active-deposit");
          depositBtn.textContent = `DEPOSIT ${this.pendingPoints.toLocaleString()} PTS (+$${(this.pendingPoints * 1000).toLocaleString()})`;
          depositBtn.disabled = false;
        } else {
          depositBtn.classList.remove("active-deposit");
          depositBtn.textContent = "NO MISSION REWARD POINTS (COMPLETE FLIGHT FIRST)";
          depositBtn.disabled = true;
        }
      }
    }

    // Update upgrade buy buttons
    Object.values(this.upgrades).forEach(up => {
      const btn = document.getElementById(`btn-buy-${up.id}`);
      if (btn) {
        if (up.purchased) {
          btn.textContent = "EQUIPPED ✓";
          btn.disabled = true;
          btn.className = "btn-upgrade-bought";
        } else {
          btn.textContent = `BUY ($${(up.cost / 1000000).toFixed(1)}M)`;
          btn.disabled = false;
          btn.className = "btn-modal primary";
        }
      }
    });
  }
};

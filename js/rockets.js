// Rocket specifications, Propulsion systems, and Missions catalog

const ROCKET_CATALOG = {
  sls: {
    id: "sls",
    name: "NASA Space Launch System (SLS)",
    subtitle: "Artemis Mars Exploration Vehicle",
    dryMass: 208000,        // kg
    fuelMass: 2400000,      // kg
    height: 98,             // meters
    width: 8.4,             // meters
    defaultEngine: "liquid_crystal",
    cd: 0.32,
    crossArea: 55.4,
    colorScheme: {
      core: "#d47a32",      // Orange foam tank
      boosters: "#f0f0f0",  // White twin SRBs
      capsule: "#ffffff"
    },
    cost: 1500000,          // $1.5M NASA Artemis Heavy
    svgType: "sls"
  },
  saturn_v: {
    id: "saturn_v",
    name: "Apollo Saturn V",
    subtitle: "Heavy Mars Transit Configuration",
    dryMass: 230000,
    fuelMass: 2740000,
    height: 110.6,
    width: 10.1,
    defaultEngine: "liquid_crystal",
    cd: 0.35,
    crossArea: 80.0,
    colorScheme: {
      core: "#ffffff",
      stripes: "#111111"
    },
    cost: 1500000,          // $1.5M Apollo Lunar
    svgType: "saturn_v"
  },
  starship: {
    id: "starship",
    name: "Starship & Super Heavy",
    subtitle: "Direct Mars Colony Transporter",
    dryMass: 300000,
    fuelMass: 4700000,
    height: 121,
    width: 9.0,
    defaultEngine: "liquid_crystal",
    cd: 0.29,
    crossArea: 63.6,
    colorScheme: {
      core: "#c5c9ce",      // Stainless steel
      heatshield: "#111111"
    },
    cost: 1500000,          // $1.5M Reusable Super Heavy
    svgType: "starship"
  },
  falcon9: {
    id: "falcon9",
    name: "Falcon 9 Heavy Mars Edition",
    subtitle: "Deep Space Planetary Transport",
    dryMass: 29500,
    fuelMass: 519500,
    height: 70,
    width: 3.7,
    defaultEngine: "liquid_crystal",
    cd: 0.27,
    crossArea: 10.7,
    colorScheme: {
      core: "#ffffff",
      interstage: "#1a1a1a"
    },
    cost: 1500000,          // $1.5M Workhorse Booster
    svgType: "falcon9"
  },
  custom: {
    id: "custom",
    name: "Custom User-Designed Rocket",
    subtitle: "User Blueprint Upload",
    dryMass: 150000,
    fuelMass: 1850000,
    height: 85,
    width: 6.0,
    defaultEngine: "liquid_crystal",
    cd: 0.30,
    crossArea: 35.0,
    cost: 1500000,          // $1.5M Custom Prototype
    isCustomImage: true,
    customImageUrl: null,
    imageElement: null
  }
};

const PROPULSION_SYSTEMS = {
  liquid_crystal: {
    id: "liquid_crystal",
    name: "Liquid Crystal Propellant Engine (LCPX)",
    engineModel: "Pre-Inbuilt Photonic Liquid Crystal Core",
    cost: 1500000,          // $1.5M
    thrustSL: 48500000,     // Revolutionary high liftoff & space insertion thrust
    ispSL: 1850,            // Extreme specific impulse (liquid crystal photonic matrix)
    plumeColor: "rgba(168, 85, 247, 0.95)", // Glistening iridescent violet-cyan crystalline plume
    flameType: "liquid_crystal"
  },
  hydrolox: {
    id: "hydrolox",
    name: "Cryogenic Hydrolox (LH2 / LOX)",
    engineModel: "4x Aerojet Rocketdyne RS-25",
    cost: 1000000,          // $1.0M
    thrustSL: 39100000,     // Total combined Newtons at sea level
    ispSL: 452,             // seconds
    plumeColor: "rgba(100, 180, 255, 0.9)", // Pale blue / violet shock diamonds
    flameType: "hydrolox"
  },
  methalox: {
    id: "methalox",
    name: "Full-Flow Staged Methalox (CH4 / LOX)",
    engineModel: "33x SpaceX Raptor 3",
    cost: 1000000,          // $1.0M
    thrustSL: 72000000,
    ispSL: 380,
    plumeColor: "rgba(80, 220, 255, 0.95)", // Brilliant bright cyan / blue
    flameType: "methalox"
  },
  rp1: {
    id: "rp1",
    name: "Dense Kerosene RP-1 (RP-1 / LOX)",
    engineModel: "Rocketdyne F-1 / Merlin 1D",
    cost: 1000000,          // $1.0M
    thrustSL: 34500000,
    ispSL: 311,
    plumeColor: "rgba(255, 140, 20, 0.95)", // Fiery blazing orange-yellow
    flameType: "rp1"
  },
  solid: {
    id: "solid",
    name: "Solid Rocket Booster (Polybutadiene)",
    engineModel: "5-Segment Solid Rocket Motors",
    cost: 1000000,          // $1.0M
    thrustSL: 42000000,
    ispSL: 269,
    plumeColor: "rgba(255, 230, 180, 0.98)", // Smoky blinding bright white
    flameType: "solid"
  },
  nuclear: {
    id: "nuclear",
    name: "Nuclear Thermal Propulsion (NTP)",
    engineModel: "NASA DRACO Demonstration Core",
    cost: 1000000,          // $1.0M
    thrustSL: 15000000,
    ispSL: 900,             // Ultra-high efficiency
    plumeColor: "rgba(140, 90, 255, 0.95)", // Deep neon magenta/violet
    flameType: "nuclear"
  },
  ion: {
    id: "ion",
    name: "High-Power Hall-Effect Ion Thrusters",
    engineModel: "NASA NEXT-C Xenon Array",
    cost: 1000000,          // $1.0M
    thrustSL: 2500000,      // Low initial acceleration, extreme Isp
    ispSL: 3100,
    plumeColor: "rgba(0, 255, 200, 0.95)", // Electric teal glow
    flameType: "ion"
  }
};

const MISSION_TARGETS = {
  leo: {
    id: "leo",
    name: "Low Earth Orbit (LEO)",
    targetAlt: 250000,      // 250 km
    targetSpeed: 7750,      // m/s
    requiredDeltaV: 9400    // m/s accounting for gravity & drag losses
  },
  moon: {
    id: "moon",
    name: "Trans-Lunar Injection (Artemis)",
    targetAlt: 384400000,
    targetSpeed: 10900,
    requiredDeltaV: 12500
  },
  mars: {
    id: "mars",
    name: "Mars Transfer Orbit",
    targetAlt: 225000000000,
    targetSpeed: 11400,
    requiredDeltaV: 13800
  }
};

// NASA Physics & Orbital Mechanics Engine
const NASA_PHYSICS = {
  G: 6.67430e-11,                 // Gravitational constant
  EARTH_MASS: 5.972e24,           // kg
  EARTH_RADIUS: 6371000,          // meters (6,371 km)
  STANDARD_GRAVITY: 9.80665,      // m/s^2 at sea level
  AIR_DENSITY_SEA_LEVEL: 1.225,   // kg/m^3
  SCALE_HEIGHT: 8500,             // Earth atmosphere scale height (meters)
  KARMAN_LINE: 100000,            // 100 km boundary of space

  // Gravity at altitude h (meters)
  getGravity(altitude) {
    const r = this.EARTH_RADIUS + Math.max(0, altitude);
    return (this.G * this.EARTH_MASS) / (r * r);
  },

  // Atmospheric density rho(h) in kg/m^3
  getAirDensity(altitude) {
    if (altitude > 140000) return 0.0;
    // Barometric isothermal approximation
    return this.AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / this.SCALE_HEIGHT);
  },

  // Dynamic Pressure Q = 0.5 * rho * v^2 (in Pascals)
  getDynamicPressure(altitude, speed) {
    const rho = this.getAirDensity(altitude);
    return 0.5 * rho * speed * speed;
  },

  // Aerodynamic Drag Force Fd = 0.5 * rho * v^2 * Cd * A
  getDragForce(altitude, speed, cd = 0.28, crossArea = 25.0) {
    const q = this.getDynamicPressure(altitude, speed);
    return q * cd * crossArea;
  },

  // Speed of sound at altitude (approximate standard atmosphere)
  getSpeedOfSound(altitude) {
    // Sea level ~340 m/s, drops in tropopause to ~295 m/s, rises slightly in stratosphere
    if (altitude < 11000) return 340.0 - (altitude / 11000) * 45.0;
    if (altitude < 25000) return 295.0;
    return 300.0;
  },

  // Orbital speed needed for a circular orbit at altitude h
  getCircularOrbitSpeed(altitude) {
    const r = this.EARTH_RADIUS + altitude;
    return Math.sqrt((this.G * this.EARTH_MASS) / r);
  },

  // Tsiolkovsky Rocket Equation Delta-V = Isp * g0 * ln(m0 / mf)
  calculateDeltaV(isp, wetMass, dryMass) {
    if (dryMass <= 0 || wetMass <= dryMass) return 0;
    return isp * this.STANDARD_GRAVITY * Math.log(wetMass / dryMass);
  },

  // Calculate Apoapsis from current state (simplified orbital energy)
  calculateApoapsis(altitude, speed, flightAngleRad) {
    const r = this.EARTH_RADIUS + altitude;
    const mu = this.G * this.EARTH_MASS;
    const specificEnergy = (speed * speed) / 2.0 - mu / r;

    if (specificEnergy >= 0) return Infinity; // Hyperbolic / escape trajectory

    const semiMajorAxis = -mu / (2.0 * specificEnergy);
    // Specific angular momentum h = r * v * sin(pitch)
    const h = r * speed * Math.sin(flightAngleRad);
    const eccentricity = Math.sqrt(Math.max(0, 1 + (2.0 * specificEnergy * h * h) / (mu * mu)));
    const ra = semiMajorAxis * (1.0 + eccentricity);
    return Math.max(altitude, ra - this.EARTH_RADIUS);
  }
};

const DEFAULT_ENVIRONMENT = {
  rho: 1.225,
  gravity: 9.81,
  Cd: 0.47,
  projectileArea: 0.01,
  mass: 0.145,
  dt: 0.01,
  maxTime: 10
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeDragForce(velocityMagnitude, environment = {}) {
  const rho = Number(environment.rho ?? DEFAULT_ENVIRONMENT.rho) || DEFAULT_ENVIRONMENT.rho;
  const Cd = Number(environment.Cd ?? DEFAULT_ENVIRONMENT.Cd) || DEFAULT_ENVIRONMENT.Cd;
  const area = Number(environment.projectileArea ?? DEFAULT_ENVIRONMENT.projectileArea) || DEFAULT_ENVIRONMENT.projectileArea;
  const speed = Math.max(velocityMagnitude, 1e-9);
  return 0.5 * rho * speed * speed * Cd * area;
}

function computeAcceleration(velocity, environment = {}) {
  const gravity = Number(environment.gravity ?? DEFAULT_ENVIRONMENT.gravity) || DEFAULT_ENVIRONMENT.gravity;
  const mass = Number(environment.mass ?? DEFAULT_ENVIRONMENT.mass) || DEFAULT_ENVIRONMENT.mass;
  const rho = Number(environment.rho ?? DEFAULT_ENVIRONMENT.rho) || DEFAULT_ENVIRONMENT.rho;
  const Cd = Number(environment.Cd ?? DEFAULT_ENVIRONMENT.Cd) || DEFAULT_ENVIRONMENT.Cd;
  const area = Number(environment.projectileArea ?? DEFAULT_ENVIRONMENT.projectileArea) || DEFAULT_ENVIRONMENT.projectileArea;

  const speed = Math.hypot(velocity.x, velocity.y, velocity.z || 0);
  const dragMagnitude = computeDragForce(speed, environment);
  const dragScale = dragMagnitude / (mass * Math.max(speed, 1e-9));

  return {
    ax: -dragScale * velocity.x,
    ay: -dragScale * velocity.y - gravity,
    az: -dragScale * (velocity.z || 0)
  };
}

function integrateBallistics(initialState = {}, environment = {}) {
  const dt = Number(environment.dt ?? DEFAULT_ENVIRONMENT.dt) || DEFAULT_ENVIRONMENT.dt;
  const maxTime = Number(environment.maxTime ?? DEFAULT_ENVIRONMENT.maxTime) || DEFAULT_ENVIRONMENT.maxTime;
  const mass = Number(environment.mass ?? DEFAULT_ENVIRONMENT.mass) || DEFAULT_ENVIRONMENT.mass;

  const state = {
    x: Number(initialState.x ?? 0) || 0,
    y: Number(initialState.y ?? 0) || 0,
    z: Number(initialState.z ?? 0) || 0,
    vx: Number(initialState.vx ?? 0) || 0,
    vy: Number(initialState.vy ?? 0) || 0,
    vz: Number(initialState.vz ?? 0) || 0,
    time: 0,
    altitude: Number(initialState.y ?? 0) || 0,
    speed: 0,
    dragForce: 0,
    status: 'active'
  };

  const trajectory = [];
  const steps = Math.ceil(maxTime / dt);

  for (let i = 0; i < steps; i += 1) {
    const acceleration = computeAcceleration({ x: state.vx, y: state.vy, z: state.vz }, environment);
    const accelerationMagnitude = Math.hypot(acceleration.ax, acceleration.ay, acceleration.az);

    const nextVx = state.vx + acceleration.ax * dt;
    const nextVy = state.vy + acceleration.ay * dt;
    const nextVz = state.vz + acceleration.az * dt;
    const nextX = state.x + nextVx * dt;
    const nextY = state.y + nextVy * dt;
    const nextZ = state.z + nextVz * dt;

    const nextSpeed = Math.hypot(nextVx, nextVy, nextVz);
    const dragForce = computeDragForce(nextSpeed, environment);

    state.vx = nextVx;
    state.vy = nextVy;
    state.vz = nextVz;
    state.x = nextX;
    state.y = nextY;
    state.z = nextZ;
    state.time += dt;
    state.altitude = state.y;
    state.speed = nextSpeed;
    state.dragForce = dragForce;

    trajectory.push({
      time: state.time,
      x: state.x,
      y: state.y,
      z: state.z,
      vx: state.vx,
      vy: state.vy,
      vz: state.vz,
      speed: state.speed,
      dragForce: state.dragForce,
      accelerationMagnitude,
      status: state.y < 0 ? 'ground_hit' : 'active'
    });

    if (state.y < 0) {
      state.status = 'ground_hit';
      break;
    }
  }

  return {
    environment: {
      ...DEFAULT_ENVIRONMENT,
      ...environment
    },
    initialState: { ...state, time: 0 },
    finalState: { ...state },
    trajectory,
    range: state.x,
    maxHeight: Math.max(0, ...trajectory.map(point => point.y)),
    impactTime: state.time,
    mass,
    summary: {
      peakHeight: Math.max(0, ...trajectory.map(point => point.y)),
      flightTime: state.time,
      totalDistance: state.x,
      terminalSpeed: state.speed
    },
    status: state.status
  };
}

function solveProjectileTrajectory(initialState = {}, environment = {}) {
  return integrateBallistics(initialState, environment);
}

export {
  DEFAULT_ENVIRONMENT,
  clamp,
  computeDragForce,
  computeAcceleration,
  integrateBallistics,
  solveProjectileTrajectory
};

import { solveProjectileTrajectory } from './projectileMath.js';

const DEFAULT_PROJECTILE_STATE = Object.freeze({
  launchSpeed: 40,
  launchAngle: 45,
  projectileType: 'SPHERE',
  mass: 5,
  dragCoefficient: 0.47,
  projectileArea: 0.01,
  gravity: 9.81,
  rho: 1.225,
  dt: 0.01,
  maxTime: 10,
  trajectory: [],
  result: null,
  lastUpdatedAt: null
});

let state = {
  ...DEFAULT_PROJECTILE_STATE
};

function cloneState() {
  return {
    ...state,
    trajectory: Array.isArray(state.trajectory) ? [...state.trajectory] : [],
    result: state.result ? { ...state.result } : null
  };
}

function resetProjectileState() {
  state = {
    ...DEFAULT_PROJECTILE_STATE,
    trajectory: [],
    result: null,
    lastUpdatedAt: null
  };
  return cloneState();
}

function getProjectileState() {
  return cloneState();
}

function setProjectileConfig(patch = {}) {
  state = {
    ...state,
    ...patch
  };
  return cloneState();
}

function updateProjectileParameter(key, value) {
  if (!Object.prototype.hasOwnProperty.call(state, key)) {
    return cloneState();
  }

  const nextValue = value;
  state = {
    ...state,
    [key]: nextValue
  };
  return cloneState();
}

function computeTrajectory() {
  const launchSpeed = Number(state.launchSpeed ?? DEFAULT_PROJECTILE_STATE.launchSpeed) || DEFAULT_PROJECTILE_STATE.launchSpeed;
  const launchAngle = Number(state.launchAngle ?? DEFAULT_PROJECTILE_STATE.launchAngle) || DEFAULT_PROJECTILE_STATE.launchAngle;
  const launchAngleRadians = (launchAngle * Math.PI) / 180;
  const initialState = {
    x: 0,
    y: 0,
    z: 0,
    vx: launchSpeed * Math.cos(launchAngleRadians),
    vy: launchSpeed * Math.sin(launchAngleRadians),
    vz: 0
  };

  const environment = {
    rho: Number(state.rho ?? DEFAULT_PROJECTILE_STATE.rho) || DEFAULT_PROJECTILE_STATE.rho,
    gravity: Number(state.gravity ?? DEFAULT_PROJECTILE_STATE.gravity) || DEFAULT_PROJECTILE_STATE.gravity,
    Cd: Number(state.dragCoefficient ?? DEFAULT_PROJECTILE_STATE.dragCoefficient) || DEFAULT_PROJECTILE_STATE.dragCoefficient,
    projectileArea: Number(state.projectileArea ?? DEFAULT_PROJECTILE_STATE.projectileArea) || DEFAULT_PROJECTILE_STATE.projectileArea,
    mass: Number(state.mass ?? DEFAULT_PROJECTILE_STATE.mass) || DEFAULT_PROJECTILE_STATE.mass,
    dt: Number(state.dt ?? DEFAULT_PROJECTILE_STATE.dt) || DEFAULT_PROJECTILE_STATE.dt,
    maxTime: Number(state.maxTime ?? DEFAULT_PROJECTILE_STATE.maxTime) || DEFAULT_PROJECTILE_STATE.maxTime
  };

  const result = solveProjectileTrajectory(initialState, environment);
  state = {
    ...state,
    trajectory: Array.isArray(result.trajectory) ? result.trajectory : [],
    result,
    lastUpdatedAt: Date.now()
  };
  return cloneState();
}

function setProjectileState(nextState = {}) {
  state = {
    ...DEFAULT_PROJECTILE_STATE,
    ...state,
    ...nextState
  };
  return cloneState();
}

function getTrajectory() {
  return Array.isArray(state.trajectory) ? [...state.trajectory] : [];
}

const projectileStateApi = Object.freeze({
  getProjectileState,
  setProjectileConfig,
  updateProjectileParameter,
  computeTrajectory,
  getTrajectory,
  resetProjectileState,
  setProjectileState
});

export {
  DEFAULT_PROJECTILE_STATE,
  getProjectileState,
  setProjectileConfig,
  updateProjectileParameter,
  computeTrajectory,
  getTrajectory,
  resetProjectileState,
  setProjectileState,
  projectileStateApi
};

export default projectileStateApi;

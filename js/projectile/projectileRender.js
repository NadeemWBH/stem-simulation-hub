const PROJECTILE_RENDER_THEME = {
  bg: '#020617',
  grid: '#334155',
  baseline: '#f8fafc',
  launchPad: '#f59e0b',
  trajectory: '#38bdf8',
  marker: '#22c55e',
  text: '#e2e8f0',
  muted: '#94a3b8'
};

function drawGrid(context, width, height, spacing = 50) {
  context.save();
  context.strokeStyle = PROJECTILE_RENDER_THEME.grid;
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += spacing) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}

function drawGround(context, width, height) {
  context.save();
  context.strokeStyle = PROJECTILE_RENDER_THEME.baseline;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(0, height - 40);
  context.lineTo(width, height - 40);
  context.stroke();

  context.fillStyle = PROJECTILE_RENDER_THEME.launchPad;
  context.fillRect(56, height - 42, 78, 18);
  context.fillStyle = PROJECTILE_RENDER_THEME.text;
  context.font = '12px sans-serif';
  context.fillText('Launch Pad', 58, height - 24);
  context.restore();
}

function drawLaunchCannon(context, width, height) {
  context.save();
  context.translate(96, height - 42);
  context.fillStyle = PROJECTILE_RENDER_THEME.launchPad;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(32, -24);
  context.lineTo(54, -12);
  context.lineTo(20, 10);
  context.closePath();
  context.fill();

  context.fillStyle = PROJECTILE_RENDER_THEME.text;
  context.beginPath();
  context.arc(0, 0, 8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function projectPoint(point, width, height, bounds = {}) {
  const xScale = Number(bounds.xScale ?? 1) || 1;
  const yScale = Number(bounds.yScale ?? 1) || 1;
  const originX = Number(bounds.originX ?? 90) || 90;
  const originY = Number(bounds.originY ?? (height - 40)) || (height - 40);
  const x = originX + point.x * xScale;
  const y = originY - point.y * yScale;
  return { x, y };
}

function drawTrajectory(context, trajectory = [], width, height, options = {}) {
  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return null;
  }

  const xScale = Number(options.xScale ?? 0.8) || 0.8;
  const yScale = Number(options.yScale ?? 0.8) || 0.8;
  const originX = Number(options.originX ?? 90) || 90;
  const originY = Number(options.originY ?? (height - 40)) || (height - 40);

  context.save();
  context.strokeStyle = PROJECTILE_RENDER_THEME.trajectory;
  context.lineWidth = 2.5;
  context.beginPath();

  trajectory.forEach((point, index) => {
    const projected = projectPoint({ x: point.x, y: point.y }, width, height, { xScale, yScale, originX, originY });
    if (index === 0) {
      context.moveTo(projected.x, projected.y);
    } else {
      context.lineTo(projected.x, projected.y);
    }
  });

  context.stroke();
  context.restore();

  const lastPoint = trajectory[trajectory.length - 1];
  if (lastPoint) {
    const projectedLast = projectPoint({ x: lastPoint.x, y: lastPoint.y }, width, height, { xScale, yScale, originX, originY });
    context.save();
    context.fillStyle = PROJECTILE_RENDER_THEME.marker;
    context.beginPath();
    context.arc(projectedLast.x, projectedLast.y, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  return { xScale, yScale, originX, originY };
}

function renderProjectileScene(canvasId = 'projectileCanvas', trajectory = [], options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  const width = Number(canvas.width) || 900;
  const height = Number(canvas.height) || 560;

  context.clearRect(0, 0, width, height);
  context.fillStyle = PROJECTILE_RENDER_THEME.bg;
  context.fillRect(0, 0, width, height);

  drawGrid(context, width, height, 48);
  drawGround(context, width, height);
  drawLaunchCannon(context, width, height);
  drawTrajectory(context, trajectory, width, height, options);

  context.save();
  context.fillStyle = PROJECTILE_RENDER_THEME.text;
  context.font = '13px sans-serif';
  context.fillText('Ballistics Workspace', 18, 22);
  context.restore();

  return { width, height };
}

export {
  PROJECTILE_RENDER_THEME,
  drawGrid,
  drawGround,
  drawLaunchCannon,
  projectPoint,
  drawTrajectory,
  renderProjectileScene
};

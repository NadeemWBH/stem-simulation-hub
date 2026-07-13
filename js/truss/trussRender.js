const VISUAL_THEME = {
  canvasBackground: '#020617',
  grid: '#334155',
  gridStrong: '#475569',
  nodeFill: '#0f172a',
  nodeStroke: '#e2e8f0',
  selected: '#38bdf8',
  pin: '#f59e0b',
  roller: '#22c55e',
  loadVector: '#f87171',
  tension: '#0ea5e9',
  stable: '#22c55e',
  failure: '#f43f5e',
  text: '#e2e8f0',
  muted: '#94a3b8'
};

function drawGrid(context, width, height, options = {}) {
  const { spacing = 50, showAxes = true, snap = false } = options;
  context.save();
  context.strokeStyle = VISUAL_THEME.grid;
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

  if (showAxes) {
    context.strokeStyle = VISUAL_THEME.gridStrong;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
  }

  if (snap) {
    context.fillStyle = VISUAL_THEME.muted;
    context.font = '11px sans-serif';
    context.fillText('Snap enabled', 12, 22);
  }
  context.restore();
}

function drawPinSupport(context, x, y, size = 16, color = VISUAL_THEME.pin) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(-size, size);
  context.lineTo(0, -size);
  context.lineTo(size, size);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(0, 0, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawRollerSupport(context, x, y, size = 14, color = VISUAL_THEME.roller) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, size, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(-size, size + 4);
  context.lineTo(size, size + 4);
  context.stroke();
  context.beginPath();
  context.moveTo(-size + 3, size + 10);
  context.lineTo(size - 3, size + 10);
  context.stroke();
  context.restore();
}

function drawLoadVector(context, node, scale = 1.0) {
  const { x, y, loadX = 0, loadY = 0 } = node || {};
  const magnitude = Math.hypot(loadX, loadY);
  if (magnitude < 1e-6) return;

  const arrowX = (loadX / Math.max(magnitude, 1)) * 35 * scale;
  const arrowY = (loadY / Math.max(magnitude, 1)) * 35 * scale;

  context.save();
  context.strokeStyle = VISUAL_THEME.loadVector;
  context.fillStyle = VISUAL_THEME.loadVector;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + arrowX, y + arrowY);
  context.stroke();

  const angle = Math.atan2(arrowY, arrowX);
  context.beginPath();
  context.moveTo(x + arrowX, y + arrowY);
  context.lineTo(x + arrowX - 8 * Math.cos(angle - Math.PI / 6), y + arrowY - 8 * Math.sin(angle - Math.PI / 6));
  context.lineTo(x + arrowX - 8 * Math.cos(angle + Math.PI / 6), y + arrowY - 8 * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

function getMemberColor(member, analysisData = {}) {
  if (!member) return VISUAL_THEME.stable;
  const analysisEntry = Array.isArray(analysisData.members)
    ? analysisData.members.find(item => item.id === member.id)
    : null;
  const status = analysisEntry?.status || member.status || 'SAFE';
  const force = analysisEntry?.force != null ? Number(analysisEntry.force) : Number(member.force) || 0;

  if (status === 'FAILURE') return VISUAL_THEME.failure;
  if (force > 0) return VISUAL_THEME.tension;
  return VISUAL_THEME.stable;
}

function drawMember(context, start, end, member, isSelected, analysisData = {}) {
  const color = getMemberColor(member, analysisData);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = isSelected ? 6 : 3;
  if (member?.status === 'FAILURE') {
    context.setLineDash([6, 4]);
  } else {
    context.setLineDash([]);
  }
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  context.save();
  context.fillStyle = VISUAL_THEME.text;
  context.font = '12px sans-serif';
  context.fillText(member.id, midX + 6, midY - 8);
  context.restore();
}

function renderWorkspace(canvasId, state, analysisResults = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = VISUAL_THEME.canvasBackground;
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height, { spacing: 50, showAxes: true, snap: true });

  const nodes = state?.nodes || [];
  const members = state?.members || [];
  const selectedNodeId = state?.selectedNodeId || null;
  const selectedMemberId = state?.selectedMemberId || null;

  members.forEach(member => {
    const start = nodes.find(node => node.id === member.a);
    const end = nodes.find(node => node.id === member.b);
    if (!start || !end) return;
    drawMember(context, start, end, member, member.id === selectedMemberId, analysisResults);
  });

  nodes.forEach(node => {
    const isSelected = node.id === selectedNodeId;
    context.beginPath();
    context.arc(node.x, node.y, isSelected ? 10 : 8, 0, Math.PI * 2);
    context.fillStyle = isSelected ? VISUAL_THEME.selected : VISUAL_THEME.nodeFill;
    context.strokeStyle = isSelected ? VISUAL_THEME.selected : VISUAL_THEME.nodeStroke;
    context.lineWidth = 2;
    context.fill();
    context.stroke();

    if (node.support === 'pin') {
      drawPinSupport(context, node.x, node.y, 12, VISUAL_THEME.pin);
    } else if (node.support === 'roller') {
      drawRollerSupport(context, node.x, node.y, 10, VISUAL_THEME.roller);
    }

    drawLoadVector(context, node, 1.0);

    context.save();
    context.fillStyle = VISUAL_THEME.text;
    context.font = '13px sans-serif';
    context.fillText(node.label || node.id, node.x + 10, node.y - 10);
    context.restore();
  });

  return { width, height };
}

export {
  VISUAL_THEME,
  drawGrid,
  drawPinSupport,
  drawRollerSupport,
  drawLoadVector,
  renderWorkspace
};

import {
  INITIAL_TOOL,
  setCurrentTool,
  getCurrentTool,
  getNodes,
  getMembers,
  getNodeById,
  getMemberById,
  addNode,
  addMember,
  deleteNode,
  deleteMember,
  setNodeBoundaryCondition,
  setNodeLoads,
  resetToDefault
} from './truss/trussState.js';
import { solveStructuralSystem } from './truss/trussMath.js';
import { renderWorkspace } from './truss/trussRender.js';

const APP_STATE = {
  activeModule: 'truss',
  activeTool: INITIAL_TOOL,
  selectedNodeId: null,
  selectedMemberId: null,
  pendingNodeId: null,
  inspectorOpen: true
};

let workspaceCanvas = null;
let analysisSummary = null;
let inspectionContent = null;
let toolIndicator = null;
let hintText = null;

function initApp() {
  analysisSummary = document.getElementById('analysisSummary');
  inspectionContent = document.getElementById('inspectionContent');
  toolIndicator = document.getElementById('toolIndicator');
  hintText = document.querySelector('.hint');

  ensureModuleNav();
  bindModuleNav();
  bindTrussToolButtons();
  bindTrussActionButtons();
  bindCanvasInteractions();
  bindInspectorDrawer();
  initializeTrussWorkspace();
  activateModule('truss');
}

function ensureModuleNav() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  if (document.querySelector('.module-nav')) return;

  const nav = document.createElement('div');
  nav.className = 'module-nav';
  nav.innerHTML = `
    <button class="module-nav-btn active" data-module-nav="truss">Truss Simulator</button>
    <button class="module-nav-btn" data-module-nav="projectile">Projectile Motion</button>
    <button class="module-nav-btn" data-module-nav="orbital">Orbital Mechanics</button>
  `;
  topbar.insertBefore(nav, topbar.firstChild);
}

function bindModuleNav() {
  document.querySelectorAll('[data-module-nav]').forEach(button => {
    button.addEventListener('click', () => activateModule(button.dataset.moduleNav));
  });
}

function bindTrussToolButtons() {
  document.querySelectorAll('.tool-btn').forEach(button => {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      setCurrentTool(tool);
      APP_STATE.activeTool = tool;
      APP_STATE.pendingNodeId = null;
      updateToolButtonState();
      updateToolIndicator();
      if (hintText) {
        hintText.textContent = `Active tool: ${tool}`;
      }
    });
  });
}

function bindTrussActionButtons() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      syncTrussView();
    });
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToDefault();
      APP_STATE.selectedNodeId = null;
      APP_STATE.selectedMemberId = null;
      APP_STATE.pendingNodeId = null;
      syncTrussView();
    });
  }

  const exampleBtn = document.getElementById('exampleBtn');
  if (exampleBtn) {
    exampleBtn.addEventListener('click', () => {
      resetToDefault();
      APP_STATE.selectedNodeId = null;
      APP_STATE.selectedMemberId = null;
      APP_STATE.pendingNodeId = null;
      syncTrussView();
    });
  }
}

function bindCanvasInteractions() {
  const canvasContainer = document.querySelector('.canvas-wrap');
  if (!canvasContainer) return;

  const canvas = document.getElementById('trussCanvas');
  if (!canvas) return;
  workspaceCanvas = canvas;

  canvas.addEventListener('click', event => {
    if (APP_STATE.activeModule !== 'truss') return;
    const point = getCanvasPoint(event);
    const hit = hitTest(point);

    if (APP_STATE.activeTool === 'node') {
      const node = addNode(point.x, point.y);
      APP_STATE.selectedNodeId = node.id;
      APP_STATE.selectedMemberId = null;
      APP_STATE.pendingNodeId = null;
      syncTrussView();
      return;
    }

    if (APP_STATE.activeTool === 'delete') {
      if (hit?.type === 'node') {
        deleteNode(hit.id);
        APP_STATE.selectedNodeId = null;
        APP_STATE.selectedMemberId = null;
      } else if (hit?.type === 'member') {
        deleteMember(hit.id);
        APP_STATE.selectedNodeId = null;
        APP_STATE.selectedMemberId = null;
      }
      syncTrussView();
      return;
    }

    if (APP_STATE.activeTool === 'member') {
      if (hit?.type === 'node') {
        if (!APP_STATE.pendingNodeId) {
          APP_STATE.pendingNodeId = hit.id;
        } else if (APP_STATE.pendingNodeId !== hit.id) {
          const member = addMember(APP_STATE.pendingNodeId, hit.id);
          if (member) {
            APP_STATE.selectedMemberId = member.id;
            APP_STATE.selectedNodeId = null;
          }
          APP_STATE.pendingNodeId = null;
        }
      } else {
        APP_STATE.pendingNodeId = null;
      }
      syncTrussView();
      return;
    }

    if (APP_STATE.activeTool === 'select') {
      if (hit?.type === 'node') {
        APP_STATE.selectedNodeId = hit.id;
        APP_STATE.selectedMemberId = null;
      } else if (hit?.type === 'member') {
        APP_STATE.selectedMemberId = hit.id;
        APP_STATE.selectedNodeId = null;
      } else {
        APP_STATE.selectedNodeId = null;
        APP_STATE.selectedMemberId = null;
      }
      syncTrussView();
    }
  });
}

function bindInspectorDrawer() {
  const toggleInspectBtn = document.getElementById('toggleInspectBtn');
  const closeInspectBtn = document.getElementById('closeInspectBtn');
  const panel = document.getElementById('inspectionPanel');

  if (toggleInspectBtn && panel) {
    toggleInspectBtn.addEventListener('click', () => {
      APP_STATE.inspectorOpen = !APP_STATE.inspectorOpen;
      panel.classList.toggle('open', APP_STATE.inspectorOpen);
    });
  }

  if (closeInspectBtn && panel) {
    closeInspectBtn.addEventListener('click', () => {
      APP_STATE.inspectorOpen = false;
      panel.classList.remove('open');
    });
  }
}

function initializeTrussWorkspace() {
  const canvasContainer = document.querySelector('.canvas-wrap');
  if (!canvasContainer) return;

  let canvas = document.getElementById('trussCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'trussCanvas';
    canvas.width = 900;
    canvas.height = 560;
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(canvas);
  } else if (canvas.tagName.toLowerCase() !== 'canvas') {
    const replacement = document.createElement('canvas');
    replacement.id = 'trussCanvas';
    replacement.width = 900;
    replacement.height = 560;
    canvas.replaceWith(replacement);
    canvas = replacement;
  }

  workspaceCanvas = canvas;
  canvas.style.width = '100%';
  canvas.style.maxWidth = '980px';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';

  const nodes = getNodes();
  const members = getMembers();
  if (nodes.length === 0 && members.length === 0) {
    resetToDefault();
  }

  updateToolButtonState();
  updateToolIndicator();
  syncTrussView();
}

function activateModule(moduleName) {
  APP_STATE.activeModule = moduleName;
  document.querySelectorAll('.module-nav-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.moduleNav === moduleName);
  });

  if (moduleName === 'projectile') {
    initializeProjectileModule();
  } else if (moduleName === 'orbital') {
    initializeOrbitalModule();
  } else {
    initializeTrussWorkspace();
  }
}

function initializeProjectileModule() {
  if (hintText) {
    hintText.textContent = 'Projectile Motion placeholder ready — the trajectory simulator will initialize here next.';
  }
  if (analysisSummary) {
    analysisSummary.innerHTML = '<div class="stat-item"><span>Projectile Motion</span><strong>Coming soon</strong></div>';
  }
}

function initializeOrbitalModule() {
  if (hintText) {
    hintText.textContent = 'Orbital Mechanics placeholder ready — gravity wells and orbital planners will initialize here next.';
  }
  if (analysisSummary) {
    analysisSummary.innerHTML = '<div class="stat-item"><span>Orbital Mechanics</span><strong>Coming soon</strong></div>';
  }
}

function updateToolButtonState() {
  document.querySelectorAll('.tool-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.tool === getCurrentTool());
  });
}

function updateToolIndicator() {
  if (!toolIndicator) return;
  const label = (getCurrentTool() || INITIAL_TOOL).charAt(0).toUpperCase() + (getCurrentTool() || INITIAL_TOOL).slice(1);
  toolIndicator.textContent = `Tool: ${label}`;
}

function getCanvasPoint(event) {
  const rect = workspaceCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * workspaceCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * workspaceCanvas.height
  };
}

function hitTest(point) {
  const tolerance = 12;
  const nodes = getNodes();

  for (const node of nodes) {
    const dx = point.x - node.x;
    const dy = point.y - node.y;
    if (Math.hypot(dx, dy) <= tolerance) {
      return { type: 'node', id: node.id };
    }
  }

  const members = getMembers();
  for (const member of members) {
    const a = getNodeById(member.a);
    const b = getNodeById(member.b);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const px = point.x - a.x;
    const py = point.y - a.y;
    const projection = (px * dx + py * dy) / (dx * dx + dy * dy);
    const closestX = a.x + dx * projection;
    const closestY = a.y + dy * projection;
    const dist = Math.hypot(point.x - closestX, point.y - closestY);
    if (dist <= 10) {
      return { type: 'member', id: member.id };
    }
  }

  return null;
}

function syncTrussView() {
  if (APP_STATE.activeModule !== 'truss') return;

  const nodes = getNodes();
  const members = getMembers();
  const analysis = solveStructuralSystem(nodes, members);
  const renderState = {
    nodes,
    members,
    selectedNodeId: APP_STATE.selectedNodeId,
    selectedMemberId: APP_STATE.selectedMemberId
  };

  const analysisMembers = (analysis.members || []).map(member => ({
    id: member.id,
    force: Number(member.force || 0).toFixed(2),
    stress: Number(member.stress || 0).toFixed(2),
    utilization: Number(member.utilization || 0).toFixed(2),
    status: member.status || 'SAFE'
  }));

  renderWorkspace('trussCanvas', renderState, { members: analysisMembers });
  updateAnalysisSummary(analysis, analysisMembers);
  renderInspectionPanel();
  updateToolIndicator();
}

function updateAnalysisSummary(analysis, analysisMembers) {
  if (!analysisSummary) return;
  analysisSummary.innerHTML = '';

  const summaryItem = document.createElement('div');
  summaryItem.className = 'stat-item';
  const summaryText = analysis?.summary?.memberCount != null
    ? `${analysis.summary.memberCount} members · ${analysis.summary.failures} failure(s)`
    : 'Ready for analysis';
  summaryItem.innerHTML = `<span>${summaryText}</span>`;
  analysisSummary.appendChild(summaryItem);

  analysisMembers.forEach(member => {
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<span>${member.id}</span><strong>${member.force} kN · ${member.status}</strong>`;
    analysisSummary.appendChild(item);
  });
}

function renderInspectionPanel() {
  if (!inspectionContent) return;

  if (APP_STATE.selectedNodeId) {
    const node = getNodeById(APP_STATE.selectedNodeId);
    if (!node) {
      APP_STATE.selectedNodeId = null;
      return renderInspectionPanel();
    }

    inspectionContent.innerHTML = `
      <div class="panel-card">
        <h3>Node ${node.label}</h3>
        <label>Label
          <input id="nodeLabel" value="${node.label}" />
        </label>
        <label>Support
          <select id="nodeSupport">
            <option value="free" ${node.support === 'free' ? 'selected' : ''}>Free</option>
            <option value="pin" ${node.support === 'pin' ? 'selected' : ''}>Pin</option>
            <option value="roller" ${node.support === 'roller' ? 'selected' : ''}>Roller</option>
          </select>
        </label>
        <label>Load X (kN)
          <input id="nodeLoadX" type="number" step="0.5" value="${node.loadX}" />
        </label>
        <label>Load Y (kN)
          <input id="nodeLoadY" type="number" step="0.5" value="${node.loadY}" />
        </label>
      </div>
    `;

    const labelInput = inspectionContent.querySelector('#nodeLabel');
    if (labelInput) {
      labelInput.addEventListener('input', event => {
        node.label = event.target.value;
        syncTrussView();
      });
    }

    const supportSelect = inspectionContent.querySelector('#nodeSupport');
    if (supportSelect) {
      supportSelect.addEventListener('change', event => {
        setNodeBoundaryCondition(node.id, event.target.value);
        syncTrussView();
      });
    }

    const loadXInput = inspectionContent.querySelector('#nodeLoadX');
    if (loadXInput) {
      loadXInput.addEventListener('input', event => {
        setNodeLoads(node.id, event.target.value, node.loadY);
        syncTrussView();
      });
    }

    const loadYInput = inspectionContent.querySelector('#nodeLoadY');
    if (loadYInput) {
      loadYInput.addEventListener('input', event => {
        setNodeLoads(node.id, node.loadX, event.target.value);
        syncTrussView();
      });
    }
    return;
  }

  if (APP_STATE.selectedMemberId) {
    const member = getMemberById(APP_STATE.selectedMemberId);
    if (!member) {
      APP_STATE.selectedMemberId = null;
      return renderInspectionPanel();
    }

    inspectionContent.innerHTML = `
      <div class="panel-card">
        <h3>Member ${member.id}</h3>
        <label>Material
          <input id="memberMaterial" value="${member.material}" />
        </label>
        <label>Area (m²)
          <input id="memberArea" type="number" step="0.0001" value="${member.area}" />
        </label>
        <label>Allowable Stress (MPa)
          <input id="memberAllowable" type="number" step="0.1" value="${member.allowableStress}" />
        </label>
      </div>
    `;

    const materialInput = inspectionContent.querySelector('#memberMaterial');
    if (materialInput) {
      materialInput.addEventListener('input', event => {
        member.material = event.target.value;
        syncTrussView();
      });
    }

    const areaInput = inspectionContent.querySelector('#memberArea');
    if (areaInput) {
      areaInput.addEventListener('input', event => {
        member.area = Number(event.target.value) || 0;
        syncTrussView();
      });
    }

    const allowableInput = inspectionContent.querySelector('#memberAllowable');
    if (allowableInput) {
      allowableInput.addEventListener('input', event => {
        member.allowableStress = Number(event.target.value) || 250;
        syncTrussView();
      });
    }
    return;
  }

  inspectionContent.innerHTML = '<p class="empty-state">Select a node or member to inspect its properties.</p>';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

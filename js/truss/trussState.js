const INITIAL_TOOL = 'select';

let currentTool = INITIAL_TOOL;
const nodes = [];
const members = [];

function nextId(prefix) {
  const existing = [...nodes, ...members]
    .map(entry => entry.id)
    .filter(id => typeof id === 'string' && id.startsWith(prefix));
  const numbers = existing
    .map(id => Number(id.replace(prefix, '')))
    .filter(value => Number.isFinite(value));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${next}`;
}

function setCurrentTool(tool) {
  currentTool = tool;
  return currentTool;
}

function getCurrentTool() {
  return currentTool;
}

function getNodes() {
  return nodes;
}

function getMembers() {
  return members;
}

function getNodeById(nodeId) {
  return nodes.find(node => node.id === nodeId) || null;
}

function getMemberById(memberId) {
  return members.find(member => member.id === memberId) || null;
}

function addNode(x, y) {
  const node = {
    id: nextId('n'),
    x: Number(x) || 0,
    y: Number(y) || 0,
    label: `N${nodes.length + 1}`,
    support: 'free',
    loadX: 0,
    loadY: 0
  };
  nodes.push(node);
  return node;
}

function addMember(nodeAId, nodeBId) {
  if (!nodeAId || !nodeBId || nodeAId === nodeBId) {
    return null;
  }

  const exists = members.some(member =>
    (member.a === nodeAId && member.b === nodeBId) ||
    (member.a === nodeBId && member.b === nodeAId)
  );
  if (exists) {
    return null;
  }

  const member = {
    id: nextId('m'),
    a: nodeAId,
    b: nodeBId,
    material: 'Structural Steel',
    profile: 'Solid Square',
    dimensions: { side: 0.05 },
    area: 0.0025,
    inertia: 1.0416666666666667e-7,
    allowableStress: 250,
    force: 0,
    stress: 0,
    utilization: 0,
    status: 'UNEVALUATED'
  };
  members.push(member);
  return member;
}

function deleteNode(nodeId) {
  const nodeIndex = nodes.findIndex(node => node.id === nodeId);
  if (nodeIndex < 0) {
    return false;
  }

  nodes.splice(nodeIndex, 1);
  for (let i = members.length - 1; i >= 0; i -= 1) {
    const member = members[i];
    if (member.a === nodeId || member.b === nodeId) {
      members.splice(i, 1);
    }
  }
  return true;
}

function deleteMember(memberId) {
  const memberIndex = members.findIndex(member => member.id === memberId);
  if (memberIndex < 0) {
    return false;
  }
  members.splice(memberIndex, 1);
  return true;
}

function setNodeBoundaryCondition(nodeId, support) {
  const node = getNodeById(nodeId);
  if (!node) return null;
  node.support = support;
  return node;
}

function setNodeLoads(nodeId, loadX, loadY) {
  const node = getNodeById(nodeId);
  if (!node) return null;
  node.loadX = Number(loadX) || 0;
  node.loadY = Number(loadY) || 0;
  return node;
}

function setMemberMaterial(memberId, material) {
  const member = getMemberById(memberId);
  if (!member) return null;
  member.material = material;
  return member;
}

function setMemberProfile(memberId, profile, dimensions = {}) {
  const member = getMemberById(memberId);
  if (!member) return null;
  member.profile = profile;
  member.dimensions = dimensions;
  return member;
}

function setMemberDimensions(memberId, dimensions) {
  const member = getMemberById(memberId);
  if (!member) return null;
  member.dimensions = { ...member.dimensions, ...dimensions };
  return member;
}

function clearAll() {
  nodes.splice(0, nodes.length);
  members.splice(0, members.length);
  currentTool = INITIAL_TOOL;
}

function resetToDefault() {
  clearAll();
  const left = addNode(180, 430);
  const right = addNode(520, 430);
  const top = addNode(350, 220);
  left.label = 'A';
  left.support = 'pin';
  right.label = 'B';
  right.support = 'roller';
  top.label = 'C';
  top.loadY = -8;
  addMember(left.id, right.id);
  addMember(left.id, top.id);
  addMember(top.id, right.id);
}

export {
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
  setMemberMaterial,
  setMemberProfile,
  setMemberDimensions,
  clearAll,
  resetToDefault
};

const MATERIALS_LIBRARY = {
  'Structural Steel': {
    E: 200,
    sigmaY: 250,
    rho: 7850,
    description: 'High-strength structural steel'
  },
  'Aerospace Aluminum': {
    E: 70,
    sigmaY: 280,
    rho: 2700,
    description: 'Lightweight aerospace grade aluminum'
  },
  'Titanium': {
    E: 116,
    sigmaY: 830,
    rho: 4500,
    description: 'High strength-to-weight titanium alloy'
  },
  'Carbon Fiber': {
    E: 70,
    sigmaY: 600,
    rho: 1600,
    description: 'Composite with excellent stiffness-to-weight'
  }
};

const BEAM_PROFILES = {
  'I-Beam': {
    compute: ({ width = 0.12, depth = 0.24, web = 0.008, flange = 0.012 } = {}) => {
      const area = 2 * width * flange + (depth - 2 * flange) * web;
      const inertia = (width * depth ** 3 - (width - web) * (depth - 2 * flange) ** 3) / 12;
      return { area, inertia, dimensions: { width, depth, web, flange } };
    }
  },
  'Hollow Tube': {
    compute: ({ outerDiameter = 0.05, wallThickness = 0.003 } = {}) => {
      const outerR = outerDiameter / 2;
      const innerR = outerR - wallThickness;
      const area = Math.PI * (outerR ** 2 - innerR ** 2);
      const inertia = Math.PI / 4 * (outerR ** 4 - innerR ** 4);
      return { area, inertia, dimensions: { outerDiameter, wallThickness } };
    }
  },
  'Solid Square': {
    compute: ({ side = 0.05 } = {}) => {
      const area = side * side;
      const inertia = side ** 4 / 12;
      return { area, inertia, dimensions: { side } };
    }
  }
};

function normalizeNodes(nodes = []) {
  return nodes.map(node => ({
    id: node.id,
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    support: node.support || 'free',
    loadX: Number(node.loadX) || 0,
    loadY: Number(node.loadY) || 0
  }));
}

function normalizeMembers(members = []) {
  return members.map(member => ({
    id: member.id,
    a: member.a,
    b: member.b,
    material: member.material || 'Structural Steel',
    profile: member.profile || 'Solid Square',
    dimensions: member.dimensions || {},
    area: Number(member.area) || 0,
    inertia: Number(member.inertia) || 0,
    allowableStress: Number(member.allowableStress) || 250
  }));
}

function buildGlobalStiffness(nodes, members) {
  const normalizedNodes = normalizeNodes(nodes);
  const normalizedMembers = normalizeMembers(members);
  const nodeCount = normalizedNodes.length;
  const size = 2 * nodeCount;
  const K = Array.from({ length: size }, () => Array(size).fill(0));

  const nodeIndex = new Map(normalizedNodes.map((node, idx) => [node.id, idx]));

  normalizedMembers.forEach(member => {
    const start = nodeIndex.get(member.a);
    const end = nodeIndex.get(member.b);
    if (start === undefined || end === undefined) return;

    const startNode = normalizedNodes[start];
    const endNode = normalizedNodes[end];
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-10) return;

    const c = dx / L;
    const s = dy / L;

    const profileConfig = BEAM_PROFILES[member.profile] || BEAM_PROFILES['Solid Square'];
    const material = MATERIALS_LIBRARY[member.material] || MATERIALS_LIBRARY['Structural Steel'];
    const computedGeometry = profileConfig.compute(member.dimensions || {});
    const area = member.area || computedGeometry.area;
    const inertia = member.inertia || computedGeometry.inertia;

    const effectiveArea = Math.max(area, 1e-6);
    const effectiveInertia = Math.max(inertia, 1e-12);
    const axialStiffness = (material.E * effectiveArea) / L;
    const bendingStiffness = (material.E * effectiveInertia) / (L ** 3);

    const local = [
      [axialStiffness * c ** 2 + bendingStiffness * s ** 2, axialStiffness * c * s - bendingStiffness * c * s],
      [axialStiffness * c * s - bendingStiffness * c * s, axialStiffness * s ** 2 + bendingStiffness * c ** 2]
    ];

    const transformation = [
      [c, s, 0, 0],
      [0, 0, c, s]
    ];

    const k = [
      [local[0][0], local[0][1]],
      [local[1][0], local[1][1]]
    ];

    const dofs = [
      [2 * start, 2 * start + 1],
      [2 * end, 2 * end + 1]
    ];

    const elementMatrix = [
      [k[0][0], k[0][1], -k[0][0], -k[0][1]],
      [k[1][0], k[1][1], -k[1][0], -k[1][1]],
      [-k[0][0], -k[0][1], k[0][0], k[0][1]],
      [k[1][0], k[1][1], -k[1][0], -k[1][1]]
    ];

    const assembledDofs = [2 * start, 2 * start + 1, 2 * end, 2 * end + 1];
    assembledDofs.forEach((rowDof, rowIndex) => {
      assembledDofs.forEach((colDof, colIndex) => {
        K[rowDof][colDof] += elementMatrix[rowIndex][colIndex];
      });
    });

    if (transformation[0].some(v => Math.abs(v) > 0)) {
      // Keep the matrix assembly deterministic for downstream solvers.
    }
  });

  return { K, nodes: normalizedNodes, members: normalizedMembers };
}

function gaussianElimination(A, B) {
  const n = B.length;
  const aug = A.map((row, idx) => [...row, B[idx]]);

  for (let i = 0; i < n; i += 1) {
    let pivotRow = i;
    let pivotValue = Math.abs(aug[i][i]);
    for (let r = i + 1; r < n; r += 1) {
      if (Math.abs(aug[r][i]) > pivotValue) {
        pivotValue = Math.abs(aug[r][i]);
        pivotRow = r;
      }
    }

    if (pivotValue < 1e-12) {
      return null;
    }

    if (pivotRow !== i) {
      [aug[i], aug[pivotRow]] = [aug[pivotRow], aug[i]];
    }

    for (let r = i + 1; r < n; r += 1) {
      const factor = aug[r][i] / aug[i][i];
      if (Math.abs(factor) < 1e-14) continue;
      for (let c = i; c <= n; c += 1) {
        aug[r][c] -= factor * aug[i][c];
      }
    }
  }

  const solution = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j += 1) {
      sum -= aug[i][j] * solution[j];
    }
    if (Math.abs(aug[i][i]) < 1e-12) {
      return null;
    }
    solution[i] = sum / aug[i][i];
  }
  return solution;
}

function solveStructuralSystem(nodes, members) {
  const { K, nodes: normalizedNodes, members: normalizedMembers } = buildGlobalStiffness(nodes, members);
  const nodeCount = normalizedNodes.length;
  const size = 2 * nodeCount;
  const loadVector = Array(size).fill(0);

  normalizedNodes.forEach((node, nodeIndex) => {
    loadVector[2 * nodeIndex] = Number(node.loadX) || 0;
    loadVector[2 * nodeIndex + 1] = Number(node.loadY) || 0;
  });

  const supports = normalizedNodes.filter(node => node.support === 'pin' || node.support === 'roller');
  const constrainedDofs = [];

  normalizedNodes.forEach((node, nodeIndex) => {
    if (node.support === 'pin') {
      constrainedDofs.push(2 * nodeIndex, 2 * nodeIndex + 1);
    } else if (node.support === 'roller') {
      constrainedDofs.push(2 * nodeIndex + 1);
    }
  });

  const freeDofs = [];
  for (let i = 0; i < size; i += 1) {
    if (!constrainedDofs.includes(i)) freeDofs.push(i);
  }

  const reducedK = Array.from({ length: freeDofs.length }, () => Array(freeDofs.length).fill(0));
  const reducedF = Array(freeDofs.length).fill(0);
  freeDofs.forEach((rowDof, rowIndex) => {
    reducedF[rowIndex] = loadVector[rowDof];
    freeDofs.forEach((colDof, colIndex) => {
      reducedK[rowIndex][colIndex] = K[rowDof][colDof];
    });
  });

  const displacements = Array(size).fill(0);
  const solution = gaussianElimination(reducedK, reducedF);
  if (!solution) {
    return { success: false, displacements, members: normalizedMembers };
  }
  freeDofs.forEach((dof, index) => {
    displacements[dof] = solution[index];
  });

  const solvedMembers = normalizedMembers.map(member => {
    const startNode = normalizedNodes.find(node => node.id === member.a);
    const endNode = normalizedNodes.find(node => node.id === member.b);
    if (!startNode || !endNode) return { ...member, force: 0, stress: 0, utilization: 0, status: 'SAFE' };

    const startIndex = normalizedNodes.findIndex(node => node.id === startNode.id);
    const endIndex = normalizedNodes.findIndex(node => node.id === endNode.id);
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-10) return { ...member, force: 0, stress: 0, utilization: 0, status: 'SAFE' };

    const c = dx / L;
    const s = dy / L;
    const material = MATERIALS_LIBRARY[member.material] || MATERIALS_LIBRARY['Structural Steel'];
    const profileConfig = BEAM_PROFILES[member.profile] || BEAM_PROFILES['Solid Square'];
    const geometry = profileConfig.compute(member.dimensions || {});
    const area = member.area || geometry.area;
    const inertia = member.inertia || geometry.inertia;

    const ux1 = displacements[2 * startIndex] || 0;
    const uy1 = displacements[2 * startIndex + 1] || 0;
    const ux2 = displacements[2 * endIndex] || 0;
    const uy2 = displacements[2 * endIndex + 1] || 0;
    const delta = [ux2 - ux1, uy2 - uy1];
    const axialForce = ((material.E * area) / L) * (delta[0] * c + delta[1] * s);
    const stress = axialForce / Math.max(area, 1e-6);
    const utilization = Math.abs(stress) / Math.max(Number(member.allowableStress) || material.sigmaY, 1e-6);
    const bucklingCapacity = (Math.PI ** 2 * material.E * inertia) / (L ** 2);
    const status = utilization > 1 || Math.abs(axialForce) > bucklingCapacity ? 'FAILURE' : 'SAFE';

    return {
      ...member,
      force: axialForce,
      stress,
      utilization,
      status,
      geometry,
      bucklingCapacity,
      length: L,
      c,
      s
    };
  });

  return {
    success: true,
    displacements,
    nodes: normalizedNodes,
    members: solvedMembers,
    summary: {
      memberCount: solvedMembers.length,
      failures: solvedMembers.filter(entry => entry.status === 'FAILURE').length
    }
  };
}

function evaluateStructuralSafety(nodes, members) {
  const result = solveStructuralSystem(nodes, members);
  return {
    ...result,
    checks: result.members.map(member => ({
      id: member.id,
      tensileYielding: Math.abs(member.force) / Math.max(member.area || 1e-6, 1e-6) > (MATERIALS_LIBRARY[member.material]?.sigmaY || 250),
      buckling: Math.abs(member.force) > ((Math.PI ** 2 * (MATERIALS_LIBRARY[member.material]?.E || 200) * (member.inertia || 1e-12)) / (member.length ** 2 || 1e-6)),
      utilization: member.utilization,
      status: member.status
    }))
  };
}

export {
  MATERIALS_LIBRARY,
  BEAM_PROFILES,
  buildGlobalStiffness,
  gaussianElimination,
  solveStructuralSystem,
  evaluateStructuralSafety
};

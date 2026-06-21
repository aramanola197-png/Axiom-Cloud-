function renderMindMap(svgEl, data) {
  if (!data || !data.nodes || !data.nodes.length) return;
  const nodes = data.nodes;
  const edges = data.edges || [];

  const width = 600;
  const height = 360;
  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');

  // Layout: core node center, primary nodes in inner ring, secondary in outer ring
  const coreNode = nodes.find(n => n.type === 'core') || nodes[0];
  const primaryNodes = nodes.filter(n => n.type === 'primary');
  const secondaryNodes = nodes.filter(n => n.type === 'secondary');

  const cx = width / 2, cy = height / 2;
  const positions = {};
  positions[coreNode.id] = { x: cx, y: cy };

  const innerRadius = 110;
  primaryNodes.forEach((n, i) => {
    const angle = (i / Math.max(primaryNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions[n.id] = { x: cx + Math.cos(angle) * innerRadius, y: cy + Math.sin(angle) * innerRadius * 0.78 };
  });

  const outerRadius = 175;
  secondaryNodes.forEach((n, i) => {
    const angle = (i / Math.max(secondaryNodes.length, 1)) * Math.PI * 2 - Math.PI / 2 + 0.3;
    positions[n.id] = { x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius * 0.78 };
  });

  // Fallback for any node missing a position (safety)
  nodes.forEach((n, i) => {
    if (!positions[n.id]) {
      const angle = (i / nodes.length) * Math.PI * 2;
      positions[n.id] = { x: cx + Math.cos(angle) * 140, y: cy + Math.sin(angle) * 100 };
    }
  });

  const ns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  const edgeGroup = el('g', {});
  const nodeGroup = el('g', {});

  edges.forEach(edge => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) return;
    const line = el('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: 'rgba(139,92,246,0.25)', 'stroke-width': '1.2',
    });
    edgeGroup.appendChild(line);
  });

  nodes.forEach(n => {
    const pos = positions[n.id];
    const isCore = n.type === 'core';
    const isPrimary = n.type === 'primary';
    const radius = isCore ? 30 : (isPrimary ? 22 : 16);
    const fill = isCore ? '#dc2626' : (isPrimary ? '#8b5cf6' : '#141414');
    const stroke = isCore ? 'none' : (isPrimary ? 'none' : 'rgba(139,92,246,0.4)');

    const g = el('g', {});
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: radius,
      fill, stroke, 'stroke-width': isCore || isPrimary ? '0' : '1.5',
    });
    const text = el('text', {
      x: pos.x, y: pos.y + radius + 14, 'text-anchor': 'middle',
      fill: isCore ? '#f0f0f0' : (isPrimary ? '#d4d4d4' : '#888888'),
      'font-family': 'Geist, sans-serif',
      'font-size': isCore ? '12' : (isPrimary ? '10.5' : '9.5'),
      'font-weight': isCore ? '700' : '500',
    });
    // Wrap label text simply by splitting on spaces if too long
    const label = n.label || '';
    text.textContent = label.length > 16 ? label.slice(0, 15) + '…' : label;

    g.appendChild(circle);
    g.appendChild(text);
    nodeGroup.appendChild(g);
  });

  svgEl.innerHTML = '';
  svgEl.appendChild(edgeGroup);
  svgEl.appendChild(nodeGroup);
}

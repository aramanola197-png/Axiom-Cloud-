(function () {
  const svg = document.getElementById('knowledge-graph');
  if (!svg) return;

  const nodes = [
    { id: 'core', x: 230, y: 230, r: 26, label: 'Idea', color: '#dc2626' },
    { id: 'research', x: 130, y: 130, r: 18, label: 'Research', color: '#8b5cf6' },
    { id: 'tutor', x: 330, y: 110, r: 16, label: 'Learn', color: '#8b5cf6' },
    { id: 'builder', x: 360, y: 280, r: 18, label: 'Build', color: '#8b5cf6' },
    { id: 'deploy', x: 250, y: 380, r: 16, label: 'Deploy', color: '#8b5cf6' },
    { id: 'market', x: 70, y: 230, r: 11, label: 'Market', color: '#5a5a5a' },
    { id: 'competitors', x: 110, y: 50, r: 10, label: 'Competitors', color: '#5a5a5a' },
    { id: 'tech', x: 410, y: 180, r: 11, label: 'Tech Stack', color: '#5a5a5a' },
    { id: 'ux', x: 400, y: 360, r: 10, label: 'UX', color: '#5a5a5a' },
    { id: 'infra', x: 130, y: 380, r: 10, label: 'Infra', color: '#5a5a5a' },
  ];

  const links = [
    ['core', 'research'], ['core', 'tutor'], ['core', 'builder'], ['core', 'deploy'],
    ['research', 'market'], ['research', 'competitors'],
    ['builder', 'tech'], ['builder', 'ux'],
    ['deploy', 'infra'],
  ];

  const ns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  const linkGroup = el('g', { class: 'links' });
  const nodeGroup = el('g', { class: 'nodes' });
  svg.appendChild(linkGroup);
  svg.appendChild(nodeGroup);

  const nodeById = {};
  nodes.forEach(n => nodeById[n.id] = n);

  links.forEach(([a, b], i) => {
    const na = nodeById[a], nb = nodeById[b];
    const line = el('line', {
      x1: na.x, y1: na.y, x2: nb.x, y2: nb.y,
      stroke: 'rgba(139,92,246,0.18)', 'stroke-width': '1',
    });
    line.style.opacity = '0';
    line.style.transition = `opacity 0.6s ease ${i * 0.08}s`;
    linkGroup.appendChild(line);
    setTimeout(() => { line.style.opacity = '1'; }, 50);
  });

  nodes.forEach((n, i) => {
    const g = el('g', { class: 'node-group' });
    g.style.opacity = '0';
    g.style.transform = 'scale(0.6)';
    g.style.transformOrigin = `${n.x}px ${n.y}px`;
    g.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;

    const glow = el('circle', {
      cx: n.x, cy: n.y, r: n.r + 8,
      fill: n.color, opacity: '0.08',
    });
    const circle = el('circle', {
      cx: n.x, cy: n.y, r: n.r,
      fill: n.id === 'core' ? n.color : '#0f0f0f',
      stroke: n.color, 'stroke-width': n.id === 'core' ? '0' : '1.5',
    });
    const text = el('text', {
      x: n.x, y: n.y + n.r + 16, 'text-anchor': 'middle',
      fill: n.id === 'core' ? '#f0f0f0' : '#888888',
      'font-family': 'Geist, sans-serif',
      'font-size': n.id === 'core' ? '13' : '10',
      'font-weight': n.id === 'core' ? '700' : '500',
    });
    text.textContent = n.label;

    g.appendChild(glow);
    g.appendChild(circle);
    g.appendChild(text);
    nodeGroup.appendChild(g);

    setTimeout(() => {
      g.style.opacity = '1';
      g.style.transform = 'scale(1)';
    }, 50);

    // Gentle floating animation after entrance
    if (n.id !== 'core') {
      const floatOffset = Math.random() * 2;
      let t = 0;
      function float() {
        t += 0.012;
        const dy = Math.sin(t + floatOffset) * 4;
        g.style.transform = `translateY(${dy}px)`;
        requestAnimationFrame(float);
      }
      setTimeout(() => requestAnimationFrame(float), 700);
    } else {
      let t = 0;
      function pulse() {
        t += 0.02;
        const scale = 1 + Math.sin(t) * 0.03;
        circle.setAttribute('r', n.r * scale);
        glow.setAttribute('r', (n.r + 8) * scale);
        requestAnimationFrame(pulse);
      }
      setTimeout(() => requestAnimationFrame(pulse), 700);
    }
  });
})();

function showTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector('.t-' + name).classList.add('active');
}

const tooltip = document.getElementById('tooltip');
function showTooltip(e, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = '1';
  moveTooltip(e);
}
function moveTooltip(e) {
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + 300 > window.innerWidth) x = e.clientX - 300;
  if (y + 300 > window.innerHeight) y = e.clientY - 300;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}
function hideTooltip() { tooltip.style.opacity = '0'; }

function makeZoomable(wrapId, prefix) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  let zoom = 1;

  function apply() {
    const svg = wrap.querySelector('svg');
    if (!svg) return;
    svg.style.transform = 'none';
    svg.style.maxWidth = 'none';
    svg.style.flexShrink = '0';
    svg.style.width = zoom <= 1 ? '100%' : (wrap.clientWidth * zoom) + 'px';
    svg.style.height = 'auto';
    if (svg.parentElement) svg.parentElement.style.justifyContent = zoom > 1 ? 'flex-start' : 'center';
  }

  const zin  = document.getElementById(prefix + '-zoom-in');
  const zout = document.getElementById(prefix + '-zoom-out');
  const zres = document.getElementById(prefix + '-zoom-reset');
  if (zin)  zin.onclick  = () => { zoom = Math.min(3, +(zoom + 0.2).toFixed(2)); apply(); };
  if (zout) zout.onclick = () => { zoom = Math.max(1, +(zoom - 0.2).toFixed(2)); apply(); };
  if (zres) zres.onclick = () => { zoom = 1; apply(); };

  if (wrap.dataset.panReady !== '1') {
    let down = false, sx = 0, sy = 0, sl = 0, st = 0;
    wrap.style.cursor = 'grab';
    wrap.addEventListener('mousedown', e => {
      down = true; wrap.style.cursor = 'grabbing';
      sx = e.clientX; sy = e.clientY; sl = wrap.scrollLeft; st = wrap.scrollTop;
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!down) return;
      wrap.scrollLeft = sl - (e.clientX - sx);
      wrap.scrollTop  = st - (e.clientY - sy);
    });
    window.addEventListener('mouseup', () => { if (down) { down = false; wrap.style.cursor = 'grab'; } });
    wrap.dataset.panReady = '1';
  }

  apply();
}

window.addEventListener('DOMContentLoaded', () => {
  drawER();
  buildSOM();
  drawRelDiagram();
  buildRelational();
  buildRelationshipTypes();
  buildCardinalityRules();
  buildIndexes();
  buildBenchmarks();
});

document.addEventListener('mousemove', e => {
  if (tooltip.style.opacity !== '0') moveTooltip(e);
});

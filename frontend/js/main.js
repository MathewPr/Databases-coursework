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

window.addEventListener('DOMContentLoaded', () => {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      er: { useMaxWidth: true },
    });
  }
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

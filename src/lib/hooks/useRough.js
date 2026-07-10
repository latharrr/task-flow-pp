import { useEffect, useRef } from 'react';

export function useRough(deps = []) {
  const ref = useRef(null);

  const drawRough = () => {
    if (!ref.current || !window.rough) return;
    const root = ref.current;
    const els = root.querySelectorAll('[data-rough]');
    
    function roundedRectPath(w, h, r) {
      r = Math.max(0, Math.min(r, w / 2 - 0.5, h / 2 - 0.5));
      return 'M' + r + ',1 L' + (w - r) + ',1 Q' + (w - 1) + ',1 ' + (w - 1) + ',' + r +
        ' L' + (w - 1) + ',' + (h - r) + ' Q' + (w - 1) + ',' + (h - 1) + ' ' + (w - r) + ',' + (h - 1) +
        ' L' + r + ',' + (h - 1) + ' Q1,' + (h - 1) + ' 1,' + (h - r) + ' L1,' + r + ' Q1,1 ' + r + ',1 Z';
    }

    els.forEach(el => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      let svg = el.querySelector(':scope > svg.rough-overlay');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'rough-overlay');
        svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:9;';
        el.appendChild(svg);
      }
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const rc = window.rough.svg(svg);
      const type = el.getAttribute('data-rough');
      const color = el.getAttribute('data-rough-color') || '#1f2937';
      const sw = parseFloat(el.getAttribute('data-rough-width') || '1.5');
      const roughnessVal = parseFloat(el.getAttribute('data-rough-roughness') || '1.8');
      const opts = { stroke: color, strokeWidth: sw, roughness: roughnessVal, bowing: 1.2, fill: 'none' };
      let node;
      if (type === 'circle') {
        node = rc.ellipse(w / 2, h / 2, Math.max(w - 2, 1), Math.max(h - 2, 1), opts);
      } else if (type === 'topline') {
        node = rc.line(2, 1, Math.max(w - 2, 3), 1, opts);
      } else {
        const r = parseFloat(el.getAttribute('data-rough-radius') || '8');
        node = rc.path(roundedRectPath(w, h, r), opts);
      }
      svg.appendChild(node);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      drawRough();
    }, 100);

    const handleResize = () => drawRough();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, deps);

  return ref;
}

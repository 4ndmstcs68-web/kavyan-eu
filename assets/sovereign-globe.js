/* Kavyan — soevereine bol.
   Een draaiende draadbol met datapunten. De punten binnen Europa lichten op in
   accentkleur, de rest blijft dof: dat is het hele verhaal van deze site in één beeld.
   Geen library, geen build. Puur canvas + wat trigonometrie (~5 KB).
   Het is decor: pointer-events staan uit, aria-hidden staat aan. */
(function () {
  var canvas = document.getElementById('globe');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Punten op de bol: [lat, lon, isEU]. Ruwe posities, geen kaartprojectie —
  // het moet herkenbaar zijn als "Europa licht op", niet cartografisch kloppen.
  var SITES = [
    // Europa (accent)
    [50.8,  4.4, 1],  // Brussel
    [52.4,  4.9, 1],  // Amsterdam
    [50.1,  8.7, 1],  // Frankfurt
    [48.9,  2.3, 1],  // Parijs
    [59.3, 18.1, 1],  // Stockholm
    [47.4,  8.5, 1],  // Zürich
    [45.5,  9.2, 1],  // Milaan
    [40.4, -3.7, 1],  // Madrid
    [52.5, 13.4, 1],  // Berlijn
    [53.3, -6.3, 1],  // Dublin
    [60.2, 24.9, 1],  // Helsinki
    [50.1, 14.4, 1],  // Praag
    // Buiten de EU (dof)
    [37.8, -122.4, 0], [40.7, -74.0, 0], [47.6, -122.3, 0], [39.9, 116.4, 0],
    [1.35, 103.8, 0], [35.7, 139.7, 0], [-33.9, 151.2, 0], [19.1, 72.9, 0],
    [-23.6, -46.6, 0], [55.8, 37.6, 0], [25.2, 55.3, 0], [-26.2, 28.0, 0]
  ];

  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 0.40 in plaats van 0.5: het bijschrift staat onderaan, dus de bol schuift wat omhoog.
    cx = W / 2; cy = H * 0.34;
    R = Math.min(W, H * 0.78) * 0.34;
    return true;
  }

  function toXYZ(lat, lon, rot) {
    var a = lat * Math.PI / 180, b = (lon * Math.PI / 180) + rot;
    return {
      x: Math.cos(a) * Math.sin(b),
      y: -Math.sin(a),
      z: Math.cos(a) * Math.cos(b)
    };
  }

  function project(p) {
    // Lichte perspectiefdeling: punten vooraan worden iets groter.
    var d = 2.6, k = d / (d - p.z);
    return { x: cx + p.x * R * k, y: cy + p.y * R * k, z: p.z, k: k };
  }

  function drawRing(pts, alpha) {
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p.z < -0.02) { started = false; continue; }   // achterkant niet tekenen
      var s = project(p);
      if (!started) { ctx.moveTo(s.x, s.y); started = true; }
      else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = 'rgba(160,190,225,' + alpha + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function frame(t) {
    var rot = reduce ? -0.35 : t * 0.00006;
    ctx.clearRect(0, 0, W, H);

    // Meridianen
    for (var m = 0; m < 12; m++) {
      var pts = [];
      for (var la = -90; la <= 90; la += 4) pts.push(toXYZ(la, m * 30, rot));
      drawRing(pts, 0.17);
    }
    // Parallellen
    for (var la2 = -60; la2 <= 60; la2 += 30) {
      var pts2 = [];
      for (var lo = 0; lo <= 360; lo += 4) pts2.push(toXYZ(la2, lo, rot));
      drawRing(pts2, la2 === 0 ? 0.26 : 0.15);
    }

    // Datapunten, van achter naar voor zodat de voorste bovenop liggen
    var vis = [];
    for (var i = 0; i < SITES.length; i++) {
      var s = SITES[i];
      var p = toXYZ(s[0], s[1], rot);
      if (p.z < 0) continue;
      var sc = project(p);
      vis.push({ x: sc.x, y: sc.y, z: p.z, eu: s[2], k: sc.k });
    }
    vis.sort(function (a, b) { return a.z - b.z; });

    for (var j = 0; j < vis.length; j++) {
      var v = vis[j];
      var fade = 0.35 + v.z * 0.65;                    // achteraan doffer
      var r = (v.eu ? 3.0 : 2.0) * v.k;
      if (v.eu) {
        // Zachte gloed rond Europese knopen
        var g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r * 5);
        g.addColorStop(0, 'rgba(77,163,255,' + (0.60 * fade) + ')');
        g.addColorStop(1, 'rgba(77,163,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(v.x, v.y, r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(124,192,255,' + fade + ')';
      } else {
        ctx.fillStyle = 'rgba(140,160,180,' + (0.30 * fade) + ')';
      }
      ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  var running = false, rafId = null;
  function loop(t) { frame(t); rafId = requestAnimationFrame(loop); }
  function start() { if (!running && !reduce) { running = true; rafId = requestAnimationFrame(loop); } }
  function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }

  function init() {
    if (!resize()) { setTimeout(init, 120); return; }
    frame(0);
    if (reduce) return;                                 // stilstaand beeld, geen lus
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es[0].isIntersecting ? start() : stop();        // niet renderen buiten beeld: spaart batterij
      }, { threshold: 0.01 }).observe(canvas);
    } else start();
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (resize()) frame(performance.now()); }, 150);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

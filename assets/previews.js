/*
 * CS2 Autoexec Creator – canvas previews (crosshair, radar + HUD).
 * Everything is drawn from scratch; no Valve graphics are used.
 */
(function (root) {
  'use strict';

  const D = root.CS2Data;

  function setupCanvas(canvas, aspect) {
    const dpr = Math.max(1, Math.min(3, root.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || 300;
    const cssH = Math.round(cssW / aspect);
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { ctx, W, H, dpr };
  }

  /* ================================================================ crosshair */

  const BACKGROUNDS = {
    dust(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#a9c4dc'); g.addColorStop(0.42, '#d8cfb6'); g.addColorStop(0.43, '#c8a574'); g.addColorStop(1, '#8f6f45');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(80,55,30,.25)';
      for (let i = 0; i < 7; i++) c.fillRect((i * 97) % w, h * 0.45 + (i % 3) * h * 0.08, w * 0.12, Math.max(2, h * 0.008));
    },
    dark(c, w, h) {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#262d35'); g.addColorStop(1, '#0d1014');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    },
    bright(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d7dbe0');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    },
    grass(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#6b8f4e'); g.addColorStop(1, '#314a25');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    },
  };

  // Illustrative spread (in pixels) for each movement state.
  const SIM_SPREAD = { idle: 0, walk: 16, run: 52, jump: 110, fire: 34 };

  /**
   * Draws the crosshair. Settings values are real screen pixels (Rush Hour
   * system), drawn 1:1 and magnified by `zoom`.
   */
  function drawCrosshair(canvas, s, opts) {
    const { ctx, W, H, dpr } = setupCanvas(canvas, 1);
    (BACKGROUNDS[opts.bg] || BACKGROUNDS.dust)(ctx, W, H);
    if (!s.crosshair) return;

    const px = opts.zoom * dpr;                 // canvas pixels per game pixel
    const style = Number(s.cl_crosshairstyle);
    const t = Math.max(1, Math.round(s.cl_crosshair_thickness));
    const len = Math.round(s.cl_crosshair_length);
    const gap = Math.round(s.cl_crosshair_gap);
    const alpha = s.cl_crosshaircolor_a / 255;
    const outline = Number(s.cl_crosshair_drawoutline);
    const color = `rgba(${s.cl_crosshaircolor_r},${s.cl_crosshaircolor_g},${s.cl_crosshaircolor_b},`;

    const spreadRaw = SIM_SPREAD[opts.sim] || 0;
    let offset = 0;
    if (D.DYNAMIC_STYLES.includes(style) || style === 2) offset = Math.min(spreadRaw, s.cl_crosshair_dynamic_spread_limit);
    if (style === 5 && opts.sim === 'fire') offset = 4; // shot feedback kick
    const recoilY = s.cl_crosshair_recoil && opts.sim === 'fire' ? -12 : 0;

    const cx = Math.floor(W / 2 / px) * px;
    const cy = Math.floor(H / 2 / px) * px + recoilY * px;

    // rects: [x, y, w, h, alphaMul] in game pixels relative to the centre
    const rects = [];
    const circles = [];
    const lo = -Math.floor(t / 2);
    const bars = (d, l, a) => {
      if (l <= 0) return;
      rects.push([-d - l, lo, l, t, a], [d, lo, l, t, a], [lo, d, t, l, a]);
      if (!s.cl_crosshair_t) rects.push([lo, -d - l, t, l, a]);
    };

    if (style === 0 || style === 4 || style === 5) {
      bars(gap + offset, len, 1);
    } else if (style === 2) {
      if (offset > s.cl_crosshair_dynamic_splitdist) {
        const ratio = s.cl_crosshair_dynamic_maxdist_splitratio;
        const inner = Math.round(len * (1 - ratio)), outer = Math.round(len * ratio);
        bars(gap, inner, s.cl_crosshair_dynamic_splitalpha_innermod);
        bars(gap + inner + offset, outer, s.cl_crosshair_dynamic_splitalpha_outermod);
      } else {
        bars(gap + offset, len, 1);
      }
    } else if (style === 1 || style === 3) {
      circles.push(gap + offset + Math.max(len, 2) / 2);
    } else if (style === 7) {
      // Approximation: four corner brackets around the spread square.
      const h = gap + offset + Math.max(len, 2) / 2;
      const arm = Math.max(2, Math.round(len / 2));
      const e = Math.round(h);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = sx < 0 ? -e : e - t, y0 = sy < 0 ? -e : e - t;
        rects.push([sx < 0 ? x0 : x0 - arm + t, y0, arm, t, 1]);
        rects.push([x0, sy < 0 ? y0 : y0 - arm + t, t, arm, 1]);
      }
    } else if (style === 8) {
      const e = Math.round(gap + Math.max(len, 2) / 2);
      rects.push([-e, -e, 2 * e, t, 1], [-e, e - t, 2 * e, t, 1], [-e, -e, t, 2 * e, 1], [e - t, -e, t, 2 * e, 1]);
    }
    if (s.cl_crosshairdot || style === 6) rects.push([lo, lo, t, t, 1]);

    const toCanvas = ([x, y, w, h], dx, dy, grow) => [
      cx + (x + dx - grow) * px, cy + (y + dy - grow) * px, (w + 2 * grow) * px, (h + 2 * grow) * px,
    ];

    // Outline: 1 = full (1 px all around), 2 = half (top-left part only).
    if (outline) {
      for (const r of rects) {
        ctx.fillStyle = `rgba(0,0,0,${alpha * r[4]})`;
        if (outline === 1) ctx.fillRect(...toCanvas(r, 0, 0, 1));
        else ctx.fillRect(...toCanvas(r, -1, -1, 0));
      }
      for (const r of circles) {
        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = (outline === 1 ? t + 2 : t) * px;
        ctx.beginPath();
        const d = outline === 1 ? 0 : -1;
        ctx.arc(cx + d * px, cy + d * px, r * px, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (const r of rects) {
      ctx.fillStyle = color + (alpha * r[4]) + ')';
      ctx.fillRect(...toCanvas(r, 0, 0, 0));
    }
    for (const r of circles) {
      ctx.strokeStyle = color + alpha + ')';
      ctx.lineWidth = t * px;
      ctx.beginPath();
      ctx.arc(cx, cy, r * px, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ================================================================ radar + HUD */

  const MAP_SIZE = 1000;

  // Schematic, fictional map: two bomb sites, mid, two spawns.
  function drawMap(c) {
    c.fillStyle = '#39424c';
    c.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    c.fillStyle = '#6c7885';
    const floors = [
      [80, 820, 260, 120], [420, 840, 180, 110], [660, 800, 240, 140],          // T side
      [120, 120, 260, 240], [640, 80, 280, 260],                               // sites B / A
      [440, 200, 120, 620], [180, 360, 80, 460], [760, 340, 80, 460],          // mid + lanes
      [380, 60, 240, 90],                                                     // CT spawn
    ];
    for (const r of floors) c.fillRect(...r);
    c.fillStyle = '#545f6b';
    c.fillRect(470, 420, 60, 60); // mid box
    c.fillRect(700, 140, 50, 50); // A box
    c.fillRect(200, 180, 50, 50); // B box
    c.fillStyle = 'rgba(242,169,59,.25)';
    c.beginPath(); c.arc(780, 210, 70, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(250, 240, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2a93b';
    c.font = 'bold 90px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('A', 780, 214);
    c.fillText('B', 250, 244);
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.font = 'bold 44px system-ui, sans-serif';
    c.fillText('CT', 500, 105);
    c.fillText('T', 510, 895);
  }

  function drawArrow(c, x, y, angle, size) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(0, -size); c.lineTo(size * 0.7, size * 0.8); c.lineTo(0, size * 0.35); c.lineTo(-size * 0.7, size * 0.8);
    c.closePath();
    c.fillStyle = '#5aa9ff'; c.fill();
    c.lineWidth = size * 0.18; c.strokeStyle = '#08121f'; c.stroke();
    c.restore();
  }

  const PLAYER_POS = { center: [500, 520], edge: [900, 110] };

  function drawHud(canvas, s, opts) {
    const { ctx: c, W, H } = setupCanvas(canvas, 16 / 9);
    const k = W / 1280; // drawn a bit larger than a real 1080p HUD so it stays readable

    // scene
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4a5a6a'); g.addColorStop(0.5, '#7b7a70'); g.addColorStop(0.51, '#5d5345'); g.addColorStop(1, '#2d2720');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(W * 0.62, H * 0.28, W * 0.22, H * 0.23);
    c.fillRect(W * 0.12, H * 0.33, W * 0.14, H * 0.18);

    const hudScale = s.hud_scaling;
    const hudColor = D.HUD_COLORS[s.cl_hud_color] || D.HUD_COLORS[0];

    // ---------------- radar
    const [px, py] = PLAYER_POS[opts.pos] || PLAYER_POS.center;
    const yaw = (opts.yaw || 0) * Math.PI / 180;
    const margin = 18 * k;
    const tabSquare = opts.tab && s.cl_radar_square_with_scoreboard;

    if (tabSquare) {
      const size = 420 * k * hudScale / 0.85;
      c.save();
      c.translate(margin, margin);
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(-4 * k, -4 * k, size + 8 * k, size + 8 * k);
      c.beginPath(); c.rect(0, 0, size, size); c.clip();
      c.scale(size / MAP_SIZE, size / MAP_SIZE);
      drawMap(c);
      drawArrow(c, px, py, yaw, 26);
      c.restore();
    } else {
      const R = 150 * k * s.cl_hud_radar_scale * hudScale / 0.85; // radius on screen
      const half = 190 / s.cl_radar_scale;                          // world units from centre to edge
      let cxw = px, cyw = py;
      if (!s.cl_radar_always_centered) {
        const clamp = v => (half >= MAP_SIZE / 2 ? MAP_SIZE / 2 : Math.min(MAP_SIZE - half, Math.max(half, v)));
        cxw = clamp(px); cyw = clamp(py);
      }
      const rx = margin + R, ry = margin + R;
      c.save();
      c.beginPath(); c.arc(rx, ry, R, 0, Math.PI * 2);
      c.fillStyle = '#1b2026'; c.fill();
      c.clip();
      c.translate(rx, ry);
      if (s.cl_radar_rotate) c.rotate(-yaw);
      c.scale(R / half, R / half);
      c.translate(-cxw, -cyw);
      drawMap(c);
      drawArrow(c, px, py, yaw, 16 * half / R * k * 1.2);
      c.restore();
      c.beginPath(); c.arc(rx, ry, R, 0, Math.PI * 2);
      c.lineWidth = 3 * k; c.strokeStyle = 'rgba(0,0,0,.7)'; c.stroke();
      if (s.cl_radar_rotate) {
        // north marker moves around the rim when rotating
        c.fillStyle = '#e6e9ec';
        c.font = `bold ${Math.round(16 * k)}px system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('N', rx + Math.sin(-yaw) * (R - 12 * k), ry - Math.cos(-yaw) * (R - 12 * k));
      }
    }

    // ---------------- HUD: health, armour, ammo
    const f = Math.round(46 * k * hudScale / 0.85);
    const base = H - 26 * k * hudScale;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 6 * k;
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillRect(18 * k, base - f * 1.1, f * 6.4, f * 1.35);
    c.fillRect(W - 18 * k - f * 5.2, base - f * 1.1, f * 5.2, f * 1.35);
    c.fillStyle = hudColor;
    c.font = `600 ${f}px system-ui, sans-serif`;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    c.fillText('✚ 100', 30 * k, base);
    c.font = `600 ${Math.round(f * 0.7)}px system-ui, sans-serif`;
    c.fillText('◈ 100', 30 * k + f * 3.4, base);
    c.textAlign = 'right';
    c.font = `600 ${f}px system-ui, sans-serif`;
    c.fillText('30', W - 30 * k - f * 1.9, base);
    c.font = `600 ${Math.round(f * 0.6)}px system-ui, sans-serif`;
    c.fillText('/ 90', W - 30 * k, base);
    c.restore();

    // tiny crosshair to anchor the scene
    c.fillStyle = `rgb(${s.cl_crosshaircolor_r},${s.cl_crosshaircolor_g},${s.cl_crosshaircolor_b})`;
    const m = Math.max(1, Math.round(2 * k));
    c.fillRect(W / 2 - 8 * m, H / 2 - m / 2, 6 * m, m); c.fillRect(W / 2 + 2 * m, H / 2 - m / 2, 6 * m, m);
    c.fillRect(W / 2 - m / 2, H / 2 - 8 * m, m, 6 * m); c.fillRect(W / 2 - m / 2, H / 2 + 2 * m, m, 6 * m);
  }

  root.CS2Previews = { drawCrosshair, drawHud, BACKGROUNDS: Object.keys(BACKGROUNDS), SIMS: Object.keys(SIM_SPREAD) };
})(typeof self !== 'undefined' ? self : this);

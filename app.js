(function () {
  'use strict';
  const KEY = 'sos-card-v1';
  const form = document.getElementById('form');
  const wall = document.getElementById('wall');
  const front = document.getElementById('card-front');
  const back = document.getElementById('card-back');

  const THEMES = {
    red: { bg: ['#E01E2F', '#B5101F'], text: '#FFFFFF', soft: 'rgba(255,255,255,.78)', tile: '#FFFFFF', tileText: '#B5101F', pill: '#FFFFFF', pillText: '#B5101F', line: 'rgba(255,255,255,.28)' },
    night: { bg: ['#141B28', '#0B0F17'], text: '#F2F4F7', soft: 'rgba(242,244,247,.66)', tile: '#FF4D5E', tileText: '#FFFFFF', pill: '#FF4D5E', pillText: '#FFFFFF', line: 'rgba(255,255,255,.16)' },
    white: { bg: ['#FFFFFF', '#EEF0F3'], text: '#1F2328', soft: 'rgba(31,35,40,.66)', tile: '#D7192B', tileText: '#FFFFFF', pill: '#D7192B', pillText: '#FFFFFF', line: 'rgba(31,35,40,.14)' }
  };
  const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const BODY = '"Barlow", "Segoe UI", sans-serif';

  // ---------- contacts UI ----------
  const contactsEl = document.getElementById('contacts');
  for (let i = 0; i < 3; i++) {
    const div = document.createElement('div');
    div.className = 'contact';
    div.innerHTML =
      '<label class="f grow">Name<input name="c' + i + 'name" type="text" placeholder="' + ['Priya Jain', 'Amit Jain', 'Neighbour'][i] + '"></label>' +
      '<label class="f rel">Relation<input name="c' + i + 'rel" type="text" placeholder="' + ['Wife', 'Brother', 'Friend'][i] + '"></label>' +
      '<label class="f grow">Phone<input name="c' + i + 'phone" type="tel" placeholder="98xxx xxxxx"></label>';
    contactsEl.appendChild(div);
  }

  // ---------- state ----------
  function read() {
    const fd = new FormData(form);
    const d = Object.fromEntries(fd.entries());
    d.donor = form.donor.checked;
    d.contacts = [0, 1, 2].map((i) => ({ name: (d['c' + i + 'name'] || '').trim(), rel: (d['c' + i + 'rel'] || '').trim(), phone: (d['c' + i + 'phone'] || '').trim() }))
      .filter((c) => c.name || c.phone);
    d.theme = d.theme || 'red';
    d.size = d.size || '1080x2400';
    for (const k in d) if (typeof d[k] === 'string') d[k] = d[k].trim();
    return d;
  }
  function serialize() {
    const o = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value;
    }
    return o;
  }
  function restore() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!o) return;
    for (const el of form.elements) {
      if (!el.name || !(el.name in o)) continue;
      if (el.type === 'radio') el.checked = el.value === o[el.name];
      else if (el.type === 'checkbox') el.checked = !!o[el.name];
      else el.value = o[el.name];
    }
  }

  // ---------- QR ----------
  function qrText(d) {
    const L = ['EMERGENCY INFO'];
    if (d.name) L.push('Name: ' + d.name + (d.age ? ' (' + d.age + ')' : ''));
    if (d.blood) L.push('Blood group: ' + d.blood);
    if (d.allergies) L.push('Allergies: ' + d.allergies);
    if (d.conditions) L.push('Conditions: ' + d.conditions);
    if (d.meds) L.push('Medicines: ' + d.meds);
    d.contacts.forEach((c) => L.push('Call: ' + [c.name, c.rel && '(' + c.rel + ')', c.phone].filter(Boolean).join(' ')));
    if (d.doctor || d.doctorPhone) L.push('Doctor: ' + [d.doctor, d.doctorPhone].filter(Boolean).join(' '));
    if (d.city) L.push('City: ' + d.city);
    if (d.langs) L.push('Speaks: ' + d.langs);
    if (d.donor) L.push('Registered organ donor');
    if (d.note) L.push('Note: ' + d.note);
    return L.join('\n');
  }
  function drawQR(ctx, text, x, y, size, dark, light) {
    if (typeof qrcode !== 'function') return;
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 3;
    const cell = size / (n + quiet * 2);
    ctx.fillStyle = light;
    roundRect(ctx, x, y, size, size, size * 0.06); ctx.fill();
    ctx.fillStyle = dark;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(Math.floor(x + (c + quiet) * cell), Math.floor(y + (r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }

  // ---------- canvas helpers ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines); let l = keep[maxLines - 1];
      while (ctx.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1);
      keep[maxLines - 1] = l.replace(/[\s,]+$/, '') + '…';
      return keep;
    }
    return lines;
  }
  const pretty = (b) => (b || '').replace('-', '−');

  // ---------- wallpaper ----------
  function drawWall(d, canvas) {
    const [W, H] = d.size.split('x').map(Number);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const th = THEMES[d.theme] || THEMES.red;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const top = H * 0.355, bottom = H * 0.875, m = W * 0.075, cw = W - 2 * m;
    let scale = 1;
    for (let i = 0; i < 12; i++) {
      const h = layoutWall(ctx, d, th, { W, H, m, cw, top, scale, dry: true });
      if (top + h <= bottom) break;
      scale *= 0.93;
    }
    layoutWall(ctx, d, th, { W, H, m, cw, top, scale, dry: false });
  }

  function layoutWall(ctx, d, th, o) {
    const { W, m, cw, top, scale, dry } = o;
    const u = W / 1080 * scale; // unit relative to a 1080px-wide screen
    let y = top;
    // pill
    ctx.font = '800 ' + 40 * u + 'px ' + COND;
    const pillTxt = 'IN CASE OF EMERGENCY';
    const pw = ctx.measureText(pillTxt).width + 56 * u, ph = 66 * u;
    if (!dry) { ctx.fillStyle = th.pill; roundRect(ctx, m, y, pw, ph, ph / 2); ctx.fill(); ctx.fillStyle = th.pillText; ctx.textBaseline = 'middle'; ctx.fillText(pillTxt, m + 28 * u, y + ph / 2 + 2 * u); }
    y += ph + 34 * u;

    // name
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + 92 * u + 'px ' + COND;
    const name = d.name || 'Your name';
    const nameLines = wrap(ctx, name, cw, 2);
    nameLines.forEach((l) => { y += 86 * u; if (!dry) { ctx.fillStyle = th.text; ctx.fillText(l, m, y); } });
    const sub = [d.age && d.age + ' yrs', d.city, d.langs && 'Speaks ' + d.langs].filter(Boolean).join('  ·  ');
    if (sub) { ctx.font = '500 ' + 36 * u + 'px ' + BODY; y += 52 * u; if (!dry) { ctx.fillStyle = th.soft; ctx.fillText(wrap(ctx, sub, cw, 1)[0], m, y); } }
    y += 36 * u;

    // blood tile + QR
    const tileH = 250 * u, qrS = tileH, tileW = cw - qrS - 24 * u;
    if (!dry) {
      ctx.fillStyle = th.tile; roundRect(ctx, m, y, tileW, tileH, 28 * u); ctx.fill();
      ctx.fillStyle = th.tileText;
      ctx.font = '600 ' + 34 * u + 'px ' + COND; ctx.fillText('BLOOD GROUP', m + 30 * u, y + 56 * u);
      ctx.font = '800 ' + 170 * u + 'px ' + COND; ctx.fillText(pretty(d.blood) || '?', m + 26 * u, y + 214 * u);
      if (d.donor) { ctx.font = '600 ' + 30 * u + 'px ' + COND; const t = 'ORGAN DONOR'; ctx.fillText(t, m + tileW - ctx.measureText(t).width - 28 * u, y + 56 * u); }
      drawQR(ctx, qrText(d), m + tileW + 24 * u, y, qrS, '#111111', '#FFFFFF');
    }
    y += tileH + 76 * u;

    // medical lines
    const rows = [['Allergic to', d.allergies], ['Conditions', d.conditions], ['Medicines', d.meds], ['Note', d.note]].filter((r) => r[1]);
    for (const [label, val] of rows) {
      ctx.font = '600 ' + 32 * u + 'px ' + COND;
      if (!dry) { ctx.fillStyle = th.soft; ctx.fillText(label.toUpperCase(), m, y); }
      ctx.font = '700 ' + 46 * u + 'px ' + BODY;
      const lines = wrap(ctx, val, cw, 2);
      lines.forEach((l) => { y += 56 * u; if (!dry) { ctx.fillStyle = th.text; ctx.fillText(l, m, y); } });
      y += 66 * u;
    }

    // contacts
    if (d.contacts.length) {
      if (!dry) { ctx.fillStyle = th.line; ctx.fillRect(m, y - 6 * u, cw, 3 * u); }
      y += 44 * u;
      ctx.font = '600 ' + 32 * u + 'px ' + COND;
      if (!dry) { ctx.fillStyle = th.soft; ctx.fillText('PLEASE CALL', m, y); }
      for (const c of d.contacts) {
        y += 70 * u;
        ctx.font = '800 ' + 60 * u + 'px ' + COND;
        const phone = c.phone || '';
        const pwid = ctx.measureText(phone).width;
        if (!dry) { ctx.fillStyle = th.text; ctx.fillText(phone, m + cw - pwid, y); }
        ctx.font = '500 ' + 40 * u + 'px ' + BODY;
        const who = [c.name, c.rel && '(' + c.rel + ')'].filter(Boolean).join(' ');
        if (!dry) { ctx.fillStyle = th.text; ctx.fillText(wrap(ctx, who, cw - pwid - 30 * u, 1)[0] || '', m, y); }
      }
      y += 20 * u;
    }
    if (d.doctor || d.doctorPhone) {
      y += 54 * u;
      ctx.font = '500 ' + 36 * u + 'px ' + BODY;
      if (!dry) { ctx.fillStyle = th.soft; ctx.fillText(wrap(ctx, 'Doctor: ' + [d.doctor, d.doctorPhone].filter(Boolean).join(' · '), cw, 1)[0], m, y); }
    }
    return y - top;
  }

  // ---------- wallet card ----------
  function drawCardFront(d, c) {
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#D7192B'; ctx.fillRect(0, 0, W, 112);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '800 58px ' + COND; ctx.textBaseline = 'middle';
    ctx.fillText('EMERGENCY INFO', 44, 60);
    ctx.font = '800 40px ' + COND; const s = 'SOS'; ctx.fillText(s, W - 44 - ctx.measureText(s).width, 60);
    ctx.textBaseline = 'alphabetic';
    // blood block
    ctx.fillStyle = '#D7192B'; roundRect(ctx, W - 44 - 250, 150, 250, 230, 22); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '600 28px ' + COND; ctx.fillText('BLOOD', W - 44 - 250 + 26, 196);
    ctx.font = '800 140px ' + COND; ctx.fillText(pretty(d.blood) || '?', W - 44 - 250 + 22, 350);
    ctx.fillStyle = '#1F2328'; ctx.font = '800 66px ' + COND;
    const nl = wrap(ctx, d.name || 'Your name', W - 88 - 280, 2); let y = 190;
    nl.forEach((l) => { ctx.fillText(l, 44, y); y += 64; });
    ctx.font = '500 30px ' + BODY; ctx.fillStyle = '#5B636E';
    const sub = [d.age && d.age + ' yrs', d.city].filter(Boolean).join(' · ');
    if (sub) { ctx.fillText(sub, 44, y); y += 30; }
    if (d.donor) { ctx.fillStyle = '#D7192B'; ctx.font = '700 28px ' + COND; ctx.fillText('REGISTERED ORGAN DONOR', 44, y + 14); y += 30; }
    y = Math.max(y + 34, 420);
    const rows = [['ALLERGIC TO', d.allergies], ['CONDITIONS', d.conditions], ['MEDICINES', d.meds]].filter((r) => r[1]);
    for (const [label, val] of rows) {
      if (y > H - 30) break;
      ctx.font = '600 24px ' + COND; ctx.fillStyle = '#5B636E'; ctx.fillText(label, 44, y);
      ctx.font = '700 30px ' + BODY; ctx.fillStyle = '#1F2328'; ctx.fillText(wrap(ctx, val, W - 88 - 190, 1)[0], 44 + 190, y);
      y += 52;
    }
  }
  function drawCardBack(d, c) {
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1F2328'; ctx.font = '800 46px ' + COND; ctx.fillText('IN AN EMERGENCY, PLEASE CALL', 44, 82);
    let y = 160;
    for (const ct of d.contacts.slice(0, 3)) {
      ctx.font = '800 50px ' + COND; ctx.fillStyle = '#D7192B'; ctx.fillText(ct.phone || '', 44, y);
      ctx.font = '500 28px ' + BODY; ctx.fillStyle = '#1F2328';
      ctx.fillText(wrap(ctx, [ct.name, ct.rel && '(' + ct.rel + ')'].filter(Boolean).join(' '), 560, 1)[0] || '', 44, y + 38);
      y += 112;
    }
    if (!d.contacts.length) { ctx.font = '500 30px ' + BODY; ctx.fillStyle = '#5B636E'; ctx.fillText('Add emergency contacts in the form', 44, y); }
    if (d.doctor || d.doctorPhone) { ctx.font = '500 26px ' + BODY; ctx.fillStyle = '#5B636E'; ctx.fillText(wrap(ctx, 'Doctor: ' + [d.doctor, d.doctorPhone].filter(Boolean).join(' · '), 600, 1)[0], 44, H - 40); }
    drawQR(ctx, qrText(d), W - 44 - 300, 150, 300, '#111111', '#FFFFFF');
    ctx.font = '500 22px ' + BODY; ctx.fillStyle = '#5B636E'; const t = 'Scan for full details';
    ctx.fillText(t, W - 44 - 150 - ctx.measureText(t).width / 2, 480);
    ctx.strokeStyle = '#D7192B'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  }

  // ---------- render ----------
  let raf = 0;
  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const d = read();
      drawWall(d, wall);
      drawCardFront(d, front);
      drawCardBack(d, back);
      const [W, H] = d.size.split('x').map(Number);
      document.querySelector('.phone').style.aspectRatio = W + ' / ' + H;
      document.querySelector('.phone').dataset.theme = d.theme;
    });
  }
  form.addEventListener('input', () => { render(); try { localStorage.setItem(KEY, JSON.stringify(serialize())); } catch (e) {} });
  form.addEventListener('change', () => { render(); try { localStorage.setItem(KEY, JSON.stringify(serialize())); } catch (e) {} });

  function download(canvas, name) {
    canvas.toBlob((b) => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }
  const slug = () => (read().name || 'my').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my';
  document.getElementById('dl-wall').addEventListener('click', () => download(wall, 'sos-lockscreen-' + slug() + '.png'));
  document.getElementById('dl-card').addEventListener('click', () => {
    const c = document.createElement('canvas'); c.width = front.width * 2 + 40; c.height = front.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(front, 0, 0); ctx.drawImage(back, front.width + 40, 0);
    ctx.setLineDash([10, 10]); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(front.width + 20, 0); ctx.lineTo(front.width + 20, c.height); ctx.stroke();
    download(c, 'sos-wallet-card-' + slug() + '.png');
  });
  document.getElementById('print').addEventListener('click', () => {
    document.getElementById('print-front').src = front.toDataURL();
    document.getElementById('print-back').src = back.toDataURL();
    setTimeout(() => window.print(), 150);
  });

  document.querySelectorAll('.tabs [role=tab]').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    document.getElementById('view-wall').hidden = t.dataset.view !== 'wall';
    document.getElementById('view-card').hidden = t.dataset.view !== 'card';
  }));

  function tick() {
    const n = new Date();
    document.getElementById('clock-t').textContent = n.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
    document.getElementById('clock-d').textContent = n.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick(); setInterval(tick, 30000);

  restore();
  const fontsReady = Promise.all([
    document.fonts.load('800 40px "Barlow Condensed"'), document.fonts.load('600 40px "Barlow Condensed"'),
    document.fonts.load('500 40px "Barlow"'), document.fonts.load('700 40px "Barlow"')
  ]).catch(() => {});
  fontsReady.then(render);
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

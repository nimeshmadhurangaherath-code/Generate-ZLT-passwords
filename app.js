/* =============================================================================
   ZLT Password Generator — production build
   - Vanilla JS, zero dependencies, zero build step.
   - Fixed rendering issue: Input fields no longer lose focus while typing.
   ========================================================================== */
(() => {
  'use strict';

  /* -------------------------------------------------------------------------
   * 1. ZLT / TOZED password algorithms
   * ----------------------------------------------------------------------- */
  const AMBIGUOUS = '1ILil';

  const alphabetChar = (m) =>
    m < 10 ? 48 + m : m < 36 ? 55 + m : 61 + m; 

  function generateFrom(data, { filterAmbiguous = true, numericOnly = false } = {}) {
    const len = data.length;
    if (!len) return '';
    const out = new Array(8);
    for (let i = 0; i < 8; i++) {
      let seed = 1;
      for (let j = 0; j < len; j++) {
        while (seed > 0xffffff) seed = ~seed & 0xffffff;
        const idx = (i + j) % len;
        const product = ((i + 1) * (j + 1)) & 0xff;
        seed = seed + data[idx] * product;
      }
      while (seed > 0xffffff) seed = ~seed & 0xffffff;
      let ch;
      if (numericOnly) {
        ch = 48 + (seed % 10);
      } else {
        ch = alphabetChar(seed % 52);
        if (filterAmbiguous && AMBIGUOUS.includes(String.fromCharCode(ch))) ch += 1;
      }
      out[i] = ch;
    }
    return String.fromCharCode(...out);
  }

  function formatMacBytes(mac) {
    const filtered = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const pairs = [];
    for (let i = 0; i < filtered.length; i += 2) pairs.push(filtered.slice(i, i + 2)); 
    const formatted = pairs.join(':');
    const bytes = new Array(formatted.length);
    for (let i = 0; i < formatted.length; i++) bytes[i] = formatted.charCodeAt(i);
    return { bytes, formatted };
  }

  function operatorPass(imei) {
    const c = String(imei || '').replace(/\s+/g, '');
    if (c.length < 15) return null;
    const data = new Array(c.length);
    for (let i = 0; i < c.length; i++) data[i] = c.charCodeAt(i);
    return generateFrom(data, { filterAmbiguous: true, numericOnly: false });
  }

  function userPass(mac) {
    const { bytes } = formatMacBytes(mac || '');
    if (!bytes.length) return null;
    return generateFrom(bytes, { filterAmbiguous: true, numericOnly: false });
  }

  function testPassword(imei) {
    const c = String(imei || '').replace(/\s+/g, '');
    if (c.length < 15) return null;
    for (let i = 0; i < c.length; i++) {
      const cc = c.charCodeAt(i);
      if (cc < 48 || cc > 57) return null;
    }
    const r = c.slice(7, 15);
    let acc = 0;
    const out = new Array(8);
    for (let i = 0; i < 8; i++) {
      acc = i + acc + (r.charCodeAt(i) - 48);
      out[i] = 48 + (acc % 10);
    }
    return String.fromCharCode(...out);
  }

  /* -------------------------------------------------------------------------
   * 2. Tiny DOM helper
   * ----------------------------------------------------------------------- */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  function svg(viewBox, attrs, ...children) {
    const el = document.createElementNS(svgNS, 'svg');
    el.setAttribute('viewBox', viewBox);
    el.setAttribute('aria-hidden', 'true');
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    for (const c of children.flat()) if (c) el.appendChild(c);
    return el;
  }
  function svgPath(d, extra = {}) {
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    for (const k in extra) p.setAttribute(k, extra[k]);
    return p;
  }

  /* -------------------------------------------------------------------------
   * 3. Inline icons
   * ----------------------------------------------------------------------- */
  const Icon = {
    cpu:        (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  rect(4,4,16,16,2), rect(9,9,6,6), line(15,2,15,4), line(15,20,15,22), line(20,9,22,9), line(20,14,22,14), line(2,9,4,9), line(2,14,4,14), line(9,2,9,4), line(9,20,9,22)),
    keyRound:   (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M2 18a4 4 0 0 1 4-4h.5a4.5 4.5 0 1 1 6.4-6.3L22 16l-3 3-2-2-2 2-2-2-2.6 2.6A4 4 0 0 1 2 18Z')),
    shieldCheck:(cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'), svgPath('m9 12 2 2 4-4')),
    wifi:       (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M5 13a10 10 0 0 1 14 0'), svgPath('M8.5 16.5a5 5 0 0 1 7 0'), svgPath('M2 8.5a15 15 0 0 1 20 0'), circle(12,20,1)),
    triangleAlert: (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'), line(12,9,12,13), circle(12,17,0.5)),
    sparkles:   (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5Z'), svgPath('M19 17v4'), svgPath('M17 19h4'), svgPath('M5 14v3'), svgPath('M3.5 15.5h3')),
    mapPin:     (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'), circle(12,10,3)),
    phone:      (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z')),
    github:     (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  svgPath('M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22')),
    check:      (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svgPath('M20 6 9 17l-5-5')),
    copy:       (cls) => svg('0 0 24 24', { class: cls, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                  rect(8,8,14,14,2), svgPath('M4 16V4a2 2 0 0 1 2-2h12')),
  };
  function rect(x,y,w,h,r){const e=document.createElementNS(svgNS,'rect');e.setAttribute('x',x-w/2);e.setAttribute('y',y-h/2);e.setAttribute('width',w);e.setAttribute('height',h);if(r)e.setAttribute('rx',r);e.setAttribute('fill','none');e.setAttribute('stroke','currentColor');e.setAttribute('stroke-width','2');return e;}
  function line(x1,y1,x2,y2){const e=document.createElementNS(svgNS,'line');e.setAttribute('x1',x1);e.setAttribute('y1',y1);e.setAttribute('x2',x2);e.setAttribute('y2',y2);e.setAttribute('stroke','currentColor');e.setAttribute('stroke-width','2');e.setAttribute('stroke-linecap','round');return e;}
  function circle(cx,cy,r){const e=document.createElementNS(svgNS,'circle');e.setAttribute('cx',cx);e.setAttribute('cy',cy);e.setAttribute('r',r);e.setAttribute('fill','none');e.setAttribute('stroke','currentColor');e.setAttribute('stroke-width','2');return e;}

  function LionMark(cls) {
    const root = document.createElementNS(svgNS, 'svg');
    root.setAttribute('viewBox', '0 0 64 64');
    root.setAttribute('class', cls);
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<defs><linearGradient id="lkLion" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#FFBE29"/><stop offset="100%" stop-color="#EB7400"/></linearGradient></defs>' +
      '<path fill="url(#lkLion)" d="M32 4l3 6 7-2-1 7 6 4-5 5 3 7-7 0-2 7-4-5-4 5-2-7-7 0 3-7-5-5 6-4-1-7 7 2z"/>' +
      '<circle cx="32" cy="34" r="10" fill="#8D153A" stroke="#FFBE29" stroke-width="1.5"/>' +
      '<path d="M26 33 q6 -6 12 0" stroke="#FFF4D9" stroke-width="1.5" fill="none"/>' +
      '<circle cx="29" cy="32" r="1.2" fill="#FFF4D9"/><circle cx="35" cy="32" r="1.2" fill="#FFF4D9"/>';
    return root;
  }
  function WhatsAppIcon(cls) {
    const root = document.createElementNS(svgNS, 'svg');
    root.setAttribute('viewBox', '0 0 24 24');
    root.setAttribute('class', cls);
    root.setAttribute('fill', 'currentColor');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<path d="M20.52 3.48A11.92 11.92 0 0 0 12.04 0C5.5 0 .17 5.33.17 11.88c0 2.1.55 4.13 1.6 5.93L0 24l6.33-1.66a11.9 11.9 0 0 0 5.7 1.45h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.17-3.4-8.43ZM12.05 21.5h-.01a9.6 9.6 0 0 1-4.9-1.34l-.35-.21-3.76.99 1-3.66-.23-.38a9.63 9.63 0 1 1 17.84-5.02c0 5.32-4.33 9.62-9.59 9.62Zm5.27-7.18c-.29-.14-1.7-.84-1.97-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.9 1.14-.17.19-.33.21-.62.07-.29-.14-1.22-.45-2.32-1.44a8.74 8.74 0 0 1-1.62-2.01c-.17-.29-.02-.45.13-.59.13-.13.29-.33.44-.5.15-.17.2-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.47-.64-.48h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.39s1.02 2.77 1.17 2.96c.14.19 2.02 3.09 4.9 4.34.68.3 1.22.47 1.63.6.68.22 1.3.19 1.79.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33Z"/>';
    return root;
  }

  /* -------------------------------------------------------------------------
   * 4. App state + components
   * ----------------------------------------------------------------------- */
  const state = { imei: '', mac: '', result: null, error: '' };

  const formatMac = (v) => {
    const hex = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
    return (hex.match(/.{1,2}/g) || []).join(':');
  };

  function ornaments() {
    return ['tl','tr','bl','br'].map(k => h('span', { class: 'lk-ornament ' + k }));
  }

  function Header() {
    return h('header', { class: 'relative z-10 px-4 sm:px-8 pt-8 sm:pt-12' },
      h('div', { class: 'mx-auto max-w-5xl flex items-center justify-between' },
        h('div', { class: 'flex items-center gap-3' },
          LionMark('h-10 w-10 sm:h-12 sm:w-12 drop-shadow'),
          h('div', null,
            h('div', { 'data-testid': 'brand-title', class: 'font-display text-lg sm:text-2xl font-extrabold tracking-tight text-lk-cream' },
              'ZLT PASSWORDS', h('span', { class: 'text-lk-gold' }, '.')),
            h('div', { class: 'text-[10px] sm:text-xs uppercase tracking-[0.28em] text-lk-gold-90' },
              'TOZED · Router key forge'))),
        h('div', { class: 'hidden sm:flex items-center gap-2 rounded-full border border-lk-gold-30 bg-lk-ink-50 px-3 py-1.5 text-xs text-lk-cream-80' },
          Icon.mapPin('h-3.5 w-3.5 text-lk-orange'), 'Made in Sri Lanka')));
  }

  function Hero() {
    return h('section', { class: 'relative z-10 px-4 sm:px-8 mt-10 sm:mt-16' },
      h('div', { class: 'mx-auto max-w-5xl' },
        h('div', { class: 'flex flex-col items-start gap-5' },
          h('span', { class: 'inline-flex items-center gap-2 rounded-full border border-lk-gold-30 bg-lk-maroon-30 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-lk-gold fade-in' },
            Icon.sparkles('h-3.5 w-3.5'), '100% Client-side · Serverless · Works offline'), 
          h('h1', { 'data-testid': 'hero-heading', class: 'font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight fade-in delay-1' },
            h('span', { class: 'text-lk-cream' }, 'Generate'), ' ',
            h('span', { class: 'text-lk-gold' }, 'ZLT'), ' ',
            h('span', { class: 'text-lk-cream' }, 'passwords'),
            h('br'),
            h('span', { class: 'text-lk-orange' }, 'in one tap'),
            h('span', { class: 'text-lk-gold' }, '.')),
          h('p', { class: 'max-w-2xl text-base sm:text-lg text-lk-cream-70 fade-in delay-2' },
            "Enter your router's ",
            h('span', { class: 'text-lk-gold font-semibold' }, 'IMEI'),
            ' and ',
            h('span', { class: 'text-lk-gold font-semibold' }, 'MAC address'),
            ' to forge the Test, Operator, and User passwords. Crafted with love from the pearl of the Indian Ocean.'))));
  }

  function Field({ icon, label, id, value, placeholder, onInput, count, max, valid, validLabel = 'Valid', invalidLabel, extraClass = '' }) {
    const input = h('input', {
      id, 'data-testid': id, type: 'text', autocomplete: 'off', spellcheck: 'false',
      placeholder, value, class: 'lk-input rounded-xl px-4 py-3 sm:py-3.5 font-mono text-base sm:text-lg ' + extraClass,
      'aria-describedby': id + '-help'
    });
    if (id === 'imei-input') input.setAttribute('inputmode', 'numeric');
    input.addEventListener('input', onInput);
    return h('label', { class: 'block', for: id },
      h('span', { class: 'flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-lk-gold mb-2' }, icon, ' ' + label),
      input,
      h('div', { id: id + '-help', class: 'mt-1.5 flex items-center justify-between text-[11px] text-lk-cream-55' },
        h('span', null, count + '/' + max + (id === 'imei-input' ? ' digits' : ' hex')),
        count > 0 && !valid ? h('span', { class: 'text-lk-orange' }, invalidLabel) : null,
        valid ? h('span', { class: 'text-lk-gold' }, validLabel) : null));
  }

  /* 
   * NEW FIX: Update only the needed DOM parts instead of a full re-render when typing
   */
  function updateFormUI() {
    const imeiDigits = state.imei.replace(/\D/g, '');
    const macHex = state.mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const imeiValid = imeiDigits.length === 15;
    const macValid  = macHex.length === 12;
    const canSubmit = imeiValid || macValid;

    const imeiHelp = document.getElementById('imei-input-help');
    if (imeiHelp) {
      imeiHelp.replaceWith(h('div', { id: 'imei-input-help', class: 'mt-1.5 flex items-center justify-between text-[11px] text-lk-cream-55' },
        h('span', null, imeiDigits.length + '/15 digits'),
        imeiDigits.length > 0 && !imeiValid ? h('span', { class: 'text-lk-orange' }, 'Need 15 digits') : null,
        imeiValid ? h('span', { class: 'text-lk-gold' }, 'Valid') : null
      ));
    }

    const macHelp = document.getElementById('mac-input-help');
    if (macHelp) {
      macHelp.replaceWith(h('div', { id: 'mac-input-help', class: 'mt-1.5 flex items-center justify-between text-[11px] text-lk-cream-55' },
        h('span', null, macHex.length + '/12 hex'),
        macHex.length > 0 && !macValid ? h('span', { class: 'text-lk-orange' }, 'Need 12 hex chars') : null,
        macValid ? h('span', { class: 'text-lk-gold' }, 'Valid') : null
      ));
    }

    const btn = document.querySelector('[data-testid="generate-btn"]');
    if (btn) {
      btn.disabled = !canSubmit;
      btn.setAttribute('aria-disabled', !canSubmit ? 'true' : 'false');
    }
  }

  function Form() {
    const imeiDigits = state.imei.replace(/\D/g, '');
    const macHex = state.mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const imeiValid = imeiDigits.length === 15;
    const macValid  = macHex.length === 12;
    const canSubmit = imeiValid || macValid;

    const imeiField = Field({
      icon: Icon.cpu('h-3.5 w-3.5'),
      label: 'IMEI (15 digits)', id: 'imei-input',
      value: state.imei, placeholder: 'e.g. 866758041234567',
      onInput: (e) => { 
        const start = e.target.selectionStart;
        const oldVal = e.target.value;
        const newVal = oldVal.replace(/\D/g, '').slice(0, 15);
        if (oldVal !== newVal) {
          e.target.value = newVal;
          const diff = oldVal.length - newVal.length;
          e.target.setSelectionRange(start - diff, start - diff);
        }
        state.imei = newVal;
        updateFormUI(); // Fix applied here
      },
      count: imeiDigits.length, max: 15, valid: imeiValid, invalidLabel: 'Need 15 digits',
    });
    
    const macField = Field({
      icon: Icon.wifi('h-3.5 w-3.5'),
      label: 'MAC Address', id: 'mac-input',
      value: state.mac, placeholder: 'AA:BB:CC:DD:EE:FF',
      onInput: (e) => { 
        const start = e.target.selectionStart;
        const oldVal = e.target.value;
        const newVal = formatMac(oldVal);
        if (oldVal !== newVal) {
          e.target.value = newVal;
          const diff = newVal.length - oldVal.length;
          const newPos = Math.max(0, start + diff);
          e.target.setSelectionRange(newPos, newPos);
        }
        state.mac = newVal;
        updateFormUI(); // Fix applied here
      },
      count: macHex.length, max: 12, valid: macValid, invalidLabel: 'Need 12 hex chars',
      extraClass: 'uppercase',
    });

    const submitBtn = h('button', {
      type: 'submit', 'data-testid': 'generate-btn', disabled: !canSubmit,
      class: 'lk-btn inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 sm:py-3.5 text-sm uppercase tracking-[0.18em]',
      'aria-disabled': !canSubmit ? 'true' : 'false',
    }, Icon.keyRound('h-4 w-4'), 'Generate passwords');

    const form = h('form', {
      'data-testid': 'generate-form', novalidate: true, 
      class: 'relative lk-glass rounded-3xl p-5 sm:p-8 fade-in delay-3', 'aria-label': 'Password generator',
    },
      ...ornaments(),
      h('div', { class: 'grid gap-5 sm:grid-cols-2' }, imeiField, macField),
      h('div', { class: 'mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between' },
        h('div', { class: 'flex items-center gap-2 text-xs text-lk-cream-60' },
          Icon.shieldCheck('h-4 w-4 text-lk-green'), 'Runs in your browser · Nothing leaves your device'),
        submitBtn),
      state.error ? h('div', {
        'data-testid': 'error-message', role: 'alert',
        class: 'mt-4 flex items-start gap-2 rounded-xl border border-lk-orange-50 bg-lk-orange-10 px-4 py-3 text-sm text-lk-cream',
      }, Icon.triangleAlert('h-4 w-4 mt-0.5 text-lk-orange flex-shrink-0'), h('span', null, state.error)) : null,
    );
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      state.error = '';
      if (!imeiValid && !macValid) {
        state.error = 'Enter a 15-digit IMEI or a 12-character MAC address.';
        state.result = null;
        rerender(); return;
      }
      const warnings = [];
      const next = { testPassword: null, operatorPassword: null, userPassword: null, warnings };
      if (imeiValid) {
        next.testPassword = testPassword(imeiDigits);
        next.operatorPassword = operatorPass(imeiDigits);
      } else warnings.push('IMEI not provided — skipping Test and Operator passwords.');
      if (macValid) next.userPassword = userPass(macHex);
      else warnings.push('MAC not provided — skipping User password.');
      state.result = next;
      rerender();
    });
    return h('section', { class: 'relative z-10 px-4 sm:px-8 mt-10 sm:mt-14' },
      h('div', { class: 'mx-auto max-w-5xl' }, form));
  }

  function CopyButton(value, label) {
    const btn = h('button', {
      type: 'button', 'data-testid': 'copy-' + label + '-btn',
      'aria-label': 'Copy ' + label + ' password',
      class: 'inline-flex items-center gap-1.5 rounded-full border border-lk-gold-40 bg-lk-ink-40 px-3 py-1.5 text-xs font-semibold text-lk-gold transition-colors',
    }, Icon.copy('h-3.5 w-3.5'), 'Copy');
    btn.addEventListener('click', async () => {
      if (!value) return;
      const setCopied = () => {
        btn.replaceChildren(Icon.check('h-3.5 w-3.5'), document.createTextNode('Copied'));
        setTimeout(() => btn.replaceChildren(Icon.copy('h-3.5 w-3.5'), document.createTextNode('Copy')), 1600);
      };
      try { await navigator.clipboard.writeText(value); setCopied(); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = value; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); setCopied(); } catch {}
        document.body.removeChild(ta);
      }
    });
    return btn;
  }

  function PasswordCard({ icon, title, subtitle, value, testid, highlight }) {
    const display = value || '—';
    return h('div', {
      'data-testid': testid,
      class: 'relative lk-card rounded-2xl p-5 sm:p-6 fade-in' + (highlight ? ' ring-1' : ''),
    },
      ...ornaments(),
      h('div', { class: 'flex items-start justify-between gap-3' },
        h('div', { class: 'flex items-center gap-3' },
          h('div', { class: 'rounded-xl border border-lk-gold-40 bg-lk-ink-60 p-2.5 text-lk-gold' }, icon),
          h('div', null,
            h('div', { class: 'font-display text-sm uppercase tracking-[0.18em] text-lk-gold' }, title),
            h('div', { class: 'text-xs text-lk-cream-70' }, subtitle))),
        value ? CopyButton(value, testid) : null),
      h('div', { class: 'mt-4 flex items-center gap-2 overflow-x-auto' },
        h('span', { 'data-testid': testid + '-value', class: 'font-mono text-2xl sm:text-3xl font-bold text-lk-cream break-all' }, display)));
  }

  const PLACEHOLDERS = [
    { key: 'operator', label: 'Operator' },
    { key: 'user',     label: 'User' },
    { key: 'test',     label: 'Test' },
  ];

  function Results() {
    let body;
    if (state.result) {
      const r = state.result;
      const cards = [
        PasswordCard({ icon: Icon.shieldCheck('h-5 w-5'), title: 'Operator',        subtitle: 'Admin / Operator login', value: r.operatorPassword, testid: 'operator-password', highlight: true }),
        PasswordCard({ icon: Icon.keyRound('h-5 w-5'),    title: 'User (TZ_USER)',  subtitle: 'Default user login',     value: r.userPassword,     testid: 'user-password' }),
        PasswordCard({ icon: Icon.cpu('h-5 w-5'),         title: 'Test (sztozed)',  subtitle: 'Test / diagnostic',      value: r.testPassword,     testid: 'test-password' }),
      ];
      if (r.warnings && r.warnings.length) {
        cards.push(h('div', { class: 'sm:col-span-3 rounded-xl border border-lk-gold-30 bg-lk-ink-40 px-4 py-3 text-xs text-lk-cream-75' },
          h('div', { class: 'flex items-center gap-2 font-semibold text-lk-gold mb-1' },
            Icon.triangleAlert('h-3.5 w-3.5'), ' Notes'),
          h('ul', { class: 'list-disc pl-5 space-y-0.5' }, ...r.warnings.map(t => h('li', null, t)))));
      }
      body = h('div', { 'data-testid': 'results-section', class: 'grid gap-4 sm:grid-cols-3' }, ...cards);
    } else {
      body = h('div', { class: 'grid gap-4 sm:grid-cols-3 opacity-60' },
        ...PLACEHOLDERS.map(p =>
          h('div', { class: 'relative lk-glass rounded-2xl p-5 sm:p-6 h-[132px] flex flex-col justify-between' },
            h('div', { class: 'text-xs uppercase tracking-[0.2em] text-lk-gold-80' }, p.label + ' password'),
            h('div', { class: 'font-mono text-xl text-lk-cream-40-mono' }, '••••••••'))));
    }
    return h('section', { class: 'relative z-10 px-4 sm:px-8 mt-8 sm:mt-10 pb-16', 'aria-live': 'polite' },
      h('div', { class: 'mx-auto max-w-5xl' }, body));
  }

  function Footer() {
    const phone = '+94 78 455 5513';
    const raw = '+94784555513';
    const year = new Date().getFullYear();
    return h('footer', { class: 'relative z-10 border-t border-lk-gold-20 bg-lk-ink-60 backdrop-blur' },
      h('div', { class: 'mx-auto max-w-5xl px-4 sm:px-8 py-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between' },
        h('div', { class: 'flex items-center gap-3' },
          LionMark('h-8 w-8'),
          h('div', null,
            h('div', { class: 'font-display text-sm font-bold text-lk-cream' }, 'ZLT PASSWORDS', h('span', { class: 'text-lk-gold' }, '.')),
            h('div', { class: 'text-[11px] uppercase tracking-[0.22em] text-lk-gold-80' }, 'Made with ', h('span', { class: 'text-lk-orange' }, '♥'), ' in Sri Lanka'))),
        h('div', { class: 'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5' },
          h('a', { href: 'tel:' + raw, 'data-testid': 'contact-phone', 'aria-label': 'Call ' + phone,
            class: 'inline-flex items-center gap-2 rounded-full border border-lk-gold-40 bg-lk-maroon-40 px-4 py-2 text-sm font-semibold text-lk-cream transition-colors' },
            Icon.phone('h-4 w-4'), phone),
          h('a', { href: 'https://wa.me/' + raw.replace('+',''), target: '_blank', rel: 'noopener noreferrer',
            'data-testid': 'contact-whatsapp', 'aria-label': 'Contact us on WhatsApp',
            class: 'inline-flex items-center gap-2 rounded-full border border-lk-green-60 bg-lk-green-30 px-4 py-2 text-sm font-semibold text-lk-cream transition-colors' },
            WhatsAppIcon('h-4 w-4'), 'WhatsApp'))),
      h('div', { class: 'mx-auto max-w-5xl px-4 sm:px-8 pb-6 flex items-center justify-center' },
        h('a', { href: 'https://github.com/', rel: 'noopener', class: 'inline-flex items-center gap-2 text-[11px] text-lk-cream-40 transition-colors' },
          Icon.github('h-3.5 w-3.5'), ' Open source · static site')),
      h('div', { class: 'text-center text-[10px] text-lk-cream-40 pb-4 tracking-widest uppercase' },
        '© ' + year + ' · ZLT Passwords · Sri Lanka 🇱🇰'));
  }

  /* -------------------------------------------------------------------------
   * 5. Render
   * ----------------------------------------------------------------------- */
  const root = document.getElementById('root');

  function rerender() {
    // Only used for the initial load and when clicking the 'Generate' button
    root.replaceChildren(Header(), Hero(), Form(), Results(), Footer());
  }

  rerender();

  /* JSON-LD for SEO */
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: 'ZLT Password Generator', applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any', inLanguage: 'en-LK',
    description: 'ZLT / TOZED router password generator for Sri Lanka.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'LKR' },
  });
  document.head.appendChild(ld);
})();

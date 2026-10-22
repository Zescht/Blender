(() => {
  const SIZE = 5;
  const KEY = 'blender-draft-v1';
  // Pick order; also the order "auto-advance" walks through.
  const ORDER = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];
  // Which earlier comp is banned for this comp (Project Blender FAQ).
  const BAN_SOURCE = { A1: null, B1: null, A2: 'A1', B2: 'B1', A3: 'A1', B3: 'B2' };
  // Comps that end up banned somewhere, with the colour used in the explainer.
  const TINT = { A1: 'grey', B1: 'green', B2: 'red' };
  const BANS_ON = { A1: 'Maps 2 & 3', B1: 'Map 2', B2: 'Map 3' };
  const MAP_ROLE = ['Team A pick', 'Team B pick', 'Decider'];
  const ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];

  const agentById = Object.fromEntries(AGENTS.map(a => [a.id, a]));
  const mapById = Object.fromEntries(MAPS.map(m => [m.id, m]));
  const teamOf = c => c[0];
  const mapOf = c => Number(c[1]);
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

  const $ = sel => document.querySelector(sel);
  const mapCols = $('#map-cols');
  const poolGrid = $('#pool-grid');
  const poolTarget = $('#pool-target');
  const search = $('#search');

  let filter = { role: 'All', q: '' };
  let state = load();

  function blank() {
    return {
      comps: Object.fromEntries(ORDER.map(c => [c, []])),
      maps: [null, null, null],
      names: { A: 'Team A', B: 'Team B' },
      active: 'A1',
    };
  }

  function load() {
    const s = blank();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved === 'object') {
        for (const c of ORDER) {
          const list = Array.isArray(saved.comps?.[c]) ? saved.comps[c] : [];
          s.comps[c] = [...new Set(list.filter(id => agentById[id]))].slice(0, SIZE);
        }
        if (Array.isArray(saved.maps)) s.maps = [0, 1, 2].map(i => (mapById[saved.maps[i]] ? saved.maps[i] : null));
        for (const t of ['A', 'B']) if (typeof saved.names?.[t] === 'string') s.names[t] = saved.names[t];
        if (ORDER.includes(saved.active)) s.active = saved.active;
      }
    } catch { /* storage unavailable or corrupt: start fresh */ }
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const teamName = t => state.names[t].trim() || `Team ${t}`;
  const icon = id => `assets/agents/${id}.png`;

  function banned(comp) {
    const src = BAN_SOURCE[comp];
    return new Set(src ? state.comps[src] : []);
  }

  function banReason(comp) {
    const src = BAN_SOURCE[comp];
    return `${teamName(teamOf(comp))} played it on Map ${mapOf(src)}`;
  }

  /* ---------- Board ---------- */

  function renderBans(comp) {
    const src = BAN_SOURCE[comp];
    const list = src ? state.comps[src] : [];
    const tint = src ? TINT[src] : '';
    let boxes = '';
    for (let i = 0; i < SIZE; i++) {
      const id = list[i];
      boxes += id
        ? `<span class="ban has tint-${tint}" title="${esc(agentById[id].name)} — banned"><img src="${icon(id)}" alt="${esc(agentById[id].name)}"></span>`
        : '<span class="ban"></span>';
    }
    const label = src
      ? `Banned: <b>${esc(teamName(teamOf(comp)))}</b>'s<br>Map ${mapOf(src)} comp`
      : 'No bans<br>on Map 1';
    return `<div class="bans"><div class="ban-slots">${boxes}</div><span class="ban-label">${label}</span></div>`;
  }

  function renderComp(comp) {
    const list = state.comps[comp];
    const ban = banned(comp);
    const tint = TINT[comp];
    let slots = '';
    for (let i = 0; i < SIZE; i++) {
      const id = list[i];
      if (id) {
        const a = agentById[id];
        const conflict = ban.has(id);
        const title = conflict ? `${a.name} is banned here (${banReason(comp)}). Click to remove.` : `${a.name} (${a.role}). Click to remove.`;
        slots += `<button type="button" class="slot filled${conflict ? ' conflict' : ''}" data-comp="${comp}" data-idx="${i}" title="${esc(title)}"><img src="${icon(id)}" alt="${esc(a.name)}"></button>`;
      } else {
        slots += `<button type="button" class="slot" data-comp="${comp}" data-idx="${i}" aria-label="Empty slot"></button>`;
      }
    }
    const tag = tint
      ? `<span class="tag tag-${tint}" title="This comp gets banned for ${esc(teamName(teamOf(comp)))} on ${BANS_ON[comp]}">Banned ${BANS_ON[comp]}</span>`
      : '';
    return `
      <div class="comp${state.active === comp ? ' active' : ''}" data-comp="${comp}"${tint ? ` data-tint="${tint}"` : ''}>
        <div class="comp-head">
          <span class="comp-name">${esc(teamName(teamOf(comp)))} <span class="comp-count">${list.length}/${SIZE}</span></span>
          ${tag}
        </div>
        <div class="slots">${slots}</div>
      </div>`;
  }

  function renderMapSelect(i) {
    const taken = new Set(state.maps.filter((m, j) => m && j !== i));
    const opts = MAPS.filter(m => !taken.has(m.id))
      .map(m => `<option value="${m.id}"${state.maps[i] === m.id ? ' selected' : ''}>${esc(m.name)}</option>`)
      .join('');
    return `<select class="map-select" data-map="${i}" aria-label="Map ${i + 1}"><option value="">Choose map…</option>${opts}</select>`;
  }

  function renderBoard() {
    mapCols.innerHTML = [1, 2, 3].map(n => {
      const mapId = state.maps[n - 1];
      const banner = mapId ? ` style="--banner:url('assets/maps/${mapId}.png')"` : '';
      return `
        <div class="col">
          <div class="col-head"${banner}>
            <div class="map-title"><span class="map-no">Map 0${n}</span><span class="map-role">${MAP_ROLE[n - 1]}</span></div>
            ${renderMapSelect(n - 1)}
          </div>
          <div class="band band-a">
            ${renderBans('A' + n)}
            ${renderComp('A' + n)}
          </div>
          <div class="band band-b">
            ${renderComp('B' + n)}
            ${renderBans('B' + n)}
          </div>
        </div>`;
    }).join('');
  }

  /* ---------- Pool ---------- */

  function renderChips() {
    $('#role-chips').innerHTML = ['All', ...ROLES].map(r => {
      const img = r === 'All' ? '' : `<img src="assets/roles/${slug(r)}.png" alt="">`;
      return `<button type="button" class="chip${filter.role === r ? ' on' : ''}" data-role="${r}">${img}${r}</button>`;
    }).join('');
  }

  function renderPool() {
    const comp = state.active;
    const list = state.comps[comp];
    const ban = banned(comp);
    const full = list.length >= SIZE;
    const mapId = state.maps[mapOf(comp) - 1];
    const available = AGENTS.filter(a => !ban.has(a.id)).length;

    poolTarget.innerHTML =
      `Picking for <span class="hl">${esc(teamName(teamOf(comp)))}</span> · <b>Map ${mapOf(comp)}</b>` +
      `${mapId ? ` (${esc(mapById[mapId].name)})` : ''} <span class="muted">· ${list.length}/${SIZE} picked · ${available} of ${AGENTS.length} available</span>`;

    const q = filter.q.trim().toLowerCase();
    poolGrid.innerHTML = ROLES
      .filter(r => filter.role === 'All' || filter.role === r)
      .map(role => {
        const agents = AGENTS.filter(a => a.role === role && (!q || a.name.toLowerCase().includes(q)));
        if (!agents.length) return '';
        const buttons = agents.map(a => {
          const isPicked = list.includes(a.id);
          const isBanned = ban.has(a.id) && !isPicked;
          const cls = ['agent', isPicked && 'picked', isBanned && 'banned', full && 'full'].filter(Boolean).join(' ');
          const title = isBanned ? `${a.name}: banned (${banReason(comp)})` : isPicked ? `${a.name}: picked, click to remove` : a.name;
          return `<button type="button" class="${cls}" data-id="${a.id}" title="${esc(title)}"${isBanned ? ' aria-disabled="true"' : ''}>
              <span class="pic"><img src="${icon(a.id)}" alt="" loading="lazy"></span>
              <span class="label">${esc(a.name)}</span>
            </button>`;
        }).join('');
        return `<div class="role-row">
            <div class="role-name"><img src="assets/roles/${slug(role)}.png" alt="">${role}</div>
            <div class="agents">${buttons}</div>
          </div>`;
      }).join('') || '<p class="muted">No agent matches.</p>';
  }

  function render() {
    renderBoard();
    renderPool();
    save();
  }

  /* ---------- Actions ---------- */

  function nextOpenComp(from) {
    const start = ORDER.indexOf(from);
    for (let k = 1; k <= ORDER.length; k++) {
      const c = ORDER[(start + k) % ORDER.length];
      if (state.comps[c].length < SIZE) return c;
    }
    return from;
  }

  function toggleAgent(id) {
    const comp = state.active;
    const list = state.comps[comp];
    if (list.includes(id)) {
      state.comps[comp] = list.filter(x => x !== id);
    } else {
      if (banned(comp).has(id)) return toast(`${agentById[id].name} is banned: ${banReason(comp)}`);
      if (list.length >= SIZE) return toast('This comp is full. Remove an agent first.');
      list.push(id);
      if (list.length === SIZE) state.active = nextOpenComp(comp);
    }
    render();
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function asText() {
    const name = id => agentById[id].name;
    const lines = [];
    for (const n of [1, 2, 3]) {
      const m = state.maps[n - 1];
      lines.push(`Map ${n} (${MAP_ROLE[n - 1]})${m ? ` – ${mapById[m].name}` : ''}`);
      for (const t of ['A', 'B']) {
        const c = t + n;
        const picks = state.comps[c].map(name).join(', ') || '–';
        const src = BAN_SOURCE[c];
        const bans = src && state.comps[src].length ? `  [banned: ${state.comps[src].map(name).join(', ')}]` : '';
        lines.push(`  ${teamName(t)}: ${picks}${bans}`);
      }
    }
    return lines.join('\n');
  }

  /* ---------- Events ---------- */

  mapCols.addEventListener('click', e => {
    const slot = e.target.closest('.slot');
    const compEl = e.target.closest('.comp');
    if (!compEl) return;
    const comp = compEl.dataset.comp;
    if (slot && slot.classList.contains('filled')) {
      state.comps[comp].splice(Number(slot.dataset.idx), 1);
    }
    state.active = comp;
    render();
  });

  mapCols.addEventListener('change', e => {
    const sel = e.target.closest('.map-select');
    if (!sel) return;
    state.maps[Number(sel.dataset.map)] = sel.value || null;
    render();
  });

  poolGrid.addEventListener('click', e => {
    const btn = e.target.closest('.agent');
    if (btn) toggleAgent(btn.dataset.id);
  });

  $('#role-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter.role = chip.dataset.role;
    renderChips();
    renderPool();
  });

  search.addEventListener('input', () => {
    filter.q = search.value;
    renderPool();
  });

  // Enter in search picks the single visible available agent.
  search.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const btns = [...poolGrid.querySelectorAll('.agent:not(.banned)')];
    if (btns.length === 1) {
      toggleAgent(btns[0].dataset.id);
      search.value = '';
      filter.q = '';
      renderPool();
    }
  });

  for (const t of ['A', 'B']) {
    const input = $(`#name-${t}`);
    input.value = state.names[t];
    input.addEventListener('input', () => {
      state.names[t] = input.value;
      render();
    });
  }

  $('#rules-btn').addEventListener('click', () => $('#rules').showModal());

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Clear all comps and maps?')) return;
    const names = state.names;
    state = blank();
    state.names = names;
    render();
  });

  $('#copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast('Draft copied to clipboard');
    } catch {
      toast('Clipboard not available');
    }
  });

  renderChips();
  render();
})();

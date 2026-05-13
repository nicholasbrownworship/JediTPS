/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */

const state = {
  activeKey:     null,
  editMode:      false,
  editContent:   '',
  rawMarkdown:   '',   // current doc's raw source (for checkbox toggling)
};


/* ════════════════════════════════════════
   MARKED CONFIG
════════════════════════════════════════ */

marked.use({ gfm: true, breaks: false });


/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */

async function init() {
  await buildNav();
  await loadProgressFromSystems();
  openFile('DESIGN');
}


/* ════════════════════════════════════════
   NAV
════════════════════════════════════════ */

const NAV_META = {
  README:   { label: 'Overview',        icon: '◎' },
  DESIGN:   { label: 'Design Document', icon: '◈' },
  SYSTEMS:  { label: 'Systems Map',     icon: '◇' },
  SESSIONS: { label: 'Session Log',     icon: '◆' },
};

async function buildNav() {
  const res = await fetch('/api/files');
  const files = await res.json();
  const container = document.getElementById('navItems');

  const order = ['README', 'DESIGN', 'SYSTEMS', 'SESSIONS'];
  order.forEach(key => {
    const file = files.find(f => f.key === key);
    if (!file) return;
    const meta = NAV_META[key] || { label: file.label, icon: '○' };

    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.key = key;
    item.innerHTML = `<em class="nav-icon">${meta.icon}</em> ${meta.label}`;
    item.addEventListener('click', () => {
      if (!state.editMode) openFile(key);
    });
    container.appendChild(item);
  });
}

function setActiveNav(key) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.key === key);
  });
}


/* ════════════════════════════════════════
   LOAD FILE
════════════════════════════════════════ */

async function openFile(key) {
  setActiveNav(key);
  state.activeKey = key;
  state.editMode  = false;

  // Loading state
  const content = document.getElementById('content');
  content.className = 'content';
  content.innerHTML = '<div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  document.getElementById('docTitle').textContent = NAV_META[key]?.label || key;
  document.getElementById('docMeta').textContent  = '';
  document.getElementById('topbarActions').innerHTML = '';

  try {
    const res  = await fetch(`/api/file/${key}`);
    const data = await res.json();

    state.rawMarkdown = data.content;
    renderView(key, data.content, data.modified);

    if (key === 'SYSTEMS') updateProgress(data.content);
  } catch {
    content.innerHTML = '<div class="loading">Failed to load document.</div>';
  }
}

function renderView(key, markdown, modified) {
  const content = document.getElementById('content');
  content.className = 'content';

  const div = document.createElement('div');
  div.className = 'md';
  div.innerHTML = parseMarkdown(markdown);
  content.innerHTML = '';
  content.appendChild(div);

  // Make checkboxes interactive
  attachCheckboxHandlers(div, key);

  // Topbar
  const meta = NAV_META[key]?.label || key;
  document.getElementById('docTitle').textContent = meta;
  document.getElementById('docMeta').textContent  = modified
    ? `Updated ${fmt(new Date(modified))}`
    : '';

  // Actions
  const actions = document.getElementById('topbarActions');
  actions.innerHTML = '';

  const dl = make('button', { class: 'btn btn-ghost' }, '↓ &nbsp;Download');
  dl.addEventListener('click', () => { window.location.href = `/download/${key}`; });

  const edit = make('button', { class: 'btn btn-primary' }, '✎ &nbsp;Edit');
  edit.addEventListener('click', () => enterEditMode(key, markdown));

  actions.append(dl, edit);
}


/* ════════════════════════════════════════
   MARKDOWN
════════════════════════════════════════ */

function parseMarkdown(src) {
  // Render, then un-disable checkboxes so we can attach real handlers
  return marked.parse(src).replace(
    /<input type="checkbox" disabled/g,
    '<input type="checkbox" class="task-check"'
  );
}


/* ════════════════════════════════════════
   INTERACTIVE CHECKBOXES
   Clicking a checkbox instantly saves.
════════════════════════════════════════ */

function attachCheckboxHandlers(container, key) {
  const boxes = container.querySelectorAll('input.task-check');
  boxes.forEach((cb, idx) => {
    cb.addEventListener('change', async (e) => {
      const checked  = e.target.checked;
      const updated  = toggleNthCheckbox(state.rawMarkdown, idx, checked);
      if (updated === null) { e.target.checked = !checked; return; }

      const saved = await saveContent(key, updated);
      if (saved) {
        state.rawMarkdown = updated;
        if (key === 'SYSTEMS') updateProgress(updated);
        showToast('Progress saved', 'ok');
      } else {
        e.target.checked = !checked; // revert
      }
    });
  });
}

function toggleNthCheckbox(src, n, newState) {
  const regex = /- \[[ xX]\]/g;
  const matches = [];
  let m;
  while ((m = regex.exec(src)) !== null) matches.push(m);
  if (n >= matches.length) return null;
  const target  = matches[n];
  const replace = newState ? '- [x]' : '- [ ]';
  return src.slice(0, target.index) + replace + src.slice(target.index + target[0].length);
}


/* ════════════════════════════════════════
   EDIT MODE
════════════════════════════════════════ */

function enterEditMode(key, markdown) {
  state.editMode    = true;
  state.editContent = markdown;

  // Split-pane layout
  const content = document.getElementById('content');
  content.className = 'content edit-mode';
  content.innerHTML = `
    <div class="editor-pane">
      <div class="pane-header">Markdown Source</div>
      <textarea class="editor-textarea" id="editorTA" spellcheck="false"></textarea>
    </div>
    <div class="preview-pane">
      <div class="pane-header">Live Preview</div>
      <div class="preview-pane-content">
        <div class="md" id="editorPreview"></div>
      </div>
    </div>`;

  const ta = document.getElementById('editorTA');
  ta.value = markdown;
  refreshPreview(markdown);

  ta.addEventListener('input', () => {
    state.editContent = ta.value;
    refreshPreview(ta.value);
  });

  // Tab → spaces
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });

  // Topbar edit controls
  document.getElementById('docTitle').textContent = `Editing — ${NAV_META[key]?.label || key}`;
  document.getElementById('docMeta').textContent  = 'Ctrl+S to save';

  const actions = document.getElementById('topbarActions');
  actions.innerHTML = '';

  const saveBtn   = make('button', { class: 'btn btn-success' }, '✓ &nbsp;Save');
  const cancelBtn = make('button', { class: 'btn btn-ghost'   }, '✕ &nbsp;Cancel');

  saveBtn.addEventListener(  'click', () => commitEdit(key));
  cancelBtn.addEventListener('click', () => exitEditMode());

  actions.append(saveBtn, cancelBtn);
  ta.focus();
}

function refreshPreview(markdown) {
  const el = document.getElementById('editorPreview');
  if (el) el.innerHTML = parseMarkdown(markdown);
}

async function commitEdit(key) {
  const saveBtn = document.querySelector('#topbarActions .btn-success');
  if (saveBtn) { saveBtn.textContent = '…'; saveBtn.disabled = true; }

  const ok = await saveContent(key, state.editContent);

  if (ok) {
    showToast('Saved', 'ok');
    exitEditMode();
    openFile(key);
  } else {
    if (saveBtn) { saveBtn.innerHTML = '✓ &nbsp;Save'; saveBtn.disabled = false; }
  }
}

function exitEditMode() {
  state.editMode = false;
  if (state.activeKey) openFile(state.activeKey);
}


/* ════════════════════════════════════════
   SAVE (shared by edit mode + checkboxes)
════════════════════════════════════════ */

async function saveContent(key, content) {
  try {
    const res  = await fetch(`/api/file/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (res.ok) return true;
    showToast(data.error || 'Save failed', 'err');
    return false;
  } catch {
    showToast('Network error — could not save', 'err');
    return false;
  }
}


/* ════════════════════════════════════════
   PASSWORD MODAL (for checkbox saves)
════════════════════════════════════════ */

function promptPassword(title, sub) {
  return new Promise((resolve) => {
    const overlay  = document.getElementById('pwdModalOverlay');
    const titleEl  = document.getElementById('pwdModalTitle');
    const subEl    = document.getElementById('pwdModalSub');
    const input    = document.getElementById('pwdModalInput');
    const confirm  = document.getElementById('pwdModalConfirm');
    const cancel   = document.getElementById('pwdModalCancel');

    titleEl.textContent = title;
    subEl.textContent   = sub;
    input.value         = '';
    overlay.hidden      = false;
    setTimeout(() => input.focus(), 60);

    function done(val) {
      overlay.hidden = true;
      confirm.removeEventListener('click', onConfirm);
      cancel.removeEventListener( 'click', onCancel);
      input.removeEventListener(  'keydown', onKey);
      resolve(val);
    }

    function onConfirm() {
      const v = input.value.trim();
      if (!v) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
      }
      done(v);
    }

    function onCancel() { done(null); }

    function onKey(e) {
      if (e.key === 'Enter')  onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    confirm.addEventListener('click', onConfirm);
    cancel.addEventListener( 'click', onCancel);
    input.addEventListener(  'keydown', onKey);
  });
}


/* ════════════════════════════════════════
   PROGRESS BARS
════════════════════════════════════════ */

const TIER_REGEX = [
  { id: 't1', re: /## Tier 1[\s\S]*?(?=## Tier 2|$)/ },
  { id: 't2', re: /## Tier 2[\s\S]*?(?=## Tier 3|$)/ },
  { id: 't3', re: /## Tier 3[\s\S]*?(?=## Tier 4|$)/ },
  { id: 't4', re: /## Tier 4[\s\S]*?$/               },
];

function updateProgress(src) {
  TIER_REGEX.forEach(({ id, re }) => {
    const block = (src.match(re) || [''])[0];
    const total = (block.match(/- \[[ xX]\]/g) || []).length;
    const done  = (block.match(/- \[[xX]\]/g)  || []).length;

    const countEl = document.getElementById(`count-${id}`);
    const fillEl  = document.getElementById(`fill-${id}`);
    if (countEl) countEl.textContent = `${done}/${total}`;
    if (fillEl)  fillEl.style.width  = total ? `${(done / total) * 100}%` : '0%';
  });
}

async function loadProgressFromSystems() {
  try {
    const res  = await fetch('/api/file/SYSTEMS');
    const data = await res.json();
    updateProgress(data.content);
  } catch {}
}


/* ════════════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════════════ */

document.addEventListener('keydown', (e) => {
  if (state.editMode) {
    if (e.key === 'Escape') exitEditMode();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (state.activeKey) commitEdit(state.activeKey);
    }
  }
});


/* ════════════════════════════════════════
   UTILS
════════════════════════════════════════ */

function fmt(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function make(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = html;
  return el;
}

function showToast(msg, type = 'ok') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}


/* ════════════════════════════════════════
   START
════════════════════════════════════════ */

init();

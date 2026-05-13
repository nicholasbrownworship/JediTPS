/* ════════════════════════════════════════
   GITHUB CONFIG  (used for saves only)
════════════════════════════════════════ */

const GITHUB_REPO   = 'nicholasbrownworship/JediTPS';
const GITHUB_BRANCH = 'main';

// Paths within the repo — used by the GitHub API when saving
const FILE_PATHS = {
  README:   'README.md',
  DESIGN:   'docs/DESIGN.md',
  SYSTEMS:  'docs/SYSTEMS.md',
  SESSIONS: 'docs/SESSIONS.md',
};

// Relative URLs for reads — these files sit next to index.html
// (README.md is copied into docs/ by the Actions workflow,
//  and served from root by the local Express server)
const RELATIVE_PATHS = {
  README:   'README.md',
  DESIGN:   'DESIGN.md',
  SYSTEMS:  'SYSTEMS.md',
  SESSIONS: 'SESSIONS.md',
};

// True when running via the local Express server
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);


/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */

const state = {
  activeKey:   null,
  editMode:    false,
  editContent: '',
  rawMarkdown: '',
};


/* ════════════════════════════════════════
   MARKED CONFIG
════════════════════════════════════════ */

marked.use({ gfm: true, breaks: false });


/* ════════════════════════════════════════
   GITHUB TOKEN (stored in localStorage)
════════════════════════════════════════ */

const TOKEN_KEY = 'jedi_gh_token';

function getToken()    { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(tok) {
  if (tok) localStorage.setItem(TOKEN_KEY, tok);
  else     localStorage.removeItem(TOKEN_KEY);
  updateTokenUI();
}

function githubHeaders() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}


/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */

async function init() {
  await buildNav();
  initTokenUI();
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
  const container = document.getElementById('navItems');
  ['README', 'DESIGN', 'SYSTEMS', 'SESSIONS'].forEach(key => {
    const meta = NAV_META[key];
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.key = key;
    item.innerHTML = `<em class="nav-icon">${meta.icon}</em> ${meta.label}`;
    item.addEventListener('click', () => { if (!state.editMode) openFile(key); });
    container.appendChild(item);
  });
}

function setActiveNav(key) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.key === key);
  });
}


/* ════════════════════════════════════════
   API ABSTRACTION
   fetchFileData  → { content, modified? }
   saveFileData   → { success } | { error }
════════════════════════════════════════ */

// Reads: plain relative fetch — no branch dependency, no API rate limits
async function fetchFileData(key) {
  if (IS_LOCAL) {
    const res = await fetch(`/api/file/${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const res = await fetch(RELATIVE_PATHS[key]);
  if (!res.ok) throw new Error(`${RELATIVE_PATHS[key]} — HTTP ${res.status}`);
  const content = await res.text();
  return { content, modified: null };
}

// Writes: GitHub Contents API (fetches fresh SHA first to avoid conflicts)
async function saveFileData(key, content) {
  if (IS_LOCAL) {
    const res  = await fetch(`/api/file/${key}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    });
    const data = await res.json();
    return res.ok ? { success: true } : { error: data.error };
  }

  const tok = getToken();
  if (!tok) return { error: 'A GitHub token is required to save. Click "Token" in the sidebar.' };

  // Always fetch a fresh SHA to avoid stale-SHA conflicts
  const repoPath = FILE_PATHS[key];
  const shaRes   = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`,
    { headers: githubHeaders() }
  );
  if (!shaRes.ok) {
    const e = await shaRes.json().catch(() => ({}));
    return { error: e.message || `Could not fetch SHA (${shaRes.status})` };
  }
  const { sha } = await shaRes.json();

  const putRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`,
    {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...githubHeaders() },
      body:    JSON.stringify({
        message: `Update ${repoPath} via Jedi Dev Portal`,
        content: encodeBase64(content),
        sha,
        branch: GITHUB_BRANCH,
      }),
    }
  );

  if (putRes.ok) return { success: true };
  const err = await putRes.json().catch(() => ({}));
  return { error: err.message || `GitHub API error ${putRes.status}` };
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}


/* ════════════════════════════════════════
   LOAD FILE
════════════════════════════════════════ */

async function openFile(key) {
  setActiveNav(key);
  state.activeKey = key;
  state.editMode  = false;

  const content = document.getElementById('content');
  content.className = 'content';
  content.innerHTML = '<div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  document.getElementById('docTitle').textContent = NAV_META[key]?.label || key;
  document.getElementById('docMeta').textContent  = '';
  document.getElementById('topbarActions').innerHTML = '';

  try {
    const data = await fetchFileData(key);
    state.rawMarkdown = data.content;
    renderView(key, data.content, data.modified);
    if (key === 'SYSTEMS') updateProgress(data.content);
  } catch (err) {
    content.innerHTML = `<div class="loading">Failed to load — ${err.message}</div>`;
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

  attachCheckboxHandlers(div, key);

  document.getElementById('docTitle').textContent = NAV_META[key]?.label || key;
  document.getElementById('docMeta').textContent  = modified ? `Updated ${fmt(new Date(modified))}` : '';

  const actions = document.getElementById('topbarActions');
  actions.innerHTML = '';

  const dl   = make('button', { class: 'btn btn-ghost'    }, '↓ &nbsp;Download');
  const edit = make('button', { class: 'btn btn-primary'  }, '✎ &nbsp;Edit');

  dl.addEventListener(  'click', () => downloadFile(key));
  edit.addEventListener('click', () => enterEditMode(key, markdown));

  actions.append(dl, edit);
}

function downloadFile(key) {
  if (IS_LOCAL) {
    window.location.href = `/download/${key}`;
    return;
  }
  // On GitHub Pages, build a raw URL and trigger download via anchor
  const path = FILE_PATHS[key];
  const url  = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
  const a    = document.createElement('a');
  a.href     = url;
  a.download = path.split('/').pop();
  a.target   = '_blank';
  a.click();
}


/* ════════════════════════════════════════
   MARKDOWN
════════════════════════════════════════ */

function parseMarkdown(src) {
  return marked.parse(src).replace(
    /<input type="checkbox" disabled/g,
    '<input type="checkbox" class="task-check"'
  );
}


/* ════════════════════════════════════════
   INTERACTIVE CHECKBOXES
════════════════════════════════════════ */

function attachCheckboxHandlers(container, key) {
  container.querySelectorAll('input.task-check').forEach((cb, idx) => {
    cb.addEventListener('change', async (e) => {
      const checked = e.target.checked;
      const updated = toggleNthCheckbox(state.rawMarkdown, idx, checked);
      if (updated === null) { e.target.checked = !checked; return; }

      const result = await saveContent(key, updated);
      if (result) {
        state.rawMarkdown = updated;
        if (key === 'SYSTEMS') updateProgress(updated);
        showToast('Progress saved', 'ok');
      } else {
        e.target.checked = !checked;
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

  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });

  document.getElementById('docTitle').textContent = `Editing — ${NAV_META[key]?.label || key}`;
  document.getElementById('docMeta').textContent  = 'Ctrl+S to save · Esc to cancel';

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
   SAVE
════════════════════════════════════════ */

async function saveContent(key, content) {
  const result = await saveFileData(key, content);
  if (!result.success) {
    showToast(result.error || 'Save failed', 'err');
    return false;
  }
  return true;
}


/* ════════════════════════════════════════
   TOKEN UI  (sidebar, GitHub Pages only)
════════════════════════════════════════ */

function initTokenUI() {
  const wrap = document.getElementById('sidebarToken');
  if (IS_LOCAL) { wrap.hidden = true; return; }
  wrap.hidden = false;
  updateTokenUI();

  document.getElementById('tokenBtn').addEventListener('click', async () => {
    const current = getToken();
    const modal   = document.getElementById('pwdModalOverlay');
    const titleEl = document.getElementById('pwdModalTitle');
    const subEl   = document.getElementById('pwdModalSub');
    const input   = document.getElementById('pwdModalInput');

    titleEl.textContent = 'GitHub Personal Access Token';
    subEl.textContent   = 'Required to save changes. Stored in your browser only.';
    input.value         = current;
    input.placeholder   = 'ghp_…';
    input.type          = 'text';
    modal.hidden        = false;
    setTimeout(() => input.focus(), 60);

    const tok = await waitForModal();
    input.type = 'password';
    if (tok !== null) {
      setToken(tok.trim());
      showToast(tok.trim() ? 'Token saved' : 'Token cleared', 'ok');
    }
  });
}

function updateTokenUI() {
  const btn   = document.getElementById('tokenBtn');
  if (!btn) return;
  const hasTok = !!getToken();
  const icon   = btn.querySelector('.token-dot');
  const label  = btn.querySelector('.token-label');
  if (icon)  icon.className  = `token-dot ${hasTok ? 'set' : ''}`;
  if (label) label.textContent = hasTok ? 'Token set' : 'Set token';
}


/* ════════════════════════════════════════
   PASSWORD / TOKEN MODAL
════════════════════════════════════════ */

let _modalResolve = null;

function waitForModal() {
  return new Promise((resolve) => {
    _modalResolve = resolve;
    const confirm = document.getElementById('pwdModalConfirm');
    const cancel  = document.getElementById('pwdModalCancel');
    const input   = document.getElementById('pwdModalInput');

    function done(val) {
      document.getElementById('pwdModalOverlay').hidden = true;
      confirm.removeEventListener('click', onConfirm);
      cancel.removeEventListener( 'click', onCancel);
      input.removeEventListener(  'keydown', onKey);
      _modalResolve = null;
      resolve(val);
    }

    function onConfirm() { done(input.value); }
    function onCancel()  { done(null); }
    function onKey(e) {
      if (e.key === 'Enter')  onConfirm();
      if (e.key === 'Escape') onCancel();
    }

    confirm.addEventListener('click',   onConfirm);
    cancel.addEventListener( 'click',   onCancel);
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
    const data = await fetchFileData('SYSTEMS');
    updateProgress(data.content);
  } catch {}
}


/* ════════════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════════════ */

document.addEventListener('keydown', (e) => {
  if (!state.editMode) return;
  if (e.key === 'Escape') exitEditMode();
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (state.activeKey) commitEdit(state.activeKey);
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
  t.className   = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}


/* ════════════════════════════════════════
   START
════════════════════════════════════════ */

init();

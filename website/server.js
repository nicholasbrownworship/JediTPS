const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const EDIT_PASSWORD = process.env.EDIT_PASSWORD || 'jedi';

const ROOT = path.join(__dirname, '..');

const FILES = {
  README:   { path: path.join(ROOT, 'README.md'),               label: 'Overview'        },
  DESIGN:   { path: path.join(ROOT, 'docs', 'DESIGN.md'),       label: 'Design Document' },
  SYSTEMS:  { path: path.join(ROOT, 'docs', 'SYSTEMS.md'),      label: 'Systems Map'     },
  SESSIONS: { path: path.join(ROOT, 'docs', 'SESSIONS.md'),     label: 'Session Log'     },
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/files', (req, res) => {
  const list = Object.entries(FILES).map(([key, meta]) => ({
    key,
    label: meta.label,
    filename: path.basename(meta.path),
  }));
  res.json(list);
});

app.get('/api/file/:key', (req, res) => {
  const meta = FILES[req.params.key.toUpperCase()];
  if (!meta) return res.status(404).json({ error: 'Not found' });
  try {
    const content = fs.readFileSync(meta.path, 'utf8');
    const stat = fs.statSync(meta.path);
    res.json({ content, modified: stat.mtime });
  } catch {
    res.status(500).json({ error: 'Could not read file' });
  }
});

app.put('/api/file/:key', (req, res) => {
  const { content } = req.body;
  const meta = FILES[req.params.key.toUpperCase()];
  if (!meta) return res.status(404).json({ error: 'Not found' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'Invalid content' });
  try {
    fs.writeFileSync(meta.path, content, 'utf8');
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Could not write file' });
  }
});

app.get('/download/:key', (req, res) => {
  const meta = FILES[req.params.key.toUpperCase()];
  if (!meta) return res.status(404).send('Not found');
  res.download(meta.path);
});

app.listen(PORT, () => {
  console.log(`\n  Jedi Dev Portal → http://localhost:${PORT}`);
  console.log(`  Edit password  → ${EDIT_PASSWORD}\n`);
});

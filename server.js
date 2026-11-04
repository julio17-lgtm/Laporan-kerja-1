const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = new Database('laporan.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS laporan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    deskripsi TEXT,
    status TEXT DEFAULT 'pending',
    pelapor TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json());

const HALAMAN = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Laporan Pekerjaan Real-time</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f2f5; color: #1f2937; min-height: 100vh; }
  header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
  header h1 { font-size: 1.3rem; }
  .users { font-size: .85rem; opacity: .95; text-align: right; }
  main { max-width: 900px; margin: 1.5rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .card { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .card h2 { font-size: 1.05rem; margin-bottom: .75rem; }
  .hidden { display: none !important; }
  input, textarea { width: 100%; padding: .6rem .8rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: .95rem; margin-bottom: .6rem; font-family: inherit; }
  input:focus, textarea:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
  button { background: #4f46e5; color: #fff; border: none; padding: .6rem 1.2rem; border-radius: 8px; font-size: .9rem; cursor: pointer; font-weight: 600; transition: background .2s; }
  button:hover { background: #4338ca; }
  button.danger { background: #ef4444; }
  button.danger:hover { background: #dc2626; }
  button.small { padding: .35rem .7rem; font-size: .8rem; }
  .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
  .status { font-size: .8rem; font-weight: 600; }
  .status.online { color: #10b981; }
  .status.offline { color: #ef4444; }
  .laporan-list { display: flex; flex-direction: column; gap: .75rem; }
  .laporan-item { border: 1px solid #e5e7eb; border-radius: 10px; padding: .9rem; background: #fafafa; animation: fadeIn .3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .laporan-item h3 { font-size: 1rem; margin-bottom: .25rem; }
  .laporan-item .meta { font-size: .78rem; color: #6b7280; margin-bottom: .5rem; }
  .laporan-item p.deskripsi { font-size: .9rem; margin-bottom: .6rem; white-space: pre-wrap; }
  .badge { display: inline-block; font-size: .72rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; text-transform: uppercase; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.proses  { background: #dbeafe; color: #1e40af; }
  .badge.selesai { background: #d1fae5; color: #065f46; }
  .actions { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .4rem; }
  .empty { text-align: center; color: #9ca3af; padding: 1.5rem; font-style: italic; }
</style>
</head>
<body>
<header>
  <h1>📋 Laporan Pekerjaan</h1>
  <div class="users">
    <span id="userCount">👥 0 online</span><br>
    <span id="userList" style="font-size:.75rem;"></span>
  </div>
</header>
<main>
  <section id="loginSection" class="card">
    <h2>Masuk</h2>
    <input id="namaInput" type="text" placeholder="Masukkan nama Anda" maxlength="30" />
    <button id="loginBtn">Masuk</button>
  </section>
  <section id="formSection" class="card hidden">
    <h2>Tambah Laporan</h2>
    <form id="laporanForm">
      <input id="judul" type="text" placeholder="Judul pekerjaan" required />
      <textarea id="deskripsi" placeholder="Deskripsi (opsional)" rows="3"></textarea>
      <button type="submit">Kirim Laporan</button>
    </form>
  </section>
  <section class="card">
    <div class="list-header">
      <h2>Daftar Laporan</h2>
      <span id="connStatus" class="status offline">● Offline</span>
    </div>
    <div id="laporanList" class="laporan-list">
      <p class="empty">Belum ada laporan.</p>
    </div>
  </section>
</main>
<script src="/socket.io/socket.io.js"><\/script>
<script>
const socket = io();
let namaUser = null;
const loginSection = document.getElementById('loginSection');
const formSection  = document.getElementById('formSection');
const namaInput    = document.getElementById('namaInput');
const loginBtn     = document.getElementById('loginBtn');
const laporanForm  = document.getElementById('laporanForm');
const laporanList  = document.getElementById('laporanList');
const connStatus   = document.getElementById('connStatus');
const userCount    = document.getElementById('userCount');
const userList     = document.getElementById('userList');
loginBtn.onclick = () => {
  const nama = namaInput.value.trim();
  if (!nama) return alert('Masukkan nama Anda');
  namaUser = nama;
  socket.emit('user:join', nama);
  loginSection.classList.add('hidden');
  formSection.classList.remove('hidden');
};
socket.on('connect', () => {
  connStatus.textContent = '● Online';
  connStatus.className = 'status online';
  if (namaUser) socket.emit('user:join', namaUser);
});
socket.on('disconnect', () => {
  connStatus.textContent = '● Offline';
  connStatus.className = 'status offline';
});
socket.on('users:online', (users) => {
  userCount.textContent = '👥 ' + users.length + ' online';
  userList.textContent = users.length ? '(' + users.join(', ') + ')' : '';
});
laporanForm.onsubmit = async (e) => {
  e.preventDefault();
  const judul = document.getElementById('judul').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  if (!judul) return;
  await fetch('/api/laporan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ judul, deskripsi, pelapor: namaUser })
  });
  laporanForm.reset();
};
async function muatLaporan() {
  const res = await fetch('/api/laporan');
  renderList(await res.json());
}
function renderList(items) {
  if (!items.length) {
    laporanList.innerHTML = '<p class="empty">Belum ada laporan.</p>';
    return;
  }
  laporanList.innerHTML = items.map(renderItem).join('');
}
function renderItem(l) {
  return '<div class="laporan-item" data-id="' + l.id + '">' +
    '<h3>' + escapeHtml(l.judul) + '</h3>' +
    '<div class="meta">👤 ' + escapeHtml(l.pelapor) + ' • ' + formatTanggal(l.created_at) +
      (l.updated_at !== l.created_at ? ' • diupdate ' + formatTanggal(l.updated_at) : '') +
    '</div>' +
    (l.deskripsi ? '<p class="deskripsi">' + escapeHtml(l.deskripsi) + '</p>' : '') +
    '<span class="badge ' + l.status + '">' + l.status + '</span>' +
    '<div class="actions">' +
      '<button class="small" onclick="ubahStatus(' + l.id + ', \\'pending\\')">Pending</button>' +
      '<button class="small" onclick="ubahStatus(' + l.id + ', \\'proses\\')">Proses</button>' +
      '<button class="small" onclick="ubahStatus(' + l.id + ', \\'selesai\\')">Selesai</button>' +
      '<button class="small danger" onclick="hapus(' + l.id + ')">Hapus</button>' +
    '</div></div>';
}
async function ubahStatus(id, status) {
  await fetch('/api/laporan/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}
async function hapus(id) {
  if (!confirm('Hapus laporan ini?')) return;
  await fetch('/api/laporan/' + id, { method: 'DELETE' });
}
socket.on('laporan:baru', (l) => {
  const empty = laporanList.querySelector('.empty');
  if (empty) laporanList.innerHTML = '';
  laporanList.insertAdjacentHTML('afterbegin', renderItem(l));
});
socket.on('laporan:update', (l) => {
  const el = laporanList.querySelector('[data-id="' + l.id + '"]');
  if (el) el.outerHTML = renderItem(l);
});
socket.on('laporan:hapus', ({ id }) => {
  const el = laporanList.querySelector('[data-id="' + id + '"]');
  if (el) el.remove();
  if (!laporanList.children.length) {
    laporanList.innerHTML = '<p class="empty">Belum ada laporan.</p>';
  }
});
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function formatTanggal(iso) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
muatLaporan();
<\/script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HALAMAN));

app.get('/api/laporan', (req, res) => {
  res.json(db.prepare('SELECT * FROM laporan ORDER BY id DESC').all());
});

app.post('/api/laporan', (req, res) => {
  const { judul, deskripsi, pelapor } = req.body;
  if (!judul || !pelapor) return res.status(400).json({ error: 'Wajib diisi' });
  const info = db.prepare('INSERT INTO laporan (judul, deskripsi, pelapor) VALUES (?, ?, ?)').run(judul, deskripsi || '', pelapor);
  const laporan = db.prepare('SELECT * FROM laporan WHERE id = ?').get(info.lastInsertRowid);
  io.emit('laporan:baru', laporan);
  res.status(201).json(laporan);
});

app.patch('/api/laporan/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'proses', 'selesai'].includes(status)) return res.status(400).json({ error: 'Salah' });
  db.prepare('UPDATE laporan SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  const laporan = db.prepare('SELECT * FROM laporan WHERE id = ?').get(id);
  io.emit('laporan:update', laporan);
  res.json(laporan);
});

app.delete('/api/laporan/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM laporan WHERE id = ?').run(id);
  io.emit('laporan:hapus', { id: Number(id) });
  res.json({ success: true });
});

io.on('connection', (socket) => {
  socket.on('user:join', (nama) => {
    socket.data.nama = (nama || 'Anonim').trim();
    const users = Array.from(io.sockets.sockets.values()).map(s => s.data.nama).filter(Boolean);
    io.emit('users:online', users);
  });
  socket.on('disconnect', () => {
    const users = Array.from(io.sockets.sockets.values()).map(s => s.data.nama).filter(Boolean);
    io.emit('users:online', users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server jalan di port ' + PORT);
});

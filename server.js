const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================= DATABASE =================
const db = new Database('laporan.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS laporan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    deskripsi TEXT,
    foto TEXT,
    status TEXT DEFAULT 'pending',
    pelapor TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ================= MIDDLEWARE =================
// Limit diperbesar karena foto diubah ke format Base64 (teks panjang)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ================= FRONTEND =================
const STYLE = `  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f2f5; color: #1f2937; min-height: 100vh; }
  header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
  header h1 { font-size: 1.3rem; }
  .users { font-size: .85rem; opacity: .95; text-align: right; }
  main { max-width: 900px; margin: 1.5rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .card { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .card h2 { font-size: 1.05rem; margin-bottom: .75rem; }
  .hidden { display: none !important; }
  input, textarea, select { width: 100%; padding: .6rem .8rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: .95rem; margin-bottom: .6rem; font-family: inherit; }
  input[type="file"] { background: #f9fafb; padding: .4rem; }
  input:focus, textarea:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
  button { background: #4f46e5; color: #fff; border: none; padding: .6rem 1.2rem; border-radius: 8px; font-size: .9rem; cursor: pointer; font-weight: 600; transition: background .2s; }
  button:hover { background: #4338ca; }
  button.danger { background: #ef4444; }
  button.danger:hover { background: #dc2626; }
  button.admin-btn { background: #f59e0b; color: #fff; }
  button.admin-btn:hover { background: #d97706; }
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
  .laporan-item img { max-width: 100%; max-height: 200px; border-radius: 8px; margin-bottom: .6rem; object-fit: cover; border: 1px solid #e5e7eb; }
  .badge { display: inline-block; font-size: .72rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; text-transform: uppercase; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.proses  { background: #dbeafe; color: #1e40af; }
  .badge.selesai { background: #d1fae5; color: #065f46; }
  .actions { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .4rem; }
  .empty { text-align: center; color: #9ca3af; padding: 1.5rem; font-style: italic; }
  .badge-admin { background: #fef3c7; color: #92400e; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.5rem; }
`;

const HALAMAN_LOGIN = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Masuk - Laporan Pekerjaan</title>
<style>${STYLE}
  .login-wrap { max-width: 420px; margin: 12vh auto 0; padding: 0 1rem; }
  .login-wrap h1 { text-align: center; font-size: 1.5rem; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="login-wrap">
  <h1>ðŸ“‹ Laporan Pekerjaan</h1>
  <section class="card">
    <h2>Masuk</h2>
    <input id="namaInput" type="text" placeholder="Masukkan nama Anda" maxlength="30" />
    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
      <button id="loginUserBtn" style="flex: 1;">Masuk sebagai Pelapor</button>
      <button id="loginAdminBtn" class="admin-btn" style="flex: 1;">Masuk sebagai Admin</button>
    </div>
  </section>
</div>
<script>
if (sessionStorage.getItem('nama')) location.replace('/laporan');

function masuk(nama, admin) {
  sessionStorage.setItem('nama', nama);
  sessionStorage.setItem('admin', admin ? '1' : '0');
  location.href = '/laporan';
}

document.getElementById('loginUserBtn').onclick = () => {
  const nama = document.getElementById('namaInput').value.trim();
  if (!nama) return alert('Masukkan nama Anda');
  masuk(nama, false);
};

document.getElementById('loginAdminBtn').onclick = () => {
  const pass = prompt("Masukkan Password Admin:");
  if (pass === null) return;
  // PASSWORD ADMIN ADALAH: CAT320
  if (pass === "CAT320") masuk("Admin", true);
  else alert("Password Salah!");
};
document.getElementById('namaInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginUserBtn').click();
});
</script>
</body>
</html>`;

const HALAMAN = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Daftar Laporan - Laporan Pekerjaan</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>ðŸ“‹ Laporan Pekerjaan</h1>
  <div class="users">
    <span id="userCount">ðŸ‘¥ 0 online</span><br>
    <span id="userList" style="font-size:.75rem;"></span><br>
    <span id="namaTampil" style="font-size:.8rem;"></span>
    <button id="logoutBtn" class="danger small" style="margin-left:.4rem;">Keluar</button>
  </div>
</header>

<main>
  <!-- FORM SECTION (Pelapor & Admin) -->
  <section id="formSection" class="card">
    <h2>Tambah Laporan</h2>
    <form id="laporanForm">
      <input id="judul" type="text" placeholder="Judul pekerjaan" required />
      <textarea id="deskripsi" placeholder="Deskripsi (opsional)" rows="2"></textarea>
      <label style="font-size: 0.85rem; font-weight: bold; color: #4b5563;">Lampiran Foto (Opsional):</label>
      <input id="fotoInput" type="file" accept="image/*" />
      <button type="submit" style="margin-top: 0.5rem;">Kirim Laporan</button>
    </form>
  </section>

  <!-- ADMIN PANEL SECTION -->
  <section id="adminPanel" class="card hidden">
    <h2>Panel Admin</h2>
    <p style="font-size: 0.9rem;">Anda masuk sebagai <strong>Admin</strong>. Anda dapat mengubah status dan menghapus laporan.</p>
  </section>

  <!-- DAFTAR LAPORAN -->
  <section class="card">
    <div class="list-header">
      <h2>Daftar Laporan</h2>
      <span id="connStatus" class="status offline">â— Offline</span>
    </div>
    <div id="laporanList" class="laporan-list">
      <p class="empty">Belum ada laporan.</p>
    </div>
  </section>
</main>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
const namaUser = sessionStorage.getItem('nama');
const isAdmin = sessionStorage.getItem('admin') === '1';
if (!namaUser) location.replace('/');

const adminPanel   = document.getElementById('adminPanel');
const logoutBtn    = document.getElementById('logoutBtn');
const laporanForm  = document.getElementById('laporanForm');
const laporanList  = document.getElementById('laporanList');
const connStatus   = document.getElementById('connStatus');
const userCount    = document.getElementById('userCount');
const userList     = document.getElementById('userList');

document.getElementById('namaTampil').textContent = 'ðŸ‘¤ ' + (namaUser || '');
if (isAdmin) adminPanel.classList.remove('hidden');

logoutBtn.onclick = () => {
  sessionStorage.clear();
  location.href = '/';
};

socket.on('connect', () => {
  connStatus.textContent = 'â— Online';
  connStatus.className = 'status online';
  if (namaUser) socket.emit('user:join', isAdmin ? namaUser + ' (Admin)' : namaUser);
});
socket.on('disconnect', () => {
  connStatus.textContent = 'â— Offline';
  connStatus.className = 'status offline';
});

socket.on('users:online', (users) => {
  userCount.textContent = 'ðŸ‘¥ ' + users.length + ' online';
  userList.textContent = users.length ? '(' + users.join(', ') + ')' : '';
});

// PROSES KIRIM LAPORAN + FOTO
laporanForm.onsubmit = async (e) => {
  e.preventDefault();
  const judul = document.getElementById('judul').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const fotoInput = document.getElementById('fotoInput');
  
  if (!judul) return;

  let fotoBase64 = "";
  
  // Cek jika ada file yang diupload
  if (fotoInput.files.length > 0) {
    const file = fotoInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      return alert("Ukuran foto terlalu besar! Maksimal 2MB.");
    }
    
    // Membaca file menjadi teks Base64
    fotoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  // Kirim ke server
  await fetch('/api/laporan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ judul, deskripsi, pelapor: namaUser, foto: fotoBase64 })
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
  // Tampilan tombol aksi HANYA muncul jika isAdmin = true
  let tombolAksi = "";
  if (isAdmin) {
    tombolAksi = \`
      <div class="actions">
        <button class="small" onclick="ubahStatus(\${l.id}, 'pending')">Pending</button>
        <button class="small" onclick="ubahStatus(\${l.id}, 'proses')">Proses</button>
        <button class="small" onclick="ubahStatus(\${l.id}, 'selesai')">Selesai</button>
        <button class="small danger" onclick="hapus(\${l.id})">Hapus</button>
      </div>
    \`;
  }

  return \`
    <div class="laporan-item" data-id="\${l.id}">
      <h3>\${escapeHtml(l.judul)}</h3>
      <div class="meta">ðŸ‘¤ \${escapeHtml(l.pelapor)} â€¢ \${formatTanggal(l.created_at)}
        \${l.updated_at !== l.created_at ? ' â€¢ diupdate ' + formatTanggal(l.updated_at) : ''}
      </div>
      \${l.deskripsi ? '<p class="deskripsi">' + escapeHtml(l.deskripsi) + '</p>' : ''}
      \${l.foto ? '<img src="' + l.foto + '" alt="Foto Laporan">' : ''}
      <div>
        <span class="badge \${l.status}">\${l.status}</span>
      </div>
      \${tombolAksi}
    </div>
  \`;
}

async function ubahStatus(id, status) {
  if (!isAdmin) return alert("Hanya Admin yang bisa mengubah status!");
  await fetch('/api/laporan/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function hapus(id) {
  if (!isAdmin) return alert("Hanya Admin yang bisa menghapus laporan!");
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
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HALAMAN_LOGIN));
app.get('/laporan', (req, res) => res.send(HALAMAN));

// ================= REST API =================
app.get('/api/laporan', (req, res) => {
  res.json(db.prepare('SELECT * FROM laporan ORDER BY id DESC').all());
});

app.post('/api/laporan', (req, res) => {
  const { judul, deskripsi, pelapor, foto } = req.body;
  if (!judul || !pelapor) return res.status(400).json({ error: 'Wajib diisi' });
  
  const info = db.prepare('INSERT INTO laporan (judul, deskripsi, pelapor, foto) VALUES (?, ?, ?, ?)').run(judul, deskripsi || '', pelapor, foto || '');
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

// ================= SOCKET.IO =================
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

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server jalan di port ' + PORT);
});lass="small" onclick="ubahStatus(\${l.id}, 'proses')">Proses</button>
        <button class="small" onclick="ubahStatus(\${l.id}, 'selesai')">Selesai</button>
        <button class="small danger" onclick="hapus(\${l.id})">Hapus</button>
      </div>
    \`;
  }

  return \`
    <div class="laporan-item" data-id="\${l.id}">
      <h3>\${escapeHtml(l.judul)}</h3>
      <div class="meta">👤 \${escapeHtml(l.pelapor)} • \${formatTanggal(l.created_at)}
        \${l.updated_at !== l.created_at ? ' • diupdate ' + formatTanggal(l.updated_at) : ''}
      </div>
      \${l.deskripsi ? '<p class="deskripsi">' + escapeHtml(l.deskripsi) + '</p>' : ''}
      \${l.foto ? '<img src="' + l.foto + '" alt="Foto Laporan">' : ''}
      <div>
        <span class="badge \${l.status}">\${l.status}</span>
      </div>
      \${tombolAksi}
    </div>
  \`;
}

async function ubahStatus(id, status) {
  if (!isAdmin) return alert("Hanya Admin yang bisa mengubah status!");
  await fetch('/api/laporan/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

async function hapus(id) {
  if (!isAdmin) return alert("Hanya Admin yang bisa menghapus laporan!");
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
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HALAMAN));

// ================= REST API =================
app.get('/api/laporan', (req, res) => {
  res.json(db.prepare('SELECT * FROM laporan ORDER BY id DESC').all());
});

app.post('/api/laporan', (req, res) => {
  const { judul, deskripsi, pelapor, foto } = req.body;
  if (!judul || !pelapor) return res.status(400).json({ error: 'Wajib diisi' });
  
  const info = db.prepare('INSERT INTO laporan (judul, deskripsi, pelapor, foto) VALUES (?, ?, ?, ?)').run(judul, deskripsi || '', pelapor, foto || '');
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

// ================= SOCKET.IO =================
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

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server jalan di port ' + PORT);
});

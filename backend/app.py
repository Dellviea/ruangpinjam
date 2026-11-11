import os
import re
import socket
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from werkzeug.security import generate_password_hash

load_dotenv()

# Dev: Flask ikut menyajikan ../frontend supaya fetch('/api/...') jalan tanpa nginx.
# Di VM, nginx yang menyajikan frontend dan meneruskan /api ke sini.
app = Flask(__name__, static_folder="../frontend", static_url_path="")

# Data disimpan di memori (tanpa database), hilang kalau server restart.
ruangan = [
    {"id": 1, "kode": "AUL-01", "nama": "Aula Pendopo", "jenis": "Aula", "gedung": "Dekat Lapangan Tenis",
     "lantai": "1", "kapasitas": 200, "fasilitas": ["Proyektor", "Sound system", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Aula terbuka untuk gladi dan pentas UKM."},
    {"id": 2, "kode": "KLS-01", "nama": "Ruang Kelas 1", "jenis": "Ruang Kelas", "gedung": "Gedung Kuliah",
     "lantai": "2", "kapasitas": 40, "fasilitas": ["Papan tulis", "Proyektor", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Untuk responsi, kelas pengganti, dan studi grup."},
    {"id": 3, "kode": "LAB-01", "nama": "Lab Praktikum Pemrograman", "jenis": "Lab Praktikum",
     "gedung": "Gedung Lab", "lantai": "1", "kapasitas": 30, "fasilitas": ["Komputer", "Proyektor", "AC"],
     "jam_buka": "08:00", "jam_tutup": "18:00", "status": "tersedia",
     "deskripsi": "Praktikum Algoritma Pemrograman dan PBO."},
    {"id": 4, "kode": "RIS-01", "nama": "Lab Riset AI", "jenis": "Lab Riset", "gedung": "Gedung Riset",
     "lantai": "3", "kapasitas": 15, "fasilitas": ["Workstation GPU", "Whiteboard", "AC"],
     "jam_buka": "08:00", "jam_tutup": "20:00", "status": "tersedia",
     "deskripsi": "Bimbingan riset dan tugas akhir."},
    {"id": 5, "kode": "RPT-01", "nama": "Ruang Rapat Himpunan", "jenis": "Ruang Rapat", "gedung": "Gedung Kemahasiswaan",
     "lantai": "2", "kapasitas": 20, "fasilitas": ["TV", "Whiteboard", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Rapat himpunan dan UKM."},
    {"id": 6, "kode": "LPG-01", "nama": "Lapangan Futsal", "jenis": "Lapangan", "gedung": "Area Olahraga",
     "lantai": "-", "kapasitas": 30, "fasilitas": ["Lampu", "Tribun"],
     "jam_buka": "07:00", "jam_tutup": "18:00", "status": "dalam perbaikan",
     "deskripsi": "Sedang perbaikan lantai."},
]
# Password contoh dari .env (PASSWORD_CONTOH); yang disimpan tetap hash-nya.
_pw = generate_password_hash(os.getenv("PASSWORD_CONTOH", "pinjamruang123"))
pengguna = [
    {"id": 1, "nama": "Dellvia", "nim_nip": "198501012010", "email": "dellvia@email.com", "password": _pw,
     "peran": "admin", "prodi": "Sarana dan Prasarana", "no_hp": "081200000001"},
    {"id": 2, "nama": "Della", "nim_nip": "1202220001", "email": "della@email.com", "password": _pw,
     "peran": "mahasiswa", "prodi": "S1 Teknologi Informasi", "no_hp": "081200000002"},
    {"id": 3, "nama": "Raka", "nim_nip": "1202220002", "email": "raka@email.com", "password": _pw,
     "peran": "mahasiswa", "prodi": "S1 Sistem Informasi", "no_hp": "081200000003"},
    {"id": 4, "nama": "Nadia", "nim_nip": "1202220003", "email": "nadia@email.com", "password": _pw,
     "peran": "mahasiswa", "prodi": "S1 Informatika", "no_hp": "081200000004"},
]
peminjaman = []

JENIS_RUANGAN = ("Aula", "Ruang Kelas", "Lab Praktikum", "Lab Riset", "Ruang Rapat", "Lapangan")
STATUS_RUANGAN = ("tersedia", "dalam perbaikan")
JAM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def error(pesan, kode=400):
    return jsonify(error=pesan), kode


def cari(daftar, id_):
    return next((x for x in daftar if x["id"] == id_), None)


def cek_ruangan(data, lama=None):
    """Gabungkan data masuk dengan data lama (untuk PUT), validasi, kembalikan (hasil, pesan_error)."""
    h = {"jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia", "fasilitas": [], "deskripsi": ""}
    h.update(lama or {})
    h.update({k: v for k, v in data.items() if k in ("kode", "nama", "jenis", "gedung", "lantai", "kapasitas",
              "fasilitas", "jam_buka", "jam_tutup", "status", "deskripsi")})

    for f in ("kode", "nama", "gedung", "lantai"):
        if not str(h.get(f, "")).strip():
            return None, f"Field '{f}' wajib diisi"
        h[f] = str(h[f]).strip()
    if h.get("jenis") not in JENIS_RUANGAN:
        return None, "Jenis harus salah satu dari: " + ", ".join(JENIS_RUANGAN)
    if h["status"] not in STATUS_RUANGAN:
        return None, "Status harus 'tersedia' atau 'dalam perbaikan'"
    # bool lolos isinstance int, jadi ditolak manual
    if not isinstance(h.get("kapasitas"), int) or isinstance(h["kapasitas"], bool) or h["kapasitas"] < 1:
        return None, "Kapasitas harus bilangan bulat lebih dari 0"
    if not isinstance(h["fasilitas"], list) or not all(isinstance(x, str) for x in h["fasilitas"]):
        return None, "Fasilitas harus berupa list teks"
    for f in ("jam_buka", "jam_tutup"):
        if not isinstance(h[f], str) or not JAM.match(h[f]):
            return None, f"'{f}' harus berformat HH:MM, contoh 07:00"
    if h["jam_tutup"] <= h["jam_buka"]:
        return None, "jam_tutup harus lebih besar dari jam_buka"
    if any(r["kode"] == h["kode"] and r is not lama for r in ruangan):
        return None, f"Kode '{h['kode']}' sudah dipakai ruangan lain"
    return h, None


def ambil_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@app.get("/api/ruangan")
def daftar_ruangan():
    return jsonify(ruangan)


@app.get("/api/ruangan/<int:id_>")
def detail_ruangan(id_):
    r = cari(ruangan, id_)
    return jsonify(r) if r else error("Ruangan tidak ditemukan", 404)


@app.post("/api/ruangan")
def tambah_ruangan():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    h, pesan = cek_ruangan(data)
    if pesan:
        return error(pesan)
    h["id"] = max((r["id"] for r in ruangan), default=0) + 1
    ruangan.append(h)
    return jsonify(h), 201


@app.put("/api/ruangan/<int:id_>")
def ubah_ruangan(id_):
    r = cari(ruangan, id_)
    if not r:
        return error("Ruangan tidak ditemukan", 404)
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    h, pesan = cek_ruangan(data, r)
    if pesan:
        return error(pesan)
    r.update(h)
    return jsonify(r)


@app.delete("/api/ruangan/<int:id_>")
def hapus_ruangan(id_):
    r = cari(ruangan, id_)
    if not r:
        return error("Ruangan tidak ditemukan", 404)
    # ponytail: belum cek peminjaman yang memakai ruangan ini, ditambah di Tahap 3
    ruangan.remove(r)
    return jsonify(pesan="Ruangan dihapus")


@app.get("/")
def index():
    return app.send_static_file("index.html")


PERAN = ("mahasiswa", "admin")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def publik(p):
    """Data pengguna tanpa password, aman dikirim ke frontend."""
    return {k: v for k, v in p.items() if k != "password"}


def cek_pengguna(data, lama=None):
    h = {"peran": "mahasiswa", "prodi": "", "no_hp": ""}
    h.update(lama or {})
    h.update({k: v for k, v in data.items() if k in ("nama", "nim_nip", "email", "peran", "prodi", "no_hp")})

    for f in ("nama", "nim_nip", "email"):
        if not isinstance(h.get(f), str) or not h[f].strip():
            return None, f"Field '{f}' wajib diisi"
        h[f] = h[f].strip()
    for f in ("prodi", "no_hp"):
        if not isinstance(h[f], str):
            return None, f"'{f}' harus berupa teks"
    h["email"] = h["email"].lower()
    if not EMAIL.match(h["email"]):
        return None, "Format email tidak valid"
    if h["peran"] not in PERAN:
        return None, "Peran harus 'mahasiswa' atau 'admin'"

    pw = data.get("password")
    if pw is not None:
        if not isinstance(pw, str) or len(pw) < 6:
            return None, "Password minimal 6 karakter"
        h["password"] = generate_password_hash(pw)
    elif lama is None:
        return None, "Field 'password' wajib diisi"

    for p in pengguna:
        if p is lama:
            continue
        if p["email"] == h["email"]:
            return None, f"Email '{h['email']}' sudah terdaftar"
        if p["nim_nip"] == h["nim_nip"]:
            return None, f"NIM/NIP '{h['nim_nip']}' sudah terdaftar"
    return h, None


# ponytail: belum ada token/sesi, endpoint pengguna terbuka untuk semua. Tambah cek peran admin kalau sempat.
@app.get("/api/pengguna")
def daftar_pengguna():
    return jsonify([publik(p) for p in pengguna])


@app.get("/api/pengguna/<int:id_>")
def detail_pengguna(id_):
    p = cari(pengguna, id_)
    return jsonify(publik(p)) if p else error("Pengguna tidak ditemukan", 404)


@app.post("/api/pengguna")
def tambah_pengguna():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    h, pesan = cek_pengguna(data)
    if pesan:
        return error(pesan)
    h["id"] = max((p["id"] for p in pengguna), default=0) + 1
    pengguna.append(h)
    return jsonify(publik(h)), 201


@app.put("/api/pengguna/<int:id_>")
def ubah_pengguna(id_):
    p = cari(pengguna, id_)
    if not p:
        return error("Pengguna tidak ditemukan", 404)
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    h, pesan = cek_pengguna(data, p)
    if pesan:
        return error(pesan)
    p.update(h)
    return jsonify(publik(p))


@app.delete("/api/pengguna/<int:id_>")
def hapus_pengguna(id_):
    p = cari(pengguna, id_)
    if not p:
        return error("Pengguna tidak ditemukan", 404)
    # ponytail: belum cek peminjaman milik pengguna ini, ditambah di Tahap 3
    pengguna.remove(p)
    return jsonify(pesan="Pengguna dihapus")


@app.get("/api/health")
def health():
    return jsonify(
        status="ok",
        server=socket.gethostname(),
        waktu=datetime.now().isoformat(timespec="seconds"),
        jumlah_data={
            "ruangan": len(ruangan),
            "pengguna": len(pengguna),
            "peminjaman": len(peminjaman),
        },
    )


@app.errorhandler(404)
def not_found(_):
    return error("Alamat tidak ditemukan", 404)


@app.errorhandler(405)
def not_allowed(_):
    return error("Method tidak diizinkan untuk alamat ini", 405)


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("PORT", 5000)),
        debug=os.getenv("DEBUG", "false").lower() == "true",
    )

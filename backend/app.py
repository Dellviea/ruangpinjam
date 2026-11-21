import os
import re
import socket
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

# Saat dev Flask ikut menyajikan frontend. Di VM tugas ini dipegang nginx.
app = Flask(__name__, static_folder="../frontend", static_url_path="")

# Data di memori, hilang saat server restart.
ruangan = [
    {"id": 1, "kode": "AUL-01", "nama": "Aula Pendopo", "jenis": "Aula", "gedung": "Dekat Lapangan Tenis",
     "lantai": "1", "kapasitas": 200, "fasilitas": ["Proyektor", "Sound system", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Aula terbuka untuk gladi dan pentas UKM."},
    {"id": 2, "kode": "TULT-0604", "nama": "Ruang Kelas 1", "jenis": "Ruang Kelas", "gedung": "Gedung TULT",
     "lantai": "6", "kapasitas": 45, "fasilitas": ["Papan tulis", "Proyektor", "AC"],
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
    {"id": 7, "kode": "AUL-02", "nama": "Aula Manterawu", "jenis": "Aula", "gedung": "Gedung Manterawu",
     "lantai": "1", "kapasitas": 150, "fasilitas": ["Proyektor", "Sound system", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Aula untuk workshop dan acara UKM."},
    {"id": 8, "kode": "AUL-03", "nama": "Gedung Serbaguna (GSG)", "jenis": "Aula", "gedung": "Gedung Serbaguna",
     "lantai": "1", "kapasitas": 500, "fasilitas": ["Panggung", "Sound system", "Kursi lipat"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Gedung besar untuk acara kampus dan first meet UKM."},
    {"id": 9, "kode": "AUL-04", "nama": "Aula TULT Lt. 18", "jenis": "Aula", "gedung": "Gedung TULT",
     "lantai": "18", "kapasitas": 250, "fasilitas": ["Proyektor", "Sound system", "AC"],
     "jam_buka": "08:00", "jam_tutup": "20:00", "status": "tersedia",
     "deskripsi": "Aula di lantai atas untuk seminar dan kuliah umum."},
    {"id": 10, "kode": "KLS-02", "nama": "Ruang TULT Lt. 2", "jenis": "Ruang Kelas", "gedung": "Gedung TULT",
     "lantai": "2", "kapasitas": 50, "fasilitas": ["Papan tulis", "Proyektor", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Ruang kelas untuk kelas pengganti dan responsi."},
    {"id": 11, "kode": "KLS-03", "nama": "Ruang Kelas 2", "jenis": "Ruang Kelas", "gedung": "Gedung Kuliah",
     "lantai": "2", "kapasitas": 40, "fasilitas": ["Papan tulis", "Proyektor", "AC"],
     "jam_buka": "07:00", "jam_tutup": "21:00", "status": "tersedia",
     "deskripsi": "Ruang kelas untuk responsi dan studi grup."},
    {"id": 12, "kode": "LAB-02", "nama": "Lab Praktikum Jaringan", "jenis": "Lab Praktikum",
     "gedung": "Gedung Lab", "lantai": "2", "kapasitas": 30,
     "fasilitas": ["Komputer", "Switch dan router", "AC"],
     "jam_buka": "08:00", "jam_tutup": "18:00", "status": "tersedia",
     "deskripsi": "Praktikum Jaringan Komputer."},
    {"id": 13, "kode": "LAB-03", "nama": "Lab Praktikum Basis Data", "jenis": "Lab Praktikum",
     "gedung": "Gedung Lab", "lantai": "2", "kapasitas": 30, "fasilitas": ["Komputer", "Proyektor", "AC"],
     "jam_buka": "08:00", "jam_tutup": "18:00", "status": "tersedia",
     "deskripsi": "Praktikum Basis Data."},
    {"id": 14, "kode": "RIS-02", "nama": "Lab Riset IoT", "jenis": "Lab Riset", "gedung": "Gedung Riset",
     "lantai": "3", "kapasitas": 12, "fasilitas": ["Perangkat IoT", "Osiloskop", "AC"],
     "jam_buka": "08:00", "jam_tutup": "20:00", "status": "tersedia",
     "deskripsi": "Pengujian prototipe dan riset perangkat IoT."},
    {"id": 15, "kode": "RPT-02", "nama": "Ruang Diskusi Perpustakaan", "jenis": "Ruang Rapat",
     "gedung": "Perpustakaan", "lantai": "2", "kapasitas": 10,
     "fasilitas": ["Whiteboard", "Colokan listrik", "AC"],
     "jam_buka": "08:00", "jam_tutup": "20:00", "status": "tersedia",
     "deskripsi": "Ruang kecil untuk diskusi dan studi grup."},
    {"id": 16, "kode": "LPG-02", "nama": "Lapangan Tenis", "jenis": "Lapangan", "gedung": "Area Olahraga",
     "lantai": "-", "kapasitas": 12, "fasilitas": ["Lampu"],
     "jam_buka": "07:00", "jam_tutup": "18:00", "status": "tersedia",
     "deskripsi": "Lapangan tenis outdoor."},
    {"id": 17, "kode": "LPG-03", "nama": "Lapangan Basket", "jenis": "Lapangan", "gedung": "Area Olahraga",
     "lantai": "-", "kapasitas": 20, "fasilitas": ["Lampu", "Tribun"],
     "jam_buka": "07:00", "jam_tutup": "19:00", "status": "tersedia",
     "deskripsi": "Lapangan basket untuk latihan dan turnamen."},
]
# Password contoh dari .env, disimpan sebagai hash.
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


def hari(n):
    """Tanggal hari ini + n hari, supaya data contoh selalu terlihat di jadwal."""
    return (date.today() + timedelta(days=n)).isoformat()


def _contoh(id_, pengguna_, ruang, tgl, mulai, selesai, jenis, perlu, jml, status, alasan=""):
    return {"id": id_, "id_pengguna": pengguna_, "id_ruangan": ruang, "tanggal": hari(tgl),
            "jam_mulai": mulai, "jam_selesai": selesai, "jenis_kegiatan": jenis, "keperluan": perlu,
            "jumlah_peserta": jml, "status": status, "alasan_penolakan": alasan,
            "dibuat_pada": datetime.now().isoformat(timespec="seconds")}


peminjaman = [
    _contoh(1, 3, 1, 0, "13:00", "16:00", "Acara UKM", "UKM Cabaret: gladi pentas", 60, "disetujui"),
    _contoh(2, 2, 2, 0, "13:00", "15:00", "Responsi", "Responsi Kalkulus", 35, "menunggu"),
    _contoh(3, 2, 2, 0, "15:00", "17:00", "Studi grup", "Studi grup Struktur Data, persiapan UAS", 8, "menunggu"),
    _contoh(4, 3, 3, 1, "09:00", "12:00", "Praktikum", "Praktikum Algoritma Pemrograman", 28, "disetujui"),
    _contoh(5, 2, 4, 1, "10:00", "12:00", "Riset", "Bimbingan riset tugas akhir", 5, "ditolak",
            "Lab dipakai untuk pemeliharaan server"),
    _contoh(6, 4, 5, 1, "15:00", "17:00", "Rapat", "Rapat himpunan", 15, "menunggu"),
    _contoh(7, 2, 2, 1, "10:00", "12:00", "Kelas pengganti", "Kelas pengganti Fisika Dasar", 30, "dibatalkan"),
    _contoh(8, 4, 7, 0, "09:00", "12:00", "Acara UKM", "UKM CCI: workshop", 80, "disetujui"),
    _contoh(9, 3, 8, 1, "13:00", "17:00", "Acara UKM", "UKM Embun: First Meet", 300, "disetujui"),
    _contoh(10, 2, 9, 0, "10:00", "12:00", "Seminar", "Kuliah umum teknologi cloud", 150, "disetujui"),
    _contoh(11, 4, 10, 0, "15:00", "17:00", "Kelas pengganti", "Kelas pengganti Basis Data", 45, "disetujui"),
    _contoh(12, 3, 11, 0, "10:00", "12:00", "Responsi", "Responsi Fisika Dasar", 38, "disetujui"),
    _contoh(13, 2, 12, 0, "13:00", "16:00", "Praktikum", "Praktikum Jaringan Komputer", 28, "disetujui"),
    _contoh(14, 4, 13, 1, "13:00", "16:00", "Praktikum", "Praktikum Basis Data", 25, "menunggu"),
    _contoh(15, 3, 14, 0, "14:00", "17:00", "Riset", "Pengujian prototipe sensor", 6, "disetujui"),
    _contoh(16, 2, 15, 0, "16:00", "18:00", "Studi grup", "Studi grup persiapan UAS", 6, "menunggu"),
    _contoh(17, 3, 16, 0, "16:00", "18:00", "Olahraga", "Latihan UKM tenis", 10, "disetujui"),
    _contoh(18, 4, 17, 1, "15:00", "18:00", "Olahraga", "Turnamen basket antarjurusan", 20, "disetujui"),
    _contoh(19, 2, 5, 0, "10:00", "11:30", "Rapat", "Rapat himpunan mingguan", 12, "disetujui"),
    _contoh(20, 3, 1, 1, "18:00", "21:00", "Acara UKM", "UKM Cabaret: pentas", 150, "disetujui"),
]

JENIS_RUANGAN = ("Aula", "Ruang Kelas", "Lab Praktikum", "Lab Riset", "Ruang Rapat", "Lapangan")
STATUS_RUANGAN = ("tersedia", "dalam perbaikan")
JAM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def error(pesan, kode=400):
    return jsonify(error=pesan), kode


def cari(daftar, id_):
    return next((x for x in daftar if x["id"] == id_), None)


def cek_ruangan(data, lama=None):
    """Validasi data ruangan; saat PUT digabung dengan data lama."""
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
    # True/False juga dianggap int, jadi dicek terpisah
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
    if any(x["id_ruangan"] == id_ for x in peminjaman):
        return error("Ruangan masih dipakai data peminjaman, hapus peminjamannya dulu", 409)
    ruangan.remove(r)
    return jsonify(pesan="Ruangan dihapus")


@app.get("/")
def index():
    return app.send_static_file("index.html")


PERAN = ("mahasiswa", "admin")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def publik(p):
    """Data pengguna tanpa password."""
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


# Belum ada token/sesi, jadi endpoint pengguna masih terbuka untuk siapa saja.
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
    if any(x["id_pengguna"] == id_ for x in peminjaman):
        return error("Pengguna masih punya data peminjaman, hapus peminjamannya dulu", 409)
    pengguna.remove(p)
    return jsonify(pesan="Pengguna dihapus")


@app.post("/api/login")
def login():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    email, pw = data.get("email"), data.get("password")
    if not isinstance(email, str) or not isinstance(pw, str) or not email or not pw:
        return error("Email dan password wajib diisi")
    p = next((p for p in pengguna if p["email"] == email.strip().lower()), None)
    if not p or not check_password_hash(p["password"], pw):
        return error("Email atau password salah", 401)
    return jsonify(publik(p))


@app.post("/api/register")
def register():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    # peran dipaksa mahasiswa, supaya tidak ada yang mendaftar sebagai admin
    h, pesan = cek_pengguna({**data, "peran": "mahasiswa"})
    if pesan:
        return error(pesan)
    h["id"] = max((p["id"] for p in pengguna), default=0) + 1
    pengguna.append(h)
    return jsonify(publik(h)), 201


@app.post("/api/lupa-password")
def lupa_password():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    email, nim, baru = data.get("email"), data.get("nim"), data.get("password_baru")
    if not all(isinstance(x, str) and x.strip() for x in (email, nim, baru)):
        return error("Email, nim, dan password_baru wajib diisi")
    if len(baru) < 6:
        return error("Password minimal 6 karakter")
    p = next((p for p in pengguna
              if p["email"] == email.strip().lower() and p["nim_nip"] == nim.strip()), None)
    if not p:
        return error("Email dan NIM tidak cocok", 404)
    p["password"] = generate_password_hash(baru)
    return jsonify(pesan="Password berhasil diganti")


JENIS_KEGIATAN = ("Praktikum", "Responsi", "Studi grup", "Kelas pengganti", "Riset", "Rapat", "Seminar",
                  "Acara UKM", "Olahraga", "Pelatihan", "Lainnya")
AKTIF = ("menunggu", "disetujui")  # hanya status ini yang dihitung saat cek bentrok


def menit(j):
    h, m = j.split(":")
    return int(h) * 60 + int(m)


def jam(m):
    return f"{m // 60:02d}:{m % 60:02d}"


def jam_kosong_terdekat(ruang, tanggal, mulai, selesai, abaikan=None):
    """Cari rentang kosong sepanjang durasi yang sama, yang awalnya paling dekat dengan jam mulai."""
    durasi = selesai - mulai
    terpakai = sorted((menit(p["jam_mulai"]), menit(p["jam_selesai"])) for p in peminjaman
                      if p["id_ruangan"] == ruang["id"] and p["tanggal"] == tanggal
                      and p["status"] in AKTIF and p is not abaikan)
    tutup = menit(ruang["jam_tutup"])
    celah, awal = [], menit(ruang["jam_buka"])
    for a, b in terpakai:
        if a > awal:
            celah.append((awal, a))
        awal = max(awal, b)
    if awal < tutup:
        celah.append((awal, tutup))

    terbaik = None
    for a, b in celah:
        if b - a >= durasi:
            s = min(max(mulai, a), b - durasi)  # geser sedekat mungkin ke jam yang diminta
            if terbaik is None or abs(s - mulai) < abs(terbaik - mulai):
                terbaik = s
    return None if terbaik is None else (terbaik, terbaik + durasi)


def cek_peminjaman(data, lama=None):
    h = dict(lama or {})
    h.update({k: v for k, v in data.items() if k in ("id_pengguna", "id_ruangan", "tanggal", "jam_mulai",
              "jam_selesai", "jenis_kegiatan", "keperluan", "jumlah_peserta")})

    for f in ("id_pengguna", "id_ruangan", "tanggal", "jam_mulai", "jam_selesai",
              "jenis_kegiatan", "keperluan", "jumlah_peserta"):
        if h.get(f) in (None, ""):
            return None, f"Field '{f}' wajib diisi", 400
    for f in ("id_pengguna", "id_ruangan", "jumlah_peserta"):
        if not isinstance(h[f], int) or isinstance(h[f], bool):
            return None, f"'{f}' harus berupa bilangan bulat", 400
    if h["jumlah_peserta"] < 1:
        return None, "Jumlah peserta minimal 1", 400
    if not cari(pengguna, h["id_pengguna"]):
        return None, "Pengguna tidak ditemukan", 400
    ruang = cari(ruangan, h["id_ruangan"])
    if not ruang:
        return None, "Ruangan tidak ditemukan", 400

    try:
        datetime.strptime(h["tanggal"], "%Y-%m-%d")
    except (TypeError, ValueError):
        return None, "Tanggal harus berformat YYYY-MM-DD dan benar-benar ada", 400
    for f in ("jam_mulai", "jam_selesai"):
        if not isinstance(h[f], str) or not JAM.match(h[f]):
            return None, f"'{f}' harus berformat HH:MM, contoh 09:00", 400
    if h["jenis_kegiatan"] not in JENIS_KEGIATAN:
        return None, "Jenis kegiatan harus salah satu dari: " + ", ".join(JENIS_KEGIATAN), 400
    if not isinstance(h["keperluan"], str) or not h["keperluan"].strip():
        return None, "Keperluan wajib diisi", 400
    h["keperluan"] = h["keperluan"].strip()

    if ruang["status"] != "tersedia":
        return None, f"{ruang['nama']} sedang dalam perbaikan dan tidak bisa dipinjam", 400
    mulai, selesai = menit(h["jam_mulai"]), menit(h["jam_selesai"])
    if selesai <= mulai:
        return None, "Jam selesai harus lebih besar dari jam mulai", 400
    if mulai < menit(ruang["jam_buka"]) or selesai > menit(ruang["jam_tutup"]):
        return None, f"{ruang['nama']} hanya buka {ruang['jam_buka']}-{ruang['jam_tutup']}", 400
    if h["jumlah_peserta"] > ruang["kapasitas"]:
        return None, (f"Jumlah peserta ({h['jumlah_peserta']}) melebihi kapasitas "
                      f"{ruang['nama']} ({ruang['kapasitas']} orang)"), 400

    bentrok = [p for p in peminjaman
               if p is not lama and p["id_ruangan"] == h["id_ruangan"] and p["tanggal"] == h["tanggal"]
               and p["status"] in AKTIF and mulai < menit(p["jam_selesai"]) and selesai > menit(p["jam_mulai"])]
    if bentrok:
        daftar = "; ".join(f"'{p['keperluan']}' ({p['jam_mulai']}-{p['jam_selesai']})" for p in bentrok)
        saran = jam_kosong_terdekat(ruang, h["tanggal"], mulai, selesai, lama)
        info = (f"Jam kosong terdekat: {jam(saran[0])}-{jam(saran[1])}." if saran
                else "Tidak ada jam kosong yang cukup di tanggal itu.")
        return None, f"Jadwal bentrok dengan {daftar}. {info}", 409
    return h, None, None


def tampil_peminjaman(p):
    """Peminjaman + nama peminjam dan ruangan, supaya frontend tidak perlu menggabungkan sendiri."""
    pg, rg = cari(pengguna, p["id_pengguna"]), cari(ruangan, p["id_ruangan"])
    return {**p, "nama_pengguna": pg["nama"] if pg else "-", "nama_ruangan": rg["nama"] if rg else "-"}


@app.get("/api/peminjaman")
def daftar_peminjaman():
    return jsonify([tampil_peminjaman(p) for p in peminjaman])


@app.get("/api/peminjaman/<int:id_>")
def detail_peminjaman(id_):
    p = cari(peminjaman, id_)
    return jsonify(tampil_peminjaman(p)) if p else error("Peminjaman tidak ditemukan", 404)


@app.post("/api/peminjaman")
def tambah_peminjaman():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    h, pesan, kode = cek_peminjaman(data)
    if pesan:
        return error(pesan, kode)
    h.update(id=max((p["id"] for p in peminjaman), default=0) + 1, status="menunggu", alasan_penolakan="",
             dibuat_pada=datetime.now().isoformat(timespec="seconds"))
    peminjaman.append(h)
    return jsonify(tampil_peminjaman(h)), 201


# Cek jadwal untuk pop-up pengajuan: tidak menyimpan apa pun, selalu 200 dengan {aman, pesan}.
@app.post("/api/peminjaman/cek")
def cek_jadwal():
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    # isian yang tidak mempengaruhi jadwal diberi nilai bawaan, supaya bisa dicek sebelum form lengkap
    data = {"jenis_kegiatan": "Lainnya", "keperluan": "-", "jumlah_peserta": 1,
            **{k: v for k, v in data.items() if v not in (None, "")}}
    # id_peminjaman (opsional): peminjaman yang sedang diubah, jangan dihitung sebagai bentrok
    _, pesan, _ = cek_peminjaman(data, cari(peminjaman, data.get("id_peminjaman")))
    return jsonify(aman=pesan is None, pesan=pesan or "Jadwal tersedia")


# Belum dicek siapa pemiliknya, karena belum ada token/sesi.
@app.put("/api/peminjaman/<int:id_>")
def ubah_peminjaman(id_):
    p = cari(peminjaman, id_)
    if not p:
        return error("Peminjaman tidak ditemukan", 404)
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    if p["status"] != "menunggu":
        return error("Hanya peminjaman berstatus menunggu yang bisa diubah atau dibatalkan", 409)
    if data.get("status") == "dibatalkan":  # tombol "Batalkan"
        p["status"] = "dibatalkan"
        return jsonify(tampil_peminjaman(p))
    h, pesan, kode = cek_peminjaman(data, p)
    if pesan:
        return error(pesan, kode)
    p.update(h)
    return jsonify(tampil_peminjaman(p))


@app.delete("/api/peminjaman/<int:id_>")
def hapus_peminjaman(id_):
    p = cari(peminjaman, id_)
    if not p:
        return error("Peminjaman tidak ditemukan", 404)
    peminjaman.remove(p)
    return jsonify(pesan="Peminjaman dihapus")


@app.put("/api/peminjaman/<int:id_>/setujui")
def setujui_peminjaman(id_):
    p = cari(peminjaman, id_)
    if not p:
        return error("Peminjaman tidak ditemukan", 404)
    if p["status"] != "menunggu":
        return error(f"Hanya peminjaman berstatus menunggu yang bisa disetujui (sekarang: {p['status']})", 409)
    p["status"], p["alasan_penolakan"] = "disetujui", ""
    return jsonify(tampil_peminjaman(p))


@app.put("/api/peminjaman/<int:id_>/tolak")
def tolak_peminjaman(id_):
    p = cari(peminjaman, id_)
    if not p:
        return error("Peminjaman tidak ditemukan", 404)
    data = ambil_json()
    if data is None:
        return error("Body harus berupa JSON object")
    alasan = data.get("alasan")
    if not isinstance(alasan, str) or not alasan.strip():
        return error("Alasan penolakan wajib diisi")
    if p["status"] != "menunggu":
        return error(f"Hanya peminjaman berstatus menunggu yang bisa ditolak (sekarang: {p['status']})", 409)
    p["status"], p["alasan_penolakan"] = "ditolak", alasan.strip()
    return jsonify(tampil_peminjaman(p))


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

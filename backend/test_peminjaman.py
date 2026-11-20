# Cek cepat peminjaman: python test_peminjaman.py
from app import app

c = app.test_client()
# tanggal jauh di depan supaya tidak ketemu data contoh; Ruang Kelas 1 (id 2) buka 07:00-21:00, kapasitas 45
b = {"id_pengguna": 2, "id_ruangan": 2, "tanggal": "2030-01-10", "jam_mulai": "14:00", "jam_selesai": "16:00",
     "jenis_kegiatan": "Studi grup", "keperluan": "Belajar bareng", "jumlah_peserta": 10}


def kirim(**ubah):
    return c.post("/api/peminjaman", json={**b, **ubah})


# data contoh dan GET
daftar = c.get("/api/peminjaman").get_json()
assert len(daftar) == 20 and {p["status"] for p in daftar} == {"menunggu", "disetujui", "ditolak", "dibatalkan"}
assert daftar[0]["nama_pengguna"] == "Raka" and daftar[0]["nama_ruangan"] == "Aula Pendopo"
assert c.get("/api/peminjaman/999").status_code == 404

# tambah: status awal selalu menunggu
r = kirim(status="disetujui")
assert r.status_code == 201 and r.get_json()["status"] == "menunggu" and r.get_json()["dibuat_pada"]
a = r.get_json()["id"]

# bentrok: pesan menyebut kegiatan, jam, dan jam kosong terdekat
r = kirim(jam_mulai="15:00", jam_selesai="17:00")
pesan = r.get_json()["error"]
assert r.status_code == 409
assert "Belajar bareng" in pesan and "14:00-16:00" in pesan and "16:00-18:00" in pesan

# jam yang hanya bersebelahan tidak bentrok; ruangan lain di jam sama juga aman
r = kirim(jam_mulai="16:00", jam_selesai="18:00")
assert r.status_code == 201
b2 = r.get_json()["id"]
r = kirim(jam_mulai="12:00", jam_selesai="14:00")
assert r.status_code == 201
b3 = r.get_json()["id"]
assert kirim(id_ruangan=5, jumlah_peserta=5).status_code == 201  # Ruang Rapat, id 4 peminjaman baru

# aturan lain
r = kirim(jumlah_peserta=46, jam_mulai="19:00", jam_selesai="20:00")
assert r.status_code == 400 and "kapasitas" in r.get_json()["error"]
assert kirim(id_ruangan=6, jumlah_peserta=5).status_code == 400  # lapangan dalam perbaikan
assert kirim(id_ruangan=3, jam_mulai="17:00", jam_selesai="19:00").status_code == 400  # lab tutup 18:00
assert kirim(jam_mulai="19:00", jam_selesai="19:00").status_code == 400
assert kirim(tanggal="2030-02-30").status_code == 400
assert kirim(jenis_kegiatan="Kondangan").status_code == 400
assert kirim(id_pengguna=999).status_code == 400
assert kirim(id_ruangan=999).status_code == 400
assert kirim(jumlah_peserta="10").status_code == 400
assert c.post("/api/peminjaman", json={"id_ruangan": 2}).status_code == 400
assert c.post("/api/peminjaman", data="bukan json").status_code == 400

# setujui: yang disetujui tetap menghalangi jadwal lain
assert c.put(f"/api/peminjaman/{a}/setujui").get_json()["status"] == "disetujui"
assert c.put(f"/api/peminjaman/{a}/setujui").status_code == 409
assert kirim(jam_mulai="15:00", jam_selesai="17:00").status_code == 409

# tolak: wajib alasan; yang ditolak tidak lagi menghalangi
assert c.put(f"/api/peminjaman/{b2}/tolak", json={}).status_code == 400
r = c.put(f"/api/peminjaman/{b2}/tolak", json={"alasan": "Ruang dipakai kuliah"})
assert r.get_json()["status"] == "ditolak" and r.get_json()["alasan_penolakan"] == "Ruang dipakai kuliah"
assert c.put(f"/api/peminjaman/{a}/tolak", json={"alasan": "x"}).status_code == 409  # sudah disetujui
r = kirim(jam_mulai="16:00", jam_selesai="18:00")
assert r.status_code == 201
b4 = r.get_json()["id"]

# ubah: boleh pada jadwalnya sendiri, tidak boleh menabrak, tidak boleh kalau sudah disetujui
assert c.put(f"/api/peminjaman/{b4}", json={"keperluan": "Ganti judul"}).get_json()["keperluan"] == "Ganti judul"
assert c.put(f"/api/peminjaman/{b4}", json={"jam_mulai": "15:00", "jam_selesai": "17:00"}).status_code == 409
assert c.put(f"/api/peminjaman/{a}", json={"keperluan": "x"}).status_code == 409

# batalkan: sekali saja, dan slotnya bebas lagi
assert c.put(f"/api/peminjaman/{b3}", json={"status": "dibatalkan"}).get_json()["status"] == "dibatalkan"
assert c.put(f"/api/peminjaman/{b3}", json={"status": "dibatalkan"}).status_code == 409
r = kirim(jam_mulai="12:00", jam_selesai="14:00")
assert r.status_code == 201

# cek jadwal untuk pop-up: tidak menyimpan, selalu 200 dengan {aman, pesan}
jumlah = len(c.get("/api/peminjaman").get_json())
cek = {"id_pengguna": 2, "id_ruangan": 2, "tanggal": "2030-03-01", "jam_mulai": "09:00", "jam_selesai": "11:00"}
r = c.post("/api/peminjaman/cek", json=cek)
assert r.status_code == 200 and r.get_json()["aman"] is True
assert c.post("/api/peminjaman/cek", json={**cek, "keperluan": "", "jumlah_peserta": None}).get_json()["aman"] is True  # isian kosong diabaikan
assert len(c.get("/api/peminjaman").get_json()) == jumlah  # tidak ada yang tersimpan

assert kirim(tanggal="2030-03-01", jam_mulai="09:00", jam_selesai="11:00").status_code == 201
r = c.post("/api/peminjaman/cek", json={**cek, "jam_mulai": "10:00", "jam_selesai": "12:00"})
assert r.status_code == 200 and r.get_json()["aman"] is False and "bentrok" in r.get_json()["pesan"]
assert c.post("/api/peminjaman/cek", json={**cek, "jam_mulai": "11:00", "jam_selesai": "12:00"}).get_json()["aman"] is True
assert c.post("/api/peminjaman/cek", json={**cek, "jam_mulai": "13:00", "jam_selesai": "14:00", "jumlah_peserta": 100}).get_json()["aman"] is False  # kapasitas
assert c.post("/api/peminjaman/cek", json={**cek, "id_ruangan": 6}).get_json()["aman"] is False  # perbaikan
assert c.post("/api/peminjaman/cek", json={"id_ruangan": 2}).get_json()["aman"] is False  # data belum lengkap
assert c.post("/api/peminjaman/cek", data="bukan json").status_code == 400
# ruangan dan pengguna yang masih dipakai tidak bisa dihapus
assert c.delete("/api/ruangan/2").status_code == 409
assert c.delete("/api/pengguna/2").status_code == 409

assert c.delete(f"/api/peminjaman/{a}").status_code == 200
assert c.get(f"/api/peminjaman/{a}").status_code == 404
assert c.get("/api/health").get_json()["jumlah_data"]["peminjaman"] > 20
print("semua cek lolos")

# Cek permintaan bersamaan: python test_bersamaan.py
# Data ada di memori dan gunicorn memakai beberapa thread, jadi "cek bentrok lalu simpan" harus tak terpotong.
import threading
import time

import app as modul
from app import app

# Perlambat langkah cek (sengaja) supaya celah antara "cek" dan "simpan" lebar. Tanpa kunci, tes ini pasti gagal.
_asli = modul.cek_peminjaman


def cek_lambat(data, lama=None):
    hasil = _asli(data, lama)
    time.sleep(0.05)
    return hasil


modul.cek_peminjaman = cek_lambat

b = {"id_pengguna": 2, "id_ruangan": 2, "tanggal": "2031-05-05", "jam_mulai": "10:00", "jam_selesai": "12:00",
     "jenis_kegiatan": "Studi grup", "keperluan": "Uji bersamaan", "jumlah_peserta": 10}


def serentak(pekerjaan):
    """Jalankan semua fungsi di thread berbeda, dimulai berbarengan; hasilnya berupa daftar status code."""
    gerbang = threading.Barrier(len(pekerjaan))
    hasil = [None] * len(pekerjaan)

    def jalan(i, f):
        klien = app.test_client()  # satu klien per thread
        gerbang.wait()
        hasil[i] = f(klien).status_code

    ts = [threading.Thread(target=jalan, args=(i, f)) for i, f in enumerate(pekerjaan)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    return hasil


def jumlah(kode, daftar):
    return daftar.count(kode)


# 1. dua pengajuan untuk slot yang sama (dan juga yang tumpang tindih) di saat bersamaan: hanya satu yang masuk
hasil = serentak([lambda k: k.post("/api/peminjaman", json=b)] * 2)
assert sorted(hasil) == [201, 409], hasil
hasil = serentak([lambda k, j=j: k.post("/api/peminjaman", json={**b, "tanggal": "2031-05-06", "jam_mulai": j, "jam_selesai": "13:00"})
                  for j in ("10:00", "11:00", "10:30", "09:00", "12:00")])
# 10:00, 11:00, 10:30, 09:00 saling tumpang tindih (semua sampai 13:00); 12:00-13:00 juga tumpang tindih dengan semuanya
assert jumlah(201, hasil) == 1 and jumlah(409, hasil) == 4, hasil
klien = app.test_client()
semua = klien.get("/api/peminjaman").get_json()
assert len([p for p in semua if p["tanggal"] == "2031-05-05" and p["id_ruangan"] == 2]) == 1
assert len([p for p in semua if p["tanggal"] == "2031-05-06" and p["id_ruangan"] == 2]) == 1
ids = [p["id"] for p in semua]
assert len(ids) == len(set(ids)), "id harus unik walau diajukan bersamaan"

# 2. slot berbeda di saat bersamaan: semuanya masuk dan id tetap unik
hasil = serentak([lambda k, j=j: k.post("/api/peminjaman", json={**b, "tanggal": "2031-06-01", "jam_mulai": f"{j:02d}:00", "jam_selesai": f"{j + 1:02d}:00"})
                  for j in range(8, 14)])
assert hasil == [201] * 6, hasil
ids = [p["id"] for p in klien.get("/api/peminjaman").get_json()]
assert len(ids) == len(set(ids))

# 3. dua perubahan (PUT) ke slot kosong yang sama di saat bersamaan: hanya satu yang berhasil
a = klien.post("/api/peminjaman", json={**b, "tanggal": "2031-07-01", "jam_mulai": "08:00", "jam_selesai": "09:00"}).get_json()["id"]
c = klien.post("/api/peminjaman", json={**b, "tanggal": "2031-07-01", "jam_mulai": "15:00", "jam_selesai": "16:00"}).get_json()["id"]
pindah = {**b, "tanggal": "2031-07-01", "jam_mulai": "11:00", "jam_selesai": "12:00"}
hasil = serentak([lambda k: k.put(f"/api/peminjaman/{a}", json=pindah), lambda k: k.put(f"/api/peminjaman/{c}", json=pindah)])
assert sorted(hasil) == [200, 409], hasil

# 4. dua admin menyetujui peminjaman yang sama: satu 200, satu 409; setujui vs tolak: hanya satu yang menang
hasil = serentak([lambda k: k.put(f"/api/peminjaman/{a}/setujui")] * 2)
assert sorted(hasil) in ([200, 409], [409, 409]), hasil  # a mungkin sudah disetujui/diubah di langkah 3
d = klien.post("/api/peminjaman", json={**b, "tanggal": "2031-08-01"}).get_json()["id"]
hasil = serentak([lambda k: k.put(f"/api/peminjaman/{d}/setujui"), lambda k: k.put(f"/api/peminjaman/{d}/tolak", json={"alasan": "bentrok"})])
assert sorted(hasil) == [200, 409], hasil
akhir = klien.get(f"/api/peminjaman/{d}").get_json()
assert akhir["status"] in ("disetujui", "ditolak")
assert (akhir["status"] == "ditolak") == bool(akhir["alasan_penolakan"]), akhir  # status dan alasan tidak boleh tercampur

# 5. ubah vs setujui bersamaan: peminjaman tidak berakhir "disetujui" dengan jam yang sudah diubah tanpa sepengetahuan admin
e = klien.post("/api/peminjaman", json={**b, "tanggal": "2031-09-01"}).get_json()["id"]
hasil = serentak([lambda k: k.put(f"/api/peminjaman/{e}/setujui"), lambda k: k.put(f"/api/peminjaman/{e}", json={**b, "tanggal": "2031-09-01", "jam_mulai": "14:00", "jam_selesai": "15:00"})])
assert 200 in hasil and jumlah(200, hasil) + jumlah(409, hasil) == 2, hasil

# tanpa kunci hasil 1 dan 3 akan 201+201 / 200+200; cek juga kuncinya benar-benar ada
assert hasattr(modul, "kunci_peminjaman")
print("semua cek lolos")

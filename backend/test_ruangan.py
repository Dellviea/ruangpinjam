# Cek cepat CRUD ruangan: python test_ruangan.py
from app import app

c = app.test_client()
baru = {"kode": "T-01", "nama": "Ruang Tes", "jenis": "Aula", "gedung": "G", "lantai": "1", "kapasitas": 10}

assert len(c.get("/api/ruangan").get_json()) == 17
assert c.get("/api/ruangan/999").status_code == 404

r = c.post("/api/ruangan", json=baru)
assert r.status_code == 201
id_ = r.get_json()["id"]
assert r.get_json()["jam_tutup"] == "21:00"  # default

assert c.post("/api/ruangan", json=baru).status_code == 400  # kode kembar
assert c.post("/api/ruangan", json={**baru, "kode": "T-02", "kapasitas": 0}).status_code == 400
assert c.post("/api/ruangan", json={**baru, "kode": "T-02", "jenis": "Kolam"}).status_code == 400
assert c.post("/api/ruangan", json={**baru, "kode": "T-02", "jam_tutup": "06:00"}).status_code == 400
assert c.post("/api/ruangan", data="bukan json").status_code == 400

r = c.put(f"/api/ruangan/{id_}", json={"kapasitas": 25, "status": "dalam perbaikan"})
assert r.get_json()["kapasitas"] == 25 and r.get_json()["nama"] == "Ruang Tes"  # field lain tetap

assert c.delete(f"/api/ruangan/{id_}").status_code == 200
assert c.get(f"/api/ruangan/{id_}").status_code == 404
print("semua cek lolos")

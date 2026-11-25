# Cek cepat pengguna + login: python test_pengguna.py
from app import app

c = app.test_client()
PW = "pinjamruang123"
baru = {"nama": "Tes", "nim_nip": "999", "email": "Tes@Email.com", "password": "rahasia1"}

daftar = c.get("/api/pengguna").get_json()
assert len(daftar) == 4 and all("password" not in p for p in daftar)  # password tidak bocor

# login
r = c.post("/api/login", json={"email": "DELLA@email.com", "password": PW})
assert r.status_code == 200 and r.get_json()["nama"] == "Della" and "password" not in r.get_json()
assert c.post("/api/login", json={"email": "della@email.com", "password": "salah"}).status_code == 401
assert c.post("/api/login", json={"email": "della@email.com", "password": "salah"}).get_json()["kode"] == "login_salah"
assert c.post("/api/login", json={"email": "tidakada@email.com", "password": PW}).status_code == 401
assert c.post("/api/login", json={"email": "della@email.com"}).status_code == 400

# tambah
r = c.post("/api/pengguna", json=baru)
assert r.status_code == 201 and r.get_json()["email"] == "tes@email.com" and "password" not in r.get_json()
id_ = r.get_json()["id"]
assert c.post("/api/login", json={"email": "tes@email.com", "password": "rahasia1"}).status_code == 200

assert c.post("/api/pengguna", json=baru).status_code == 400  # email kembar
assert c.post("/api/pengguna", json={**baru, "email": "x@email.com"}).status_code == 400  # nim kembar
assert c.post("/api/pengguna", json={**baru, "email": "x@email.com", "nim_nip": "1", "password": "123"}).status_code == 400
assert c.post("/api/pengguna", json={**baru, "email": "salah", "nim_nip": "1"}).status_code == 400
assert c.post("/api/pengguna", json={**baru, "email": "x@email.com", "nim_nip": "1", "peran": "dosen"}).status_code == 400

# ubah: tanpa password -> password lama tetap; dengan password -> berganti
r = c.put(f"/api/pengguna/{id_}", json={"prodi": "S1 TI"})
assert r.get_json()["prodi"] == "S1 TI"
assert c.post("/api/login", json={"email": "tes@email.com", "password": "rahasia1"}).status_code == 200
c.put(f"/api/pengguna/{id_}", json={"password": "baru1234"})
assert c.post("/api/login", json={"email": "tes@email.com", "password": "rahasia1"}).status_code == 401
assert c.post("/api/login", json={"email": "tes@email.com", "password": "baru1234"}).status_code == 200

assert c.delete(f"/api/pengguna/{id_}").status_code == 200
assert c.get(f"/api/pengguna/{id_}").status_code == 404
# register: peran selalu mahasiswa walau minta admin
reg = {"nama": "Baru", "nim_nip": "888", "email": "Baru@Email.com", "password": "rahasia1", "peran": "admin"}
r = c.post("/api/register", json=reg)
assert r.status_code == 201
assert r.get_json()["peran"] == "mahasiswa" and "password" not in r.get_json()
reg_id = r.get_json()["id"]
assert c.post("/api/login", json={"email": "baru@email.com", "password": "rahasia1"}).status_code == 200
assert c.post("/api/register", json=reg).status_code == 400  # email kembar
assert c.post("/api/register", json={**reg, "email": "y@email.com", "nim_nip": "777", "password": "1"}).status_code == 400
assert c.post("/api/register", json={"nama": "Tanpa Email"}).status_code == 400
assert c.post("/api/register", data="bukan json").status_code == 400

# lupa password: harus cocok email + nim
lupa = {"email": "baru@email.com", "nim": "888", "password_baru": "gantibaru1"}
assert c.post("/api/lupa-password", json={**lupa, "nim": "000"}).status_code == 404  # nim salah
assert c.post("/api/lupa-password", json={**lupa, "email": "tidakada@email.com"}).status_code == 404
assert c.post("/api/lupa-password", json={**lupa, "password_baru": "123"}).status_code == 400
assert c.post("/api/lupa-password", json={"email": "baru@email.com"}).status_code == 400
assert c.post("/api/lupa-password", json=lupa).status_code == 200
assert c.post("/api/login", json={"email": "baru@email.com", "password": "rahasia1"}).status_code == 401
assert c.post("/api/login", json={"email": "baru@email.com", "password": "gantibaru1"}).status_code == 200

c.delete(f"/api/pengguna/{reg_id}")
print("semua cek lolos")

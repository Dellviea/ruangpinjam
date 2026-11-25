# PinjamRuang

PinjamRuang adalah aplikasi web peminjaman ruangan kampus. Mahasiswa bisa melihat jadwal semua ruangan, mencari ruangan yang kosong, mengajukan peminjaman, dan memantau statusnya. Admin (bagian sarana dan prasarana) menyetujui atau menolak pengajuan serta mengelola data. Sistem otomatis menolak jadwal yang bentrok, peserta yang melebihi kapasitas, ruangan yang sedang diperbaiki, dan waktu yang sudah lewat.

## Fitur utama

**Mahasiswa**
- Daftar akun, masuk, dan atur ulang password (verifikasi email + NIM).
- Jadwal: tabel ruangan x jam per hari, dikelompokkan per jenis ruangan. Klik slot kosong untuk mengajukan peminjaman.
- Cari Ruangan Kosong: isi jumlah orang, tanggal, dan jam, lalu lihat ruangan yang cocok (diurutkan dari ukuran yang paling pas).
- Daftar Ruangan: kartu ruangan dengan status, kapasitas, fasilitas, pencarian, dan filter jenis.
- Peminjaman Saya: pantau status (menunggu, disetujui, ditolak, dibatalkan), ubah atau batalkan pengajuan yang masih menunggu, ajukan ulang yang ditolak.

**Admin**
- Persetujuan: setujui pengajuan, atau tolak dengan alasan.
- Kelola Data: tambah, ubah, dan hapus data ruangan, pengguna, dan peminjaman.

**Umum**
- Bahasa Indonesia dan Inggris, mode terang dan gelap.
- Pesan bentrok menyebut kegiatan yang bentrok, jamnya, dan jam kosong terdekat.

## Teknologi

| Bagian | Yang dipakai |
|---|---|
| Backend | Python, Flask (REST API, JSON) |
| Frontend | HTML, CSS, JavaScript biasa (tanpa framework) |
| Data | Disimpan di memori backend (list of dict), tanpa database, sesuai ketentuan tugas |
| Server web | nginx (menyajikan frontend dan meneruskan `/api`) |
| Server aplikasi | gunicorn, dijalankan sebagai service systemd |
| Hosting | Google Cloud (Compute Engine, VM Ubuntu, region asia-southeast2) |

## Arsitektur singkat

```
Browser  --HTTP:80-->  nginx  --/api/*-->  gunicorn (127.0.0.1:8000)  -->  Flask
                         |
                         +--> file frontend/ (HTML, CSS, JS)

Semuanya berjalan di satu VM Google Cloud.
```

- Browser membuka halaman dari nginx, lalu memanggil `/api/...` (alamat relatif) ke nginx yang sama.
- nginx meneruskan `/api` ke gunicorn di port 8000 (hanya bisa diakses dari dalam VM).
- Di laptop (mode pengembangan), Flask menyajikan frontend sendiri di port 5000, jadi nginx tidak diperlukan.

Struktur folder:

```
pinjamruang/
  backend/    app.py, requirements.txt, .env.example, test_*.py
  frontend/   index.html, css/, js/
  deploy/     pinjamruang.service (systemd), nginx-pinjamruang.conf (nginx)
```

## Menjalankan di laptop (Windows)

Butuh Python 3.10 atau lebih baru. Buka PowerShell, lalu:

```powershell
cd pinjamruang\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Buka http://localhost:5000 di browser. Hentikan server dengan Ctrl+C.

Jika `activate` ditolak karena kebijakan eksekusi, jalankan dulu: `Set-ExecutionPolicy -Scope Process Bypass`.

Data hanya ada di memori, jadi setiap server dijalankan ulang, data kembali ke data contoh.

## Akun contoh

Password semua akun contoh: `pinjamruang123` (bisa diganti lewat `PASSWORD_CONTOH` di `.env`).

| Peran | Nama | Email |
|---|---|---|
| Admin | Dellvia | dellvia@email.com |
| Mahasiswa | Della | della@email.com |
| Mahasiswa | Raka | raka@email.com |
| Mahasiswa | Nadia | nadia@email.com |

Contoh alur mencoba: masuk sebagai Della, ajukan peminjaman dari halaman Jadwal. Lalu keluar, masuk sebagai Dellvia, dan setujui atau tolak di menu Persetujuan.

## Deploy ke VM Google Cloud

Panduan ini untuk pemula. Jalankan perintah satu per satu. Contoh di bawah memakai lokasi `/opt/pinjamruang`; file di folder `deploy/` sudah memakai lokasi yang sama.

### a. Buat project dan aktifkan Compute Engine

1. Buka https://console.cloud.google.com dan masuk dengan akun Google.
2. Klik pemilih project di bagian atas, pilih **New Project**, beri nama (misalnya `pinjamruang`), lalu **Create**.
3. Pastikan project baru terpilih dan akun penagihan (billing) sudah terhubung (kredit gratis juga lewat billing).
4. Buka menu **Compute Engine > VM instances**. Jika diminta, klik **Enable** pada Compute Engine API dan tunggu sampai selesai.

### b. Buat VM

Di **Compute Engine > VM instances**, klik **Create instance**, lalu isi:

- **Name**: `pinjamruang`
- **Region**: `asia-southeast2 (Jakarta)`, zone bebas (misalnya `asia-southeast2-a`)
- **Machine type**: seri E2, `e2-small`
- **Boot disk**: klik **Change**, pilih **Ubuntu** versi **22.04 LTS** atau **24.04 LTS**
- **Firewall**: centang **Allow HTTP traffic**

Klik **Create** dan tunggu sampai VM berstatus hijau.

### c. Masuk ke VM dan pasang paket

Di daftar VM, klik tombol **SSH** pada baris `pinjamruang` (terminal terbuka di browser). Lalu:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git
sudo timedatectl set-timezone Asia/Jakarta
timedatectl
```

Baris `Time zone` pada hasil `timedatectl` harus tertulis `Asia/Jakarta`. Langkah ini perlu karena VM Ubuntu memakai UTC (7 jam di belakang WIB), padahal aplikasi memakai jam server untuk menolak tanggal dan jam yang sudah lewat serta untuk data contoh.

### d. Ambil kode dan siapkan backend

```bash
sudo mkdir -p /opt/pinjamruang
sudo chown $USER:$USER /opt/pinjamruang
git clone https://github.com/Dellviea/ruangpinjam.git /opt/pinjamruang

cd /opt/pinjamruang/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate

cp .env.example .env
sed -i 's/^DEBUG=.*/DEBUG=false/' .env
```

Opsional, ganti password contoh: `nano .env`, ubah `PASSWORD_CONTOH`, simpan dengan Ctrl+O, Enter, Ctrl+X.

Jika repo di GitHub bersifat private, `git clone` meminta login. Pakai personal access token sebagai password, atau jadikan repo public.

### e. Pasang service systemd dan konfigurasi nginx

Service (menjalankan gunicorn otomatis dan menyalakannya lagi kalau mati):

```bash
sudo cp /opt/pinjamruang/deploy/pinjamruang.service /etc/systemd/system/pinjamruang.service
sudo sed -i "s/GANTI_USER/$USER/" /etc/systemd/system/pinjamruang.service
sudo systemctl daemon-reload
sudo systemctl enable --now pinjamruang
sudo systemctl status pinjamruang
```

Status harus `active (running)`. Tekan `q` untuk keluar dari tampilan status. Cek juga backend langsung:

```bash
curl http://127.0.0.1:8000/api/health
```

nginx (menyajikan frontend dan meneruskan `/api`):

```bash
sudo cp /opt/pinjamruang/deploy/nginx-pinjamruang.conf /etc/nginx/sites-available/pinjamruang
sudo ln -s /etc/nginx/sites-available/pinjamruang /etc/nginx/sites-enabled/pinjamruang
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

`nginx -t` harus menampilkan `syntax is ok` dan `test is successful`.

### f. Buka aplikasinya

1. Di **Compute Engine > VM instances**, salin **External IP** milik VM.
2. Buka `http://<IP-eksternal-VM>` di browser (pakai `http`, bukan `https`).
3. Cek backend lewat `http://<IP-eksternal-VM>/api/health`. Hasilnya JSON berisi status, nama server, waktu, dan jumlah data.
4. Masuk dengan akun contoh di atas.

### g. Memperbarui setelah ada perubahan kode

```bash
cd /opt/pinjamruang
git pull
sudo systemctl restart pinjamruang
```

- Jika `requirements.txt` berubah, jalankan dulu: `/opt/pinjamruang/backend/.venv/bin/pip install -r /opt/pinjamruang/backend/requirements.txt`.
- Jika file di `deploy/` berubah, salin lagi (langkah e) lalu `sudo systemctl daemon-reload` atau `sudo systemctl restart nginx`.
- Restart service mengembalikan data ke data contoh (data hanya di memori).
- Di browser tekan **Ctrl+F5** supaya tampilan terbaru dimuat.

### h. Menghemat kredit: stop dan start VM

VM yang menyala terus memakai kredit. Setelah selesai demo atau latihan, hentikan:

- Console: **Compute Engine > VM instances**, centang VM, klik **Stop**. Untuk menyalakan lagi klik **Start**.
- Atau lewat terminal yang sudah terpasang `gcloud`:

```bash
gcloud compute instances stop pinjamruang --zone=asia-southeast2-a
gcloud compute instances start pinjamruang --zone=asia-southeast2-a
```

Catatan:
- VM yang berhenti tidak dikenai biaya mesin, tapi disk-nya tetap ditagih (kecil).
- **IP eksternal bisa berubah** setiap VM dinyalakan ulang. Cek lagi IP di daftar VM.
- Jika ingin IP tetap, buat IP statis: **VPC network > IP addresses > Reserve external static address**, lalu pasang ke VM. IP statis yang tidak terpasang ke VM yang menyala dikenai biaya kecil, jadi hapus kalau sudah tidak dipakai.
- Service dan nginx aktif otomatis lagi saat VM menyala (sudah di-`enable`). Data kembali ke data contoh.

## Kenapa gunicorn hanya 1 worker

Data disimpan sebagai list di memori **satu proses**. Kalau gunicorn dijalankan dengan 2 worker atau lebih, setiap worker punya salinan data sendiri:

- pengajuan yang dibuat lewat satu worker tidak terlihat oleh worker lain,
- jadwal yang bentrok bisa lolos,
- data tampil berbeda-beda setiap halaman dimuat ulang.

Karena itu perintahnya wajib `--workers 1 --threads 4` (lihat `deploy/pinjamruang.service`). Beberapa thread dalam satu worker aman: pengecekan bentrok dan penyimpanan peminjaman dibungkus `threading.Lock`, dan ini diuji di `backend/test_bersamaan.py`. Konsekuensinya, restart service berarti data kembali ke data contoh.

## Mengatasi masalah umum

**502 Bad Gateway.** nginx hidup tapi gunicorn tidak. Cek:

```bash
sudo systemctl status pinjamruang
sudo journalctl -u pinjamruang -n 50 --no-pager
curl http://127.0.0.1:8000/api/health
```

Penyebab yang sering: `.venv` belum dibuat atau `pip install` belum dijalankan, `.env` belum ada, atau `GANTI_USER` belum diganti di file service. Setelah diperbaiki: `sudo systemctl restart pinjamruang`.

**Halaman tidak terbuka (timeout).**
- Pastikan VM berstatus berjalan dan alamat memakai `http://`, bukan `https://`.
- Pastikan **Allow HTTP traffic** tercentang. Cek di halaman detail VM > **Edit**, atau tambah aturan firewall untuk `tcp:80`.
- Cek nginx: `sudo systemctl status nginx` dan `sudo nginx -t`.
- IP eksternal mungkin berubah setelah VM dinyalakan ulang.

**403 Forbidden atau halaman default nginx.** Pastikan repo ada di `/opt/pinjamruang` dan situs bawaan sudah dihapus: `sudo rm -f /etc/nginx/sites-enabled/default`, lalu `sudo systemctl restart nginx`.

**Jam/tanggal di aplikasi tidak sesuai.** Cek zona waktu VM dengan `timedatectl`. Kalau bukan `Asia/Jakarta`, atur lalu muat ulang service:

```bash
sudo timedatectl set-timezone Asia/Jakarta
sudo systemctl daemon-reload
sudo systemctl restart pinjamruang
```

**Perubahan tidak muncul.** Jalankan `git pull`, `sudo systemctl restart pinjamruang`, lalu tekan **Ctrl+F5** di browser.

## Menjalankan tes

Tes backend berupa skrip biasa (tanpa framework). Jalankan dari folder `backend` dengan venv aktif:

```powershell
cd backend
python test_ruangan.py
python test_pengguna.py
python test_peminjaman.py
python test_bersamaan.py
```

Setiap skrip mencetak `semua cek lolos` kalau berhasil, atau berhenti dengan pesan `AssertionError` kalau ada yang salah.

## Tim

Kelompok 2, kelas IF-48-02, mata kuliah Komputasi Awan dan Terdistribusi (CAK3EAB3), Telkom University.

| Nama | NIM | Peran |
|---|---|---|
| Della Oktavia | 103012400260 | Desain UI, frontend, backend, testing |
| Adinda Syifa | 102012400207 | Setup Google Cloud, deploy ke VM |

# Daftar Cek Testing Manual PinjamRuang

Centang `[x]` setiap langkah yang hasilnya sesuai. Kalau ada yang tidak sesuai, catat di bagian
**Catatan temuan** paling bawah (langkah mana, apa yang terjadi, apa yang diharapkan).

## 0. Persiapan

### Menjalankan di laptop
```powershell
cd pinjamruang\backend
python -m venv .venv                       # hanya sekali
.\.venv\Scripts\pip install -r requirements.txt   # hanya sekali
.\.venv\Scripts\python app.py
```
Buka **http://localhost:5000**. Hentikan server dengan `Ctrl+C`.

- Kalau muncul "address already in use": ada server lama yang masih jalan. Tutup terminalnya, atau
  ganti port dengan menyalin `backend\.env.example` menjadi `backend\.env` lalu ubah `PORT`.
- **Semua data ada di memori.** Menghentikan dan menjalankan ulang server mengembalikan semuanya ke
  data contoh (termasuk password yang pernah diganti). Itu cara cepat untuk mengulang tes dari awal.
- Data contoh memakai tanggal **relatif hari ini dan besok**, jadi jadwal selalu terisi.

### Akun contoh (semua memakai password `pinjamruang123`)
| Peran | Nama | Email | NIM/NIP |
|---|---|---|---|
| Admin | Dellvia | dellvia@email.com | 198501012010 |
| Mahasiswa | Della | della@email.com | 1202220001 |
| Mahasiswa | Raka | raka@email.com | 1202220002 |
| Mahasiswa | Nadia | nadia@email.com | 1202220003 |

### Tips penting
- Sesi login disimpan per **profil browser**. Untuk menguji dua peran sekaligus (admin dan
  mahasiswa), pakai dua profil atau satu jendela biasa dan satu **jendela Incognito/InPrivate**.
  Kalau tidak, keluar di satu tab ikut mengeluarkan tab lain.
- Bahasa dan mode tampilan juga tersimpan per profil browser.
- Pesan error dari server (misalnya "Jadwal bentrok...") **selalu berbahasa Indonesia**, termasuk saat
  tampilan diganti ke Inggris. Itu keterbatasan yang sudah diketahui, bukan bug.
- Urutan bagian di bawah dirancang berurutan (data hasil bagian sebelumnya dipakai di bagian
  berikutnya). Kalau ingin mengulang, restart server.

## 1. Cek cepat (smoke test)
- [ ] `http://localhost:5000/api/health` menampilkan JSON: `status: ok`, `server` (nama komputer),
      `waktu`, dan `jumlah_data` = ruangan 17, pengguna 4, peminjaman 20.
- [ ] `http://localhost:5000` menampilkan halaman **Masuk** (bukan halaman kosong atau error).
- [ ] Buka konsol browser (`F12` → Console): tidak ada tulisan merah saat berpindah halaman.
- [ ] Alamat yang tidak ada, misalnya `http://localhost:5000/api/ngawur`, menjawab JSON
      `{"error": "Alamat tidak ditemukan"}`.

## 2. Mahasiswa

### 2.1 Register
Buka halaman Masuk → klik **Daftar**.
- [ ] Isi lengkap (nama, NIM/NIP baru, email baru, password 6+ karakter) → **langsung masuk** ke
      halaman Jadwal, profil di bar atas menampilkan nama; arahkan kursor untuk melihat peran **Mahasiswa**.
- [ ] Password dan "Ulangi password" berbeda → pesan "Password dan ulangi password tidak sama".
- [ ] Password kurang dari 6 karakter → pesan "Password minimal 6 karakter".
- [ ] Email yang sudah terdaftar (misalnya `della@email.com`) → pesan "Email '...' sudah terdaftar".
- [ ] NIM/NIP yang sudah ada (misalnya `1202220001`) → pesan "NIM/NIP '...' sudah terdaftar".
- [ ] Format email salah (`abc`) → pesan "Format email tidak valid".
- [ ] Kolom wajib dikosongkan → pesan "... wajib diisi".
- [ ] Tombol berubah jadi "Memproses..." selama dikirim dan aktif lagi kalau gagal.

### 2.1b Tampilan halaman Masuk, Register, dan Lupa password
- [ ] Kartu form berada **di tengah** layar, di atas latar berisi **garis jam samar** dan beberapa **blok
      jadwal kecil** (biru dan pink) yang **pelan-pelan muncul, bergeser, lalu menghilang** (putaran
      sekitar 20 detik). Gerakannya halus dan tidak mengganggu saat mengetik.
- [ ] Latar hanya hiasan: tidak ada teks di dalamnya, tidak bisa diklik, dan kolom form tetap nyaman
      dipakai.
- [ ] Di mode **Gelap**, warna latar ikut gelap (blok biru tua dan pink tua).
- [ ] Di **HP** (lebar di bawah 760px) blok **diam** (tidak bergerak) supaya hemat baterai.
- [ ] Jika Windows memakai pengaturan **"Efek animasi" dimatikan** (Pengaturan → Aksesibilitas → Efek
      visual), blok juga diam.
- [ ] Animasi **hanya ada** di Masuk, Register, dan Lupa password; halaman Jadwal, tabel, Persetujuan, dan
      Kelola Data **tidak** punya animasi latar.
- [ ] Ketiga halaman memakai tampilan yang sama; laptop tidak terasa berat atau kipas tidak menyala
      kencang saat halaman login dibiarkan terbuka beberapa menit.
### 2.2 Login dan keluar
- [ ] Login `della@email.com` + `pinjamruang123` → masuk ke Jadwal; di kanan atas bar tampil avatar + "Della". **Tidak ada** tab Persetujuan/Kelola Data.
- [ ] Email benar + password salah → "Email atau password salah" (pesan sama untuk email yang tidak
      terdaftar).
- [ ] Email atau password dikosongkan → pesan "wajib diisi".
- [ ] Email boleh ditulis huruf besar (`DELLA@email.com`) dan tetap bisa masuk.
- [ ] Muat ulang halaman (`F5`) → tetap masuk (sesi bertahan).
- [ ] Tombol **Keluar** → kembali ke halaman Masuk; tombol Back browser **tidak** membuka Jadwal lagi
      (dialihkan ke Masuk).

### 2.3 Lupa password
Di halaman Masuk klik **Lupa password?**.
- [ ] Email + NIM tidak cocok (misalnya NIM salah) → "Email dan NIM tidak cocok".
- [ ] Password baru kurang dari 6 karakter → "Password minimal 6 karakter".
- [ ] Password baru dan ulangi berbeda → "Password dan ulangi password tidak sama".
- [ ] Email `della@email.com` + NIM `1202220001` + password baru valid → pesan hijau
      "Password berhasil diganti...", form dikosongkan, **tetap di halaman itu**.
- [ ] Link "Kembali ke halaman masuk" → login dengan password **lama** gagal, dengan password **baru**
      berhasil.
- [ ] (Ingat: restart server mengembalikan password ke `pinjamruang123`.)

### 2.4 Halaman yang dilindungi
- [ ] Saat **belum login**, buka langsung `http://localhost:5000/#/jadwal` → dialihkan ke Masuk.
- [ ] Saat login sebagai mahasiswa, buka `#/persetujuan` dan `#/kelola` → dialihkan ke Jadwal.
- [ ] Saat sudah login, buka `#/login` atau `#/register` → dialihkan ke Jadwal.
- [ ] Alamat ngawur seperti `#/abc` → dialihkan ke Jadwal (jika login) atau Masuk.

### 2.5 Jadwal
Login sebagai **Della**.
- [ ] Tabel ruangan × jam (07:00–21:00) tampil, ruangan **dikelompokkan per jenis** (Aula, Ruang
      Kelas, Lab Praktikum, Lab Riset, Ruang Rapat, Lapangan), 17 ruangan semuanya.
- [ ] Judul tanggal menunjukkan hari ini; tombol panah kiri/kanan dan **Hari ini** mengganti tanggal;
      kolom tanggal bisa dipilih manual. Pindah ke besok → blok berganti.
- [ ] Peminjaman milik Della berwarna **pink** dengan label **Milik saya**; milik orang lain berwarna
      **biru** dan menampilkan **nama peminjam**.
- [ ] Isi blok berurutan: **jam (tebal)**, nama kegiatan, lalu **Milik saya** atau nama peminjam. Tidak ada
      tulisan Menunggu/Disetujui di dalam blok; statusnya diwakili strip di sisi kiri (lihat di bawah).
- [ ] Peminjaman berstatus Ditolak atau Dibatalkan **tidak** muncul di tabel.
- [ ] **Lapangan Futsal** berwarna abu-abu dengan tulisan "Dalam perbaikan" dan kotaknya tidak bisa
      diklik.
- [ ] Jam di luar jam buka ruangan (misalnya Lab Praktikum Pemrograman sebelum 08:00 dan sesudah
      18:00) berwarna abu-abu dan tidak bisa diklik.
- [ ] Filter **jenis ruangan** (mis. Lab Riset) hanya menampilkan jenis itu.
- [ ] Pindah ke tanggal yang jauh (mis. tahun depan) → muncul keterangan "Belum ada peminjaman pada
      tanggal ini."
- [ ] Klik kotak kosong → pop-up **Ajukan peminjaman** terbuka dengan ruangan, tanggal, dan jam sudah
      terisi (durasi 1 jam). Tidak ada jadwal mini di dalam pop-up.
- [ ] Klik pada blok peminjaman yang sudah ada → tidak terjadi apa-apa.
- [ ] Tombol **Ajukan peminjaman** di atas membuka pop-up kosong.

### 2.5b Jadwal: penanda waktu, ringkasan, dan tampilan padat
Cek di halaman **Jadwal**, tanggal **hari ini**, dan lakukan antara pukul **07:00 dan 21:00** (di luar jam itu
garis "sekarang" memang tidak muncul).
- [ ] **Garis "sekarang":** garis vertikal **pink** memotong semua baris tepat di posisi jam sekarang, dengan
      **titik kecil** di ujung atasnya (di batas header jam). Arahkan kursor ke titik → tooltip "Sekarang HH:MM".
- [ ] **Header jam yang sedang berjalan ditebalkan** (mis. "14:00" tebal saat pukul 14:20).
- [ ] **Diperbarui tiap menit:** biarkan halaman terbuka 1-2 menit tanpa muat ulang → garis bergeser sendiri
      sedikit ke kanan, dan saat jam berganti, tebal header pindah ke jam berikutnya.
- [ ] Pindah ke **besok** atau **kemarin** → garis, titik, dan tebal header **hilang**. Klik **Hari ini** →
      muncul lagi.
- [ ] Geser tabel ke kanan sampai garis berada di belakang kolom nama ruangan → garis **tertutup** kolom
      itu (tidak menimpanya).
- [ ] **Strip warna 3px di sisi kiri blok:** **hijau** untuk Disetujui, **kuning** untuk Menunggu, pada
      blok pink (milik sendiri) maupun biru (orang lain).
- [ ] **Ringkasan = 3 kotak kecil** (angka besar + keterangan kecil); angkanya **naik dari 0** saat halaman
      dibuka. Isinya: "N kegiatan", "N menunggu", dan khusus hari ini "N ruangan kosong
      sekarang". Pindah ke tanggal lain → hanya dua yang pertama. Angkanya cocok dengan jumlah blok di tabel.
- [ ] Ringkasan **mengikuti filter jenis ruangan** (pilih Aula → hanya menghitung ruangan Aula).
- [ ] Setelah mengajukan peminjaman baru, "kegiatan" dan "menunggu" **bertambah** tanpa muat ulang.
- [ ] **Titik status di samping nama ruangan:** hijau = kosong, biru = sedang dipakai (ada peminjaman
      **disetujui** yang berlangsung sekarang; yang masih Menunggu tidak dihitung), abu-abu = dalam
      perbaikan, **cincin kosong** = tutup (di luar jam buka ruangan, mis. lab setelah 18:00). Arahkan
      kursor ke titik untuk melihat tulisannya.
- [ ] Pada **tanggal lain**, titik hijau/biru berarti "Tidak ada kegiatan"/"Ada kegiatan" pada hari itu.
- [ ] **Baris lebih padat** dan **tingginya seragam**. Nama atau keterangan ruangan yang panjang dipotong
      titik-titik (nama lengkap muncul sebagai tooltip), dan keterangan ruangan hanya "200 orang" (tidak terpotong).
- [ ] Arahkan kursor ke **kotak kosong** → muncul tulisan samar **"+ 09:00"** (sesuai jamnya). Tidak muncul
      pada jam di luar jam buka, ruangan perbaikan, atau saat di atas blok kegiatan.
- [ ] **Legenda** memakai kotak warna kecil yang solid (bukan kotak berbingkai seperti checkbox): Milik saya,
      Jadwal orang lain, Disetujui, Menunggu, Di luar jam buka atau perbaikan.
- [ ] **Header jam dan kolom ruangan menempel:** scroll ke bawah di dalam tabel → baris jam tetap di atas;
      scroll ke kanan → nama ruangan tetap di kiri. Area tabel punya batas tinggi dan scroll sendiri.
- [ ] Bisa dilihat bahwa garis "sekarang" tidak menghalangi klik: klik kotak kosong di dekat garis tetap
      membuka pop-up pengajuan.
### 2.6 Ajukan peminjaman (jalur aman)
Di pop-up pengajuan:
- [ ] Daftar ruangan **dikelompokkan per jenis**; Lapangan Futsal tampil tetapi **tidak bisa dipilih**
      (keterangan "dalam perbaikan").
- [ ] Setelah ruangan dipilih, muncul "Kapasitas ruangan: N orang".
- [ ] Sebelum ruangan, tanggal, dan jam lengkap → kotak pesan abu-abu berisi petunjuk.
- [ ] Pilih **Aula Manterawu**, besok, 14:00–15:00, jenis kegiatan apa saja, keperluan dan jumlah
      peserta valid → kotak pesan berubah **hijau** ("Aman. Jadwal tersedia dan tidak bentrok.").
- [ ] **Kirim pengajuan** → pop-up menutup, muncul **toast hijau** di pojok kanan bawah yang hilang
      sendiri (~4 detik), dan blok baru muncul di Jadwal berwarna pink berlabel **Menunggu**.
- [ ] Ada di tab **Menunggu** pada halaman Peminjaman Saya.
- [ ] Klik **Kirim** dengan isian belum lengkap → pesan "Lengkapi semua isian dulu."
- [ ] Tombol **Batal**, tombol `Esc`, dan klik di luar kotak pop-up semuanya menutup pop-up.

### 2.7 Cek bentrok
Hari ini **Ruang Kelas 1** sudah dipakai: Responsi Kalkulus 13:00–15:00 dan Studi grup Struktur Data
15:00–17:00 (keduanya milik Della, menunggu). Jam kosongnya 07:00–13:00 dan 17:00–21:00.
- [ ] Ajukan Ruang Kelas 1, hari ini, **13:30–14:30** → pesan **merah**: "Jadwal bentrok dengan
      'Responsi Kalkulus' (13:00-15:00). Jam kosong terdekat: 12:00-13:00." (jam saran bisa berbeda
      kalau datanya sudah kamu ubah). Tombol Kirim **nonaktif**.
- [ ] Pesan menyebut **nama kegiatan**, **jamnya**, dan **jam kosong terdekat**.
- [ ] Ubah jam jadi **17:00–18:00** (kosong) atau ikuti saran jam kosong → pesan jadi hijau, tombol
      Kirim aktif lagi.
- [ ] Jam yang hanya **bersebelahan** dianggap aman: **17:00–18:00** dimulai tepat saat Studi grup
      (15:00–17:00) selesai, dan tetap hijau. Sebaliknya **16:30–17:30** bentrok.
- [ ] Ruangan **lain** pada jam yang sama tetap aman.
- [ ] Peminjaman berstatus **Ditolak** atau **Dibatalkan** tidak membuat bentrok (mis. Lab Riset AI
      besok 10:00–12:00 yang ditolak, boleh diajukan lagi).
- [ ] Mengirim paksa (misalnya dua pengajuan yang sama dari dua jendela) → pesan bentrok juga muncul
      saat kirim.

### 2.8 Kapasitas dan aturan lain
- [ ] **Ruang Kelas 1** (kapasitas 45) dengan 46 peserta → pesan merah "Jumlah peserta (46) melebihi
      kapasitas Ruang Kelas 1 (45 orang)"; 45 peserta diterima.
- [ ] Jumlah peserta 0 atau kosong → ditolak.
- [ ] **Lab Praktikum Pemrograman** 17:00–19:00 → "hanya buka 08:00-18:00".
- [ ] Jam selesai sama dengan atau lebih awal dari jam mulai → "Jam selesai harus lebih besar dari jam
      mulai".
- [ ] Peminjaman bisa dibuat untuk tanggal yang akan datang, dan tampil di Jadwal tanggal itu.

### 2.9 Peminjaman Saya
Login sebagai **Della**, buka **Peminjaman Saya**.
- [ ] Ada tab **Semua / Menunggu / Disetujui / Ditolak / Dibatalkan**, masing-masing dengan **jumlah**.
- [ ] Tab bisa dipindah dengan panah kiri/kanan di keyboard.
- [ ] Urutan terbaru (tanggal paling jauh) di atas; kolom ruangan, tanggal, jam, kegiatan, status.
- [ ] Hanya peminjaman **milik sendiri** yang tampil.
- [ ] **Menunggu:** ada tombol **Ubah** dan **Batalkan** yang sejajar dalam satu baris.
- [ ] **Disetujui** dan **Dibatalkan:** tanpa tombol aksi.
- [ ] **Ditolak** (Lab Riset AI besok): menampilkan **alasan penolakan** ("Lab dipakai untuk pemeliharaan
      server") dan tombol **Ajukan ulang**.

**Ubah**
- [ ] Klik **Ubah** pada salah satu yang menunggu → pop-up berjudul "Ubah peminjaman" dengan isian
      terisi data lama.
- [ ] Langsung dicek: pesan **hijau** (jadwalnya sendiri tidak dianggap bentrok).
- [ ] Ubah jam sampai menabrak peminjaman lain → pesan merah, tombol Simpan nonaktif.
- [ ] Ubah jumlah peserta lalu **Simpan perubahan** → toast hijau "Peminjaman diperbarui." dan tabel
      berubah.

**Batalkan**
- [ ] Klik **Batalkan** → muncul dialog konfirmasi; fokus awal ada di **Tidak jadi**.
- [ ] **Tidak jadi** → tidak ada perubahan.
- [ ] **Ya, batalkan** → toast "Peminjaman dibatalkan.", pindah ke tab **Dibatalkan**, hilang dari Jadwal,
      jumlah tab ikut berubah.

**Ajukan ulang**
- [ ] Pada yang Ditolak klik **Ajukan ulang** → pop-up pengajuan **baru** terisi data lama; kirim →
      toast, muncul sebagai peminjaman baru berstatus Menunggu (yang lama tetap Ditolak).

**Tampilan kosong**
- [ ] Mahasiswa baru (hasil Register) yang belum pernah meminjam → gambar + "Belum ada peminjaman"
      + tombol **Buka jadwal**.
- [ ] Tab yang kosong (mis. Menunggu untuk Raka) → "Tidak ada peminjaman di tab ini" + tombol
      **Lihat semua**.

### 2.10 Daftar Ruangan
- [ ] 17 kartu, tiap kartu: label jenis, status, nama, gedung dan lantai, kapasitas, fasilitas, tombol
      **Lihat jadwal** dan **Pinjam**. Teks "17 ruangan" tampil di atas daftar.
- [ ] **Ruang Kelas 1** menampilkan "Gedung TULT · Lantai 6" dan "Kapasitas 45 orang" (kodenya,
      `TULT-0604`, terlihat di Kelola Data).
- [ ] Lapangan: baris lantai tidak menampilkan "Lantai -".
- [ ] **Kalimat status** di tiap kartu: "Kosong sampai 15:00" (sampai pengajuan berikutnya atau jam tutup),
      "Dipakai <kegiatan> sampai 16:00", atau "Belum bisa dipinjam (perbaikan)".
- [ ] **Strip pemakaian 07-21** di tiap kartu: blok **biru** = orang lain, **pink** = milik saya (yang masih
      menunggu lebih pudar), abu-abu = di luar jam buka, garis hitam kecil = jam sekarang.
- [ ] Kursor di atas kartu → kartu **terangkat sedikit**. Kartu muncul berurutan saat halaman dibuka.
- [ ] **Lapangan Futsal**: kartu abu-abu, status "Dalam perbaikan", tombol **Pinjam nonaktif** (dengan
      keterangan saat kursor diarahkan).
- [ ] Kolom **cari** menyaring langsung (huruf besar/kecil tidak berpengaruh); cari "lab" → 5 ruangan.
- [ ] **Filter jenis** (Semua, Aula, Ruang Kelas, Lab Praktikum, Lab Riset, Ruang Rapat, Lapangan)
      bekerja; pencarian dan filter bisa dipakai bersamaan.
- [ ] Tidak ada hasil (cari "zzzz") → tampilan kosong "Ruangan tidak ditemukan" + **Reset pencarian**
      yang mengembalikan semua kartu.
- [ ] **Status "Sedang dipakai"** hanya muncul untuk peminjaman **disetujui** yang berlangsung **saat
      ini**. Contoh: **Aula Pendopo** berstatus Sedang dipakai antara 13:00–16:00 hari ini. Peminjaman
      yang masih Menunggu **tidak** membuat ruangan berstatus dipakai (mis. Ruang Kelas 1 saat 13:00–15:00
      tetap Kosong).
- [ ] Untuk melihat "Sedang dipakai" di jam berapa pun: lakukan bagian 3.4 (admin membuat lalu menyetujui
      peminjaman yang mencakup waktu sekarang), lalu muat ulang Daftar Ruangan.
- [ ] **Lihat jadwal** pada kartu Lab Riset → membuka Jadwal dengan filter **Lab Riset** sudah terpilih
      (hanya 2 ruangan).
- [ ] **Pinjam** → pop-up pengajuan dengan ruangan sudah terpilih dan tanggal hari ini; kirim → toast.

## 3. Admin
Pakai jendela terpisah (Incognito) dan login `dellvia@email.com`.

### 3.1 Akses admin
- [ ] Bar atas menampilkan tab **Persetujuan** dan **Kelola Data** (setelah pemisah tipis), profil
      menampilkan nama dan peran **Admin**.

### 3.2 Persetujuan
- [ ] Teks jumlah, mis. "5 pengajuan menunggu" (sesuai jumlah baris).
- [ ] Tabel hanya berisi status **menunggu**, urut jadwal terdekat dulu; kolom peminjam, ruangan,
      tanggal dan jam, kegiatan, **peserta / kapasitas** (mis. "35 / 45"), aksi.
- [ ] **Setujui** → langsung diproses tanpa pop-up, toast hijau, jumlah berkurang, baris hilang.
- [ ] **Tolak** → pop-up berisi ringkasan pengajuan dan kolom **alasan (wajib)**.
- [ ] Kirim alasan kosong → pesan "Alasan penolakan wajib diisi" di dalam pop-up.
- [ ] Alasan terisi → toast, jumlah berkurang.
- [ ] Batal pada pop-up Tolak → tidak ada perubahan.
- [ ] Setelah semua diproses → "0 pengajuan menunggu" dan tampilan kosong "Semua pengajuan sudah
      diproses".
- [ ] **Hasil terlihat oleh mahasiswa:** di jendela lain login sebagai pemilik pengajuan → Peminjaman
      Saya menampilkan status **Disetujui** atau **Ditolak** beserta **alasan**; yang disetujui kini
      tampil sebagai Disetujui di Jadwal.

### 3.3 Kelola Data
Buka **Kelola Data**. Ada tiga tab: **Ruangan**, **Pengguna**, **Peminjaman**, dengan jumlah data
di tiap tab. Tiap tab punya tabel, kolom cari, dan tombol **+ Tambah**.

**Ruangan (17)**
- [ ] Cari "futsal" menyaring ke 1 baris berstatus Dalam perbaikan.
- [ ] **Tambah**: isi kosong lalu simpan → "... wajib diisi" di dalam form.
- [ ] Tambah ruangan valid (kode baru, jenis, gedung, lantai, kapasitas, fasilitas "Proyektor, AC") →
      toast "Data ditambahkan.", baris baru muncul, jumlah tab bertambah, ruangan baru tampil di Jadwal
      dan Daftar Ruangan.
- [ ] Kode yang sama dengan ruangan lain → pesan backend "sudah dipakai ruangan lain" di dalam form,
      pop-up tetap terbuka.
- [ ] Kapasitas 0 → pesan backend di dalam form.
- [ ] **Ubah**: isian terisi data lama (fasilitas dipisah koma); ubah kapasitas atau status jadi
      "Dalam perbaikan" → tersimpan, tabel dan Jadwal ikut berubah.
- [ ] **Hapus** ruangan baru → dialog konfirmasi menyebut namanya; **Tidak jadi** membatalkan; **Ya, hapus**
      menghapus dan jumlah berkurang.
- [ ] Hapus ruangan yang **masih dipakai peminjaman** (mis. Aula Pendopo) → toast merah "Ruangan masih
      dipakai data peminjaman, hapus peminjamannya dulu"; data tetap ada.

**Pengguna (4)**
- [ ] Tabel **tidak pernah menampilkan password** atau hash-nya.
- [ ] **Tambah** tanpa password → "Password wajib diisi"; password 3 karakter → pesan backend; email
      atau NIM yang sudah ada → pesan backend. Data valid → tersimpan, orang itu bisa login.
- [ ] **Ubah**: kolom password **kosong** dengan petunjuk "Kosongkan jika tidak ingin mengganti password".
      Simpan tanpa mengisi password → data berubah tetapi **password lama tetap berlaku**.
- [ ] Ubah dengan password diisi → password berganti (yang lama tidak bisa lagi dipakai login).
- [ ] Mengubah peran jadi Admin → orang itu melihat menu Admin saat login berikutnya.
- [ ] Tombol **Hapus** untuk **akun yang sedang dipakai** nonaktif dengan keterangan.
- [ ] Hapus pengguna yang **punya peminjaman** (mis. Della) → toast merah "Pengguna masih punya data
      peminjaman, hapus peminjamannya dulu".
- [ ] Hapus pengguna tanpa peminjaman (mis. akun hasil Register) → berhasil.
- [ ] Mengubah **akun sendiri** (mis. prodi) → tersimpan dan nama di bar atas tetap benar.

**Peminjaman (20)**
- [ ] Cari "responsi" → 2 baris; cari "disetujui" (menurut status) bekerja.
- [ ] Tombol **Ubah** hanya aktif pada status **Menunggu** (yang lain nonaktif dengan keterangan).
- [ ] **Tambah**: pilih peminjam, ruangan (Futsal tidak bisa dipilih), tanggal, jam, jenis kegiatan,
      keperluan, peserta → tersimpan berstatus **Menunggu** (muncul di Persetujuan).
- [ ] Jadwal yang bentrok atau peserta melebihi kapasitas → pesan backend di dalam form.
- [ ] **Hapus** peminjaman → konfirmasi → terhapus; setelah itu ruangan atau pengguna terkait baru
      bisa dihapus (jika sudah tidak ada peminjaman lain).

### 3.4 Alur lengkap dari ujung ke ujung
- [ ] Mahasiswa mengajukan peminjaman → admin melihatnya di Persetujuan → admin menyetujui →
      mahasiswa melihat statusnya Disetujui dan blok di Jadwal berubah.
- [ ] Mahasiswa mengajukan lagi → admin menolak dengan alasan → mahasiswa melihat alasan dan memakai
      **Ajukan ulang**.
- [ ] Admin membuat peminjaman di **Gedung Serbaguna (GSG)** hari ini dari **1 jam sebelum sampai 1 jam
      sesudah waktu sekarang** (masih di dalam 07:00–21:00) lalu menyetujuinya → di **Daftar Ruangan**,
      GSG berstatus **Sedang dipakai**.

## 4. Bahasa (ID | EN)
- [ ] Di bar atas (kanan) ada kapsul **ID | EN**; di halaman Masuk, Register, dan Lupa password ada versi kecilnya
- [ ] Klik **EN** → seluruh menu, judul, tombol, tabel, pop-up, dan pesan toast berganti Inggris
      tanpa muat ulang. Tombol EN tetap terfokus.
- [ ] Jenis ruangan, jenis kegiatan, dan fasilitas ikut berganti (Aula → Hall, Acara UKM → Student Club
      Event, Proyektor → Projector). Nama ruangan, keperluan, dan pesan error server tetap apa adanya.
- [ ] Nama hari dan bulan berganti Inggris (mis. "Sunday 22 November 2026"); kembali ke ID kembali
      Indonesia.
- [ ] Bentuk tunggal/jamak benar ("1 room" dan "17 rooms", "1 request pending" dan "5 requests pending").
- [ ] Di halaman Masuk, ganti bahasa saat sudah mengetik email dan password → **isiannya tidak hilang**.
- [ ] Muat ulang (`F5`) → bahasa pilihan tetap bertahan; masuk lalu keluar → tetap bertahan.
- [ ] Di Jadwal (Inggris): ringkasan "12 activities", "1 activity", "3 pending", "14 rooms free now" /
      "1 room free now" memakai bentuk tunggal/jamak yang benar; tooltip titik "Now HH:MM"; label titik status
      "Free", "In use now", "Under maintenance", "Closed" (tanggal lain: "Has bookings"/"No bookings").
- [ ] Telusuri semua halaman dalam bahasa Inggris (Jadwal, Daftar Ruangan, Peminjaman Saya, dan sebagai
      admin Persetujuan dan Kelola Data) mencari **sisa tulisan Indonesia pada menu atau tombol**.

## 4b. Cari Ruangan Kosong (halaman baru, menu ke-2)
- [ ] Tab bar atas berurutan: Jadwal, **Cari Ruangan Kosong** (tanpa label tambahan), Daftar Ruangan, Peminjaman Saya.
- [ ] Kalimat isian: "Aku butuh ruangan untuk [20] orang, [tanggal] jam [mulai] sampai [selesai]." dengan
      kolom bergaris bawah pink. Mengubah isian membuat hasil **langsung berubah** (tanpa tombol cari).
- [ ] Jam mulai dan selesai berupa **dropdown per 30 menit (07:00-21:00)**, bukan input jam bawaan (tidak ada
      ikon jam). Tanggal tampil sebagai teks pendek ("Sel, 24 Nov") dan **membuka pemilih tanggal saat
      diklik** (tanpa ikon kalender). Lebar isian pas dengan isinya. Di laptop kalimat satu baris; di layar
      sempit isian terakhir dan titiknya tidak terpisah. Di mode gelap warna isian ikut terang.
- [ ] Tab bar atas: arahkan kursor ke tab yang tidak aktif → hanya warna teks yang sedikit lebih gelap, **tanpa
      latar**; tab aktif bergaris bawah pink.
- [ ] Bagian **Tersedia (n)** urut dari kapasitas yang paling sesuai; kartu pertama berlabel **Disarankan** (pink
      penuh, teks putih kecil) dan hanya tombol Ajukan kartu itu yang pink penuh; kartu lain bergaris dan pink
      lembut saat disorot. Label ukuran hanya **Agak besar** / **Terlalu besar** (tidak ada label "Pas").
- [ ] Klik Ajukan → pop-up pengajuan **terisi otomatis** (ruangan, tanggal, jam, jumlah peserta).
- [ ] Bagian **Tidak tersedia (n)** tampil redup di bawah dengan alasan: perbaikan, kapasitas kurang, bentrok
      (menyebut kegiatan dan jamnya), atau di luar jam buka. Contoh: 13:00-15:00 hari ini → Ruang Kelas 1 bentrok.
- [ ] Jumlah orang 0, atau jam selesai ≤ jam mulai → muncul petunjuk, bukan hasil.
- [ ] Sapaan di Jadwal ("Selamat pagi/siang/sore/malam, <nama>") sesuai jam; ada **4 kotak ringkasan** (kegiatan
      hari ini, menunggu, ruangan kosong sekarang, jadwal milikmu).
- [ ] Aturan warna: pink penuh hanya untuk satu tombol utama per layar (mis. Ajukan peminjaman), tombol
      berulang (Ajukan di kartu, Setujui) pink lembut atau bergaris.

## 5. Mode tampilan (Terang | Gelap | Sistem)
- [ ] Tombol kecil berbentuk **kapsul** (jalur pink lembut tanpa garis; pilihan aktif = kapsul putih bayangan tipis yang **meluncur** ke pilihan baru, ~0,2 detik, diam bila animasi dimatikan) tanpa label ada di **pojok kanan atas area konten**, sejajar judul halaman: **ID | EN** dan
      tiga ikon (matahari = Terang, bulan = Gelap, monitor = **Sistem**); arahkan kursor untuk melihat namanya.
      Komponen dan posisinya sama dengan di halaman Masuk/Register/Lupa password. Di **layar HP** tombolnya
      naik ke bar atas, sejajar nama aplikasi. Bawah sidebar hanya berisi profil (tombol **Keluar** ikon di
      kanan) dan info server.
- [ ] **Kunjungan pertama mengikuti Windows.** Buka di jendela Incognito (atau hapus Local Storage lewat
      `F12` → Application → Local Storage → Clear): kalau tema Windows gelap, aplikasi langsung gelap dan
      tombol **Sistem** ditandai; kalau terang, langsung terang (Sistem tetap ditandai).
- [ ] Selama belum menekan tombol apa pun, mengganti tema Windows (Pengaturan → Personalisasi → Warna →
      "Pilih mode Anda") membuat tampilan **ikut berubah otomatis tanpa muat ulang**.
- [ ] Setelah menekan **Terang** atau **Gelap**, pilihan itu **tersimpan** dan perubahan tema Windows
      berikutnya **tidak lagi berpengaruh**; menekan **Sistem** membuatnya ikut Windows lagi.
- [ ] **Gelap**: latar menjadi gelap di semua halaman, termasuk bar atas, tabel, kartu, pop-up, dialog
      konfirmasi, toast, dan tampilan kosong. Tidak ada kotak putih yang tertinggal.
- [ ] Di mode gelap: status **Menunggu (kuning)**, **Disetujui (hijau)**, **Ditolak (merah)**, pesan
      **hijau aman** dan **merah bentrok** di pop-up, serta blok **pink** (milik saya) dan **biru**
      (orang lain) di Jadwal semuanya **mudah dibaca**.
- [ ] **Terang** kembali ke warna semula.
- [ ] Muat ulang saat mode Gelap → **tidak berkedip terang** dulu; pilihan bertahan setelah keluar dan
      masuk.
- [ ] Kolom isian, pilihan tanggal/jam, dan kotak dropdown ikut gelap dan tulisannya terbaca.
- [ ] Di Jadwal mode gelap: garis "sekarang" (pink terang), strip hijau/kuning, titik status, dan kotak legenda
      semuanya jelas terlihat; titik pada header jam punya cincin tipis sehingga menonjol.
## 6. Layar HP
Cara mengetes: tekan `F12` → `Ctrl+Shift+M` (mode perangkat) → pilih ukuran **360 × 640**, lalu
**390 × 844**, lalu **768 × 1024** (tablet). Ulangi bagian penting dalam mode **Gelap** juga.

- [ ] Halaman **Masuk, Register, Lupa password**: kartu penuh di layar, latar animasi diam, tidak ada
      geser samping, kontrol ID | EN dan dua ikon mode di **atas** kartu (tidak menimpa judul).
- [ ] Di **HP** (lebar 760px ke bawah) bar atas dua baris: logo + kapsul + avatar, lalu menu tab yang **bisa digeser
      ke samping** (tab aktif otomatis di tengah). Di layar di bawah 420px nama aplikasi disembunyikan, logo tetap.
- [ ] **Jadwal**: tabel bisa **digeser ke samping**; kolom nama ruangan (lebih sempit di HP) dan header jam tetap
      menempel; nama ruangan panjang boleh dua baris; toolbar, ringkasan, dan legenda turun baris dengan rapi;
      area tabel tidak lebih tinggi dari 3/4 layar; garis "sekarang" tetap terlihat.
- [ ] **Pop-up pengajuan** muat di layar (bisa di-scroll di dalam pop-up), semua kolom dan tombol bisa
      dijangkau.
- [ ] **Peminjaman Saya** dan tabel admin bisa digeser ke samping; tombol **Ubah** dan **Batalkan**
      tetap **sejajar satu baris**.
- [ ] **Daftar Ruangan**: kartu menjadi 1 kolom; filter jenis turun baris; tombol Lihat jadwal dan Pinjam
      terlihat.
- [ ] **Toast** muat di layar dan tidak menutupi tombol penting terlalu lama.
- [ ] Seluruh halaman **tidak punya scroll horizontal** di luar tabel yang memang bisa digeser.
- [ ] (Opsional) Tes dari **HP asli**: lihat bagian 8.

## 7. Browser lain
- [ ] Alur utama (login, Jadwal, ajukan, Peminjaman Saya, Daftar Ruangan, Persetujuan) berjalan di
      **Chrome**, **Edge**, dan (jika ada) **Firefox**.
- [ ] Pop-up (`<dialog>`) terbuka dan tertutup normal, kolom tanggal dan jam bisa dipakai.

## 8. Mencoba dari HP asli (opsional, di jaringan Wi-Fi yang sama)
Jalankan server dengan perintah berikut (bukan `python app.py`) supaya bisa diakses dari perangkat lain:
```powershell
cd pinjamruang\backend
.\.venv\Scripts\python -m flask --app app run --host 0.0.0.0 --port 5000
```
1. Cari IP laptop dengan `ipconfig` (baris **IPv4 Address**, misalnya `192.168.1.10`).
2. Di HP buka `http://192.168.1.10:5000`.
3. Jika Windows menampilkan peringatan Firewall, izinkan hanya untuk **jaringan privat**.
4. Selesai mengetes, hentikan server (`Ctrl+C`). Jangan dibiarkan terbuka di Wi-Fi umum.

## 9. Setelah server di-restart
- [ ] Semua data kembali ke data contoh (17 ruangan, 4 pengguna, 20 peminjaman); akun yang dibuat lewat
      Register dan password yang diganti hilang. (Itu perilaku yang diharapkan karena data hanya di memori.)
- [ ] Pengguna yang masih memegang sesi lama di browser (akun hasil Register) bisa melihat error saat
      membuka halaman; keluar lalu masuk dengan akun contoh. Catat kalau ini membingungkan.

## 10. Tampilan dan animasi
- [ ] Judul halaman dan angka ringkasan memakai font **Plus Jakarta Sans**, teks lain tetap Inter.
- [ ] Pindah halaman → konten **muncul perlahan**; pop-up **membesar halus**; blok Jadwal dan kartu ruangan
      **muncul berurutan**; titik "sekarang" di Jadwal **berdenyut pelan**; garis "sekarang" berada **di
      belakang** blok.
- [ ] Windows: Pengaturan → Aksesibilitas → Efek visual → matikan **Efek animasi** → semua animasi di atas
      berhenti.
- [ ] Ulangi pengecekan Jadwal dan Daftar Ruangan di mode gelap, bahasa Inggris, dan layar HP (390px).

## 11. Identitas visual "Papan Ruang"
- [ ] **Font:** judul dan angka besar Plus Jakarta Sans, teks Inter, kode ruangan / jam di blok / label kapital
      JetBrains Mono. **Sudut tegas** 3-4px (kapsul hanya untuk ID|EN dan mode). Bayangan hanya saat hover.
- [ ] **Logo "Denah P"** (huruf P seperti denah dengan celah pintu) berwarna pink di bar atas dan kartu Masuk.
- [ ] **Jadwal:** angka tanggal besar pink (klik → pemilih tanggal), "Selasa, November 2026", sapaan, tombol
      Kemarin / Hari ini / Besok; ringkasan = angka besar dipisah garis vertikal (bukan kotak).
- [ ] **Penggaris jam:** garis panjang tiap jam, pendek tiap 30 menit, label mono; penanda sekarang = segitiga
      pink + garis pink di belakang blok. Kolom ruangan: kode (mono, pink) / nama / "45 orang".
- [ ] **Header kelompok** "AULA" + "4 ruangan" (mono). **Blok:** strip kiri 3px (pink milik saya, biru orang
      lain), judul tebal, baris mono "13:00-15:00 · Raka"; **menunggu = arsiran miring**.
      **Ruangan perbaikan:** arsiran penuh + tulisan DALAM PERBAIKAN.
- [ ] **Daftar Ruangan** bergaya papan nama pintu: pita gelap (kode mono + status titik), nama besar, garis
      titik-titik antara label dan nilai (Gedung / Lantai / Kapasitas), kalimat status, strip pemakaian,
      tombol **Lihat jadwal** dan **Ajukan** (pink lembut).
- [ ] **Logo** huruf P dengan batang tegak, lengkung di atas, celah pintu di bawah lengkung, dan daun pintu diagonal pendek.
- [ ] **Masuk / Register / Lupa password:** latar hanya pola garis denah dan penggaris yang sangat samar (tanpa kotak
      melayang, tanpa biru, tanpa gerak).
- [ ] **Menu profil:** klik avatar + nama → menu kecil (nama, peran, tombol **Keluar**); tutup dengan klik di luar
      atau **Esc** (fokus kembali ke avatar). Keluar hanya lewat tombol di menu.
- [ ] **HP:** geser menu tab ke samping; teks "Cari Ruangan Kosong" dan "Daftar Ruangan" tidak saling menimpa
      (cek juga di lebar 320px).
- [ ] **Cari Ruangan Kosong:** kartu pertama berlabel **Disarankan** tanpa label "Pas" tambahan; kartu lain tetap
      berlabel ukuran (Agak besar / Terlalu besar; ukuran pas tanpa label).
- [ ] Cek juga mode gelap, bahasa Inggris, dan HP untuk semua halaman.

## 12. Rapikan tipografi, bar atas, tab, Cari, Daftar Ruangan
- [ ] **Skala huruf konsisten:** angka tanggal besar 64px; judul halaman dan angka ringkasan 28px; kalimat isian
      Cari 22px; judul kartu dan judul pop-up 18px (jelas lebih kecil dari judul halaman); nama ruangan di
      semua tabel 15px tebal; teks isi 14px; tombol tidak lebih besar dari teks isi. Di HP: judul 24px, angka
      tanggal 48px. Ukuran disimpan sebagai variabel `--fs-*` di `css/warna.css`.
- [ ] **Bar atas** setinggi 60-64px; logo 28px sejajar tulisan; kapsul ID|EN, kapsul mode, dan tombol avatar
      sama tinggi (36px); avatar = lingkaran inisial + nama tanpa kotak, pink lembut saat disorot; garis bawah
      bar jelas; tidak ada label BARU.
- [ ] **Tab status** (Peminjaman Saya, Kelola Data): garis bawah pink; angka jumlah berupa kapsul kecil mono
      (tab aktif pink lembut, tab lain abu muda).
- [ ] **Cari Ruangan Kosong:** kalimat bantu di bawah judul; kalimat isian di dalam panel putih; tiap isian
      berlatar pink lembut dengan tanda ▾ (klik apa pun membuka pilihan/pemilih tanggal); teks "Klik bagian
      berwarna untuk mengubah."; tombol **Cari** di kanan panel (hasil juga otomatis berubah; tombol menggulir
      ke hasil); tidak ada spasi sebelum titik di akhir kalimat.
- [ ] **Tidak tersedia** dilipat: tombol "Tampilkan N ruangan tidak tersedia" / "Sembunyikan"; kartunya redup,
      alasan berwarna abu dengan ikon (orang = kapasitas kurang, jam = bentrok, kunci inggris = perbaikan).
      Untuk bentrok ada tautan kecil **Kosong mulai HH:MM** yang mengganti jam di kalimat ke jam kosong terdekat.
- [ ] **Daftar Ruangan:** placeholder "Cari nama atau kode ruangan…" (cari `AUL-02` atau `tult-0604`), dan tautan
      "Butuh ruangan kosong di jam tertentu? Cari Ruangan Kosong →".
- [ ] Cek juga mode gelap, bahasa Inggris, dan HP untuk semua halaman di atas.

## 13. Perbaikan dari audit pengguna awam
- [ ] **HP (lebar 390px)** — Peminjaman Saya, Persetujuan, Kelola Data tampil sebagai **kartu bertumpuk** (label
      kecil di kiri tiap isian) dan tombol aksi (Ubah/Batalkan/Setujui/Tolak/Hapus) ada di **bawah tiap kartu**,
      terlihat penuh tanpa geser ke samping. Di laptop tetap tabel biasa.
- [ ] **Tanggal/jam lewat ditolak:** di pop-up, pilih tanggal kemarin → pesan "Tanggal itu sudah lewat…" dan tombol
      Ajukan nonaktif (kolom tanggal juga tidak menawarkan hari lampau). Di Cari Ruangan Kosong, tanggal kemarin
      atau jam hari ini yang sudah lewat → petunjuk "Waktu yang dipilih sudah lewat…", tanpa hasil. Di Jadwal, slot
      yang sudah lewat **redup, kursor tidak boleh, tidak bisa diklik** dan ikut berubah tiap menit; di tanggal
      kemarin semua slot redup.
- [ ] **Jadwal:** geser tabel ke kanan sampai blok kegiatan tertutup kolom ruangan → **teks blok tetap terbaca**
      (menempel di tepi kiri area terlihat).
- [ ] **Istilah "Ajukan"** di semua aksi (Jadwal, Daftar Ruangan, Cari, pop-up; EN "Request"). Pop-up baru ada catatan
      "Pengajuan akan menunggu persetujuan admin." dan tombol penutupnya **Tutup** (EN Close).
- [ ] **Peminjaman Saya:** status Disetujui bertulis "Hubungi admin untuk membatalkan"; ada tombol utama
      **Ajukan peminjaman** di kanan atas (pink, satu-satunya).
- [ ] **Kelola Data:** tombol **Hapus nonaktif** untuk ruangan/pengguna yang masih punya peminjaman, dengan tulisan
      terlihat "Masih punya N peminjaman" (juga alasan untuk akun sendiri dan Ubah yang nonaktif).
- [ ] **Register:** kirim form kosong → "Nama lengkap wajib diisi" (kolom itu ditandai dan terfokus, tanpa kirim ke
      server); juga cek format email, password minimal 6 karakter, dan password tidak sama.
- [ ] **Pesan error ikut bahasa:** login salah, kapasitas, bentrok, jam buka, perbaikan, tanggal lewat tampil
      Inggris saat bahasa EN (dan Indonesia saat ID).
- [ ] **Ringkasan Jadwal:** "menunggu persetujuan (hari ini)" dan "jadwalmu hari ini" (tanggal lain tanpa kata
      hari ini).
- [ ] **Status kartu ruangan:** sebelum jam buka "Belum buka", sesudah jam tutup "Sudah tutup" (abu di pita).
- [ ] **Format seragam:** tanggal "Sel, 24 Nov 2026" dan jam "13:00–15:00" (tanda – bukan -) di semua tabel,
      konfirmasi, tombol, dan Cari. Kapasitas: "35 peserta dari kapasitas 45" di Persetujuan, "Kapasitas 200 orang"
      di pop-up. (Kotak tanggal bawaan browser di pop-up tetap mengikuti pengaturan browser.)

## Catatan temuan
| No | Bagian / langkah | Yang terjadi | Yang diharapkan | Tingkat (kecil/sedang/besar) |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

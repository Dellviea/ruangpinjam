// Semua teks tampilan ada di sini. Bahasa Inggris nanti cukup menambah blok "en".
const teks = {
  id: {
    "app.nama": "PinjamRuang",

    "nav.utama": "Menu utama",
    "nav.jadwal": "Jadwal",
    "nav.ruangan": "Daftar Ruangan",
    "nav.peminjaman": "Peminjaman Saya",
    "nav.admin": "Admin",
    "nav.persetujuan": "Persetujuan",
    "nav.kelola": "Kelola Data",
    "nav.keluar": "Keluar",

    "peran.admin": "Admin",
    "peran.mahasiswa": "Mahasiswa",

    "server.aktif": "Server aktif · dilayani oleh {nama}",
    "server.mati": "Server tidak terhubung",

    "login.judul": "Masuk",
    "login.sub": "Peminjaman ruangan kampus",
    "login.email": "Email",
    "login.password": "Password",
    "login.tombol": "Masuk",
    "login.proses": "Memproses...",
    "login.lupa": "Lupa password?",
    "login.belumPunya": "Belum punya akun?",
    "login.daftar": "Daftar",

    "register.judul": "Buat akun",
    "register.sub": "Daftar untuk meminjam ruangan",
    "register.nama": "Nama lengkap",
    "register.nim": "NIM / NIP",
    "register.email": "Email",
    "register.prodi": "Program studi",
    "register.hp": "No. HP (opsional)",
    "register.password": "Password",
    "register.hintPassword": "Minimal 6 karakter",
    "register.konfirmasi": "Ulangi password",
    "register.passwordBeda": "Password dan ulangi password tidak sama",
    "register.tombol": "Daftar",
    "register.proses": "Memproses...",
    "register.sudahPunya": "Sudah punya akun?",
    "register.masuk": "Masuk",

    "lupa-password.judul": "Lupa password",
    "lupa-password.sub": "Verifikasi dengan email dan NIM/NIP, lalu isi password baru.",
    "lupa-password.email": "Email",
    "lupa-password.nim": "NIM / NIP",
    "lupa-password.passwordBaru": "Password baru",
    "lupa-password.konfirmasi": "Ulangi password baru",
    "lupa-password.tombol": "Ganti password",
    "lupa-password.proses": "Memproses...",
    "lupa-password.berhasil": "Password berhasil diganti. Silakan masuk dengan password baru.",
    "lupa-password.kembali": "Kembali ke halaman masuk",

    "placeholder.segera": "Halaman ini akan segera tersedia.",

    "error.umum": "Terjadi kesalahan. Coba lagi.",
    "error.server": "Tidak bisa terhubung ke server. Coba lagi.",
  },
};

let bahasa = "id";

// t("server.aktif", { nama: "vm-1" }) mengganti {nama} dengan isinya
export function t(kunci, isi = {}) {
  const s = teks[bahasa][kunci] ?? kunci;
  return s.replace(/\{(\w+)\}/g, (_, k) => isi[k] ?? "");
}

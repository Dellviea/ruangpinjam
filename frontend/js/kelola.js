import { api, ambilSesi, simpanSesi } from "./api.js";
import { h, ikon } from "./dom.js";
import { bukaForm } from "./form.js";
import { jenisRuangan, kegiatan, t } from "./i18n.js";
import { konfirmasi } from "./konfirmasi.js";
import { tampilanGagal, tampilanKosong } from "./kosong.js";
import { JENIS_KEGIATAN, JENIS_RUANGAN } from "./konstanta.js";
import { buatTab } from "./tab.js";
import { toast } from "./toast.js";
import { tanggalLokal, tanggalPendek } from "./waktu.js";

const TAB = ["ruangan", "pengguna", "peminjaman"];
const chip = (kelas, teks) => h("span", { class: "chip " + kelas }, teks);
const utama = (teks, sub) => h("td", {}, h("div", { class: "sel-utama" }, teks), sub && h("div", { class: "sel-sub" }, sub));
const pilihan = (daftar, label = (x) => x) => daftar.map((x) => ({ nilai: x, label: label(x) }));

export function halamanKelola() {
  const saya = ambilSesi();
  const data = { ruangan: [], pengguna: [], peminjaman: [] };
  const kata = { ruangan: "", pengguna: "", peminjaman: "" };
  let aktif = "ruangan";

  const jumlah = h("p", { class: "r-jumlah", "aria-live": "polite" });
  const wadah = h("div", {}, h("div", { class: "kosong" }, t("jadwal.memuat")));

  // Satu entri per tab: kolom tabel, teks pencarian, dan bidang formulir.
  const KONFIG = {
    ruangan: {
      jalur: "/ruangan",
      kolom: ["kode", "nama", "gedung", "kapasitas", "jam", "status"],
      sel: (r) => [
        h("td", {}, r.kode),
        utama(r.nama, jenisRuangan(r.jenis)),
        utama(r.gedung, r.lantai && r.lantai !== "-" ? t("ruangan.lantai", { n: r.lantai }) : null),
        h("td", { class: "nowrap" }, r.kapasitas),
        h("td", { class: "nowrap" }, `${r.jam_buka}–${r.jam_tutup}`),
        h("td", {}, r.status === "tersedia" ? chip("chip-kosong", t("kelola.tersedia"))
          : chip("chip-perbaikan", t("ruangan.status.perbaikan"))),
      ],
      cari: (r) => [r.kode, r.nama, r.jenis, jenisRuangan(r.jenis), r.gedung].join(" "),
      urut: (a, b) => JENIS_RUANGAN.indexOf(a.jenis) - JENIS_RUANGAN.indexOf(b.jenis) || a.id - b.id,
      nama: (r) => r.nama,
      awal: () => ({ jam_buka: "07:00", jam_tutup: "21:00", status: "tersedia" }),
      bidang: () => [
        { nama: "kode", label: t("kelola.f.kode"), wajib: true, setengah: true },
        { nama: "nama", label: t("kelola.f.nama"), wajib: true, setengah: true },
        { nama: "jenis", label: t("kelola.f.jenis"), jenis: "select", wajib: true, kosong: t("kelola.pilih"),
          pilihan: pilihan(JENIS_RUANGAN, jenisRuangan), setengah: true },
        { nama: "status", label: t("kelola.f.status"), jenis: "select", wajib: true, setengah: true,
          pilihan: [{ nilai: "tersedia", label: t("kelola.tersedia") },
            { nilai: "dalam perbaikan", label: t("ruangan.status.perbaikan") }] },
        { nama: "gedung", label: t("kelola.f.gedung"), wajib: true, setengah: true },
        { nama: "lantai", label: t("kelola.f.lantai"), wajib: true, hint: t("kelola.f.lantaiHint"), setengah: true },
        { nama: "kapasitas", label: t("kelola.f.kapasitas"), jenis: "number", min: 1, wajib: true },
        { nama: "jam_buka", label: t("kelola.f.jamBuka"), jenis: "time", wajib: true, setengah: true },
        { nama: "jam_tutup", label: t("kelola.f.jamTutup"), jenis: "time", wajib: true, setengah: true },
        { nama: "fasilitas", label: t("kelola.f.fasilitas"), hint: t("kelola.f.fasilitasHint"),
          dari: (v) => (v ?? []).join(", "),
          ke: (s) => s.split(",").map((x) => x.trim()).filter(Boolean) },
        { nama: "deskripsi", label: t("kelola.f.deskripsi"), jenis: "area" },
      ],
    },

    pengguna: {
      jalur: "/pengguna",
      kolom: ["nama", "nim", "email", "peran", "prodi", "hp"],
      sel: (p) => [
        utama(p.nama),
        h("td", { class: "nowrap" }, p.nim_nip),
        h("td", {}, p.email),
        h("td", {}, p.peran === "admin" ? chip("chip-admin", t("peran.admin")) : chip("chip-mhs", t("peran.mahasiswa"))),
        h("td", {}, p.prodi || "—"),
        h("td", { class: "nowrap" }, p.no_hp || "—"),
      ],
      cari: (p) => [p.nama, p.nim_nip, p.email, p.prodi].join(" "),
      urut: (a, b) => a.id - b.id,
      nama: (p) => p.nama,
      awal: () => ({ peran: "mahasiswa" }),
      hapusDitolak: (p) => (saya && p.id === saya.id ? t("kelola.hapusDiriSendiri") : null),
      // password tidak pernah dimuat ke form; saat ubah, kosong = tidak diganti
      siapkan: (v) => {
        if (!v.password) delete v.password;
        return v;
      },
      bidang: (edit) => [
        { nama: "nama", label: t("kelola.f.nama"), wajib: true },
        { nama: "nim_nip", label: t("register.nim"), wajib: true, setengah: true },
        { nama: "peran", label: t("kelola.f.peran"), jenis: "select", wajib: true, setengah: true,
          pilihan: [{ nilai: "mahasiswa", label: t("peran.mahasiswa") }, { nilai: "admin", label: t("peran.admin") }] },
        { nama: "email", label: t("register.email"), jenis: "email", wajib: true },
        { nama: "prodi", label: t("register.prodi"), setengah: true },
        { nama: "no_hp", label: t("kelola.f.hp"), jenis: "tel", setengah: true },
        { nama: "password", label: t("login.password"), jenis: "password", wajib: !edit,
          hint: t(edit ? "kelola.f.passwordUbah" : "register.hintPassword") },
      ],
    },

    peminjaman: {
      jalur: "/peminjaman",
      kolom: ["peminjam", "ruangan", "waktu", "kegiatan", "peserta", "status"],
      sel: (p) => [
        utama(p.nama_pengguna),
        h("td", {}, p.nama_ruangan),
        h("td", { class: "nowrap" }, h("div", {}, tanggalPendek(p.tanggal)),
          h("div", { class: "sel-sub" }, `${p.jam_mulai}–${p.jam_selesai}`)),
        utama(p.keperluan, kegiatan(p.jenis_kegiatan)),
        h("td", { class: "nowrap" }, p.jumlah_peserta),
        h("td", {}, chip("chip-" + p.status, t("status." + p.status))),
      ],
      cari: (p) => [p.nama_pengguna, p.nama_ruangan, p.keperluan, p.jenis_kegiatan, kegiatan(p.jenis_kegiatan), t("status." + p.status)].join(" "),
      urut: (a, b) => (b.tanggal + b.jam_mulai).localeCompare(a.tanggal + a.jam_mulai),
      nama: (p) => `${p.keperluan} (${p.nama_ruangan}, ${tanggalPendek(p.tanggal)})`,
      awal: () => ({ tanggal: tanggalLokal() }),
      ubahDitolak: (p) => (p.status === "menunggu" ? null : t("kelola.ubahHanyaMenunggu")),
      bidang: () => [
        { nama: "id_pengguna", label: t("kelola.f.pengguna"), jenis: "select", wajib: true, kosong: t("kelola.pilih"),
          pilihan: data.pengguna.map((p) => ({ nilai: p.id, label: `${p.nama} (${p.nim_nip})` })), ke: Number },
        { nama: "id_ruangan", label: t("kelola.f.ruangan"), jenis: "select", wajib: true, kosong: t("kelola.pilih"),
          pilihan: [...data.ruangan].sort(KONFIG.ruangan.urut).map((r) => ({
            nilai: r.id, nonaktif: r.status !== "tersedia",
            label: `${r.nama} (${t("jadwal.kapasitas", { n: r.kapasitas })})` + (r.status !== "tersedia" ? t("pengajuan.perbaikan") : ""),
          })), ke: Number },
        { nama: "tanggal", label: t("pengajuan.tanggal"), jenis: "date", wajib: true },
        { nama: "jam_mulai", label: t("pengajuan.mulai"), jenis: "time", wajib: true, setengah: true },
        { nama: "jam_selesai", label: t("pengajuan.selesai"), jenis: "time", wajib: true, setengah: true },
        { nama: "jenis_kegiatan", label: t("pengajuan.jenisKegiatan"), jenis: "select", wajib: true,
          kosong: t("pengajuan.pilihKegiatan"), pilihan: pilihan(JENIS_KEGIATAN, kegiatan) },
        { nama: "keperluan", label: t("pengajuan.keperluan"), wajib: true },
        { nama: "jumlah_peserta", label: t("pengajuan.peserta"), jenis: "number", min: 1, wajib: true },
      ],
    },
  };

  // ----- aksi -----
  function formData(k, baris) {
    const ubah = Boolean(baris);
    bukaForm({
      judul: t(ubah ? "kelola.judulUbah" : "kelola.judulTambah", { data: t("kelola.satuan." + aktif) }),
      bidang: k.bidang(ubah),
      nilai: ubah ? baris : k.awal(),
      labelSimpan: t(ubah ? "pengajuan.simpan" : "kelola.simpanTambah"),
      simpan: (v) => api(ubah ? `${k.jalur}/${baris.id}` : k.jalur,
        { method: ubah ? "PUT" : "POST", body: k.siapkan ? k.siapkan(v) : v }),
      onSukses: (hasil) => {
        // mengubah akun yang sedang login: perbarui sesi, lalu gambar ulang seluruh layout (sidebar ikut)
        if (aktif === "pengguna" && ubah && saya && baris.id === saya.id) {
          simpanSesi(hasil);
          window.dispatchEvent(new Event("hashchange"));
          return;
        }
        toast(t(ubah ? "kelola.diubah" : "kelola.ditambah"));
        muat();
      },
    });
  }

  async function hapus(k, baris) {
    const ya = await konfirmasi({
      judul: t("kelola.hapusJudul"),
      teks: t("kelola.hapusTeks", { nama: k.nama(baris) }),
      ya: t("kelola.hapusYa"),
      bahaya: true,
    });
    if (!ya) return;
    try {
      await api(`${k.jalur}/${baris.id}`, { method: "DELETE" });
      toast(t("kelola.dihapus"));
      muat();
    } catch (err) {
      toast(err.message, "error"); // misalnya: masih dipakai data peminjaman
    }
  }

  function aksi(k, baris) {
    const tombol = (kunci, kelas, alasan, fungsi) => h("button", {
      class: "tombol tombol-kecil " + kelas, type: "button", disabled: Boolean(alasan), title: alasan,
      onclick: fungsi }, t(kunci));
    return h("td", {}, h("div", { class: "aksi-sel" },
      tombol("peminjaman.ubah", "tombol-sekunder", k.ubahDitolak?.(baris), () => formData(k, baris)),
      tombol("kelola.hapus", "tombol-bahaya", k.hapusDitolak?.(baris), () => hapus(k, baris))));
  }

  // ----- tampilan -----
  const tab = buatTab({
    label: t("kelola.tab"), idPanel: "panel-kelola", awal: aktif,
    pilihan: TAB.map((k) => ({ kunci: k, teks: t("kelola.tab." + k) })),
    onPilih: (k) => {
      aktif = k;
      gambar();
    },
  });

  const cari = h("input", { type: "search", "aria-label": t("kelola.cari"), autocomplete: "off",
    oninput: (e) => { kata[aktif] = e.target.value.trim().toLowerCase(); gambarTabel(); } });
  const tambah = h("button", { class: "tombol tombol-kecil", type: "button",
    onclick: () => formData(KONFIG[aktif]) }, ikon("tambah"), t("kelola.tambah"));

  function gambarTabel() {
    const k = KONFIG[aktif];
    const baris = data[aktif].filter((r) => k.cari(r).toLowerCase().includes(kata[aktif])).sort(k.urut);
    jumlah.textContent = t("kelola.jumlah", { n: baris.length });
    if (!baris.length) {
      const satuan = t("kelola.satuan." + aktif);
      wadah.replaceChildren(data[aktif].length
        ? tampilanKosong({ gambar: "cari", judul: t("kelola.kosongJudul"), teks: t("kelola.kosong"),
          tombol: { teks: t("kelola.reset"), aksi: () => { kata[aktif] = ""; cari.value = ""; gambarTabel(); } } })
        : tampilanKosong({ gambar: "kelola", judul: t("kelola.belumAdaJudul", { data: satuan }),
          teks: t("kelola.belumAdaTeks"), tombol: { teks: t("kelola.tambahAria", { data: satuan }), aksi: () => formData(k) } }));
      return;
    }
    wadah.replaceChildren(h("div", { class: "tabel-gulir" },
      h("table", { class: "tabel tabel-bebas" },
        h("thead", {}, h("tr", {}, ...[...k.kolom, "aksi"].map((c) => h("th", { scope: "col" }, t("kelola.kolom." + c))))),
        h("tbody", {}, ...baris.map((r) => h("tr", {}, ...k.sel(r), aksi(k, r)))))));
  }

  function gambar() {
    for (const k of TAB) tab.setJumlah(k, data[k].length);
    cari.value = kata[aktif];
    cari.placeholder = t("kelola.cari." + aktif);
    tambah.setAttribute("aria-label", t("kelola.tambahAria", { data: t("kelola.satuan." + aktif) }));
    document.getElementById("panel-kelola")?.setAttribute("aria-labelledby", `tab-panel-kelola-${aktif}`);
    gambarTabel();
  }

  async function muat() {
    try {
      const [ruangan, pengguna, peminjaman] = await Promise.all([api("/ruangan"), api("/pengguna"), api("/peminjaman")]);
      Object.assign(data, { ruangan, pengguna, peminjaman });
      gambar();
    } catch (err) {
      toast(err.message, "error");
      jumlah.textContent = "";
      wadah.replaceChildren(tampilanGagal(err.message, muat));
    }
  }

  muat();
  return h("div", {}, tab.el,
    h("div", { role: "tabpanel", id: "panel-kelola", "aria-labelledby": `tab-panel-kelola-${aktif}` },
      h("div", { class: "r-alat kelola-alat" },
        h("div", { class: "cari" }, ikon("cari"), cari), tambah),
      jumlah, wadah));
}

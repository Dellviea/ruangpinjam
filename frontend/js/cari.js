import { api } from "./api.js";
import { h } from "./dom.js";
import { jenisRuangan, t } from "./i18n.js";
import { tampilanGagal, tampilanKosong } from "./kosong.js";
import { bukaPengajuan } from "./pengajuan.js";
import { toast } from "./toast.js";
import { geserHari, menit, pad, tanggalLokal, tanggalRingkas } from "./waktu.js";

const AKTIF = ["menunggu", "disetujui"];
// pilihan jam per 30 menit, 07:00-21:00
const PILIHAN_JAM = Array.from({ length: 29 }, (_, i) => `${pad(7 + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);

// Isian awal: jam bulat berikutnya (07:00-19:00) selama 2 jam; kalau sudah lewat jam 19, besok pukul 09:00.
function isianAwal() {
  const d = new Date();
  let tanggal = tanggalLokal(d);
  let mulai = d.getHours() + 1;
  if (mulai < 7) mulai = 7;
  if (mulai > 19) {
    mulai = 9;
    tanggal = geserHari(tanggal, 1);
  }
  return { tanggal, mulai: `${pad(mulai)}:00`, selesai: `${pad(Math.min(mulai + 2, 21))}:00` };
}

export function halamanCari() {
  let ruangan = [];
  let peminjaman = [];
  let animasiMasuk = true; // hasil muncul berurutan hanya pada tampilan pertama, bukan tiap ketikan

  const awal = isianAwal();
  // Kolom isian di dalam kalimat: garis bawah pink, hasil langsung diperbarui saat berubah.
  const peserta = h("input", { class: "isian-inline ii-angka", type: "number", min: "1", max: "999", value: "20",
    "aria-label": t("cari.aria.peserta"), oninput: gambar, onchange: gambar });
  const pilihJam = (nilai, label) => {
    const el = h("select", { class: "isian-inline ii-jam", "aria-label": label, oninput: gambar, onchange: gambar },
      ...PILIHAN_JAM.map((j) => h("option", { value: j }, j)));
    el.value = nilai;
    return el;
  };
  const mulai = pilihJam(awal.mulai, t("cari.aria.mulai"));
  const selesai = pilihJam(awal.selesai, t("cari.aria.selesai"));
  // Tanggal tampil sebagai teks pendek; input tanggal asli transparan di atasnya dan membuka pemilih saat diklik.
  const bukaPemilih = (e) => { try { e.target.showPicker(); } catch { /* browser lama: input biasa */ } };
  const teksTanggal = h("span", { "aria-hidden": "true" }, tanggalRingkas(awal.tanggal));
  const tanggal = h("input", { class: "ii-tanggal-input", type: "date", value: awal.tanggal, "aria-label": t("cari.aria.tanggal"),
    onclick: bukaPemilih, onkeydown: (e) => e.key === "Enter" && bukaPemilih(e),
    oninput: ubahTanggal, onchange: ubahTanggal });
  const kolomTanggal = h("label", { class: "isian-inline ii-tanggal" }, teksTanggal, tanggal);
  function ubahTanggal() {
    teksTanggal.textContent = tanggal.value ? tanggalRingkas(tanggal.value) : "—";
    gambar();
  }

  const hasil = h("div", { "aria-live": "polite", "aria-label": t("cari.hasil") }, h("div", { class: "kosong" }, t("jadwal.memuat")));

  // Alasan ruangan tidak tersedia, atau null kalau bisa dipinjam. Aturannya sama dengan backend.
  function alasan(r, n, tgl, m1, m2) {
    if (r.status !== "tersedia") return t("cari.alasan.perbaikan");
    if (m1 < menit(r.jam_buka) || m2 > menit(r.jam_tutup)) return t("cari.alasan.jam", { buka: r.jam_buka, tutup: r.jam_tutup });
    if (n > r.kapasitas) return t("cari.alasan.kapasitas", { kap: r.kapasitas, n });
    const bentrok = peminjaman.find((p) => p.id_ruangan === r.id && p.tanggal === tgl && AKTIF.includes(p.status)
      && m1 < menit(p.jam_selesai) && m2 > menit(p.jam_mulai));
    if (bentrok) return t("cari.alasan.bentrok", { kegiatan: bentrok.keperluan, mulai: bentrok.jam_mulai, selesai: bentrok.jam_selesai });
    return null;
  }

  function ajukan(r, n) {
    bukaPengajuan({
      ruangan,
      awal: { id_ruangan: r.id, tanggal: tanggal.value, jam_mulai: mulai.value, jam_selesai: selesai.value, jumlah_peserta: n },
      onSukses: () => {
        toast(t("jadwal.terkirim"));
        muat();
      },
    });
  }

  const lokasi = (r) => `${r.gedung}${r.lantai && r.lantai !== "-" ? " · " + t("ruangan.lantai", { n: r.lantai }) : ""}`;

  function kartuCocok(r, n, i, pas) {
    // kecocokan ukuran: pas >= 40% kapasitas, agak besar 15-39%, terlalu besar < 15%
    const rasio = n / r.kapasitas;
    const ukuran = rasio >= 0.4 ? "pas" : rasio >= 0.15 ? "agak" : "besar";
    return h("article", { class: "cr-kartu", style: `--i:${Math.min(i, 12)}` },
      h("div", { class: "kr-atas" },
        h("span", { class: "tag-jenis" }, jenisRuangan(r.jenis)),
        pas && h("span", { class: "chip chip-pas" }, t("cari.palingPas"))),
      h("h2", { class: "kr-nama" }, r.nama),
      h("p", { class: "kr-info" }, lokasi(r)),
      h("p", { class: "cr-kap" }, t("ruangan.kapasitas", { n: r.kapasitas }),
        // kartu yang sudah berlabel "Disarankan" tidak perlu label "Pas" lagi
        !(pas && ukuran === "pas") && h("span", { class: "chip cr-ukuran cr-ukuran-" + ukuran }, t("cari.ukuran." + ukuran))),
      h("div", { class: "kr-aksi" },
        h("button", { class: "tombol tombol-kecil tombol-lembut", type: "button", onclick: () => ajukan(r, n) },
          t("cari.ajukan", { mulai: mulai.value, selesai: selesai.value }))));
  }

  function kartuTidak(r, teks, i) {
    return h("article", { class: "cr-kartu tidak", style: `--i:${Math.min(i, 12)}` },
      h("div", { class: "kr-atas" }, h("span", { class: "tag-jenis" }, jenisRuangan(r.jenis))),
      h("h2", { class: "kr-nama" }, r.nama),
      h("p", { class: "kr-info" }, lokasi(r)),
      h("p", { class: "cr-alasan" }, teks));
  }

  function gambar() {
    const n = Number(peserta.value);
    const m1 = mulai.value ? menit(mulai.value) : NaN;
    const m2 = selesai.value ? menit(selesai.value) : NaN;
    const petunjuk = !(n >= 1) ? "cari.petunjuk.peserta" : !tanggal.value ? "cari.petunjuk.tanggal"
      : !(m2 > m1) ? "cari.petunjuk.jam" : null;
    if (petunjuk) return hasil.replaceChildren(h("p", { class: "cr-petunjuk" }, t(petunjuk)));

    const cocok = [];
    const tidak = [];
    for (const r of ruangan) {
      const a = alasan(r, n, tanggal.value, m1, m2);
      (a ? tidak : cocok).push(a ? [r, a] : r);
    }
    cocok.sort((a, b) => a.kapasitas - b.kapasitas || a.id - b.id); // kapasitas paling pas dulu
    tidak.sort((a, b) => a[0].kapasitas - b[0].kapasitas);

    const kelas = "cr-grid" + (animasiMasuk ? " muncul" : "");
    hasil.replaceChildren(
      cocok.length
        ? h("section", {},
          h("h2", { class: "cr-judul" }, t("cari.tersedia", { n: cocok.length })),
          h("div", { class: kelas }, ...cocok.map((r, i) => kartuCocok(r, n, i, i === 0))))
        : tampilanKosong({ gambar: "cari", judul: t("cari.kosongJudul"), teks: t("cari.kosong") }),
      tidak.length > 0 && h("section", {},
        h("h2", { class: "cr-judul" }, t("cari.tidakTersedia", { n: tidak.length })),
        h("div", { class: kelas }, ...tidak.map(([r, a], i) => kartuTidak(r, a, i + cocok.length)))));
    animasiMasuk = false;
  }

  async function muat() {
    try {
      [ruangan, peminjaman] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      gambar();
    } catch (err) {
      toast(err.message, "error");
      hasil.replaceChildren(tampilanGagal(err.message, muat));
    }
  }

  muat();
  return h("div", {},
    h("p", { class: "cari-kalimat" },
      t("cari.k1"), " ", peserta, " ", t("cari.k2"), " ", kolomTanggal, " ", t("cari.k3"), " ", mulai, " ", t("cari.k4"), " ",
      h("span", { class: "tak-pisah" }, selesai, ".")), // isian terakhir dan titiknya tidak boleh terpisah baris
    hasil);
}

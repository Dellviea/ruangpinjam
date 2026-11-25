import { api } from "./api.js";
import { h, ikon } from "./dom.js";
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
  let tampilTidak = false; // bagian "tidak tersedia" dilipat sampai dibuka
  let animasiMasuk = true; // hasil muncul berurutan hanya pada tampilan pertama, bukan tiap ketikan

  const awal = isianAwal();
  // Bar pencarian bersegmen: tiap kolom = label kecil + nilai; seluruh kolom bisa diklik. Hasil langsung diperbarui saat berubah.
  const kolom = (kunci, kontrol, ...lain) => h("label", { class: "cari-kolom", onclick: (e) => {
    if (e.target === kontrol) return;
    try { kontrol.showPicker(); } catch { kontrol.focus(); } // dropdown/tanggal dibuka; input angka cukup difokus
  } }, h("span", { class: "cari-label" }, t(kunci)), kontrol, ...lain);
  const peserta = h("input", { class: "cari-nilai", type: "number", min: "1", max: "999", value: "20", "aria-label": t("cari.peserta"),
    oninput: gambar, onchange: gambar });
  const pilihJam = (nilai, label) => {
    const el = h("select", { class: "cari-nilai", "aria-label": label, oninput: gambar, onchange: gambar },
      ...PILIHAN_JAM.map((j) => h("option", { value: j }, j)));
    el.value = nilai;
    return el;
  };
  const mulai = pilihJam(awal.mulai, t("cari.mulai"));
  const selesai = pilihJam(awal.selesai, t("cari.selesai"));
  // Tanggal tampil sebagai teks pendek; input tanggal asli transparan menutupi kolom dan membuka pemilih saat diklik.
  const bukaPemilih = (e) => { try { e.target.showPicker(); } catch { /* browser lama: input biasa */ } };
  const teksTanggal = h("span", { class: "cari-nilai", "aria-hidden": "true" }, tanggalRingkas(awal.tanggal));
  const tanggal = h("input", { class: "cari-nilai", type: "date", min: tanggalLokal(), value: awal.tanggal, "aria-label": t("cari.tanggal"),
    onclick: bukaPemilih, onkeydown: (e) => e.key === "Enter" && bukaPemilih(e),
    oninput: ubahTanggal, onchange: ubahTanggal });
  function ubahTanggal() {
    teksTanggal.textContent = tanggal.value ? tanggalRingkas(tanggal.value) : "—";
    gambar();
  }

  const hasil = h("div", { "aria-live": "polite", "aria-label": t("cari.hasil") }, h("div", { class: "kosong" }, t("jadwal.memuat")));

  const jamStr = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const bentrokDengan = (r, tgl, m1, m2) => peminjaman.find((p) => p.id_ruangan === r.id && p.tanggal === tgl && AKTIF.includes(p.status)
    && m1 < menit(p.jam_selesai) && m2 > menit(p.jam_mulai));

  // Jam mulai terdekat (per 30 menit, dengan durasi yang sama) yang kosong di ruangan itu; null kalau tidak ada.
  function jamKosongTerdekat(r, tgl, m1, m2) {
    const dur = m2 - m1;
    const kini = new Date();
    const dariMenit = tgl === tanggalLokal(kini) ? kini.getHours() * 60 + kini.getMinutes() : 0; // jam yang sudah lewat tidak disarankan
    let terbaik = null;
    for (let m = menit(r.jam_buka); m + dur <= menit(r.jam_tutup); m += 30) {
      if (m % 30 || m < dariMenit || bentrokDengan(r, tgl, m, m + dur)) continue;
      if (terbaik === null || Math.abs(m - m1) < Math.abs(terbaik - m1)) terbaik = m;
    }
    return terbaik;
  }

  // Alasan ruangan tidak tersedia ({ikon, teks, saran}), atau null kalau bisa diajukan. Aturannya sama dengan backend.
  function alasan(r, n, tgl, m1, m2) {
    if (r.status !== "tersedia") return { ikon: "kunci", teks: t("cari.alasan.perbaikan") };
    if (m1 < menit(r.jam_buka) || m2 > menit(r.jam_tutup)) return { ikon: "jam", teks: t("cari.alasan.jam", { buka: r.jam_buka, tutup: r.jam_tutup }) };
    if (n > r.kapasitas) return { ikon: "orang", teks: t("cari.alasan.kapasitas", { kap: r.kapasitas, n }) };
    const bentrok = bentrokDengan(r, tgl, m1, m2);
    if (bentrok) {
      const saran = jamKosongTerdekat(r, tgl, m1, m2);
      return { ikon: "jam", teks: t("cari.alasan.bentrok", { kegiatan: bentrok.keperluan, mulai: bentrok.jam_mulai, selesai: bentrok.jam_selesai }),
        saran: saran === null ? null : { mulai: jamStr(saran), selesai: jamStr(saran + (m2 - m1)) } };
    }
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
        // hanya "Agak besar" dan "Terlalu besar" yang diberi label; ukuran pas tidak perlu label
        ukuran !== "pas" && h("span", { class: "chip cr-ukuran cr-ukuran-" + ukuran }, t("cari.ukuran." + ukuran))),
      h("div", { class: "kr-aksi" },
        // hanya kartu "Disarankan" yang tombolnya pink penuh; yang lain bergaris
        h("button", { class: "tombol tombol-kecil" + (pas ? "" : " tombol-garis"), type: "button", onclick: () => ajukan(r, n) },
          t("cari.ajukan", { mulai: mulai.value, selesai: selesai.value }))));
  }

  // Kartu diredupkan (latar --latar, tanpa bayangan/hover); alasan berwarna teks sekunder dengan ikon garis.
  function kartuTidak(r, a, i) {
    return h("article", { class: "cr-kartu tidak", style: `--i:${Math.min(i, 12)}` },
      h("div", { class: "kr-atas" }, h("span", { class: "tag-jenis" }, jenisRuangan(r.jenis))),
      h("h2", { class: "kr-nama" }, r.nama),
      h("p", { class: "kr-info" }, lokasi(r)),
      h("div", { class: "cr-alasan" }, ikon(a.ikon, 16),
        h("div", {}, h("div", {}, a.teks),
          a.saran && h("button", { class: "tautan-kecil", type: "button",
            onclick: () => {
              mulai.value = a.saran.mulai;
              selesai.value = a.saran.selesai;
              gambar();
            } }, t("cari.saran", { jam: a.saran.mulai })))));
  }

  function gambar() {
    const n = Number(peserta.value);
    const m1 = mulai.value ? menit(mulai.value) : NaN;
    const m2 = selesai.value ? menit(selesai.value) : NaN;
    const kini = new Date();
    const lampau = tanggal.value && (tanggal.value < tanggalLokal(kini)
      || (tanggal.value === tanggalLokal(kini) && m1 < kini.getHours() * 60 + kini.getMinutes()));
    const petunjuk = !(n >= 1) ? "cari.petunjuk.peserta" : !tanggal.value ? "cari.petunjuk.tanggal"
      : !(m2 > m1) ? "cari.petunjuk.jam" : lampau ? "cari.petunjuk.lampau" : null;
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
        h("h2", { class: "cr-judul" }, h("button", { class: "tautan-lipat", type: "button", "aria-expanded": String(tampilTidak),
          "aria-controls": "cr-tidak", onclick: () => { tampilTidak = !tampilTidak; gambar(); } },
        tampilTidak ? t("cari.sembunyikan") : t("cari.tampilTidak", { n: tidak.length }))),
        h("div", { class: "cr-grid", id: "cr-tidak", hidden: !tampilTidak }, ...tidak.map(([r, a], i) => kartuTidak(r, a, i + cocok.length)))));
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

  // Tombol Cari: menjalankan ulang pencarian lalu menggulir ke hasil (hasil sudah otomatis diperbarui saat isian berubah).
  function cariUlang() {
    gambar();
    const pelan = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    hasil.scrollIntoView({ behavior: pelan ? "smooth" : "auto", block: "start" });
  }

  muat();
  return h("div", {},
    h("p", { class: "cari-sub" }, t("cari.sub")),
    h("div", { class: "cari-bar", role: "search" },
      kolom("cari.peserta", peserta),
      kolom("cari.tanggal", tanggal, teksTanggal),
      kolom("cari.mulai", mulai),
      kolom("cari.selesai", selesai),
      h("button", { class: "tombol cari-tombol", type: "button", onclick: cariUlang }, ikon("cari", 16), t("cari.tombol"))),
    hasil);
}

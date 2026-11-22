import { api, ambilSesi } from "./api.js";
import { h, ikon } from "./dom.js";
import { t } from "./i18n.js";
import { JENIS_RUANGAN } from "./konstanta.js";
import { bukaPengajuan } from "./pengajuan.js";
import { geserHari, menit, namaHari, pad, tanggalLokal } from "./waktu.js";

// Kolom tabel: satu kolom per jam, dari 07:00 sampai 21:00.
const JAM_AWAL = 7;
const JAM_AKHIR = 21;
const JUMLAH_JAM = JAM_AKHIR - JAM_AWAL;
const LEBAR_JAM = 84; // px

export function halamanJadwal(query = new URLSearchParams()) {
  const pengguna = ambilSesi();
  let ruangan = [];
  let peminjaman = [];
  let tanggal = tanggalLokal();
  let jenis = JENIS_RUANGAN.includes(query.get("jenis")) ? query.get("jenis") : ""; // dari tombol "Lihat jadwal"

  const info = h("p", { class: "pesan-ok", role: "status" });
  const galat = h("p", { class: "pesan-error", role: "alert" });
  const labelHari = h("span", { class: "hari-label" });
  const inputTanggal = h("input", { type: "date", class: "kontrol", "aria-label": t("jadwal.tanggal"),
    onchange: (e) => e.target.value && pindahTanggal(e.target.value) });
  const wadah = h("div", { class: "j-gulir", role: "region", tabindex: "0", "aria-label": t("jadwal.tabel") },
    h("div", { class: "kosong" }, t("jadwal.memuat")));

  // ----- bagian tabel -----
  function blok(p) {
    const milik = pengguna && p.id_pengguna === pengguna.id;
    const total = JUMLAH_JAM * 60;
    const kiri = Math.max(0, (menit(p.jam_mulai) - JAM_AWAL * 60) / total * 100);
    const lebar = Math.min(100 - kiri, (menit(p.jam_selesai) - menit(p.jam_mulai)) / total * 100);
    return h("div", {
      class: "j-blok " + (milik ? "milik" : "lain"),
      style: `left:calc(${kiri}% + 2px);width:calc(${lebar}% - 4px)`,
      title: `${p.jam_mulai}-${p.jam_selesai} · ${p.keperluan} · ${p.nama_pengguna} · ${t("status." + p.status)}`,
    },
      h("div", { class: "j-jam" }, `${p.jam_mulai}–${p.jam_selesai}`),
      h("div", { class: "j-perlu" }, p.keperluan),
      !milik && h("div", { class: "j-oleh" }, p.nama_pengguna),
      h("div", { class: "j-chip" },
        milik && h("span", { class: "chip chip-milik" }, t("jadwal.milikSaya")),
        h("span", { class: "chip chip-" + p.status }, t("status." + p.status))));
  }

  function baris(r, daftar) {
    const tersedia = r.status === "tersedia";
    const buka = menit(r.jam_buka);
    const tutup = menit(r.jam_tutup);
    const slot = [];
    for (let j = JAM_AWAL; j < JAM_AKHIR; j++) {
      const bisa = tersedia && j * 60 >= buka && (j + 1) * 60 <= tutup;
      slot.push(h("div", { class: "j-slot" + (bisa ? "" : " j-tutup"), "data-jam": bisa ? j : null }));
    }
    const track = h("div", { class: "j-track",
      onclick: (e) => {
        const s = e.target.closest(".j-slot[data-jam]");
        if (s) ajukan(r.id, Number(s.dataset.jam));
      } }, ...slot, ...daftar.map(blok));

    return h("div", { class: "j-baris" + (tersedia ? "" : " j-rusak") },
      h("div", { class: "j-ruang" },
        h("div", { class: "j-nama" }, r.nama),
        h("div", { class: "j-sub" }, `${r.gedung} · ${t("jadwal.kapasitas", { n: r.kapasitas })}`),
        !tersedia && h("div", { class: "j-sub" }, t("jadwal.perbaikan"))),
      track);
  }

  function gambar(gulir) {
    const kiriLama = wadah.scrollLeft;
    labelHari.textContent = namaHari(tanggal);
    inputTanggal.value = tanggal;

    const aktif = peminjaman.filter((p) => p.tanggal === tanggal && ["menunggu", "disetujui"].includes(p.status));
    const kelompok = JENIS_RUANGAN.filter((j) => !jenis || j === jenis)
      .map((j) => ({ jenis: j, daftar: ruangan.filter((r) => r.jenis === j) }))
      .filter((k) => k.daftar.length);

    if (!kelompok.length) {
      wadah.replaceChildren(h("div", { class: "kosong" }, t("jadwal.kosong")));
      return;
    }
    const jam = Array.from({ length: JUMLAH_JAM }, (_, i) => h("span", {}, `${pad(JAM_AWAL + i)}:00`));
    wadah.replaceChildren(h("div", { class: "j-tabel", style: `--jam:${JUMLAH_JAM};--lebar-jam:${LEBAR_JAM}px` },
      h("div", { class: "j-kepala" }, h("div", { class: "j-ruang-label" }, t("jadwal.ruangan")),
        h("div", { class: "j-jam-label" }, ...jam)),
      ...kelompok.flatMap((k) => [
        h("div", { class: "j-kelompok" }, h("span", {}, k.jenis)),
        ...k.daftar.map((r) => baris(r, aktif.filter((p) => p.id_ruangan === r.id))),
      ])));

    if (!gulir) wadah.scrollLeft = kiriLama;
    else if (tanggal === tanggalLokal()) wadah.scrollLeft = Math.max(0, new Date().getHours() - JAM_AWAL - 1) * LEBAR_JAM;
    else wadah.scrollLeft = 0;
  }

  // ----- data dan aksi -----
  async function muat(gulir = false) {
    galat.textContent = "";
    try {
      [ruangan, peminjaman] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      gambar(gulir);
    } catch (err) {
      galat.textContent = err.message;
    }
  }

  function pindahTanggal(tgl) {
    tanggal = tgl;
    info.textContent = "";
    if (ruangan.length) gambar(true);
    else muat(true);
  }

  function ajukan(idRuangan, jam) {
    bukaPengajuan({
      ruangan,
      awal: {
        id_ruangan: idRuangan,
        tanggal,
        jam_mulai: jam == null ? "" : `${pad(jam)}:00`,
        jam_selesai: jam == null ? "" : `${pad(jam + 1)}:00`,
      },
      onSukses: () => {
        info.textContent = t("jadwal.terkirim");
        muat();
      },
    });
  }

  // ----- tampilan -----
  const tombolIkon = (nama, label, aksi) =>
    h("button", { class: "tombol-ikon", type: "button", "aria-label": label, title: label, onclick: aksi }, ikon(nama));

  const filter = h("select", { class: "kontrol", "aria-label": t("jadwal.jenis"),
    onchange: (e) => { jenis = e.target.value; gambar(false); } },
    h("option", { value: "" }, t("jadwal.semuaJenis")),
    ...JENIS_RUANGAN.map((j) => h("option", { value: j }, j)));
  filter.value = jenis;

  const halaman = h("div", { class: "jadwal" },
    h("div", { class: "j-alat" },
      h("div", { class: "grup" },
        tombolIkon("kiri", t("jadwal.sebelum"), () => pindahTanggal(geserHari(tanggal, -1))),
        inputTanggal,
        tombolIkon("kanan", t("jadwal.sesudah"), () => pindahTanggal(geserHari(tanggal, 1))),
        h("button", { class: "tombol tombol-kecil tombol-sekunder", type: "button",
          onclick: () => pindahTanggal(tanggalLokal()) }, t("jadwal.hariIni"))),
      labelHari,
      h("div", { class: "grup j-kanan" },
        filter,
        h("button", { class: "tombol tombol-kecil", type: "button", onclick: () => ajukan(null, null) },
          ikon("tambah"), t("jadwal.ajukan")))),
    h("div", { class: "j-legenda" },
      h("span", {}, h("i", { class: "sw sw-milik" }), t("jadwal.milikSaya")),
      h("span", {}, h("i", { class: "sw sw-lain" }), t("jadwal.lain")),
      h("span", {}, h("i", { class: "sw sw-tutup" }), t("jadwal.tutup")),
      h("span", {}, t("jadwal.petunjuk"))),
    info, galat, wadah);

  muat(true);
  return halaman;
}

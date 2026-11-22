import { api } from "./api.js";
import { h, ikon } from "./dom.js";
import { t } from "./i18n.js";
import { JENIS_RUANGAN } from "./konstanta.js";
import { bukaPengajuan } from "./pengajuan.js";
import { menit, tanggalLokal } from "./waktu.js";

const PILIHAN = ["", ...JENIS_RUANGAN]; // "" = Semua

export function halamanRuangan() {
  let ruangan = [];
  let peminjaman = [];
  let kata = "";
  let jenis = "";

  const info = h("p", { class: "pesan-ok", role: "status" });
  const galat = h("p", { class: "pesan-error", role: "alert" });
  const jumlah = h("p", { class: "r-jumlah", "aria-live": "polite" });
  const wadah = h("div", {}, h("div", { class: "kosong" }, t("jadwal.memuat")));

  // Kosong / sedang dipakai / dalam perbaikan. "Sedang dipakai" = ada peminjaman disetujui yang berlangsung sekarang.
  function statusRuangan(r, hari, sekarang) {
    if (r.status !== "tersedia") return "perbaikan";
    const dipakai = peminjaman.some((p) => p.id_ruangan === r.id && p.status === "disetujui" && p.tanggal === hari
      && menit(p.jam_mulai) <= sekarang && sekarang < menit(p.jam_selesai));
    return dipakai ? "dipakai" : "kosong";
  }

  function pinjam(r) {
    bukaPengajuan({
      ruangan,
      awal: { id_ruangan: r.id, tanggal: tanggalLokal() },
      onSukses: () => {
        info.textContent = t("jadwal.terkirim");
        muat();
      },
    });
  }

  function kartu(r, status) {
    const rusak = status === "perbaikan";
    const lantai = r.lantai && r.lantai !== "-" ? ` · ${t("ruangan.lantai", { n: r.lantai })}` : "";
    return h("article", { class: "kartu-ruangan" + (rusak ? " rusak" : "") },
      h("div", { class: "kr-atas" },
        h("span", { class: "tag-jenis" }, r.jenis),
        h("span", { class: "chip chip-" + (status === "kosong" ? "kosong" : status) }, t("ruangan.status." + status))),
      h("h2", { class: "kr-nama" }, r.nama),
      h("p", { class: "kr-info" }, ikon("gedung"), r.gedung + lantai),
      h("p", { class: "kr-info" }, ikon("orang"), t("ruangan.kapasitas", { n: r.kapasitas })),
      r.fasilitas.length > 0 && h("ul", { class: "kr-fasilitas", "aria-label": t("ruangan.fasilitas") },
        ...r.fasilitas.map((x) => h("li", {}, x))),
      h("div", { class: "kr-aksi" },
        h("a", { class: "tombol tombol-kecil tombol-sekunder",
          href: "#/jadwal?jenis=" + encodeURIComponent(r.jenis) }, t("ruangan.lihatJadwal")),
        h("button", { class: "tombol tombol-kecil", type: "button", disabled: rusak,
          title: rusak ? t("ruangan.tidakBisaPinjam") : null, onclick: () => pinjam(r) }, t("ruangan.pinjam"))));
  }

  function gambar() {
    pil.forEach((el, i) => el.setAttribute("aria-pressed", String(PILIHAN[i] === jenis)));

    const sekarang = new Date();
    const hari = tanggalLokal(sekarang);
    const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();

    const cocok = ruangan
      .filter((r) => (!jenis || r.jenis === jenis) && r.nama.toLowerCase().includes(kata))
      .sort((a, b) => JENIS_RUANGAN.indexOf(a.jenis) - JENIS_RUANGAN.indexOf(b.jenis) || a.id - b.id);

    jumlah.textContent = t("ruangan.jumlah", { n: cocok.length });
    wadah.replaceChildren(cocok.length
      ? h("div", { class: "r-grid" }, ...cocok.map((r) => kartu(r, statusRuangan(r, hari, menitSekarang))))
      : h("div", { class: "kartu kosong" }, t("ruangan.kosong")));
  }

  async function muat() {
    galat.textContent = "";
    try {
      [ruangan, peminjaman] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      gambar();
    } catch (err) {
      galat.textContent = err.message;
    }
  }

  const pil = PILIHAN.map((j) => h("button", { class: "pil", type: "button", "aria-pressed": "false",
    onclick: () => { jenis = j; gambar(); } }, j || t("ruangan.semua")));

  const cari = h("input", { type: "search", id: "cari-ruangan", placeholder: t("ruangan.cari"),
    "aria-label": t("ruangan.cari"), autocomplete: "off",
    oninput: (e) => { kata = e.target.value.trim().toLowerCase(); gambar(); } });

  muat();
  return h("div", {},
    h("div", { class: "r-alat" },
      h("div", { class: "cari" }, ikon("cari"), cari),
      h("div", { class: "pil-baris", role: "group", "aria-label": t("ruangan.filter") }, ...pil)),
    jumlah, info, galat, wadah);
}

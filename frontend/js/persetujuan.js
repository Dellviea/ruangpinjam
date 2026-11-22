import { api } from "./api.js";
import { h } from "./dom.js";
import { bukaForm } from "./form.js";
import { t } from "./i18n.js";
import { tanggalPendek } from "./waktu.js";

export function halamanPersetujuan() {
  let ruangan = [];
  let menunggu = []; // pengajuan berstatus menunggu, yang paling dekat jadwalnya di atas

  const info = h("p", { class: "pesan-ok", role: "status" });
  const galat = h("p", { class: "pesan-error", role: "alert" });
  const jumlah = h("p", { class: "info-jumlah", "aria-live": "polite" });
  const panel = h("div", {}, h("div", { class: "kosong" }, t("jadwal.memuat")));

  async function setujui(p, tombol) {
    galat.textContent = "";
    tombol.disabled = true;
    try {
      await api(`/peminjaman/${p.id}/setujui`, { method: "PUT" });
      info.textContent = t("persetujuan.disetujui", { keperluan: p.keperluan });
      muat();
    } catch (err) {
      galat.textContent = err.message;
      tombol.disabled = false;
    }
  }

  function tolak(p) {
    bukaForm({
      judul: t("persetujuan.tolakJudul"),
      ringkasan: `${p.nama_pengguna} · ${p.nama_ruangan} · ${tanggalPendek(p.tanggal)}, ${p.jam_mulai}–${p.jam_selesai}`,
      bidang: [{ nama: "alasan", label: t("persetujuan.alasan"), jenis: "area", wajib: true,
        hint: t("persetujuan.alasanHint") }],
      labelSimpan: t("persetujuan.tolakKirim"),
      bahaya: true,
      simpan: (v) => api(`/peminjaman/${p.id}/tolak`, { method: "PUT", body: { alasan: v.alasan } }),
      onSukses: () => {
        info.textContent = t("persetujuan.ditolak", { keperluan: p.keperluan });
        muat();
      },
    });
  }

  function baris(p) {
    const r = ruangan.find((x) => x.id === p.id_ruangan);
    const tombolSetuju = h("button", { class: "tombol tombol-kecil", type: "button",
      onclick: () => setujui(p, tombolSetuju) }, t("persetujuan.setujui"));
    return h("tr", {},
      h("td", {}, h("div", { class: "sel-utama" }, p.nama_pengguna)),
      h("td", {}, p.nama_ruangan),
      h("td", { class: "nowrap" },
        h("div", {}, tanggalPendek(p.tanggal)),
        h("div", { class: "sel-sub" }, `${p.jam_mulai}–${p.jam_selesai}`)),
      h("td", {},
        h("div", { class: "sel-utama" }, p.keperluan),
        h("div", { class: "sel-sub" }, p.jenis_kegiatan)),
      h("td", { class: "nowrap" }, `${p.jumlah_peserta} / ${r ? r.kapasitas : "?"}`),
      h("td", {}, h("div", { class: "aksi-sel" }, tombolSetuju,
        h("button", { class: "tombol tombol-kecil tombol-bahaya", type: "button", onclick: () => tolak(p) },
          t("persetujuan.tolak")))));
  }

  function gambar() {
    jumlah.textContent = t("persetujuan.jumlah", { n: menunggu.length });
    if (!menunggu.length) {
      panel.replaceChildren(h("div", { class: "kartu kosong" }, t("persetujuan.kosong")));
      return;
    }
    const kolom = ["Peminjam", "Ruangan", "Waktu", "Kegiatan", "Peserta", "Aksi"];
    panel.replaceChildren(h("div", { class: "tabel-gulir" },
      h("table", { class: "tabel tabel-bebas" },
        h("thead", {}, h("tr", {}, ...kolom.map((k) => h("th", { scope: "col" }, t("persetujuan.kolom" + k))))),
        h("tbody", {}, ...menunggu.map(baris)))));
  }

  async function muat() {
    galat.textContent = "";
    try {
      const [r, semua] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      ruangan = r;
      menunggu = semua.filter((p) => p.status === "menunggu")
        .sort((a, b) => (a.tanggal + a.jam_mulai).localeCompare(b.tanggal + b.jam_mulai));
      gambar();
    } catch (err) {
      galat.textContent = err.message;
    }
  }

  muat();
  return h("div", {}, jumlah, info, galat, panel);
}

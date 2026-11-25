import { api, ambilSesi } from "./api.js";
import { beriLabelSel, h } from "./dom.js";
import { kegiatan, t } from "./i18n.js";
import { konfirmasi } from "./konfirmasi.js";
import { tampilanGagal, tampilanKosong } from "./kosong.js";
import { bukaPengajuan } from "./pengajuan.js";
import { toast } from "./toast.js";
import { tanggalPendek } from "./waktu.js";

const TAB = ["semua", "menunggu", "disetujui", "ditolak", "dibatalkan"];

export function halamanPeminjaman() {
  const pengguna = ambilSesi();
  let ruangan = [];
  let milik = []; // peminjaman milik pengguna yang login, terbaru di atas
  let tabAktif = "semua";

  const panel = h("div", { role: "tabpanel", id: "panel-peminjaman" });

  // ----- tab (dibuat sekali supaya fokus keyboard tidak hilang) -----
  const tab = Object.fromEntries(TAB.map((s) => {
    const jumlah = h("span", { class: "tab-jml" });
    const el = h("button", { class: "tab", type: "button", role: "tab", id: "tab-" + s,
      "aria-controls": "panel-peminjaman", onclick: () => pilihTab(s), onkeydown: (e) => panah(e, s) },
    t(s === "semua" ? "peminjaman.semua" : "status." + s), jumlah);
    return [s, { el, jumlah }];
  }));

  function pilihTab(s, fokus = false) {
    tabAktif = s;
    gambar();
    if (fokus) tab[s].el.focus();
  }

  function panah(e, s) {
    const i = TAB.indexOf(s);
    const tujuan = { ArrowRight: TAB[(i + 1) % TAB.length], ArrowLeft: TAB[(i + TAB.length - 1) % TAB.length],
      Home: TAB[0], End: TAB[TAB.length - 1] }[e.key];
    if (tujuan) {
      e.preventDefault();
      pilihTab(tujuan, true);
    }
  }

  // ----- aksi -----
  const awalDari = (p) => ({ id_ruangan: p.id_ruangan, tanggal: p.tanggal, jam_mulai: p.jam_mulai,
    jam_selesai: p.jam_selesai, jenis_kegiatan: p.jenis_kegiatan, keperluan: p.keperluan,
    jumlah_peserta: p.jumlah_peserta });

  function ubah(p) {
    bukaPengajuan({ ruangan, idUbah: p.id, awal: awalDari(p),
      onSukses: () => { toast(t("peminjaman.diperbarui")); muat(); } });
  }

  function ajukanUlang(p) {
    bukaPengajuan({ ruangan, awal: awalDari(p),
      onSukses: () => { toast(t("peminjaman.terkirimUlang")); muat(); } });
  }

  async function batalkan(p) {
    const ya = await konfirmasi({
      judul: t("peminjaman.konfirmasiJudul"),
      teks: t("peminjaman.konfirmasiTeks", { ruangan: p.nama_ruangan, tanggal: tanggalPendek(p.tanggal),
        jam: `${p.jam_mulai}–${p.jam_selesai}` }),
      ya: t("peminjaman.konfirmasiYa"),
      bahaya: true,
    });
    if (!ya) return;
    try {
      await api(`/peminjaman/${p.id}`, { method: "PUT", body: { status: "dibatalkan" } });
      toast(t("peminjaman.dibatalkan"));
      muat();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function aksi(p) {
    const tombol = (kunci, kelas, fungsi) =>
      h("button", { class: "tombol tombol-kecil " + kelas, type: "button", onclick: () => fungsi(p) }, t(kunci));
    if (p.status === "menunggu") {
      return h("div", { class: "aksi-sel" },
        tombol("peminjaman.ubah", "tombol-sekunder", ubah),
        tombol("peminjaman.batalkan", "tombol-bahaya", batalkan));
    }
    if (p.status === "ditolak") return h("div", { class: "aksi-sel" }, tombol("peminjaman.ajukanUlang", "tombol-sekunder", ajukanUlang));
    if (p.status === "disetujui") return h("span", { class: "sel-sub" }, t("peminjaman.hubungiAdmin"));
    return h("span", { class: "sel-sub" }, "—");
  }

  // ----- tampilan -----
  function baris(p) {
    return h("tr", {},
      h("td", {}, h("div", { class: "sel-utama" }, p.nama_ruangan)),
      h("td", {}, tanggalPendek(p.tanggal)),
      h("td", { class: "mono" }, `${p.jam_mulai}–${p.jam_selesai}`),
      h("td", {},
        h("div", { class: "sel-utama" }, p.keperluan),
        h("div", { class: "sel-sub" }, `${kegiatan(p.jenis_kegiatan)} · ${t("peminjaman.peserta", { n: p.jumlah_peserta })}`)),
      h("td", {},
        h("span", { class: "chip chip-" + p.status }, t("status." + p.status)),
        p.status === "ditolak" && h("p", { class: "alasan" }, t("peminjaman.alasan", { alasan: p.alasan_penolakan }))),
      h("td", {}, aksi(p)));
  }

  function gambar() {
    for (const s of TAB) {
      const aktif = s === tabAktif;
      tab[s].el.setAttribute("aria-selected", String(aktif));
      tab[s].el.tabIndex = aktif ? 0 : -1;
      tab[s].jumlah.textContent = String(s === "semua" ? milik.length : milik.filter((p) => p.status === s).length);
    }
    panel.setAttribute("aria-labelledby", "tab-" + tabAktif);

    const daftar = tabAktif === "semua" ? milik : milik.filter((p) => p.status === tabAktif);
    if (!daftar.length) {
      panel.replaceChildren(milik.length
        ? tampilanKosong({ gambar: "peminjaman", judul: t("peminjaman.kosongStatusJudul"), teks: t("peminjaman.kosongStatus"),
          tombol: { teks: t("peminjaman.lihatSemua"), aksi: () => { pilihTab("semua", true); } } })
        : tampilanKosong({ gambar: "peminjaman", judul: t("peminjaman.kosongSemuaJudul"), teks: t("peminjaman.kosongSemua"),
          tombol: { teks: t("peminjaman.keJadwal"), href: "#/jadwal" } }));
      return;
    }
    const kolom = ["Ruangan", "Tanggal", "Jam", "Kegiatan", "Status", "Aksi"];
    panel.replaceChildren(h("div", { class: "tabel-gulir" },
      beriLabelSel(h("table", { class: "tabel" },
        h("thead", {}, h("tr", {}, ...kolom.map((k) => h("th", { scope: "col" }, t("peminjaman.kolom" + k))))),
        h("tbody", {}, ...daftar.map(baris))))));
  }

  async function muat() {
    try {
      const [r, semua] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      ruangan = r;
      milik = semua.filter((p) => p.id_pengguna === pengguna.id)
        .sort((a, b) => (b.tanggal + b.jam_mulai).localeCompare(a.tanggal + a.jam_mulai));
      gambar();
    } catch (err) {
      toast(err.message, "error");
      panel.replaceChildren(tampilanGagal(err.message, muat));
    }
  }

  panel.append(h("div", { class: "kosong" }, t("jadwal.memuat")));
  muat();
  return h("div", {},
    h("div", { class: "tab-baris", role: "tablist", "aria-label": t("peminjaman.tab") }, ...TAB.map((s) => tab[s].el)),
    panel);
}

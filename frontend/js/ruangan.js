import { api, ambilSesi } from "./api.js";
import { h, ikon } from "./dom.js";
import { fasilitas, jenisRuangan, t } from "./i18n.js";
import { tampilanGagal, tampilanKosong } from "./kosong.js";
import { JENIS_RUANGAN } from "./konstanta.js";
import { bukaPengajuan } from "./pengajuan.js";
import { toast } from "./toast.js";
import { menit, tanggalLokal } from "./waktu.js";

const PILIHAN = ["", ...JENIS_RUANGAN]; // "" = Semua
const JAM_AWAL = 7; // strip pemakaian mencakup 07:00-21:00
const JAM_AKHIR = 21;
const AKTIF = ["menunggu", "disetujui"];

// Posisi menit-hari dalam persen strip (0% = 07:00, 100% = 21:00).
const persen = (m) => Math.min(100, Math.max(0, (m - JAM_AWAL * 60) / ((JAM_AKHIR - JAM_AWAL) * 60) * 100));

export function halamanRuangan() {
  const pengguna = ambilSesi();
  let ruangan = [];
  let peminjaman = [];
  let kata = "";
  let jenis = "";
  let ref = []; // kartu yang statusnya diperbarui tiap menit
  let animasiMasuk = true; // kartu muncul berurutan hanya saat halaman dibuka

  const jumlah = h("p", { class: "r-jumlah", "aria-live": "polite" });
  const wadah = h("div", {}, h("div", { class: "kosong" }, t("jadwal.memuat")));

  // kosong / dipakai / perbaikan / tutup. "Dipakai" = ada peminjaman DISETUJUI yang sedang berlangsung;
  // "tutup" = di luar jam buka ruangan. aktif = peminjaman menunggu/disetujui ruangan itu hari ini.
  function statusRuangan(r, aktif, m) {
    if (r.status !== "tersedia") return "perbaikan";
    if (m < menit(r.jam_buka) || m >= menit(r.jam_tutup)) return "tutup";
    const dipakai = aktif.some((p) => p.status === "disetujui" && menit(p.jam_mulai) <= m && m < menit(p.jam_selesai));
    return dipakai ? "dipakai" : "kosong";
  }

  // Kalimat status di kartu. "Kosong sampai ..." = sampai peminjaman berikutnya (menunggu atau disetujui) atau jam tutup.
  function kalimat(r, status, aktif, m) {
    if (status === "perbaikan") return t("ruangan.kalimat.perbaikan");
    if (status === "tutup") return t(m < menit(r.jam_buka) ? "ruangan.kalimat.belumBuka" : "ruangan.kalimat.tutup", { jam: r.jam_buka });
    if (status === "dipakai") {
      const p = aktif.find((x) => x.status === "disetujui" && menit(x.jam_mulai) <= m && m < menit(x.jam_selesai));
      return t("ruangan.kalimat.dipakai", { kegiatan: p.keperluan, jam: p.jam_selesai });
    }
    const berikut = aktif.filter((p) => menit(p.jam_mulai) > m).sort((a, b) => menit(a.jam_mulai) - menit(b.jam_mulai))[0];
    return t("ruangan.kalimat.kosong", { jam: berikut ? berikut.jam_mulai : r.jam_tutup });
  }

  // Strip pemakaian hari ini: biru = orang lain, pink = milik saya (yang masih menunggu dibuat lebih pudar),
  // abu-abu = di luar jam buka, garis kecil = jam sekarang. Hanya hiasan visual; teksnya ada di aria-label.
  function stripPemakaian(r, aktif) {
    const penanda = h("i", { class: "strip-sekarang", hidden: true });
    const ringkas = aktif.length ? aktif.map((p) => `${p.jam_mulai}-${p.jam_selesai} ${p.keperluan}`).join(", ") : t("ruangan.stripKosong");
    const el = h("div", { class: "strip", role: "img", "aria-label": `${t("ruangan.strip")}: ${ringkas}` },
      h("i", { class: "strip-tutup", style: `left:0;width:${persen(menit(r.jam_buka))}%` }),
      h("i", { class: "strip-tutup", style: `left:${persen(menit(r.jam_tutup))}%;right:0` }),
      ...aktif.map((p) => {
        const milik = pengguna && p.id_pengguna === pengguna.id;
        const kiri = persen(menit(p.jam_mulai));
        return h("i", { class: `strip-blok ${milik ? "milik" : "lain"}${p.status === "menunggu" ? " menunggu" : ""}`,
          style: `left:${kiri}%;width:${persen(menit(p.jam_selesai)) - kiri}%`, title: `${p.jam_mulai}-${p.jam_selesai} · ${p.keperluan}` });
      }),
      penanda);
    return { el, penanda };
  }

  function pinjam(r) {
    bukaPengajuan({
      ruangan,
      awal: { id_ruangan: r.id, tanggal: tanggalLokal() },
      onSukses: () => {
        toast(t("jadwal.terkirim"));
        muat();
      },
    });
  }

  // Kartu bergaya papan nama pintu: pita gelap (kode + status), nama, detail dengan garis titik-titik, kalimat status, strip pemakaian.
  function kartu(r, indeks, hari) {
    const rusak = r.status !== "tersedia";
    const aktif = peminjaman.filter((p) => p.id_ruangan === r.id && p.tanggal === hari && AKTIF.includes(p.status));
    const chipTeks = h("span", {});
    const chip = h("span", { class: "kr-status-pita" }, h("i", { class: "kr-dot", "aria-hidden": "true" }), chipTeks);
    const kal = h("p", { class: "kr-status" });
    const st = stripPemakaian(r, aktif);
    ref.push({ r, aktif, chip, chipTeks, kal, penanda: st.penanda });

    const baris = (kunci, nilai) => h("div", { class: "kr-baris" },
      h("dt", {}, t("ruangan.label." + kunci)), h("span", { class: "kr-titik", "aria-hidden": "true" }), h("dd", {}, nilai));

    return h("article", { class: "kartu-ruangan" + (rusak ? " rusak" : ""), style: `--i:${Math.min(indeks, 16)}` },
      h("div", { class: "kr-pita" }, h("span", { class: "kr-kode" }, r.kode), chip),
      h("div", { class: "kr-badan" },
        h("p", { class: "kr-jenis" }, jenisRuangan(r.jenis)),
        h("h2", { class: "kr-nama" }, r.nama),
        h("dl", { class: "kr-detail" },
          baris("gedung", r.gedung),
          r.lantai && r.lantai !== "-" && baris("lantai", r.lantai),
          baris("kapasitas", t("jadwal.orang", { n: r.kapasitas }))),
        kal,
        h("div", { class: "kr-strip" }, st.el,
          h("div", { class: "strip-label", "aria-hidden": "true" }, h("span", {}, String(JAM_AWAL).padStart(2, "0")),
            h("span", {}, String(JAM_AKHIR)))),
        r.fasilitas.length > 0 && h("ul", { class: "kr-fasilitas", "aria-label": t("ruangan.fasilitas") },
          ...r.fasilitas.map((x) => h("li", {}, fasilitas(x)))),
        h("div", { class: "kr-aksi" },
          h("a", { class: "tombol tombol-kecil tombol-sekunder",
            href: "#/jadwal?jenis=" + encodeURIComponent(r.jenis) }, t("ruangan.lihatJadwal")),
          h("button", { class: "tombol tombol-kecil tombol-lembut", type: "button", disabled: rusak,
            title: rusak ? t("ruangan.tidakBisaPinjam") : null, onclick: () => pinjam(r) }, t("ruangan.pinjam")))));
  }

  // Dipanggil setelah menggambar dan tiap menit: status, kalimat, dan penanda jam sekarang di tiap kartu.
  function segarkan() {
    const d = new Date();
    const m = d.getHours() * 60 + d.getMinutes();
    for (const k of ref) {
      const status = statusRuangan(k.r, k.aktif, m);
      const teks = kalimat(k.r, status, k.aktif, m);
      k.chip.className = "kr-status-pita sp-" + status;
      k.chipTeks.textContent = t("ruangan.status." + status);
      k.kal.className = "kr-status ks-" + status;
      k.kal.textContent = k.kal.title = teks;
      const dalam = k.r.status === "tersedia" && m >= JAM_AWAL * 60 && m < JAM_AKHIR * 60;
      k.penanda.hidden = !dalam;
      if (dalam) k.penanda.style.left = persen(m) + "%";
    }
  }

  function gambar() {
    pil.forEach((el, i) => el.setAttribute("aria-pressed", String(PILIHAN[i] === jenis)));

    const hari = tanggalLokal();
    const cocok = ruangan
      .filter((r) => (!jenis || r.jenis === jenis) && r.nama.toLowerCase().includes(kata))
      .sort((a, b) => JENIS_RUANGAN.indexOf(a.jenis) - JENIS_RUANGAN.indexOf(b.jenis) || a.id - b.id);

    ref = [];
    jumlah.textContent = t("ruangan.jumlah", { n: cocok.length });
    wadah.replaceChildren(cocok.length
      ? h("div", { class: "r-grid" + (animasiMasuk ? " muncul" : "") }, ...cocok.map((r, i) => kartu(r, i, hari)))
      : tampilanKosong({ gambar: "cari", judul: t("ruangan.kosongJudul"), teks: t("ruangan.kosong"),
        tombol: { teks: t("ruangan.reset"), aksi: resetCari } }));
    animasiMasuk = false; // mengetik di kolom cari tidak mengulang animasi
    segarkan();
  }

  function resetCari() {
    kata = "";
    jenis = "";
    cari.value = "";
    gambar();
  }

  async function muat() {
    try {
      [ruangan, peminjaman] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      gambar();
    } catch (err) {
      ref = [];
      toast(err.message, "error");
      jumlah.textContent = "";
      wadah.replaceChildren(tampilanGagal(err.message, muat));
    }
  }

  const pil = PILIHAN.map((j) => h("button", { class: "pil", type: "button", "aria-pressed": "false",
    onclick: () => { jenis = j; gambar(); } }, j ? jenisRuangan(j) : t("ruangan.semua")));

  const cari = h("input", { type: "search", id: "cari-ruangan", placeholder: t("ruangan.cari"),
    "aria-label": t("ruangan.cari"), autocomplete: "off",
    oninput: (e) => { kata = e.target.value.trim().toLowerCase(); gambar(); } });

  const halaman = h("div", {},
    h("div", { class: "r-alat" },
      h("div", { class: "cari" }, ikon("cari"), cari),
      h("div", { class: "pil-baris", role: "group", "aria-label": t("ruangan.filter") }, ...pil)),
    jumlah, wadah);

  // Perbarui status tiap menit (dicek tiap 15 detik); berhenti sendiri kalau halaman sudah ditinggalkan.
  const tik = () => {
    if (!halaman.isConnected) {
      clearInterval(pewaktu);
      document.removeEventListener("visibilitychange", tik);
      return;
    }
    segarkan();
  };
  const pewaktu = setInterval(tik, 15000);
  document.addEventListener("visibilitychange", tik);

  muat();
  return halaman;
}

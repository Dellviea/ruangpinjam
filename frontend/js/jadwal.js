import { api, ambilSesi } from "./api.js";
import { h, ikon } from "./dom.js";
import { jenisRuangan, t } from "./i18n.js";
import { tampilanGagal, tampilanKosong } from "./kosong.js";
import { JENIS_RUANGAN } from "./konstanta.js";
import { bukaPengajuan } from "./pengajuan.js";
import { toast } from "./toast.js";
import { angkaHari, geserHari, hariBulan, menit, pad, tanggalLokal } from "./waktu.js";

// Kolom tabel: satu kolom per jam, dari 07:00 sampai 21:00.
const JAM_AWAL = 7;
const JAM_AKHIR = 21;
const JUMLAH_JAM = JAM_AKHIR - JAM_AWAL;
const LEBAR_JAM = 84; // px

// Status titik di samping nama ruangan. sekarang = menit sejak 00:00 kalau tanggalnya hari ini, selain itu null.
//  - hari ini: perbaikan / tutup (di luar jam buka) / dipakai (ada peminjaman disetujui yang berlangsung) / kosong
//  - tanggal lain: perbaikan, atau dipakai = ada kegiatan di hari itu, kosong = tidak ada
function statusRuang(r, aktifRuang, sekarang) {
  if (r.status !== "tersedia") return "perbaikan";
  if (sekarang == null) return aktifRuang.length ? "dipakai" : "kosong";
  if (sekarang < menit(r.jam_buka) || sekarang >= menit(r.jam_tutup)) return "tutup";
  const dipakai = aktifRuang.some((p) => p.status === "disetujui"
    && menit(p.jam_mulai) <= sekarang && sekarang < menit(p.jam_selesai));
  return dipakai ? "dipakai" : "kosong";
}

function labelStatus(status, hariIni) {
  if (!hariIni && status === "kosong") return t("jadwal.titik.kosong");
  if (!hariIni && status === "dipakai") return t("jadwal.titik.ada");
  return t("ruangan.status." + status);
}

// Angka naik dari 0 ke nilai akhir (animasi 0,7 detik). Tanpa animasi kalau diminta, nilainya 0, atau "kurangi gerakan" aktif.
function naikkan(el, ke, animasi) {
  cancelAnimationFrame(el._raf);
  if (!animasi || ke === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = String(ke);
    return;
  }
  const mulai = performance.now();
  const langkah = (waktu) => {
    const p = Math.min(1, (waktu - mulai) / 700);
    el.textContent = String(Math.round(ke * (1 - Math.pow(1 - p, 3)))); // melambat di akhir
    if (p < 1) el._raf = requestAnimationFrame(langkah);
  };
  el._raf = requestAnimationFrame(langkah);
}

export function halamanJadwal(query = new URLSearchParams()) {
  const pengguna = ambilSesi();
  let ruangan = [];
  let peminjaman = [];
  let tanggal = tanggalLokal();
  let jenis = JENIS_RUANGAN.includes(query.get("jenis")) ? query.get("jenis") : ""; // dari tombol "Lihat jadwal"
  let ref = null; // elemen yang diperbarui tiap menit: garis dan titik "sekarang", header jam, titik ruangan

  const hariKosong = h("p", { class: "j-hari-kosong" });
  let urutanBlok = 0; // untuk muncul berurutan

  // Tiga kotak ringkasan: angka besar + keterangan kecil. Dibuat sekali; angkanya naik dari 0 saat halaman dibuka.
  const kotak = (penanda) => {
    const angka = h("b", { class: "angka", "aria-hidden": "true" }, "0");
    const ket = h("span", {});
    return { angka, ket, el: h("div", { class: "j-kotak", role: "group" }, angka, h("span", { class: "j-ket" }, penanda, ket)) };
  };
  const kKegiatan = kotak(null);
  const kMenunggu = kotak(h("i", { class: "sw sw-arsir" }));
  const kKosong = kotak(h("span", { class: "titik-status ts-kosong" }));
  const kMilik = kotak(h("i", { class: "sw sw-milik" }));
  const ringkasan = h("div", { class: "j-ringkasan", role: "group", "aria-label": t("jadwal.ringkasan"), hidden: true },
    kKegiatan.el, kMenunggu.el, kKosong.el, kMilik.el);
  const sapaan = h("p", { class: "j-sapaan" });
  const isiKotak = (k, n, kunciKet, kunciAria, animasi) => {
    k.ket.textContent = t(kunciKet, { n });
    k.el.setAttribute("aria-label", t(kunciAria, { n })); // pembaca layar membaca nilai akhir, bukan angka yang sedang naik
    naikkan(k.angka, n, animasi);
  };
  const labelHari = h("h1", { class: "j-judul" }); // "Selasa, November 2026"
  const angkaTgl = h("span", { class: "j-tgl-angka", "aria-hidden": "true" });
  // angka tanggal besar ala kalender meja; input tanggal asli transparan di atasnya membuka pemilih tanggal
  const bukaPemilih = (e) => { try { e.target.showPicker(); } catch { /* browser lama */ } };
  const inputTanggal = h("input", { type: "date", class: "j-tgl-input", "aria-label": t("jadwal.pilihTanggal"), title: t("jadwal.pilihTanggal"),
    onclick: bukaPemilih, onchange: (e) => e.target.value && pindahTanggal(e.target.value) });
  const wadah = h("div", { class: "j-gulir", role: "region", tabindex: "0", "aria-label": t("jadwal.tabel") },
    h("div", { class: "kosong" }, t("jadwal.memuat")));

  // ----- bagian tabel -----
  function blok(p) {
    const milik = pengguna && p.id_pengguna === pengguna.id;
    const total = JUMLAH_JAM * 60;
    const kiri = Math.max(0, (menit(p.jam_mulai) - JAM_AWAL * 60) / total * 100);
    const lebar = Math.min(100 - kiri, (menit(p.jam_selesai) - menit(p.jam_mulai)) / total * 100);
    return h("div", {
      class: `j-blok ${milik ? "milik" : "lain"} s-${p.status}`, // strip kiri = pemilik (pink / biru); menunggu = arsiran
      style: `left:calc(${kiri}% + 2px);width:calc(${lebar}% - 4px);--i:${Math.min(urutanBlok++, 24)}`,
      title: `${p.jam_mulai}-${p.jam_selesai} · ${p.keperluan} · ${p.nama_pengguna} · ${t("status." + p.status)}`,
    },
      h("div", { class: "j-perlu" }, p.keperluan),
      h("div", { class: "j-detail" }, `${p.jam_mulai}-${p.jam_selesai} · ${milik ? t("jadwal.milikSaya") : p.nama_pengguna}`),
      h("span", { class: "sr-only" }, t("status." + p.status))); // status untuk pembaca layar; visualnya: menunggu = arsiran
  }

  function baris(r, daftar) {
    const tersedia = r.status === "tersedia";
    const buka = menit(r.jam_buka);
    const tutup = menit(r.jam_tutup);
    const slot = [];
    for (let j = JAM_AWAL; j < JAM_AKHIR; j++) {
      const bisa = tersedia && j * 60 >= buka && (j + 1) * 60 <= tutup;
      slot.push(h("div", { class: "j-slot" + (bisa ? "" : " j-tutup"),
        "data-jam": bisa ? j : null, "data-label": bisa ? `+ ${pad(j)}:00` : null })); // label muncul saat disorot
    }
    const track = h("div", { class: "j-track",
      onclick: (e) => {
        const s = e.target.closest(".j-slot[data-jam]");
        if (s) ajukan(r.id, Number(s.dataset.jam));
      } }, ...slot, ...daftar.map(blok),
      !tersedia && h("div", { class: "j-rusak-label", "aria-hidden": "true" }, h("span", {}, t("jadwal.perbaikan"))));

    const titik = h("span", { class: "titik-status", role: "img" });
    ref.baris.push({ r, aktifRuang: daftar, titik });

    return h("div", { class: "j-baris" + (tersedia ? "" : " j-rusak") },
      h("div", { class: "j-ruang", title: `${r.nama} · ${r.gedung} · ${t("jadwal.kapasitas", { n: r.kapasitas })}` },
        h("div", { class: "j-kode" }, r.kode),
        h("div", { class: "j-nama" }, titik, h("span", {}, r.nama)),
        h("div", { class: "j-sub" }, t("jadwal.orang", { n: r.kapasitas }))),
      track);
  }

  // Dipanggil tiap menit (dan setelah menggambar): garis "sekarang", jam yang berjalan, titik ruangan, ringkasan.
  function segarkanWaktu(animasiAngka = false) {
    const d = new Date();
    const hariIni = tanggal === tanggalLokal(d);
    const m = d.getHours() * 60 + d.getMinutes();
    // sapaan menurut jam: pagi 04-10, siang 11-14, sore 15-17, selain itu malam
    const jam = d.getHours();
    sapaan.textContent = t("sapaan." + (jam >= 4 && jam < 11 ? "pagi" : jam < 15 && jam >= 11 ? "siang" : jam >= 15 && jam < 18 ? "sore" : "malam"),
      { nama: pengguna ? pengguna.nama : "" });
    ringkasan.hidden = !ref;
    if (!ref) return;

    const dalam = hariIni && m >= JAM_AWAL * 60 && m < JAM_AKHIR * 60;
    ref.garis.hidden = ref.titik.hidden = !dalam;
    if (dalam) {
      const x = (m - JAM_AWAL * 60) / 60 * LEBAR_JAM;
      ref.garis.style.left = `calc(var(--kolom-ruang) + ${x}px)`;
      ref.titik.style.left = `${x}px`;
      ref.titik.title = t("jadwal.sekarang", { jam: `${pad(d.getHours())}:${pad(d.getMinutes())}` });
    }
    ref.jam.forEach((el, i) => el.classList.toggle("sekarang", dalam && JAM_AWAL + i === Math.floor(m / 60)));

    for (const b of ref.baris) {
      b.status = statusRuang(b.r, b.aktifRuang, hariIni ? m : null);
      b.titik.className = "titik-status ts-" + b.status;
      const label = labelStatus(b.status, hariIni);
      b.titik.setAttribute("aria-label", label);
      b.titik.title = label;
    }

    const sfx = hariIni ? "Hari" : "";
    isiKotak(kKegiatan, ref.aktif.length, "jadwal.ket.kegiatan" + sfx, "jadwal.ringkasan.kegiatan" + sfx, animasiAngka);
    isiKotak(kMenunggu, ref.aktif.filter((p) => p.status === "menunggu").length, "jadwal.ket.menunggu",
      "jadwal.ringkasan.menunggu", animasiAngka);
    kKosong.el.hidden = !hariIni; // "kosong sekarang" hanya untuk hari ini
    isiKotak(kKosong, ref.baris.filter((b) => b.status === "kosong").length, "jadwal.ket.kosong",
      "jadwal.ringkasan.kosong", animasiAngka);
    isiKotak(kMilik, ref.aktif.filter((p) => pengguna && p.id_pengguna === pengguna.id).length, "jadwal.ket.milikmu",
      "jadwal.ringkasan.milikmu", animasiAngka);
  }

  function gambar(gulir) {
    const kiriLama = wadah.scrollLeft;
    const atasLama = wadah.scrollTop;
    labelHari.replaceChildren(h("span", { class: "sr-only" }, t("nav.jadwal") + ": "), hariBulan(tanggal));
    angkaTgl.textContent = angkaHari(tanggal);
    inputTanggal.value = tanggal;

    const aktifHari = peminjaman.filter((p) => p.tanggal === tanggal && ["menunggu", "disetujui"].includes(p.status));
    hariKosong.textContent = aktifHari.length ? "" : t("jadwal.hariKosong");
    const kelompok = JENIS_RUANGAN.filter((j) => !jenis || j === jenis)
      .map((j) => ({ jenis: j, daftar: ruangan.filter((r) => r.jenis === j) }))
      .filter((k) => k.daftar.length);

    if (!kelompok.length) {
      ref = null;
      segarkanWaktu();
      wadah.replaceChildren(tampilanKosong({ gambar: "ruangan", judul: t("jadwal.kosongJudul"), teks: t("jadwal.kosong"),
        tombol: { teks: t("jadwal.tampilSemua"), aksi: () => { jenis = ""; filter.value = ""; gambar(false); } } }));
      return;
    }

    urutanBlok = 0;
    const idTampil = new Set(kelompok.flatMap((k) => k.daftar.map((r) => r.id)));
    ref = {
      baris: [],
      aktif: aktifHari.filter((p) => idTampil.has(p.id_ruangan)), // ringkasan hanya untuk ruangan yang tampil
      garis: h("div", { class: "j-sekarang", "aria-hidden": "true", hidden: true }),
      titik: h("div", { class: "j-titik-sekarang", "aria-hidden": "true", hidden: true }), // div: span di header jam ikut gaya sel jam
      jam: [],
    };
    const jam = Array.from({ length: JUMLAH_JAM }, (_, i) => {
      const el = h("span", {}, `${pad(JAM_AWAL + i)}:00`);
      ref.jam.push(el);
      return el;
    });

    wadah.replaceChildren(h("div", { class: "j-tabel" + (gulir ? " muncul" : ""), style: `--jam:${JUMLAH_JAM};--lebar-jam:${LEBAR_JAM}px` },
      h("div", { class: "j-kepala" }, h("div", { class: "j-ruang-label" }, t("jadwal.ruangan")),
        h("div", { class: "j-jam-label" }, ...jam, ref.titik)),
      h("div", { class: "j-isi" },
        ...kelompok.flatMap((k) => [
          h("div", { class: "j-kelompok" }, h("div", { class: "j-kel-isi" },
            h("span", { class: "j-kel-nama" }, jenisRuangan(k.jenis)),
            h("span", { class: "j-kel-jml" }, t("jadwal.jumlahRuangan", { n: k.daftar.length })))),
          ...k.daftar.map((r) => baris(r, aktifHari.filter((p) => p.id_ruangan === r.id))),
        ]),
        ref.garis)));
    segarkanWaktu(gulir);

    if (!gulir) {
      wadah.scrollLeft = kiriLama;
      wadah.scrollTop = atasLama;
    } else {
      wadah.scrollTop = 0;
      wadah.scrollLeft = tanggal === tanggalLokal() ? Math.max(0, new Date().getHours() - JAM_AWAL - 1) * LEBAR_JAM : 0;
    }
  }

  // ----- data dan aksi -----
  async function muat(gulir = false) {
    try {
      [ruangan, peminjaman] = await Promise.all([api("/ruangan"), api("/peminjaman")]);
      gambar(gulir);
    } catch (err) {
      ref = null;
      segarkanWaktu();
      toast(err.message, "error");
      wadah.replaceChildren(tampilanGagal(err.message, () => muat(gulir)));
    }
  }

  function pindahTanggal(tgl) {
    tanggal = tgl;
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
        toast(t("jadwal.terkirim"));
        muat();
      },
    });
  }

  // ----- tampilan -----
  const filter = h("select", { class: "kontrol", "aria-label": t("jadwal.jenis"),
    onchange: (e) => { jenis = e.target.value; gambar(false); } },
    h("option", { value: "" }, t("jadwal.semuaJenis")),
    ...JENIS_RUANGAN.map((j) => h("option", { value: j }, jenisRuangan(j))));
  filter.value = jenis;

  // Legenda: kotak warna kecil (bukan kotak berbingkai) untuk tiap penanda di tabel.
  const LEGENDA = [["sw-milik", "jadwal.milikSaya"], ["sw-lain", "jadwal.lain"], ["sw-arsir", "jadwal.legenda.menunggu"],
    ["sw-tutup", "jadwal.tutup"]];

  const halaman = h("div", { class: "jadwal" },
    h("div", { class: "j-kepala-halaman" },
      h("label", { class: "j-tgl" }, angkaTgl, inputTanggal),
      h("div", { class: "j-kepala-teks" },
        labelHari,
        sapaan,
        h("div", { class: "j-hari-nav", role: "group", "aria-label": t("jadwal.tanggal") },
          h("button", { class: "tombol tombol-kecil tombol-sekunder", type: "button",
            onclick: () => pindahTanggal(geserHari(tanggal, -1)) }, t("jadwal.kemarin")),
          h("button", { class: "tombol tombol-kecil tombol-sekunder", type: "button",
            onclick: () => pindahTanggal(tanggalLokal()) }, t("jadwal.hariIni")),
          h("button", { class: "tombol tombol-kecil tombol-sekunder", type: "button",
            onclick: () => pindahTanggal(geserHari(tanggal, 1)) }, t("jadwal.besok")))),
      h("div", { class: "grup j-kanan" },
        filter,
        h("button", { class: "tombol tombol-kecil", type: "button", onclick: () => ajukan(null, null) },
          ikon("tambah"), t("jadwal.ajukan")))),
    ringkasan,
    h("div", { class: "j-legenda" },
      ...LEGENDA.map(([kelas, kunci]) => h("span", {}, h("i", { class: "sw " + kelas }), t(kunci))),
      h("span", {}, t("jadwal.petunjuk"))),
    hariKosong, wadah);

  // Perbarui posisi "sekarang" tiap menit (dicek tiap 15 detik); berhenti sendiri kalau halaman sudah ditinggalkan.
  const tik = () => {
    if (!halaman.isConnected) {
      clearInterval(pewaktu);
      document.removeEventListener("visibilitychange", tik);
      return;
    }
    segarkanWaktu();
  };
  const pewaktu = setInterval(tik, 15000);
  document.addEventListener("visibilitychange", tik); // langsung segar lagi saat tab dibuka kembali

  segarkanWaktu(); // sapaan langsung tampil, sebelum data selesai dimuat
  muat(true);
  return halaman;
}

import { api, ambilSesi } from "./api.js";
import { h } from "./dom.js";
import { t } from "./i18n.js";
import { JENIS_KEGIATAN, JENIS_RUANGAN } from "./konstanta.js";

const kolom = (id, labelKunci, kontrol, hint) =>
  h("div", { class: "medan" }, h("label", { for: id }, t(labelKunci)), kontrol, hint);

// Pop-up pengajuan. awal = { id_ruangan, tanggal, jam_mulai, jam_selesai } (boleh kosong), onSukses(peminjaman).
export function bukaPengajuan({ ruangan, awal = {}, onSukses }) {
  const pengguna = ambilSesi();

  const pilihRuangan = h("select", { id: "p-ruangan", name: "id_ruangan" },
    h("option", { value: "" }, t("pengajuan.pilihRuangan")),
    ...JENIS_RUANGAN.map((jenis) => {
      const daftar = ruangan.filter((r) => r.jenis === jenis);
      if (!daftar.length) return null;
      return h("optgroup", { label: jenis }, ...daftar.map((r) => {
        const rusak = r.status !== "tersedia";
        return h("option", { value: r.id, disabled: rusak },
          `${r.nama} (${t("jadwal.kapasitas", { n: r.kapasitas })})` + (rusak ? t("pengajuan.perbaikan") : ""));
      }));
    }));
  pilihRuangan.value = awal.id_ruangan ?? "";
  const hintKapasitas = h("p", { class: "hint", id: "p-kapasitas" });

  const pilihKegiatan = h("select", { id: "p-kegiatan", name: "jenis_kegiatan" },
    h("option", { value: "" }, t("pengajuan.pilihKegiatan")),
    ...JENIS_KEGIATAN.map((j) => h("option", { value: j }, j)));

  const cek = h("div", { class: "cek cek-netral", role: "status", "aria-live": "polite" });
  const galat = h("p", { class: "pesan-error", role: "alert" });
  const kirim = h("button", { class: "tombol tombol-auto", type: "submit" }, t("pengajuan.kirim"));
  const batal = h("button", { class: "tombol tombol-auto tombol-sekunder", type: "button" }, t("pengajuan.batal"));

  const form = h("form", { novalidate: true },
    h("h2", { id: "dlg-judul" }, t("pengajuan.judul")),
    kolom("p-ruangan", "pengajuan.ruangan", pilihRuangan, hintKapasitas),
    kolom("p-kegiatan", "pengajuan.jenisKegiatan", pilihKegiatan),
    kolom("p-tanggal", "pengajuan.tanggal",
      h("input", { id: "p-tanggal", name: "tanggal", type: "date", value: awal.tanggal ?? "" })),
    h("div", { class: "baris-2" },
      kolom("p-mulai", "pengajuan.mulai",
        h("input", { id: "p-mulai", name: "jam_mulai", type: "time", value: awal.jam_mulai ?? "" })),
      kolom("p-selesai", "pengajuan.selesai",
        h("input", { id: "p-selesai", name: "jam_selesai", type: "time", value: awal.jam_selesai ?? "" }))),
    kolom("p-keperluan", "pengajuan.keperluan",
      h("textarea", { id: "p-keperluan", name: "keperluan", rows: 2, maxlength: 200 })),
    kolom("p-peserta", "pengajuan.peserta",
      h("input", { id: "p-peserta", name: "jumlah_peserta", type: "number", min: 1, inputmode: "numeric" })),
    cek, galat,
    h("div", { class: "aksi" }, batal, kirim));

  const dialog = h("dialog", { class: "dialog", "aria-labelledby": "dlg-judul" }, form);

  // ----- cek jadwal -----
  function nilai() {
    const f = new FormData(form);
    const angka = (k) => (f.get(k) === "" ? null : Number(f.get(k)));
    return {
      id_pengguna: pengguna.id,
      id_ruangan: angka("id_ruangan"),
      tanggal: f.get("tanggal"),
      jam_mulai: f.get("jam_mulai"),
      jam_selesai: f.get("jam_selesai"),
      jumlah_peserta: angka("jumlah_peserta"),
      jenis_kegiatan: f.get("jenis_kegiatan"),
      keperluan: f.get("keperluan").trim(),
    };
  }

  function tampilCek(jenis, label, teks) {
    cek.className = "cek cek-" + jenis;
    cek.replaceChildren(...(label ? [h("strong", {}, label), " "] : []), teks);
  }

  let aman = null; // null = belum tahu
  let mengirim = false;
  let pewaktu, urutan = 0, terakhir = null;
  const aturTombol = () => (kirim.disabled = mengirim || aman === false);

  function cekJadwal() {
    const d = nilai();
    const r = ruangan.find((x) => x.id === d.id_ruangan);
    hintKapasitas.textContent = r ? t("pengajuan.kapasitas", { n: r.kapasitas }) : "";

    // hanya isian yang berpengaruh ke jadwal yang memicu pengecekan
    const kunci = JSON.stringify([d.id_ruangan, d.tanggal, d.jam_mulai, d.jam_selesai, d.jumlah_peserta]);
    if (kunci === terakhir) return;
    terakhir = kunci;

    clearTimeout(pewaktu);
    const saya = ++urutan;
    if (!d.id_ruangan || !d.tanggal || !d.jam_mulai || !d.jam_selesai) {
      aman = null;
      tampilCek("netral", "", t("pengajuan.cekAwal"));
      aturTombol();
      return;
    }
    tampilCek("netral", "", t("pengajuan.cekProses"));
    pewaktu = setTimeout(async () => {
      try {
        const hasil = await api("/peminjaman/cek", { method: "POST", body: d });
        if (saya !== urutan) return; // sudah ada pengecekan yang lebih baru
        aman = hasil.aman;
        if (aman) tampilCek("aman", t("pengajuan.labelAman"), t("pengajuan.cekAman"));
        else tampilCek("bentrok", t("pengajuan.labelTidak"), hasil.pesan);
      } catch (err) {
        if (saya !== urutan) return;
        aman = null;
        tampilCek("netral", "", err.message);
      }
      aturTombol();
    }, 300);
  }

  // ----- kirim -----
  form.addEventListener("input", cekJadwal);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    galat.textContent = "";
    const d = nilai();
    if (!d.id_ruangan || !d.tanggal || !d.jam_mulai || !d.jam_selesai || !d.jenis_kegiatan
        || !d.keperluan || !d.jumlah_peserta) {
      galat.textContent = t("pengajuan.lengkapi");
      return;
    }
    mengirim = true;
    aturTombol();
    kirim.textContent = t("pengajuan.proses");
    try {
      const hasil = await api("/peminjaman", { method: "POST", body: d });
      dialog.close();
      onSukses?.(hasil);
    } catch (err) {
      galat.textContent = err.message;
      mengirim = false;
      aturTombol();
      kirim.textContent = t("pengajuan.kirim");
    }
  });

  batal.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); }); // klik di luar kotak
  dialog.addEventListener("close", () => {
    clearTimeout(pewaktu);
    urutan++;
    dialog.remove();
  });

  document.body.append(dialog);
  dialog.showModal();
  cekJadwal();
}

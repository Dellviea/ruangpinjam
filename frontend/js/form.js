import { h } from "./dom.js";
import { t } from "./i18n.js";

// Pop-up formulir umum, dibuat dari daftar bidang.
// bidang: { nama, label, jenis (text|email|number|time|date|password|select|area), wajib, hint, pilihan, kosong,
//           setengah (dua bidang berurutan bersebelahan), dari (nilai -> teks awal), ke (teks -> nilai) }
// simpan(nilai) boleh melempar Error; pesannya tampil di formulir.
export function bukaForm({ judul, ringkasan, bidang, nilai = {}, labelSimpan, bahaya = false, simpan, onSukses }) {
  const kontrol = {};

  function buat(b) {
    const id = "f-" + b.nama;
    const awal = b.dari ? b.dari(nilai[b.nama]) : String(nilai[b.nama] ?? "");
    let el;
    if (b.jenis === "select") {
      el = h("select", { id, name: b.nama },
        b.kosong != null && h("option", { value: "" }, b.kosong),
        ...b.pilihan.map((p) => h("option", { value: p.nilai, disabled: p.nonaktif }, p.label)));
    } else if (b.jenis === "area") {
      el = h("textarea", { id, name: b.nama, rows: 3, maxlength: 300 });
    } else {
      el = h("input", { id, name: b.nama, type: b.jenis ?? "text", min: b.min,
        autocomplete: b.jenis === "password" ? "new-password" : "off" });
    }
    el.value = awal;
    if (b.wajib) el.setAttribute("aria-required", "true");
    kontrol[b.nama] = el;
    return h("div", { class: "medan" }, h("label", { for: id }, b.label), el,
      b.hint && h("p", { class: "hint" }, b.hint));
  }

  // dua bidang "setengah" berurutan ditaruh sebelahan
  const isi = [];
  for (let i = 0; i < bidang.length; i++) {
    if (bidang[i].setengah && bidang[i + 1]?.setengah) {
      isi.push(h("div", { class: "baris-2" }, buat(bidang[i]), buat(bidang[i + 1])));
      i++;
    } else {
      isi.push(buat(bidang[i]));
    }
  }

  const galat = h("p", { class: "pesan-error", role: "alert" });
  const kirim = h("button", { class: "tombol tombol-auto" + (bahaya ? " tombol-merah" : ""), type: "submit" }, labelSimpan);
  const batal = h("button", { class: "tombol tombol-auto tombol-sekunder", type: "button" }, t("pengajuan.batal"));
  const form = h("form", { novalidate: true },
    h("h2", { id: "dlg-form" }, judul),
    ringkasan && h("p", { class: "dialog-teks" }, ringkasan),
    ...isi, galat,
    h("div", { class: "aksi" }, batal, kirim));
  const dialog = h("dialog", { class: "dialog", "aria-labelledby": "dlg-form" }, form);

  function ambil() {
    const hasil = {};
    for (const b of bidang) {
      const mentah = kontrol[b.nama].value;
      const teks = b.jenis === "password" ? mentah : mentah.trim();
      if (b.wajib && teks === "") throw new Error(t("form.wajib", { label: b.label }));
      hasil[b.nama] = b.ke ? b.ke(teks) : b.jenis === "number" ? (teks === "" ? null : Number(teks)) : teks;
    }
    return hasil;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    galat.textContent = "";
    kirim.disabled = true;
    kirim.textContent = t("form.proses");
    try {
      const hasil = await simpan(ambil());
      dialog.close();
      onSukses?.(hasil);
    } catch (err) {
      galat.textContent = err.message;
      kirim.disabled = false;
      kirim.textContent = labelSimpan;
    }
  });
  batal.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => dialog.remove());

  document.body.append(dialog);
  dialog.showModal();
}

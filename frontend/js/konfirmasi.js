import { h } from "./dom.js";
import { t } from "./i18n.js";

// Dialog konfirmasi: konfirmasi({ judul, teks, ya, bahaya }) -> Promise<boolean>
export function konfirmasi({ judul, teks, ya, bahaya = false }) {
  return new Promise((selesai) => {
    const tidak = h("button", { class: "tombol tombol-auto tombol-sekunder", type: "button" }, t("konfirmasi.tidak"));
    const lanjut = h("button", { class: "tombol tombol-auto" + (bahaya ? " tombol-merah" : ""), type: "button" }, ya);
    const dialog = h("dialog", { class: "dialog dialog-kecil", "aria-labelledby": "dlg-konfirmasi" },
      h("div", { class: "dialog-isi" },
        h("h2", { id: "dlg-konfirmasi" }, judul),
        h("p", { class: "dialog-teks" }, teks),
        h("div", { class: "aksi" }, tidak, lanjut)));

    tidak.addEventListener("click", () => dialog.close("tidak"));
    lanjut.addEventListener("click", () => dialog.close("ya"));
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close("tidak"); });
    dialog.addEventListener("close", () => {
      selesai(dialog.returnValue === "ya");
      dialog.remove();
    });

    document.body.append(dialog);
    dialog.showModal();
    tidak.focus(); // fokus awal di pilihan aman
  });
}

import { h, ikon } from "./dom.js";
import { t } from "./i18n.js";

const MAKS = 3; // paling banyak yang tampil bersamaan

let wadah = null;
function ambilWadah() {
  if (!wadah) {
    wadah = h("div", { class: "toast-wadah", role: "region", "aria-live": "polite" });
    document.body.append(wadah);
  }
  wadah.setAttribute("aria-label", t("toast.wilayah"));
  return wadah;
}

// Pemberitahuan kecil di pojok kanan bawah yang hilang sendiri. jenis: "ok" atau "error".
export function toast(teks, jenis = "ok") {
  let pewaktu;
  const tutup = () => {
    clearTimeout(pewaktu);
    el.classList.add("keluar");
    setTimeout(() => el.remove(), 200);
  };
  const mulai = (ms) => { pewaktu = setTimeout(tutup, ms); };

  const el = h("div", { class: "toast toast-" + jenis, role: jenis === "error" ? "alert" : "status" },
    ikon(jenis === "error" ? "peringatan" : "persetujuan"),
    h("span", { class: "toast-teks" }, teks),
    h("button", { class: "toast-tutup", type: "button", "aria-label": t("toast.tutup"), onclick: tutup }, ikon("tutup", 14)));

  el.addEventListener("mouseenter", () => clearTimeout(pewaktu)); // ditahan saat disorot
  el.addEventListener("mouseleave", () => mulai(2000));

  const w = ambilWadah();
  w.append(el);
  while (w.children.length > MAKS) w.firstElementChild.remove();
  mulai(jenis === "error" ? 6000 : 4000);
}

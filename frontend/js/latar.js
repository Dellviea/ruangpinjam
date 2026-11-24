import { h } from "./dom.js";

// Latar halaman Masuk, Register, dan Lupa password: pola garis denah dan penggaris yang sangat samar.
// Hanya hiasan (aria-hidden, tanpa teks, tidak bisa diklik); polanya dibuat di css (.latar-denah), tanpa animasi.
export function latarAnimasi() {
  return h("div", { class: "latar-denah", "aria-hidden": "true" });
}

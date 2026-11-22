import { h } from "./dom.js";
import { ambilBahasa, BAHASA, setBahasa, t } from "./i18n.js";
import { ambilMode, MODE, setMode } from "./tema.js";

// Pilihan bahasa (ID | EN) dan mode tampilan (Terang | Gelap | Sistem), tersimpan di localStorage.
// kecil = versi ringkas tanpa label yang terlihat (pojok halaman login); sidebar memakai versi berlabel.
// gambarUlang dipanggil setelah bahasa berganti, supaya seluruh halaman digambar ulang.
export function kontrolTampilan({ kecil = false, gambarUlang }) {
  const tombolBahasa = BAHASA.map((b) => h("button", { class: "seg", type: "button", lang: b, "data-bahasa": b,
    "aria-pressed": String(ambilBahasa() === b),
    onclick: () => {
      if (b === ambilBahasa()) return;
      setBahasa(b);
      gambarUlang();
      document.querySelector(`[data-bahasa="${b}"]`)?.focus();
    } }, b.toUpperCase()));

  const tombolMode = MODE.map((m) => h("button", { class: "seg", type: "button", "data-mode": m,
    "aria-pressed": String(ambilMode() === m),
    onclick: () => {
      setMode(m);
      tombolMode.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.mode === m)));
    } }, t("mode." + m)));

  const grup = (idLabel, teksLabel, tombol) => kecil
    ? h("div", { class: "seg-grup", role: "group", "aria-label": teksLabel }, ...tombol)
    : h("div", {},
      h("span", { class: "tampilan-label", id: idLabel }, teksLabel),
      h("div", { class: "seg-grup", role: "group", "aria-labelledby": idLabel }, ...tombol));

  return h("div", { class: kecil ? "tampilan-kecil" : "tampilan" },
    grup("lbl-bahasa", t("tampilan.bahasa"), tombolBahasa),
    grup("lbl-mode", t("tampilan.mode"), tombolMode));
}

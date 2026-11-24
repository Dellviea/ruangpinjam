import { h, ikon } from "./dom.js";
import { ambilBahasa, BAHASA, setBahasa, t } from "./i18n.js";
import { ambilMode, MODE, setMode } from "./tema.js";

// Dua tombol kecil dalam satu baris: bahasa (ID | EN) dan mode tampilan (ikon matahari, bulan, monitor untuk
// Terang | Gelap | Sistem). Dipakai di sidebar dan di pojok halaman login. Pilihan tersimpan di localStorage.
// gambarUlang dipanggil setelah bahasa berganti, supaya seluruh halaman digambar ulang.
// posisi terakhir kapsul per kelompok (indeks tombol aktif)
const POSISI = {};

export function kontrolTampilan({ gambarUlang }) {
  const tombolBahasa = BAHASA.map((b) => h("button", { class: "seg", type: "button", lang: b, "data-bahasa": b,
    "aria-pressed": String(ambilBahasa() === b),
    onclick: () => {
      if (b === ambilBahasa()) return;
      setBahasa(b);
      gambarUlang();
      document.querySelector(`[data-bahasa="${b}"]`)?.focus();
    } }, b.toUpperCase()));

  // tanpa tulisan: namanya ada di aria-label dan tooltip (nama ikon = nama mode: terang, gelap, sistem)
  const tombolMode = MODE.map((m) => h("button", { class: "seg seg-ikon", type: "button", "data-mode": m,
    "aria-pressed": String(ambilMode() === m), "aria-label": t("mode." + m), title: t("mode." + m),
    onclick: () => setMode(m) }, ikon(m, 15)));

  // tanda aktif mengikuti pilihan yang tersimpan (termasuk saat tema dipasang dari tempat lain)
  const segarkan = () => {
    if (!tombolMode[0].isConnected) return window.removeEventListener("tema-berubah", segarkan);
    tombolMode.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.mode === ambilMode())));
  };
  window.addEventListener("tema-berubah", segarkan);

  // Kapsul putih di bawah tombol aktif; meluncur ke pilihan baru (transisi di css). Tombol tetap yang bisa difokus.
  // Bahasa menggambar ulang seluruh halaman, jadi posisi terakhir diingat supaya kapsul tetap meluncur dari pilihan lama.
  const grup = (nama, label, tombol) => {
    const geser = h("span", { class: "seg-geser tanpa-gerak", "aria-hidden": "true" });
    const el = h("div", { class: "seg-grup", role: "group", "aria-label": label }, geser, ...tombol);
    const aktif = () => tombol.findIndex((b) => b.getAttribute("aria-pressed") === "true");
    const taruh = (i) => {
      const b = tombol[i];
      if (!b || !b.offsetWidth) return;
      geser.style.width = b.offsetWidth + "px";
      geser.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    el.perbarui = () => { const i = aktif(); taruh(i); POSISI[nama] = i; };
    // sejak tampil (dan tiap ukuran berubah, mis. font selesai dimuat) letakkan kapsul tanpa animasi
    new ResizeObserver(() => {
      if (!el.isConnected) return;
      const dulu = POSISI[nama];
      taruh(dulu != null && dulu !== aktif() ? dulu : aktif());
      requestAnimationFrame(() => {
        geser.classList.remove("tanpa-gerak");
        el.perbarui(); // meluncur dari posisi lama ke pilihan baru
      });
    }).observe(el);
    return el;
  };
  const gBahasa = grup("bahasa", t("tampilan.bahasa"), tombolBahasa);
  const gMode = grup("mode", t("tampilan.mode"), tombolMode);
  // mode berubah dari tempat lain atau lewat klik: kapsul ikut pindah
  const pindahKapsul = () => {
    if (!gMode.isConnected) return window.removeEventListener("tema-berubah", pindahKapsul);
    gMode.perbarui();
  };
  window.addEventListener("tema-berubah", pindahKapsul);
  return h("div", { class: "tampilan-kecil" }, gBahasa, gMode);
}

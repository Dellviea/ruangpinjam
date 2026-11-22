import { h, ikon } from "./dom.js";
import { t } from "./i18n.js";

// Tampilan kosong: ikon + judul + teks + tombol arahan (tautan kalau ada href, selain itu tombol dengan aksi).
export function tampilanKosong({ gambar, judul, teks, tombol }) {
  return h("div", { class: "kosong-rapi" },
    h("span", { class: "kosong-ikon", "aria-hidden": "true" }, ikon(gambar, 28)),
    h("h2", { class: "kosong-judul" }, judul),
    teks && h("p", { class: "kosong-teks" }, teks),
    tombol && (tombol.href
      ? h("a", { class: "tombol tombol-kecil", href: tombol.href }, tombol.teks)
      : h("button", { class: "tombol tombol-kecil", type: "button", onclick: tombol.aksi }, tombol.teks)));
}

// Tampilan saat data gagal dimuat, dengan tombol "Coba lagi".
export const tampilanGagal = (pesan, coba) => tampilanKosong({
  gambar: "peringatan", judul: t("kosong.gagalJudul"), teks: pesan, tombol: { teks: t("kosong.coba"), aksi: coba },
});

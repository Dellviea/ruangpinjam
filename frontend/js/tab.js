import { h } from "./dom.js";

// Deretan tab yang bisa dipakai dengan keyboard (panah kiri/kanan, Home, End).
// pilihan: [{ kunci, teks }]. Jumlah per tab diisi lewat setJumlah.
export function buatTab({ label, idPanel, pilihan, awal, onPilih }) {
  const kunci = pilihan.map((p) => p.kunci);
  const jumlah = {};
  const tombol = {};
  let aktif = awal;

  function pilih(k, fokus = false, panggil = true) {
    aktif = k;
    for (const x of kunci) {
      tombol[x].setAttribute("aria-selected", String(x === aktif));
      tombol[x].tabIndex = x === aktif ? 0 : -1;
    }
    if (fokus) tombol[k].focus();
    if (panggil) onPilih(k);
  }

  function panah(e, k) {
    const i = kunci.indexOf(k);
    const tujuan = { ArrowRight: kunci[(i + 1) % kunci.length], ArrowLeft: kunci[(i + kunci.length - 1) % kunci.length],
      Home: kunci[0], End: kunci[kunci.length - 1] }[e.key];
    if (tujuan) {
      e.preventDefault();
      pilih(tujuan, true);
    }
  }

  const el = h("div", { class: "tab-baris", role: "tablist", "aria-label": label },
    ...pilihan.map((p) => {
      jumlah[p.kunci] = h("span", { class: "tab-jml" });
      tombol[p.kunci] = h("button", { class: "tab", type: "button", role: "tab", id: `tab-${idPanel}-${p.kunci}`,
        "aria-controls": idPanel, onclick: () => pilih(p.kunci), onkeydown: (e) => panah(e, p.kunci) },
      p.teks, jumlah[p.kunci]);
      return tombol[p.kunci];
    }));

  pilih(awal, false, false); // tanda awal saja; pemanggil menggambar sendiri
  return { el, setJumlah: (k, n) => (jumlah[k].textContent = String(n)), aktif: () => aktif };
}

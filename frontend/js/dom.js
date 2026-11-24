// Pembuat elemen kecil: h("p", { class: "x" }, "teks"). Teks selalu lewat textContent, jadi aman dari XSS.
export function h(tag, atribut = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(atribut || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...anak.flat().filter((a) => a != null && a !== false));
  return el;
}

// Ikon garis tipis, warnanya ikut warna teks (currentColor).
const IKON = {
  gedung: '<path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2"/>',
  jadwal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  ruangan: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M15 12v1"/>',
  peminjaman: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
  persetujuan: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  kelola: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  keluar: '<path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9"/>',
  kiri: '<path d="m15 6-6 6 6 6"/>',
  kanan: '<path d="m9 6 6 6-6 6"/>',
  orang: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
  cari: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  terang: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  gelap: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sistem: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  peringatan: '<path d="M12 4 2.5 20h19L12 4zM12 10v4M12 17.5v.01"/>',
  tutup: '<path d="M6 6l12 12M18 6 6 18"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>',
};

// Logo "Denah P": batang tegak, lengkung di atas kembali ke batang, celah pintu di bawah lengkung + daun pintu diagonal pendek.
// Warna ikut currentColor.
export function logoDenah(ukuran = 24) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({
    width: ukuran, height: ukuran, viewBox: "0 0 48 48", fill: "none", stroke: "currentColor",
    "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  })) svg.setAttribute(k, v);
  svg.innerHTML = '<path d="M17 38V10h10a8 8 0 0 1 0 16h-4"/><path d="M23 26l-4.5 5"/>';
  return svg;
}

export function ikon(nama, ukuran = 18) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({
    width: ukuran, height: ukuran, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  })) svg.setAttribute(k, v);
  svg.innerHTML = IKON[nama]; // string tetap di atas, bukan input pengguna
  return svg;
}

import { lokal } from "./i18n.js";

export const pad = (n) => String(n).padStart(2, "0");

// "13:30" -> 810 menit sejak tengah malam
export const menit = (jam) => Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3));

// Tanggal lokal YYYY-MM-DD. toISOString() sengaja dihindari karena memakai UTC.
export const tanggalLokal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function geserHari(tanggal, n) {
  const d = new Date(tanggal + "T00:00:00");
  d.setDate(d.getDate() + n);
  return tanggalLokal(d);
}

export const namaHari = (tanggal) =>
  new Intl.DateTimeFormat(lokal(), { dateStyle: "full" }).format(new Date(tanggal + "T00:00:00"));

// Kepala Jadwal ala kalender meja: angka tanggal besar dan "Selasa, November 2026"
export const angkaHari = (tanggal) => String(new Date(tanggal + "T00:00:00").getDate());
export const hariBulan = (tanggal) => {
  const d = new Date(tanggal + "T00:00:00");
  const hari = new Intl.DateTimeFormat(lokal(), { weekday: "long" }).format(d);
  const bulan = new Intl.DateTimeFormat(lokal(), { month: "long", year: "numeric" }).format(d);
  return `${hari}, ${bulan}`;
};


export const tanggalPendek = (tanggal) =>
  new Intl.DateTimeFormat(lokal(), { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(tanggal + "T00:00:00"));

// "Sel, 24 Nov 2026": format tanggal pendek yang sama di semua tempat
export const tanggalRingkas = (tanggal) => tanggalPendek(tanggal);

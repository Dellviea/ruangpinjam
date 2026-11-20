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
  new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(tanggal + "T00:00:00"));

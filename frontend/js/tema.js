// Mode tampilan: terang, gelap, atau sistem (mengikuti pengaturan laptop). Pilihan disimpan di localStorage.
// html[data-tema] selalu "terang" atau "gelap"; css/warna.css yang menentukan warnanya.
const KUNCI = "pinjamruang_mode";
export const MODE = ["terang", "gelap", "sistem"];

const sistemGelap = matchMedia("(prefers-color-scheme: dark)");

export function ambilMode() {
  try {
    const m = localStorage.getItem(KUNCI);
    return MODE.includes(m) ? m : "sistem";
  } catch {
    return "sistem";
  }
}

function terapkan() {
  const mode = ambilMode();
  const gelap = mode === "gelap" || (mode === "sistem" && sistemGelap.matches);
  document.documentElement.dataset.tema = gelap ? "gelap" : "terang";
}

export function setMode(mode) {
  if (!MODE.includes(mode)) return;
  try { localStorage.setItem(KUNCI, mode); } catch { /* abaikan */ }
  terapkan();
}

sistemGelap.addEventListener("change", terapkan); // pengaturan laptop berubah saat mode Sistem
terapkan();

// Mode tampilan: terang, gelap, atau sistem (mengikuti pengaturan laptop, bawaan). Pilihan disimpan di localStorage.
// html[data-tema] selalu "terang" atau "gelap"; css/warna.css yang menentukan warnanya.
const KUNCI = "pinjamruang_mode";
export const MODE = ["terang", "gelap", "sistem"];

const sistemGelap = matchMedia("(prefers-color-scheme: dark)");

// Pilihan pengguna ("sistem" kalau belum memilih).
export function ambilMode() {
  try {
    const m = localStorage.getItem(KUNCI);
    if (MODE.includes(m)) return m;
  } catch { /* tanpa localStorage: ikut sistem */ }
  return "sistem";
}

function terapkan() {
  const mode = ambilMode();
  const gelap = mode === "gelap" || (mode === "sistem" && sistemGelap.matches);
  document.documentElement.dataset.tema = gelap ? "gelap" : "terang";
  window.dispatchEvent(new Event("tema-berubah")); // supaya tombol penanda mode ikut diperbarui
}

export function setMode(mode) {
  if (!MODE.includes(mode)) return;
  try { localStorage.setItem(KUNCI, mode); } catch { /* abaikan */ }
  terapkan();
}

sistemGelap.addEventListener("change", terapkan); // berpengaruh selama mode "sistem"
terapkan();

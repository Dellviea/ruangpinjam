import { t } from "./i18n.js";

// Semua panggilan ke backend lewat sini. Path relatif, jadi jalan di localhost maupun di VM.
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(t("error.server"));
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || t("error.umum"));
  return data;
}

// Sesi login: data pengguna disimpan di localStorage (belum ada token).
const KUNCI = "pinjamruang_sesi";

export function ambilSesi() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI));
  } catch {
    return null;
  }
}
export const simpanSesi = (pengguna) => localStorage.setItem(KUNCI, JSON.stringify(pengguna));
export const hapusSesi = () => localStorage.removeItem(KUNCI);

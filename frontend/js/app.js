import { api, ambilSesi, hapusSesi } from "./api.js";
import { halamanLogin, halamanLupaPassword, halamanRegister } from "./auth.js";
import { h, ikon } from "./dom.js";
import { halamanJadwal } from "./jadwal.js";
import { halamanKelola } from "./kelola.js";
import { halamanPersetujuan } from "./persetujuan.js";
import { halamanPeminjaman } from "./peminjaman.js";
import { halamanRuangan } from "./ruangan.js";
import { t } from "./i18n.js";
import { kontrolTampilan } from "./tampilan.js";

// publik = boleh dibuka tanpa login, admin = hanya peran admin
const RUTE = {
  login: { publik: true, tampil: halamanLogin },
  register: { publik: true, tampil: halamanRegister },
  "lupa-password": { publik: true, tampil: halamanLupaPassword },
  jadwal: { judul: "nav.jadwal", ikon: "jadwal", tampil: halamanJadwal },
  ruangan: { judul: "nav.ruangan", ikon: "ruangan", tampil: halamanRuangan },
  peminjaman: { judul: "nav.peminjaman", ikon: "peminjaman", tampil: halamanPeminjaman },
  persetujuan: { judul: "nav.persetujuan", ikon: "persetujuan", admin: true, tampil: halamanPersetujuan },
  kelola: { judul: "nav.kelola", ikon: "kelola", admin: true, tampil: halamanKelola },
};
const MENU_UMUM = ["jadwal", "ruangan", "peminjaman"];
const MENU_ADMIN = ["persetujuan", "kelola"];

const root = document.getElementById("app");
let server = null; // { nama } kalau aktif, { mati: true } kalau gagal; dimuat sekali. Teksnya dibuat saat digambar supaya ikut bahasa.

function menu(nama, aktif) {
  const r = RUTE[nama];
  return h("a", { class: "menu" + (nama === aktif ? " aktif" : ""), href: "#/" + nama,
                  "aria-current": nama === aktif ? "page" : null },
    ikon(r.ikon), t(r.judul));
}

// Info server di sidebar: titik status + teks (selalu bertulis, warna hanya pelengkap).
function isiInfoServer(el) {
  if (!server) return el.replaceChildren();
  el.replaceChildren(
    h("span", { class: "titik " + (server.mati ? "titik-mati" : "titik-ok"), "aria-hidden": "true" }),
    server.mati ? t("server.mati") : t("server.aktif", { nama: server.nama }));
}

// Gambar ulang halaman (setelah bahasa berganti) tanpa menghilangkan isian formulir yang sedang diketik.
function gambarUlang() {
  const form = document.querySelector("form");
  const isian = form ? [...new FormData(form).entries()] : [];
  tampil();
  for (const [nama, nilai] of isian) {
    const el = document.querySelector(`form [name="${nama}"]`);
    if (el) el.value = nilai;
  }
}
function layout(aktif, pengguna, query) {
  const keluar = h("button", { class: "menu", type: "button", onclick: () => {
    hapusSesi();
    location.hash = "#/login";
  } }, ikon("keluar"), t("nav.keluar"));

  const sisi = h("aside", { class: "sisi" },
    h("div", { class: "merek" }, ikon("gedung"), t("app.nama")),
    h("nav", { "aria-label": t("nav.utama") },
      ...MENU_UMUM.map((n) => menu(n, aktif)),
      pengguna.peran === "admin" && [
        h("div", { class: "bagian" }, t("nav.admin")),
        ...MENU_ADMIN.map((n) => menu(n, aktif)),
      ]),
    h("div", { class: "sisi-bawah" },
      kontrolTampilan({ gambarUlang }),
      h("div", { class: "profil" },
        h("span", { class: "avatar", "aria-hidden": "true" }, pengguna.nama.charAt(0).toUpperCase()),
        h("div", {},
          h("div", { class: "profil-nama" }, pengguna.nama),
          h("div", { class: "profil-peran" }, t("peran." + pengguna.peran)))),
      keluar,
      (() => {
        const info = h("p", { class: "info-server", id: "info-server" });
        isiInfoServer(info);
        return info;
      })()));

  return h("div", { class: "layout" }, sisi,
    h("main", { class: "isi" },
      h("div", { class: "isi-kepala" }, h("h1", {}, t(RUTE[aktif].judul))),
      RUTE[aktif].tampil(query)));
}

function tampil() {
  // contoh hash: #/jadwal?jenis=Aula -> nama "jadwal", query jenis=Aula
  const [nama, kueri = ""] = location.hash.replace(/^#\//, "").split("?");
  const query = new URLSearchParams(kueri);
  const pengguna = ambilSesi();
  const r = RUTE[nama];

  // arahkan ke halaman yang boleh dibuka; hashchange memanggil tampil() lagi
  const tujuan = !r ? (pengguna ? "jadwal" : "login")
    : r.publik && pengguna ? "jadwal"
    : !r.publik && !pengguna ? "login"
    : r.admin && pengguna.peran !== "admin" ? "jadwal"
    : null;
  if (tujuan) {
    location.hash = "#/" + tujuan;
    return;
  }

  // halaman publik (login dkk.) tanpa sidebar: kontrol bahasa dan mode versi kecil di pojok kanan atas
  root.replaceChildren(...(r.publik
    ? [h("div", { class: "pojok-tampilan" }, kontrolTampilan({ kecil: true, gambarUlang })), r.tampil(query)]
    : [layout(nama, pengguna, query)]));
  document.title = `${t(r.judul ?? nama + ".judul")} · ${t("app.nama")}`;
}

function muatInfoServer() {
  api("/health")
    .then((d) => (server = { nama: d.server }))
    .catch(() => (server = { mati: true }))
    .then(() => {
      const el = document.getElementById("info-server");
      if (el) isiInfoServer(el);
    });
}

window.addEventListener("hashchange", tampil);
muatInfoServer();
tampil();

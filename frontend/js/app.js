import { api, ambilSesi, hapusSesi } from "./api.js";
import { halamanLogin, halamanLupaPassword, halamanRegister } from "./auth.js";
import { h, ikon } from "./dom.js";
import { halamanJadwal } from "./jadwal.js";
import { halamanPeminjaman } from "./peminjaman.js";
import { t } from "./i18n.js";

// Halaman selain Jadwal dibuat di tahap berikutnya.
const segera = () => h("div", { class: "kartu kosong" }, t("placeholder.segera"));

// publik = boleh dibuka tanpa login, admin = hanya peran admin
const RUTE = {
  login: { publik: true, tampil: halamanLogin },
  register: { publik: true, tampil: halamanRegister },
  "lupa-password": { publik: true, tampil: halamanLupaPassword },
  jadwal: { judul: "nav.jadwal", ikon: "jadwal", tampil: halamanJadwal },
  ruangan: { judul: "nav.ruangan", ikon: "ruangan", tampil: segera },
  peminjaman: { judul: "nav.peminjaman", ikon: "peminjaman", tampil: halamanPeminjaman },
  persetujuan: { judul: "nav.persetujuan", ikon: "persetujuan", admin: true, tampil: segera },
  kelola: { judul: "nav.kelola", ikon: "kelola", admin: true, tampil: segera },
};
const MENU_UMUM = ["jadwal", "ruangan", "peminjaman"];
const MENU_ADMIN = ["persetujuan", "kelola"];

const root = document.getElementById("app");
let infoServer = null; // teks "Server aktif · ..." dimuat sekali

function menu(nama, aktif) {
  const r = RUTE[nama];
  return h("a", { class: "menu" + (nama === aktif ? " aktif" : ""), href: "#/" + nama,
                  "aria-current": nama === aktif ? "page" : null },
    ikon(r.ikon), t(r.judul));
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
      h("div", { class: "profil" },
        h("span", { class: "avatar", "aria-hidden": "true" }, pengguna.nama.charAt(0).toUpperCase()),
        h("div", {},
          h("div", { class: "profil-nama" }, pengguna.nama),
          h("div", { class: "profil-peran" }, t("peran." + pengguna.peran)))),
      keluar,
      h("p", { class: "info-server", id: "info-server" }, infoServer ?? "")));

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

  root.replaceChildren(r.publik ? r.tampil(query) : layout(nama, pengguna, query));
  document.title = `${t(r.judul ?? nama + ".judul")} · ${t("app.nama")}`;
}

function muatInfoServer() {
  api("/health")
    .then((d) => (infoServer = t("server.aktif", { nama: d.server })))
    .catch(() => (infoServer = t("server.mati")))
    .then(() => {
      const el = document.getElementById("info-server");
      if (el) el.textContent = infoServer;
    });
}

window.addEventListener("hashchange", tampil);
muatInfoServer();
tampil();

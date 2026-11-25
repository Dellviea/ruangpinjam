import { api, ambilSesi, hapusSesi } from "./api.js";
import { halamanLogin, halamanLupaPassword, halamanRegister } from "./auth.js";
import { h, ikon, logoDenah } from "./dom.js";
import { halamanCari } from "./cari.js";
import { halamanJadwal } from "./jadwal.js";
import { halamanKelola } from "./kelola.js";
import { halamanPersetujuan } from "./persetujuan.js";
import { halamanPeminjaman } from "./peminjaman.js";
import { bukaPengajuan } from "./pengajuan.js";
import { toast } from "./toast.js";
import { halamanRuangan } from "./ruangan.js";
import { t } from "./i18n.js";
import { kontrolTampilan } from "./tampilan.js";

// Tombol utama "Ajukan peminjaman" di kepala halaman Peminjaman Saya: pop-up pengajuan, lalu halaman digambar ulang.
function tombolAjukan() {
  return h("button", { class: "tombol tombol-kecil", type: "button",
    onclick: async () => {
      try {
        bukaPengajuan({ ruangan: await api("/ruangan"), onSukses: () => { toast(t("jadwal.terkirim")); tampil(); } });
      } catch (err) {
        toast(err.message, "error");
      }
    } }, ikon("tambah"), t("jadwal.ajukan"));
}

// publik = boleh dibuka tanpa login, admin = hanya peran admin
const RUTE = {
  login: { publik: true, tampil: halamanLogin },
  register: { publik: true, tampil: halamanRegister },
  "lupa-password": { publik: true, tampil: halamanLupaPassword },
  jadwal: { judul: "nav.jadwal", ikon: "jadwal", kepalaSendiri: true, tampil: halamanJadwal },
  cari: { judul: "nav.cari", ikon: "cari", tampil: halamanCari },
  ruangan: { judul: "nav.ruangan", ikon: "ruangan", tampil: halamanRuangan },
  peminjaman: { judul: "nav.peminjaman", ikon: "peminjaman", aksiKepala: tombolAjukan, tampil: halamanPeminjaman },
  persetujuan: { judul: "nav.persetujuan", ikon: "persetujuan", admin: true, tampil: halamanPersetujuan },
  kelola: { judul: "nav.kelola", ikon: "kelola", admin: true, tampil: halamanKelola },
};
const MENU_UMUM = ["jadwal", "cari", "ruangan", "peminjaman"];
const MENU_ADMIN = ["persetujuan", "kelola"];

const root = document.getElementById("app");
let server = null; // { nama } kalau aktif, { mati: true } kalau gagal; dimuat sekali. Teksnya dibuat saat digambar supaya ikut bahasa.

function menu(nama, aktif) {
  const r = RUTE[nama];
  return h("a", { class: "menu" + (nama === aktif ? " aktif" : ""), href: "#/" + nama,
                  "aria-current": nama === aktif ? "page" : null },
    t(r.judul));
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
  // avatar + nama di kanan atas: klik membuka menu kecil (nama, peran, Keluar); tutup dengan klik di luar atau Esc
  const chip = h("button", { class: "profil-chip", type: "button", "aria-haspopup": "menu", "aria-expanded": "false",
    "aria-label": `${t("nav.akun")}: ${pengguna.nama}`, title: t("nav.akun") },
    h("span", { class: "avatar", "aria-hidden": "true" }, pengguna.nama.charAt(0).toUpperCase()),
    h("span", { class: "profil-nama" }, pengguna.nama));
  const keluarTombol = h("button", { class: "tombol tombol-kecil tombol-sekunder profil-keluar", type: "button", role: "menuitem",
    onclick: () => {
      hapusSesi();
      location.hash = "#/login";
    } }, ikon("keluar", 15), t("nav.keluar"));
  const menuProfil = h("div", { class: "profil-menu", role: "menu", "aria-label": t("nav.akun"), hidden: true },
    h("div", { class: "pm-nama" }, pengguna.nama),
    h("div", { class: "pm-peran" }, t("peran." + pengguna.peran)),
    keluarTombol);
  const keluar = h("div", { class: "profil-wrap" }, chip, menuProfil);

  const bukaMenu = (buka) => {
    menuProfil.hidden = !buka;
    chip.setAttribute("aria-expanded", String(buka));
    if (buka) keluarTombol.focus();
  };
  chip.addEventListener("click", () => bukaMenu(menuProfil.hidden));
  const klikLuar = (e) => {
    if (!keluar.isConnected) return document.removeEventListener("click", klikLuar);
    if (!menuProfil.hidden && !keluar.contains(e.target)) bukaMenu(false);
  };
  const tekanEsc = (e) => {
    if (!keluar.isConnected) return document.removeEventListener("keydown", tekanEsc);
    if (e.key === "Escape" && !menuProfil.hidden) {
      bukaMenu(false);
      chip.focus();
    }
  };
  document.addEventListener("click", klikLuar);
  document.addEventListener("keydown", tekanEsc);

  const tab = h("nav", { class: "tab-menu", "aria-label": t("nav.utama") },
    ...MENU_UMUM.map((n) => menu(n, aktif)),
    pengguna.peran === "admin" && [
      h("span", { class: "tab-pisah", "aria-hidden": "true" }),
      ...MENU_ADMIN.map((n) => menu(n, aktif)),
    ]);

  const bar = h("header", { class: "bar-atas" },
    h("div", { class: "bar-isi" },
      h("a", { class: "merek", href: "#/jadwal", "aria-label": t("app.nama") }, logoDenah(28), h("span", {}, t("app.nama"))),
      tab,
      h("div", { class: "bar-kanan" }, kontrolTampilan({ gambarUlang }), keluar)));

  // tab aktif selalu terlihat saat menu digeser (HP)
  requestAnimationFrame(() => {
    const el = tab.querySelector(".aktif");
    if (el) tab.scrollLeft = el.offsetLeft - (tab.clientWidth - el.offsetWidth) / 2;
  });

  const info = h("p", { class: "info-server", id: "info-server" });
  isiInfoServer(info);

  return h("div", { class: "layout" }, bar,
    h("main", { class: "isi" },
      RUTE[aktif].kepalaSendiri ? null : h("div", { class: "isi-kepala" }, h("h1", {}, t(RUTE[aktif].judul)), RUTE[aktif].aksiKepala?.()),
      RUTE[aktif].tampil(query)),
    h("footer", { class: "kaki" }, info));
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
    ? [h("div", { class: "pojok-tampilan" }, kontrolTampilan({ gambarUlang })), r.tampil(query)]
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

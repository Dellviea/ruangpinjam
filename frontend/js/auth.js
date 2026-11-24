import { api, simpanSesi } from "./api.js";
import { h, logoDenah } from "./dom.js";
import { t } from "./i18n.js";
import { latarAnimasi } from "./latar.js";

function medan(nama, labelKunci, atribut = {}, hint) {
  const id = "f-" + nama;
  return h("div", { class: "medan" },
    h("label", { for: id }, t(labelKunci)),
    h("input", { id, name: nama, type: "text", ...atribut }),
    hint && h("p", { class: "hint" }, hint));
}

// Kerangka kartu yang sama untuk login dan register.
function kartu(judul, sub, form, bawah) {
  return h("div", { class: "auth" },
    latarAnimasi(),
    h("div", { class: "auth-kartu" },
      h("div", { class: "auth-merek" }, logoDenah(24), t("app.nama")),
      h("h1", {}, t(judul)),
      h("p", { class: "auth-sub" }, t(sub)),
      form,
      h("p", { class: "auth-bawah" }, ...bawah)));
}

const masuk = (pengguna) => {
  simpanSesi(pengguna);
  location.hash = "#/jadwal";
};

// Kirim form ke API; gagal -> tampilkan pesan dari server. ambilKirim mengembalikan { path, body, sukses }.
function kirim(form, pesan, tombol, kunciProses, kunciTombol, ambilKirim) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    pesan.textContent = "";
    let permintaan;
    try {
      permintaan = ambilKirim(new FormData(form));
    } catch (err) {
      pesan.textContent = err.message;
      return;
    }
    tombol.disabled = true;
    tombol.textContent = t(kunciProses);
    try {
      permintaan.sukses(await api(permintaan.path, { method: "POST", body: permintaan.body }));
    } catch (err) {
      pesan.textContent = err.message;
      tombol.disabled = false;
      tombol.textContent = t(kunciTombol);
    }
  });
}

export function halamanLogin() {
  const pesan = h("p", { class: "pesan-error", role: "alert" });
  const tombol = h("button", { class: "tombol", type: "submit" }, t("login.tombol"));
  const form = h("form", { novalidate: true },
    medan("email", "login.email", { type: "email", autocomplete: "email", required: true }),
    medan("password", "login.password", { type: "password", autocomplete: "current-password", required: true }),
    h("p", { class: "lupa-baris" }, h("a", { href: "#/lupa-password" }, t("login.lupa"))),
    pesan, tombol);

  kirim(form, pesan, tombol, "login.proses", "login.tombol", (d) => ({
    path: "/login",
    body: { email: d.get("email"), password: d.get("password") },
    sukses: masuk,
  }));

  return kartu("login.judul", "login.sub", form,
    [t("login.belumPunya") + " ", h("a", { href: "#/register" }, t("login.daftar"))]);
}

export function halamanRegister() {
  const pesan = h("p", { class: "pesan-error", role: "alert" });
  const tombol = h("button", { class: "tombol", type: "submit" }, t("register.tombol"));
  const form = h("form", { novalidate: true },
    medan("nama", "register.nama", { autocomplete: "name", required: true }),
    medan("nim_nip", "register.nim", { required: true }),
    medan("email", "register.email", { type: "email", autocomplete: "email", required: true }),
    medan("prodi", "register.prodi"),
    medan("no_hp", "register.hp", { type: "tel", autocomplete: "tel" }),
    medan("password", "register.password", { type: "password", autocomplete: "new-password", required: true },
      t("register.hintPassword")),
    medan("konfirmasi", "register.konfirmasi", { type: "password", autocomplete: "new-password", required: true }),
    pesan, tombol);

  kirim(form, pesan, tombol, "register.proses", "register.tombol", (d) => {
    if (d.get("password") !== d.get("konfirmasi")) throw new Error(t("register.passwordBeda"));
    const body = Object.fromEntries(d);
    delete body.konfirmasi;
    return { path: "/register", body, sukses: masuk };
  });

  return kartu("register.judul", "register.sub", form,
    [t("register.sudahPunya") + " ", h("a", { href: "#/login" }, t("register.masuk"))]);
}

export function halamanLupaPassword() {
  const pesan = h("p", { class: "pesan-error", role: "alert" });
  const berhasil = h("p", { class: "pesan-ok", role: "status" });
  const tombol = h("button", { class: "tombol", type: "submit" }, t("lupa-password.tombol"));
  const form = h("form", { novalidate: true },
    medan("email", "lupa-password.email", { type: "email", autocomplete: "email", required: true }),
    medan("nim", "lupa-password.nim", { required: true }),
    medan("password_baru", "lupa-password.passwordBaru", { type: "password", autocomplete: "new-password", required: true },
      t("register.hintPassword")),
    medan("konfirmasi", "lupa-password.konfirmasi", { type: "password", autocomplete: "new-password", required: true }),
    pesan, berhasil, tombol);

  form.addEventListener("submit", () => (berhasil.textContent = ""));
  kirim(form, pesan, tombol, "lupa-password.proses", "lupa-password.tombol", (d) => {
    if (d.get("password_baru") !== d.get("konfirmasi")) throw new Error(t("register.passwordBeda"));
    const body = Object.fromEntries(d);
    delete body.konfirmasi;
    return {
      path: "/lupa-password",
      body,
      sukses: () => {
        form.reset();
        berhasil.textContent = t("lupa-password.berhasil");
        tombol.disabled = false;
        tombol.textContent = t("lupa-password.tombol");
      },
    };
  });

  return kartu("lupa-password.judul", "lupa-password.sub", form,
    [h("a", { href: "#/login" }, t("lupa-password.kembali"))]);
}

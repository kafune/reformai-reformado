// Mockups: injeta a barra de navegação entre telas + menu lateral por perfil.
// No app real isso é o layout (app/(app)/layout.tsx) com o menu vindo do perfil do usuário.

const SCREENS = [
  ["01-login.html", "Login"],
  ["02-cadastro-morador.html", "Cadastro (QR)"],
  ["03-morador-obras.html", "Morador · Obras"],
  ["04-morador-nova-obra.html", "Morador · Nova obra"],
  ["05-morador-obra-detalhe.html", "Morador · Obra"],
  ["06-sindico-obras.html", "Síndico · Obras"],
  ["07-sindico-analise.html", "Síndico · Análise"],
  ["08-painel-art.html", "Painel ART/RRT"],
  ["09-admin-condominios.html", "Admin · Condomínios"],
  ["10-admin-condominio-detalhe.html", "Admin · Unidades/QR"],
  ["11-termo-liberacao.html", "Termo imprimível"],
];

const MENUS = {
  RESIDENT: {
    who: ["AS", "Ana Souza", "Morador · Bl. B 304"],
    items: [
      ["obras", "03-morador-obras.html", "▦", "Minhas obras"],
      ["nova", "04-morador-nova-obra.html", "＋", "Nova obra"],
      ["conta", "#", "◍", "Minha conta"],
    ],
  },
  SYNDIC: {
    who: ["RM", "Roberto Mendes", "Síndico · Jd. das Acácias"],
    items: [
      ["obras", "06-sindico-obras.html", "▦", "Obras", 3],
      ["art", "08-painel-art.html", "◈", "Painel ART/RRT"],
      ["cadastro", "10-admin-condominio-detalhe.html", "⌗", "Cadastro de moradores"],
    ],
  },
  ADMIN: {
    who: ["LC", "Lúcia Carvalho", "Administradora"],
    items: [
      ["obras", "06-sindico-obras.html", "▦", "Obras", 7],
      ["art", "08-painel-art.html", "◈", "Painel ART/RRT"],
      ["condominios", "09-admin-condominios.html", "⌂", "Condomínios"],
      ["usuarios", "#", "◍", "Usuários"],
    ],
  },
};

(function () {
  const here = location.pathname.split("/").pop();

  // Barra de mockup (não existe no app real)
  const bar = document.createElement("div");
  bar.className = "mock-bar";
  bar.innerHTML =
    '<strong>Mockup ReformAI</strong><a href="index.html">índice</a>' +
    SCREENS.map(([f, t]) => (f === here ? `<strong>${t}</strong>` : `<a href="${f}">${t}</a>`)).join("");
  document.body.prepend(bar);

  const role = document.body.dataset.role;
  const active = document.body.dataset.active;
  const slot = document.getElementById("sidebar");
  if (!role || !slot) return;
  const m = MENUS[role];
  slot.className = "sidebar";
  slot.innerHTML = `
    <div class="brand"><div class="brand-mark">R</div>ReformAI</div>
    <nav class="nav">
      ${m.items
        .map(
          ([k, href, ico, label, count]) =>
            `<a href="${href}" class="${k === active ? "active" : ""}"><span>${ico}</span>${label}${
              count ? `<span class="count">${count}</span>` : ""
            }</a>`
        )
        .join("")}
    </nav>
    <div class="who"><div class="avatar">${m.who[0]}</div><div><div style="font-weight:600">${m.who[1]}</div><div class="small muted">${m.who[2]}</div></div></div>`;

  const top = document.getElementById("topbar");
  if (top) {
    top.className = "topbar";
    top.innerHTML = `<div class="brand"><div class="brand-mark">R</div>ReformAI</div><div class="avatar">${m.who[0]}</div>`;
  }
})();

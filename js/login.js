/* =========================================================
   NASOI Demo – Login page (DEO / Verifier / Admin)
   ========================================================= */
(function () {
  "use strict";
  const { $, $$ } = UI;

  const ROLES = {
    deo: { title: "Data Entry Operator Login", short: "DEO", page: "deo.html", demoId: "DEO126", demoPw: "Abcd@2026", reg: true },
    verifier: { title: "Verifier (VR) Login", short: "Verifier", page: "verifier.html", demoId: "VR101", demoPw: "Abcd@2026", reg: false },
    admin: { title: "Super Admin Login", short: "Admin", page: "admin.html", demoId: "ADMIN", demoPw: "Admin@2026", reg: false }
  };

  const params = new URLSearchParams(location.search);
  let role = ROLES[params.get("role")] ? params.get("role") : "deo";


  const form = $("#loginForm");
  const err = $("#loginError");

  function setRole(r) {
    role = r;
    const cfg = ROLES[r];
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.role === r));
    $("#loginTitle").textContent = cfg.title;
    $("#demoId").textContent = cfg.demoId;
    $("#demoPw").textContent = cfg.demoPw;
    $("#regLink").hidden = !cfg.reg;
    err.hidden = true;
    renderActive();
  }

  // Panels already logged in (each role keeps its own session in this browser).
  function renderActive() {
    const list = Store.activeSessions();
    const box = $("#activeBox");
    box.hidden = !list.length;
    $("#activeList").innerHTML = list.map((a) =>
      `<a class="active-chip${a.role === role ? " current" : ""}" href="${ROLES[a.role].page}" target="_blank" rel="noopener">${Icons.svg("dashboard")} <span><b>${UI.esc(a.user.name)}</b><small>${UI.esc(ROLES[a.role].short)} • ${UI.esc(a.user.id)}</small></span></a>`
    ).join("");
    const cur = list.find((a) => a.role === role);
    $("#alreadyNote").hidden = !cur;
    if (cur) $("#alreadyNote").innerHTML = `Already logged in as <b>${UI.esc(cur.user.name)}</b>. <a href="${ROLES[role].page}">Open ${UI.esc(ROLES[role].short)} dashboard</a> or log in again below.`;
  }
  window.addEventListener("storage", renderActive);

  $$(".tabs button").forEach((b) => b.addEventListener("click", () => setRole(b.dataset.role)));
  setRole(role);
  if (params.get("id")) form.elements.loginId.value = params.get("id");

  $("#togglePw").addEventListener("click", (e) => {
    const pw = form.elements.password;
    pw.type = pw.type === "password" ? "text" : "password";
    e.target.textContent = pw.type === "password" ? "Show" : "Hide";
  });

  $("#useDemo").addEventListener("click", () => {
    form.elements.loginId.value = ROLES[role].demoId;
    form.elements.password.value = ROLES[role].demoPw;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = form.elements.loginId.value.trim();
    const pw = form.elements.password.value;
    if (!id || !pw) { err.textContent = "Please enter your ID and password."; err.hidden = false; return; }
    const res = Store.login(role, id, pw);
    if (!res.ok) { err.textContent = res.msg; err.hidden = false; return; }
    location.href = ROLES[role].page;
  });
})();

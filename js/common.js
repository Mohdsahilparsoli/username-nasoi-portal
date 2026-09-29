/* =========================================================
   NASOI Demo – Shared UI helpers (all pages)
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d)) return esc(v);
    return pad2(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  };
  const fmtDateTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return fmtDate(v) + ", " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  };
  const fmtMonth = (key) => {
    const [y, m] = key.split("-");
    return MONTHS[Number(m) - 1] + " " + y;
  };
  function pad2(n) { return String(n).padStart(2, "0"); }
  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const maskAcc = (a) => (a ? "XXXXXX" + String(a).slice(-4) : "—");

  const STATUS_BADGE = {
    pending: '<span class="badge amber">Pending</span>',
    approved: '<span class="badge green">Approved</span>',
    rejected: '<span class="badge red">Rejected</span>'
  };
  const statusBadge = (s) => STATUS_BADGE[s] || '<span class="badge grey">' + esc(s) + "</span>";

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, type = "ok") {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = "toast " + type; }, 2800);
  }

  /* ---------- Modal ---------- */
  function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }
  document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close]");
    if (closer) { closer.closest(".modal").classList.remove("open"); return; }
    if (e.target.classList && e.target.classList.contains("modal")) e.target.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal.open").forEach((m) => m.classList.remove("open"));
  });

  /* ---------- Public nav toggle ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const btn = $(".nav-toggle");
    const nav = $(".site-nav");
    if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("open"));
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  });

  /* ---------- Dashboard helpers ---------- */
  // Redirect to login unless the current session has the given role.
  function guard(role) {
    const s = Store.getSession();
    const user = s && s.role === role ? Store.getUser(s.id) : null;
    if (!user) { location.replace("login.html?role=" + role); return null; }
    return user;
  }

  // Wires the sidebar + hash-based section switching used by all dashboards.
  function initDashboard(user, onShow) {
    $$("[data-user-name]").forEach((el) => (el.textContent = user.name));
    $$("[data-user-id]").forEach((el) => (el.textContent = user.id));
    $$("[data-logout]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault(); Store.clearSession(); location.href = "login.html";
    }));
    const menu = $("#menuBtn");
    if (menu) menu.addEventListener("click", () => document.body.classList.toggle("nav-open"));

    const sections = $$(".dash-section");
    const show = () => {
      const id = (location.hash || "#" + sections[0].id).slice(1);
      const target = document.getElementById(id) || sections[0];
      sections.forEach((s) => (s.hidden = s !== target));
      $$(".side-nav a[href^='#']").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + target.id));
      document.body.classList.remove("nav-open");
      window.scrollTo(0, 0);
      if (onShow) onShow(target.id);
    };
    window.addEventListener("hashchange", show);
    show();
  }

  function fillStates(stateSel, distSel, stateVal, distVal) {
    stateSel.innerHTML = '<option value="">-- Select State --</option>' +
      Object.keys(Store.STATES).map((s) => `<option${s === stateVal ? " selected" : ""}>${esc(s)}</option>`).join("");
    const fillDist = () => {
      const list = Store.STATES[stateSel.value] || [];
      distSel.innerHTML = '<option value="">-- Select District --</option>' +
        list.map((d) => `<option${d === distVal ? " selected" : ""}>${esc(d)}</option>`).join("");
    };
    stateSel.addEventListener("change", () => { distVal = ""; fillDist(); });
    fillDist();
  }

  // Reads all named fields of a form into a plain object (trimmed strings).
  function formData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === "string" ? v.trim() : v; });
    return out;
  }

  // Simple validation: marks invalid inputs and returns true if the form is OK.
  function markErrors(form, errors) {
    $$(".invalid", form).forEach((el) => el.classList.remove("invalid"));
    $$(".err", form).forEach((el) => (el.textContent = ""));
    Object.keys(errors).forEach((name) => {
      const el = form.elements[name];
      const node = el && (el.length && !el.tagName ? el[0] : el);
      if (node && node.classList) node.classList.add("invalid");
      const holder = $(`[data-err="${name}"]`, form);
      if (holder) holder.textContent = errors[name];
    });
    const first = Object.keys(errors)[0];
    if (first) {
      const el = form.elements[first];
      const node = el && (el.length && !el.tagName ? el[0] : el);
      if (node && node.focus) node.focus();
    }
    return Object.keys(errors).length === 0;
  }

  const RX = {
    mobile: /^[6-9]\d{9}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    pincode: /^[1-9]\d{5}$/,
    ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    account: /^\d{9,18}$/,
    password: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
  };

  /* ---------- Data entry record definition ---------- */
  const ENTRY_FIELDS = [
    { name: "studentName", label: "Student Name", type: "text", req: true },
    { name: "fatherName", label: "Father's Name", type: "text", req: true },
    { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], req: true },
    { name: "dob", label: "Date of Birth", type: "date", req: true },
    { name: "className", label: "Class", type: "select", options: ["10th", "12th"], req: true },
    { name: "rollNo", label: "Roll Number", type: "text", req: true },
    { name: "school", label: "School Name", type: "text", req: true, full: true },
    { name: "board", label: "Board", type: "select", options: ["UP Board", "CBSE", "ICSE", "State Board (Other)"], req: true },
    { name: "percentage", label: "Percentage (%)", type: "number", req: true },
    { name: "village", label: "Village / Ward", type: "text", req: true },
    { name: "pincode", label: "Pincode", type: "text", req: true },
    { name: "mobile", label: "Parent Mobile No.", type: "tel", req: false }
  ];

  function entryFieldsHTML(data = {}, prefix = "e") {
    return ENTRY_FIELDS.map((f) => {
      const id = prefix + "_" + f.name;
      const v = data[f.name] || "";
      let input;
      if (f.type === "select") {
        input = `<select id="${id}" name="${f.name}"><option value="">-- Select --</option>` +
          f.options.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("") + "</select>";
      } else {
        const extra = f.type === "number" ? ' step="0.1" min="0" max="100"' : f.name === "pincode" ? ' maxlength="6" inputmode="numeric"' : f.type === "tel" ? ' maxlength="10" inputmode="numeric"' : ' maxlength="80"';
        input = `<input id="${id}" name="${f.name}" type="${f.type}" value="${esc(v)}"${extra}>`;
      }
      return `<div class="field${f.full ? " full" : ""}"><label for="${id}">${esc(f.label)}${f.req ? ' <span class="req">*</span>' : ""}</label>${input}<span class="err" data-err="${f.name}"></span></div>`;
    }).join("");
  }

  function validateEntry(d) {
    const e = {};
    ENTRY_FIELDS.forEach((f) => { if (f.req && !d[f.name]) e[f.name] = "Required"; });
    if (d.percentage && (isNaN(d.percentage) || d.percentage < 0 || d.percentage > 100)) e.percentage = "Enter 0 – 100";
    if (d.pincode && !RX.pincode.test(d.pincode)) e.pincode = "6-digit pincode";
    if (d.mobile && !RX.mobile.test(d.mobile)) e.mobile = "10-digit mobile";
    if (d.dob && new Date(d.dob) > new Date()) e.dob = "Future date";
    return e;
  }

  function entryDetailHTML(entry) {
    const a = Store.getAssignment(entry.assignmentId);
    const deo = Store.getUser(entry.deoId);
    const rows = ENTRY_FIELDS.map((f) => {
      const v = f.type === "date" ? fmtDate(entry.data[f.name]) : esc(entry.data[f.name] || "—");
      return `<div><span>${esc(f.label)}</span><b>${v}</b></div>`;
    }).join("");
    return `
      ${entry.status === "rejected" ? `<div class="alert red"><b>Rejection reason:</b> ${esc(entry.reason)}</div>` : ""}
      <div class="detail-grid" style="margin-bottom:16px">
        <div><span>Entry ID</span><b>${esc(entry.id)}</b></div>
        <div><span>Status</span><b>${statusBadge(entry.status)}${entry.resubmitted ? ' <span class="badge blue">Resubmitted</span>' : ""}</b></div>
        <div><span>Operator</span><b>${esc(deo ? deo.name + " (" + deo.id + ")" : entry.deoId)}</b></div>
        <div><span>Assignment</span><b>${esc(a ? a.id + " – " + a.taskType : entry.assignmentId)}</b></div>
        <div><span>Submitted on</span><b>${fmtDateTime(entry.submittedAt)}</b></div>
        <div><span>Verified on</span><b>${fmtDateTime(entry.verifiedAt)}</b></div>
      </div>
      <h4 style="margin-bottom:10px">Record details</h4>
      <div class="detail-grid">${rows}</div>`;
  }

  /* ---------- Stat card (icon + label + value) ---------- */
  function statCard(o) {
    const tag = o.href ? "a" : o.go ? "button" : "div";
    const attrs = (o.href ? ` href="${o.href}"` : "") + (o.go ? ` data-go="${o.go}"` : "") + (tag === "div" ? ' style="cursor:default"' : ' style="text-decoration:none"');
    return `<${tag} class="stat ${o.cls || ""}"${attrs}><span class="stat-top"><span><span class="stat-label">${esc(o.label)}</span><span class="stat-value">${o.value}</span></span><span class="stat-ic">${Icons.svg(o.icon || "chart")}</span></span></${tag}>`;
  }

  window.UI = {
    $, $$, esc, fmtDate, fmtDateTime, fmtMonth, money, maskAcc, statusBadge,
    toast, openModal, closeModal, guard, initDashboard, fillStates, formData, markErrors, RX,
    ENTRY_FIELDS, entryFieldsHTML, validateEntry, entryDetailHTML, statCard
  };
})();

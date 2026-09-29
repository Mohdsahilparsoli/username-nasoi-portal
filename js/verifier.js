/* =========================================================
   NASOI Demo – Verifier dashboard
   ========================================================= */
(function () {
  "use strict";
  const U = UI;
  const { $, esc, fmtDate, fmtDateTime, toast } = U;

  const me = U.guard("verifier");
  if (!me) return;

  const deoName = (id) => { const u = Store.getUser(id); return u ? u.name : id; };
  const byNewest = (k) => (a, b) => (a[k] < b[k] ? 1 : -1);
  let current = null;

  /* ---------- Queue ---------- */
  function renderQueue() {
    const all = Store.db.entries;
    const mine = all.filter((e) => e.verifierId === me.id);
    const pending = all.filter((e) => e.status === "pending");
    const today = new Date().toDateString();
    const cards = [
      { label: "Pending to verify", value: pending.length, cls: "amber" },
      { label: "Approved by me", value: mine.filter((e) => e.status === "approved").length, cls: "green" },
      { label: "Rejected by me", value: mine.filter((e) => e.status === "rejected").length, cls: "red" },
      { label: "Verified today", value: mine.filter((e) => e.verifiedAt && new Date(e.verifiedAt).toDateString() === today).length, cls: "blue" }
    ];
    $("#vStats").innerHTML = cards.map((c) => `<div class="stat ${c.cls}" style="cursor:default"><span class="stat-label">${c.label}</span><span class="stat-value">${c.value}</span></div>`).join("");
    $("#pendCount").textContent = pending.length;
    $("#pendCount").hidden = !pending.length;

    const deoSel = $("#vDeo");
    const chosen = deoSel.value;
    const deos = Store.db.users.filter((u) => u.role === "deo");
    deoSel.innerHTML = '<option value="">All operators</option>' + deos.map((u) => `<option value="${esc(u.id)}"${u.id === chosen ? " selected" : ""}>${esc(u.id)} – ${esc(u.name)}</option>`).join("");

    const q = $("#vSearch").value.trim().toLowerCase();
    const rows = pending
      .filter((e) => (!chosen || e.deoId === chosen) && (!q || e.id.toLowerCase().includes(q) || e.data.studentName.toLowerCase().includes(q)))
      .sort((a, b) => (a.submittedAt > b.submittedAt ? 1 : -1)); // oldest first
    $("#vBody").innerHTML = rows.map((e) => `
      <tr>
        <td><b>${esc(e.id)}</b>${e.resubmitted ? ' <span class="badge blue">Resubmitted</span>' : ""}</td>
        <td>${esc(deoName(e.deoId))}<span class="small muted" style="display:block">${esc(e.deoId)}</span></td>
        <td>${esc(e.data.studentName)}<span class="small muted" style="display:block">${esc(e.data.className)} • Roll ${esc(e.data.rollNo)} • ${esc(e.data.percentage)}%</span></td>
        <td class="small">${fmtDateTime(e.submittedAt)}</td>
        <td><div class="actions">
          <button class="btn btn-light btn-sm" data-open="${esc(e.id)}">View</button>
          <button class="btn btn-primary btn-sm" data-approve="${esc(e.id)}">Approve</button>
          <button class="btn btn-danger btn-sm" data-reject="${esc(e.id)}">Reject</button>
        </div></td>
      </tr>`).join("") || '<tr><td colspan="5" class="empty">🎉 Nothing pending. All entries are verified.</td></tr>';
  }
  $("#vDeo").addEventListener("change", renderQueue);
  $("#vSearch").addEventListener("input", renderQueue);

  /* ---------- History ---------- */
  function renderHistory() {
    const mine = Store.db.entries.filter((e) => e.verifierId === me.id).sort(byNewest("verifiedAt"));
    $("#aBody").innerHTML = mine.filter((e) => e.status === "approved").map((e) => `
      <tr><td><b>${esc(e.id)}</b></td><td>${esc(deoName(e.deoId))}</td><td>${esc(e.data.studentName)}</td><td class="small">${fmtDateTime(e.verifiedAt)}</td>
      <td><button class="btn btn-light btn-sm" data-open="${esc(e.id)}">View</button></td></tr>`).join("") || '<tr><td colspan="5" class="empty">No approved entries yet.</td></tr>';
    $("#rBody").innerHTML = mine.filter((e) => e.status === "rejected").map((e) => `
      <tr><td><b>${esc(e.id)}</b></td><td>${esc(deoName(e.deoId))}</td><td>${esc(e.data.studentName)}</td><td class="small" style="color:var(--red)">${esc(e.reason)}</td><td class="small">${fmtDate(e.verifiedAt)}</td>
      <td><button class="btn btn-light btn-sm" data-open="${esc(e.id)}">View</button></td></tr>`).join("") || '<tr><td colspan="6" class="empty">No rejected entries yet.</td></tr>';
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const u = Store.getUser(me.id);
    const d = (l, v) => `<div><span>${esc(l)}</span><b>${esc(v || "—")}</b></div>`;
    $("#pfBody").innerHTML = d("Verifier ID", u.id) + d("Name", u.name) + d("Father's Name", u.fatherName) + d("Mother's Name", u.motherName) +
      `<div><span>Date of Birth</span><b>${fmtDate(u.dob)}</b></div>` + d("Mobile", u.mobile) + d("Email", u.email) +
      d("Qualification", u.qualification) + `<div style="grid-column:1/-1"><span>Address</span><b>${esc(u.address)}</b></div>`;
  }

  /* ---------- Verify modal ---------- */
  $("#rReasonPick").innerHTML = '<option value="">-- Pick a common reason --</option>' + Store.REJECT_REASONS.map((r) => `<option>${esc(r)}</option>`).join("");
  $("#rReasonPick").addEventListener("change", (e) => { if (e.target.value) $("#rReason").value = e.target.value; });

  function openVerify(id, startReject) {
    const en = Store.getEntry(id);
    if (!en) return;
    current = en;
    $("#vmBody").innerHTML = U.entryDetailHTML(en);
    const pending = en.status === "pending";
    $("#approveBtn").hidden = !pending;
    $("#rejectBtn").hidden = !pending;
    $("#rejectBox").hidden = !(pending && startReject);
    $("#rejectBtn").textContent = startReject ? "Confirm Reject" : "Reject";
    $("#rReason").value = ""; $("#rReasonPick").value = ""; $("#rErr").textContent = "";
    U.openModal("verifyModal");
  }

  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) return openVerify(o.dataset.open, false);
    const r = e.target.closest("[data-reject]");
    if (r) return openVerify(r.dataset.reject, true);
    const a = e.target.closest("[data-approve]");
    if (a) { Store.verifyEntry(a.dataset.approve, me.id, true); toast("Entry " + a.dataset.approve + " approved."); renderAll(); }
  });

  $("#approveBtn").addEventListener("click", () => {
    if (!current) return;
    Store.verifyEntry(current.id, me.id, true);
    U.closeModal("verifyModal");
    toast("Entry " + current.id + " approved.");
    renderAll();
  });

  $("#rejectBtn").addEventListener("click", () => {
    if (!current) return;
    const box = $("#rejectBox");
    if (box.hidden) { box.hidden = false; $("#rejectBtn").textContent = "Confirm Reject"; $("#rReason").focus(); return; }
    const reason = $("#rReason").value.trim();
    if (reason.length < 5) { $("#rErr").textContent = "Please write a clear reason (at least 5 characters)."; return; }
    Store.verifyEntry(current.id, me.id, false, reason);
    U.closeModal("verifyModal");
    toast("Entry " + current.id + " rejected.", "error");
    renderAll();
  });

  function renderAll() { renderQueue(); renderHistory(); renderProfile(); }
  renderAll();
  U.initDashboard(me, renderAll);
})();

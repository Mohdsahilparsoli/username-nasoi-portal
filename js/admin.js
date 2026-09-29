/* =========================================================
   NASOI Demo – Super Admin dashboard
   ========================================================= */
(function () {
  "use strict";
  const U = UI;
  const { $, $$, esc, money, fmtDate, fmtDateTime, fmtMonth, maskAcc, statusBadge, toast } = U;

  const me = U.guard("admin");
  if (!me) return;

  const deos = () => Store.db.users.filter((u) => u.role === "deo");
  const userName = (id) => { const u = Store.getUser(id); return u ? u.name : id || "—"; };
  let aeFilter = "all";

  function statBox(label, value, cls, go) {
    return `<${go ? `a href="${go}"` : "div"} class="stat ${cls || ""}" style="text-decoration:none${go ? "" : ";cursor:default"}"><span class="stat-label">${esc(label)}</span><span class="stat-value">${value}</span></${go ? "a" : "div"}>`;
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    const s = Store.statsOf(Store.db.entries);
    const d = deos();
    const unassigned = d.filter((u) => !Store.assignmentsFor(u.id).length);
    $("#ovStats").innerHTML =
      statBox("Total Operators", d.length, "", "#operators") +
      statBox("Awaiting assignment", unassigned.length, "blue", "#operators") +
      statBox("Total Entries", s.total, "", "#all-entries") +
      statBox("Pending", s.pending, "amber", "#all-entries") +
      statBox("Approved", s.approved, "green", "#all-entries") +
      statBox("Rejected", s.rejected, "red", "#all-entries") +
      statBox("Total Payable", money(s.earnings), "gold", "#payouts");

    const recent = d.slice().sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1)).slice(0, 6);
    $("#ovNew").innerHTML = recent.map((u) => {
      const has = Store.assignmentsFor(u.id).length;
      return `<tr><td><b>${esc(u.id)}</b></td><td>${esc(u.name)}</td><td class="small">${esc(u.district)}</td>
        <td>${has ? '<span class="badge green">Assigned</span>' : `<a href="#assign" class="btn btn-primary btn-sm" data-assign-to="${esc(u.id)}">Assign</a>`}</td></tr>`;
    }).join("") || '<tr><td colspan="4" class="empty">No operators yet.</td></tr>';

    const top = d.map((u) => ({ u, s: Store.statsOf(Store.entriesFor(u.id)) })).sort((a, b) => b.s.approved - a.s.approved).slice(0, 5);
    $("#ovTop").innerHTML = top.map((t) => `<tr><td>${esc(t.u.name)} <span class="small muted">(${esc(t.u.id)})</span></td><td>${t.s.approved}</td><td>${money(t.s.earnings)}</td></tr>`).join("")
      || '<tr><td colspan="3" class="empty">No data.</td></tr>';
  }

  /* ---------- Operators ---------- */
  function renderOperators() {
    const q = $("#opSearch").value.trim().toLowerCase();
    const list = deos().filter((u) => !q || [u.id, u.name, u.mobile].some((v) => String(v).toLowerCase().includes(q)));
    $("#opBody").innerHTML = list.map((u) => {
      const s = Store.statsOf(Store.entriesFor(u.id));
      const asg = Store.assignmentsFor(u.id).length;
      return `<tr>
        <td><b>${esc(u.id)}</b></td><td>${esc(u.name)}</td><td>${esc(u.mobile)}</td>
        <td class="small">${esc(u.district)}, ${esc(u.state)}</td>
        <td>${asg || '<span class="badge blue">None</span>'}</td>
        <td class="small">${s.pending} / ${s.approved} / ${s.rejected}</td>
        <td>${money(s.earnings)}</td>
        <td>${u.status === "blocked" ? '<span class="badge red">Blocked</span>' : '<span class="badge green">Active</span>'}</td>
        <td><div class="actions">
          <button class="btn btn-light btn-sm" data-op="${esc(u.id)}">View</button>
          <a href="#assign" class="btn btn-primary btn-sm" data-assign-to="${esc(u.id)}">Assign</a>
        </div></td></tr>`;
    }).join("") || '<tr><td colspan="9" class="empty">No operators found.</td></tr>';
  }
  $("#opSearch").addEventListener("input", renderOperators);

  function openOperator(id) {
    const u = Store.getUser(id);
    if (!u) return;
    const s = Store.statsOf(Store.entriesFor(u.id));
    const d = (l, v) => `<div><span>${esc(l)}</span><b>${esc(v || "—")}</b></div>`;
    const b = u.bank || {};
    $("#opTitle").textContent = u.name + " (" + u.id + ")";
    $("#opDetail").innerHTML = `
      <div class="detail-grid">
        ${d("Father's Name", u.fatherName)}${d("Mother's Name", u.motherName)}
        <div><span>Date of Birth</span><b>${fmtDate(u.dob)}</b></div>${d("Gender / Category", u.gender + " / " + u.category)}
        ${d("Mobile", u.mobile)}${d("Email", u.email)}
        ${d("Qualification", u.qualification)}<div><span>Registered</span><b>${fmtDate(u.joinedAt)}</b></div>
        <div style="grid-column:1/-1"><span>Address</span><b>${esc(u.address)}, ${esc(u.tehsil)}, ${esc(u.district)}, ${esc(u.state)} – ${esc(u.pincode)}</b></div>
        ${d("Bank", b.bankName)}${d("Account Holder", b.holder)}${d("Account No.", maskAcc(b.account))}${d("IFSC", b.ifsc)}
        ${d("Entries (Total / Approved)", s.total + " / " + s.approved)}${d("Earnings", money(s.earnings))}
      </div>`;
    $("#opActions").innerHTML = `
      <button class="btn ${u.status === "blocked" ? "btn-primary" : "btn-danger"}" data-toggle-block="${esc(u.id)}">${u.status === "blocked" ? "Unblock" : "Block"} operator</button>
      <a href="#assign" class="btn btn-outline" data-assign-to="${esc(u.id)}">Assign work</a>
      <button class="btn btn-light" data-close>Close</button>`;
    U.openModal("opModal");
  }

  /* ---------- Assign ---------- */
  const asgForm = $("#asgForm");
  $("#a_task").innerHTML = '<option value="">-- Select --</option>' + Store.TASK_TYPES.map((t) => `<option>${esc(t)}</option>`).join("");
  let assignTo = "";

  function renderAssignForm() {
    const cur = assignTo || asgForm.elements.deoId.value;
    $("#a_deo").innerHTML = '<option value="">-- Select operator --</option>' + deos().filter((u) => u.status !== "blocked").map((u) =>
      `<option value="${esc(u.id)}"${u.id === cur ? " selected" : ""}>${esc(u.id)} – ${esc(u.name)} (${esc(u.district)}, ${esc(u.state)})</option>`).join("");
    const deo = Store.getUser(cur);
    if (assignTo && deo) {
      U.fillStates($("#a_state"), $("#a_district"), deo.state, deo.district);
      asgForm.elements.block.value = deo.tehsil || "";
    } else if (!$("#a_state").options.length) {
      U.fillStates($("#a_state"), $("#a_district"));
    }
    if (!asgForm.elements.rate.value) asgForm.elements.rate.value = Store.db.settings.rate;
    if (!asgForm.elements.deadline.value) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      asgForm.elements.deadline.value = d.toISOString().slice(0, 10);
    }
    assignTo = "";
  }
  $("#a_deo").addEventListener("change", () => { assignTo = $("#a_deo").value; renderAssignForm(); });

  asgForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = U.formData(asgForm), err = {};
    ["deoId", "taskType", "state", "district", "block", "village", "deadline"].forEach((k) => { if (!d[k]) err[k] = "Required"; });
    if (!(Number(d.target) > 0)) err.target = "Enter a target above 0";
    if (!(Number(d.rate) > 0)) err.rate = "Enter a rate above 0";
    if (!U.markErrors(asgForm, err)) return;
    const a = Store.createAssignment({
      deoId: d.deoId, taskType: d.taskType, target: Number(d.target), rate: Number(d.rate), deadline: d.deadline, note: d.note,
      area: { state: d.state, district: d.district, block: d.block, village: d.village }
    });
    toast(a.id + " assigned to " + userName(d.deoId) + ".");
    asgForm.reset();
    U.fillStates($("#a_state"), $("#a_district"));
    asgForm.elements.rate.value = Store.db.settings.rate;
    location.hash = "#assignments";
  });

  /* ---------- Assignments ---------- */
  function renderAssignments() {
    const list = Store.db.assignments.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    $("#asBody").innerHTML = list.map((a) => {
      const es = Store.db.entries.filter((e) => e.assignmentId === a.id);
      const pct = Math.min(100, Math.round((es.length / a.target) * 100));
      const st = a.status === "completed" ? '<span class="badge grey">Completed</span>' : !a.seenAt ? '<span class="badge blue">New (unseen)</span>' : '<span class="badge green">Active</span>';
      return `<tr>
        <td><b>${esc(a.id)}</b><span class="small muted" style="display:block">${fmtDate(a.createdAt)}</span></td>
        <td>${esc(userName(a.deoId))}<span class="small muted" style="display:block">${esc(a.deoId)}</span></td>
        <td>${esc(a.taskType)}<span class="small muted" style="display:block">📍 ${esc(a.area.village)}, ${esc(a.area.block)}, ${esc(a.area.district)}</span></td>
        <td style="min-width:140px"><div class="progress-label"><span>${es.length}/${a.target}</span><span>${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></td>
        <td>${money(a.rate)}</td><td class="small">${fmtDate(a.deadline)}</td><td>${st}</td>
        <td>${a.status === "active" ? `<button class="btn btn-light btn-sm" data-complete="${esc(a.id)}">Mark complete</button>` : `<button class="btn btn-light btn-sm" data-reopen="${esc(a.id)}">Reopen</button>`}</td>
      </tr>`;
    }).join("") || '<tr><td colspan="8" class="empty">No assignments yet.</td></tr>';
  }

  /* ---------- All entries ---------- */
  function renderEntries() {
    $$("#aeFilter button").forEach((b) => b.classList.toggle("active", b.dataset.f === aeFilter));
    const sel = $("#aeDeo"), chosen = sel.value;
    sel.innerHTML = '<option value="">All operators</option>' + deos().map((u) => `<option value="${esc(u.id)}"${u.id === chosen ? " selected" : ""}>${esc(u.id)} – ${esc(u.name)}</option>`).join("");
    const q = $("#aeSearch").value.trim().toLowerCase();
    const rows = Store.db.entries
      .filter((e) => (aeFilter === "all" || e.status === aeFilter) && (!chosen || e.deoId === chosen) &&
        (!q || e.id.toLowerCase().includes(q) || e.data.studentName.toLowerCase().includes(q)))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    $("#aeBody").innerHTML = rows.slice(0, 300).map((e) => `
      <tr><td><b>${esc(e.id)}</b></td><td>${esc(userName(e.deoId))}</td>
      <td>${esc(e.data.studentName)}${e.status === "rejected" ? `<span class="reason">${esc(e.reason)}</span>` : ""}</td>
      <td class="small">${fmtDateTime(e.submittedAt)}</td><td>${statusBadge(e.status)}</td>
      <td class="small">${e.verifierId ? esc(userName(e.verifierId)) : "—"}</td>
      <td><button class="btn btn-light btn-sm" data-entry="${esc(e.id)}">View</button></td></tr>`).join("")
      || '<tr><td colspan="7" class="empty">No entries found.</td></tr>';
  }
  $("#aeFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { aeFilter = b.dataset.f; renderEntries(); } });
  $("#aeDeo").addEventListener("change", renderEntries);
  $("#aeSearch").addEventListener("input", renderEntries);

  /* ---------- Payouts ---------- */
  function renderPayouts() {
    const months = Store.monthlyHistory(Store.db.entries).map((m) => m.key);
    const sel = $("#poMonth");
    const chosen = sel.value || months[0];
    sel.innerHTML = months.map((k) => `<option value="${k}"${k === chosen ? " selected" : ""}>${fmtMonth(k)}</option>`).join("");
    let total = 0, count = 0, ops = 0;
    const rows = deos().map((u) => {
      const m = Store.monthlyHistory(Store.entriesFor(u.id)).find((x) => x.key === chosen);
      if (!m || !m.approved) return "";
      total += m.earnings; count += m.approved; ops += 1;
      const b = u.bank || {};
      const pb = { Paid: "green", "In progress": "blue", "Under verification": "amber" }[m.payout];
      return `<tr><td>${esc(u.name)} <span class="small muted">(${esc(u.id)})</span></td><td>${esc(b.bankName)}</td><td>${maskAcc(b.account)}</td><td>${esc(b.ifsc)}</td>
        <td>${m.approved}</td><td><b>${money(m.earnings)}</b></td><td><span class="badge ${pb}">${m.payout}</span></td></tr>`;
    }).join("");
    $("#poStats").innerHTML = statBox("Operators to pay", ops, "blue") + statBox("Approved entries", count, "green") + statBox("Total amount", money(total), "gold");
    $("#poBody").innerHTML = rows || '<tr><td colspan="7" class="empty">No approved entries in this month.</td></tr>';
  }
  $("#poMonth").addEventListener("change", renderPayouts);

  /* ---------- Settings ---------- */
  function renderSettings() {
    const f = $("#setForm");
    f.elements.rate.value = Store.db.settings.rate;
    f.elements.payoutWindow.value = Store.db.settings.payoutWindow;
  }
  $("#setForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = U.formData(ev.target);
    if (!U.markErrors(ev.target, Number(d.rate) > 0 ? {} : { rate: "Enter a rate above 0" })) return;
    Store.db.settings.rate = Number(d.rate);
    Store.db.settings.payoutWindow = d.payoutWindow || Store.db.settings.payoutWindow;
    Store.save();
    toast("Settings saved.");
  });
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all demo data? New registrations and entries will be removed.")) return;
    Store.reset();
    Store.setSession(Store.getUser("ADMIN"));
    toast("Demo data reset.");
    renderAll();
  });

  /* ---------- Global clicks ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-assign-to],[data-op],[data-entry],[data-complete],[data-reopen],[data-toggle-block]");
    if (!t) return;
    if (t.dataset.assignTo) { assignTo = t.dataset.assignTo; U.closeModal("opModal"); if (location.hash === "#assign") renderAssignForm(); return; }
    if (t.dataset.op) return openOperator(t.dataset.op);
    if (t.dataset.entry) {
      const en = Store.getEntry(t.dataset.entry);
      if (en) { $("#entryBody").innerHTML = U.entryDetailHTML(en); U.openModal("entryModal"); }
      return;
    }
    if (t.dataset.complete) { Store.setAssignmentStatus(t.dataset.complete, "completed"); toast("Assignment marked complete."); return renderAssignments(); }
    if (t.dataset.reopen) { Store.setAssignmentStatus(t.dataset.reopen, "active"); toast("Assignment reopened."); return renderAssignments(); }
    if (t.dataset.toggleBlock) {
      const u = Store.getUser(t.dataset.toggleBlock);
      Store.updateUser(u.id, { status: u.status === "blocked" ? "active" : "blocked" });
      toast(u.name + (u.status === "blocked" ? " blocked." : " unblocked."));
      openOperator(u.id); renderOperators();
    }
  });

  function renderAll() { renderOverview(); renderOperators(); renderAssignments(); renderEntries(); renderPayouts(); renderSettings(); }
  renderAll();
  U.initDashboard(me, (id) => {
    if (id === "assign") renderAssignForm();
    else renderAll();
  });
})();

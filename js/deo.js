/* =========================================================
   NASOI Demo – Data Entry Operator dashboard
   ========================================================= */
(function () {
  "use strict";
  const U = UI;
  const { $, $$, esc, money, fmtDate, fmtDateTime, fmtMonth, maskAcc, statusBadge, toast } = U;

  const me = U.guard("deo");
  if (!me) return;

  let filter = "all";

  /* ---------- Helpers ---------- */
  const myEntries = () => Store.entriesFor(me.id).slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  const myAssignments = () => Store.assignmentsFor(me.id).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const isNew = (a) => !a.seenAt;
  const areaText = (a) => [a.area.village, a.area.block, a.area.district, a.area.state].filter(Boolean).join(", ");

  function statCards(s, extra = []) {
    const cards = [
      { key: "all", label: "Total Entries", value: s.total, cls: "", icon: "clipboard" },
      { key: "pending", label: "Pending Entries", value: s.pending, cls: "amber", icon: "clock" },
      { key: "approved", label: "Approved Entries", value: s.approved, cls: "green", icon: "check-circle" },
      { key: "rejected", label: "Rejected Entries", value: s.rejected, cls: "red", icon: "x-circle" },
      { key: "earn", label: "Total Earnings", value: money(s.earnings), cls: "gold", icon: "wallet" }
    ].concat(extra);
    return cards.map((c) => U.statCard(Object.assign({ go: c.key }, c))).join("");
  }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    const k = go.dataset.go;
    if (k === "earn") location.hash = "#earnings";
    else if (k === "asg") location.hash = "#work";
    else { filter = k; location.hash = "#entries"; renderEntries(); }
  });

  /* ---------- Overview ---------- */
  function renderOverview() {
    const list = myEntries();
    const s = Store.statsOf(list);
    const asgs = myAssignments();
    const newCount = asgs.filter(isNew).length;
    $("#ovStats").innerHTML = statCards(s, [{ key: "asg", label: "New Assignments", value: newCount, cls: "blue", icon: "bell" }]);

    $("#newAsgAlert").innerHTML = newCount
      ? `<div class="alert blue">${Icons.svg("bell")} You have <b>${newCount}</b> new work assignment${newCount > 1 ? "s" : ""} from the admin. <a href="#work">View now →</a></div>`
      : "";

    $("#ovRecent").innerHTML = list.slice(0, 6).map((e) => `
      <tr><td><a href="#" data-view="${esc(e.id)}">${esc(e.id)}</a></td><td>${esc(e.data.studentName)}</td><td>${fmtDate(e.submittedAt)}</td><td>${statusBadge(e.status)}</td></tr>`
    ).join("") || '<tr><td colspan="4" class="empty">No entries yet. Start with “New Entry”.</td></tr>';

    const active = asgs.filter((a) => a.status === "active");
    $("#ovArea").innerHTML = active.length
      ? active.map((a) => `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(a.taskType)}</b>${isNew(a) ? '<span class="badge blue">New</span>' : ""}</div>
            <div class="small muted">${Icons.svg("map-pin")} ${esc(areaText(a))}</div>
            ${progressHTML(a)}
          </div>`).join("")
      : '<p class="muted">No area has been assigned to you yet. The Super Admin will assign work shortly.</p>';
  }

  function progressHTML(a) {
    const done = Store.entriesFor(me.id).filter((e) => e.assignmentId === a.id).length;
    const pct = Math.min(100, Math.round((done / a.target) * 100));
    return `<div class="progress-label" style="margin-top:6px"><span>${done} / ${a.target} entries</span><span>${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div>`;
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const u = Store.getUser(me.id);
    const d = (label, v) => `<div><span>${esc(label)}</span><b>${esc(v || "—")}</b></div>`;
    $("#pfPersonal").innerHTML =
      d("Registration ID", u.id) + d("Name", u.name) + d("Father's Name", u.fatherName) + d("Mother's Name", u.motherName) +
      `<div><span>Date of Birth</span><b>${fmtDate(u.dob)}</b></div>` + d("Gender", u.gender) + d("Category", u.category) +
      d("Qualification", u.qualification) + `<div><span>Registered on</span><b>${fmtDate(u.joinedAt)}</b></div>`;
    $("#pfContact").innerHTML =
      d("Mobile Number", u.mobile) + d("Alternate Mobile", u.altMobile) + d("Email ID", u.email) +
      d("State / District", u.state + " / " + u.district) + d("Tehsil / Pincode", u.tehsil + " / " + u.pincode) +
      `<div style="grid-column:1/-1"><span>Full Address</span><b>${esc(u.address)}</b></div>`;
    const b = u.bank || {};
    $("#pfBank").innerHTML = d("Bank Name", b.bankName) + d("Account Holder Name", b.holder) +
      d("Account Number", maskAcc(b.account)) + d("IFSC Code", b.ifsc);
  }

  function toggleEdit(formSel, viewSel, btnSel, fill) {
    const form = $(formSel), view = $(viewSel), btn = $(btnSel);
    btn.addEventListener("click", () => { fill(form); form.hidden = false; view.hidden = true; btn.hidden = true; });
    $("[data-cancel]", form).addEventListener("click", () => { form.hidden = true; view.hidden = false; btn.hidden = false; U.markErrors(form, {}); });
    return () => { form.hidden = true; view.hidden = false; btn.hidden = false; };
  }

  const closeContact = toggleEdit("#contactForm", "#pfContact", "#editContactBtn", (f) => {
    const u = Store.getUser(me.id);
    f.elements.mobile.value = u.mobile; f.elements.altMobile.value = u.altMobile || "";
    f.elements.email.value = u.email; f.elements.address.value = u.address;
  });
  $("#contactForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, d = U.formData(f), err = {};
    if (!U.RX.mobile.test(d.mobile)) err.mobile = "Enter a valid 10-digit mobile.";
    if (d.altMobile && !U.RX.mobile.test(d.altMobile)) err.altMobile = "Enter a valid 10-digit mobile.";
    if (!U.RX.email.test(d.email)) err.email = "Enter a valid email.";
    if (d.address.length < 10) err.address = "Enter full address.";
    if (Store.db.users.some((x) => x.id !== me.id && x.mobile === d.mobile)) err.mobile = "Mobile already used by another account.";
    if (!U.markErrors(f, err)) return;
    Store.updateUser(me.id, d);
    closeContact(); renderProfile(); toast("Contact details updated.");
  });

  const closeBank = toggleEdit("#bankForm", "#pfBank", "#editBankBtn", (f) => {
    const b = Store.getUser(me.id).bank || {};
    f.elements.bankName.value = b.bankName || ""; f.elements.holder.value = b.holder || "";
    f.elements.account.value = ""; f.elements.account2.value = ""; f.elements.ifsc.value = b.ifsc || "";
  });
  ["account", "account2"].forEach((n) => $("#bankForm").elements[n].addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); }));
  $("#bankForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, d = U.formData(f), err = {};
    d.ifsc = d.ifsc.toUpperCase();
    if (!d.bankName) err.bankName = "Required";
    if (!d.holder) err.holder = "Required";
    if (!U.RX.account.test(d.account)) err.account = "9–18 digit account number";
    if (d.account2 !== d.account) err.account2 = "Account numbers do not match";
    if (!U.RX.ifsc.test(d.ifsc)) err.ifsc = "Invalid IFSC code";
    if (!U.markErrors(f, err)) return;
    Store.updateUser(me.id, { bank: { bankName: d.bankName, holder: d.holder.toUpperCase(), account: d.account, ifsc: d.ifsc } });
    closeBank(); renderProfile(); renderEarnings(); toast("Bank details updated.");
  });

  $("#pwForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, d = U.formData(f), err = {};
    if (!d.old) err.old = "Required";
    if (!U.RX.password.test(d.pw)) err.pw = "Min 6 chars, letters + numbers";
    if (d.pw2 !== d.pw) err.pw2 = "Passwords do not match";
    if (!U.markErrors(f, err)) return;
    const r = Store.changePassword(me.id, d.old, d.pw);
    if (!r.ok) { U.markErrors(f, { old: r.msg }); return; }
    f.reset(); toast("Password changed successfully.");
  });

  /* ---------- Work status ---------- */
  function renderWork() {
    const list = myEntries();
    const s = Store.statsOf(list);
    const asgs = myAssignments();
    $("#wkStats").innerHTML = statCards(s);
    $("#wkList").innerHTML = asgs.map((a) => {
      const es = list.filter((e) => e.assignmentId === a.id);
      const st = Store.statsOf(es);
      const badge = a.status === "completed" ? '<span class="badge grey">Completed</span>' : isNew(a) ? '<span class="badge blue">New</span>' : '<span class="badge green">Active</span>';
      return `
        <div class="assign-card">
          <div class="top"><div><h4>${esc(a.taskType)}</h4><span class="small muted">${esc(a.id)} • assigned ${fmtDate(a.createdAt)}</span></div>${badge}</div>
          <dl class="meta">
            <dt>${Icons.svg("map-pin")} Area</dt><dd>${esc(areaText(a))}</dd>
            <dt>${Icons.svg("target")} Target</dt><dd>${a.target} entries</dd>
            <dt>${Icons.svg("wallet")} Rate</dt><dd>${money(a.rate)} / approved entry</dd>
            <dt>${Icons.svg("calendar")} Deadline</dt><dd>${fmtDate(a.deadline)}</dd>
          </dl>
          ${a.note ? `<p class="small muted" style="margin:0">${esc(a.note)}</p>` : ""}
          ${progressHTML(a)}
          <div class="small" style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="badge amber">${st.pending} pending</span><span class="badge green">${st.approved} approved</span><span class="badge red">${st.rejected} rejected</span><span class="badge grey">${money(st.earnings)} earned</span>
          </div>
          ${a.status === "active" ? `<a class="btn btn-primary btn-sm" href="#new-entry" data-asg="${esc(a.id)}">${Icons.svg("plus")} Add entry for this area</a>` : ""}
        </div>`;
    }).join("") || '<div class="panel"><div class="empty">No work has been assigned yet.</div></div>';
    // Viewing the list marks new assignments as seen
    Store.markAssignmentsSeen(me.id);
    updateNewCount();
  }

  $("#wkList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-asg]");
    if (b) preselectAsg = b.dataset.asg;
  });

  function updateNewCount() {
    const n = myAssignments().filter(isNew).length;
    const el = $("#newAsgCount");
    el.textContent = n; el.hidden = !n;
  }

  /* ---------- Entries ---------- */
  function renderEntries() {
    $$("#enFilter button").forEach((b) => b.classList.toggle("active", b.dataset.f === filter));
    const q = $("#enSearch").value.trim().toLowerCase();
    const rows = myEntries().filter((e) =>
      (filter === "all" || e.status === filter) &&
      (!q || e.id.toLowerCase().includes(q) || String(e.data.studentName).toLowerCase().includes(q))
    );
    $("#enBody").innerHTML = rows.map((e) => `
      <tr>
        <td><b>${esc(e.id)}</b></td>
        <td>${esc(e.data.studentName)}<span class="small muted" style="display:block">${esc(e.data.className)} • Roll ${esc(e.data.rollNo)}</span>
          ${e.status === "rejected" ? `<span class="reason">Reason: ${esc(e.reason)}</span>` : ""}</td>
        <td class="small">${esc(e.assignmentId)}</td>
        <td class="small">${fmtDateTime(e.submittedAt)}</td>
        <td>${statusBadge(e.status)}</td>
        <td>${e.status === "approved" ? money(e.rate) : '<span class="muted">—</span>'}</td>
        <td><div class="actions">
          <button class="btn btn-light btn-sm" data-view="${esc(e.id)}">${Icons.svg("eye")} View</button>
          ${e.status === "rejected" ? `<button class="btn btn-outline btn-sm" data-edit="${esc(e.id)}">${Icons.svg("edit")} Edit &amp; Resubmit</button>` : ""}
        </div></td>
      </tr>`).join("") || '<tr><td colspan="7" class="empty">No entries found.</td></tr>';
  }
  $("#enFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.f; renderEntries();
  });
  $("#enSearch").addEventListener("input", renderEntries);

  /* ---------- View / edit modals ---------- */
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-view]");
    if (v) { e.preventDefault(); openView(v.dataset.view); return; }
    const ed = e.target.closest("[data-edit]");
    if (ed) { e.preventDefault(); U.closeModal("viewModal"); openEdit(ed.dataset.edit); }
  });

  function openView(id) {
    const en = Store.getEntry(id);
    if (!en || en.deoId !== me.id) return;
    $("#viewBody").innerHTML = U.entryDetailHTML(en);
    $("#viewActions").innerHTML = (en.status === "rejected" ? `<button class="btn btn-outline" data-edit="${esc(en.id)}">Edit &amp; Resubmit</button>` : "") +
      '<button class="btn btn-light" data-close>Close</button>';
    U.openModal("viewModal");
  }

  let editingId = null;
  function openEdit(id) {
    const en = Store.getEntry(id);
    if (!en || en.deoId !== me.id || en.status !== "rejected") return;
    editingId = id;
    $("#editId").textContent = en.id;
    $("#editReason").innerHTML = "<b>Rejection reason:</b> " + esc(en.reason);
    $("#editFields").innerHTML = U.entryFieldsHTML(en.data, "ed");
    U.openModal("editModal");
  }
  $("#editForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = U.formData(ev.target);
    if (!U.markErrors(ev.target, U.validateEntry(d))) return;
    Store.resubmitEntry(editingId, d);
    U.closeModal("editModal");
    toast("Entry " + editingId + " resubmitted for verification.");
    renderAll();
  });

  /* ---------- New entry ---------- */
  let preselectAsg = null;
  const entryForm = $("#entryForm");

  function renderNewEntry() {
    const active = myAssignments().filter((a) => a.status === "active");
    const sel = $("#ne_asg");
    if (!active.length) {
      $("#neBlocked").innerHTML = '<div class="alert gold">No active assignment yet. You can add entries once the Super Admin assigns an area to you.</div>';
      entryForm.hidden = true;
      return;
    }
    $("#neBlocked").innerHTML = "";
    entryForm.hidden = false;
    const cur = preselectAsg || sel.value || active[0].id;
    sel.innerHTML = active.map((a) => `<option value="${esc(a.id)}"${a.id === cur ? " selected" : ""}>${esc(a.id)} – ${esc(a.taskType)} (${esc(a.area.village)}, ${esc(a.area.district)})</option>`).join("");
    preselectAsg = null;
    if (!$("#neFields").children.length) $("#neFields").innerHTML = U.entryFieldsHTML({}, "ne");
    onAsgChange();
  }
  function onAsgChange() {
    const a = Store.getAssignment($("#ne_asg").value);
    if (!a) return;
    $("#neRate").textContent = money(a.rate);
    const v = entryForm.elements.village;
    if (v && !v.value) v.value = a.area.village;
  }
  $("#ne_asg").addEventListener("change", onAsgChange);

  entryForm.addEventListener("reset", () => setTimeout(onAsgChange, 0));
  entryForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = U.formData(entryForm);
    const asgId = d.assignmentId; delete d.assignmentId;
    const err = U.validateEntry(d);
    const dup = Store.entriesFor(me.id).some((x) => x.data.rollNo === d.rollNo && x.status !== "rejected");
    if (d.rollNo && dup) err.rollNo = "An entry with this roll number already exists.";
    if (!U.markErrors(entryForm, err)) { toast("Please fill all required fields correctly.", "error"); return; }
    const en = Store.addEntry(me.id, asgId, d);
    entryForm.reset();
    toast("Entry " + en.id + " submitted. Status: Pending verification.");
    renderAll();
  });

  $("#neSample").addEventListener("click", () => {
    const names = ["Ravi Tomar", "Sakshi Rana", "Mohit Pal", "Anjali Malik", "Kunal Bansal", "Shivani Goyal"];
    const i = Math.floor(Math.random() * names.length);
    const set = (n, v) => { entryForm.elements[n].value = v; };
    set("studentName", names[i]); set("fatherName", "Mr. " + names[(i + 2) % names.length].split(" ")[1] + " Sr.");
    set("gender", i % 2 ? "Female" : "Male"); set("dob", "2008-0" + (1 + i) + "-1" + i);
    set("className", i % 2 ? "12th" : "10th"); set("rollNo", String(250000 + Math.floor(Math.random() * 90000)));
    set("school", "Govt. Inter College Sardhana"); set("board", "UP Board");
    set("percentage", (55 + Math.random() * 40).toFixed(1)); set("pincode", "250342"); set("mobile", "9" + String(Math.floor(100000000 + Math.random() * 899999999)));
    U.markErrors(entryForm, {});
  });

  /* ---------- Earnings ---------- */
  function renderEarnings() {
    const list = myEntries();
    const s = Store.statsOf(list);
    const u = Store.getUser(me.id);
    $("#erTotal").textContent = money(s.earnings);
    $("#erSub").textContent = s.approved + " approved entries";
    $("#erBank").textContent = (u.bank && u.bank.bankName ? u.bank.bankName + " • " : "") + maskAcc(u.bank && u.bank.account);
    $("#erWindow").textContent = "Paid between " + Store.db.settings.payoutWindow;
    const now = new Date();
    const curKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const thisMonth = Store.monthlyHistory(list).find((m) => m.key === curKey);
    const potential = s.pending * Store.db.settings.rate;
    $("#erStats").innerHTML = [
      { label: "This month", value: money(thisMonth ? thisMonth.earnings : 0), cls: "green", icon: "calendar" },
      { label: "Pending (if approved)", value: money(potential), cls: "amber", icon: "clock" },
      { label: "Lost to rejection", value: money(s.rejected * Store.db.settings.rate), cls: "red", icon: "x-circle" },
      { label: "Approval rate", value: (s.approved + s.rejected ? Math.round((s.approved / (s.approved + s.rejected)) * 100) : 0) + "%", cls: "blue", icon: "trending-up" }
    ].map(U.statCard).join("");
    const payBadge = { Paid: "green", "In progress": "blue", "Under verification": "amber" };
    $("#erBody").innerHTML = Store.monthlyHistory(list).map((m) => `
      <tr><td><b>${fmtMonth(m.key)}</b></td><td>${m.total}</td><td>${m.approved}</td><td>${m.rejected}</td><td>${m.pending}</td>
      <td><b>${money(m.earnings)}</b></td><td><span class="badge ${payBadge[m.payout]}">${m.payout}</span></td></tr>`
    ).join("") || '<tr><td colspan="7" class="empty">No history yet.</td></tr>';
  }

  /* ---------- Boot ---------- */
  function renderAll() {
    renderOverview(); renderProfile(); renderEntries(); renderEarnings(); updateNewCount();
  }
  renderAll();
  // Another tab (e.g. Verifier or Admin) changed the data -> refresh everything.
  document.addEventListener("nasoi:update", renderAll);
  U.initDashboard(me, (id) => {
    if (id === "work") renderWork();
    if (id === "new-entry") renderNewEntry();
    if (id === "overview") renderOverview();
    if (id === "entries") renderEntries();
  });
})();

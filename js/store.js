/* =========================================================
   NASOI Demo – Data layer
   All data lives in the browser's localStorage (demo only,
   there is no server). Every page loads this file first.
   ========================================================= */
(function () {
  "use strict";

  const DB_KEY = "nasoi_db_v1";
  // One session per role, so DEO, Verifier and Admin can all be logged in
  // at the same time in the same browser (e.g. in three tabs).
  const SESSION_PREFIX = "nasoi_session_";
  const ROLES = ["deo", "verifier", "admin"];

  /* ---------- Small helpers ---------- */
  const pad = (n, len) => String(n).padStart(len, "0");
  const iso = (d) => d.toISOString();
  const daysAgo = (n, h = 11) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(h, (n * 7) % 60, 0, 0);
    return d;
  };

  const STATES = {
    "Uttar Pradesh": ["Meerut", "Ghaziabad", "Lucknow", "Agra"],
    "Delhi": ["North Delhi", "South Delhi", "East Delhi", "West Delhi"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Rohtak"],
    "Rajasthan": ["Jaipur", "Alwar", "Ajmer", "Kota"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"]
  };

  const TASK_TYPES = [
    "Student Academic Record",
    "School Survey Form",
    "Scholarship Application Data"
  ];

  const REJECT_REASONS = [
    "Date of birth does not match the source document.",
    "Student name spelling mismatch with school register.",
    "Percentage entered is outside the valid range.",
    "Duplicate entry – this record already exists.",
    "Pincode does not belong to the assigned area."
  ];

  /* ---------- Seed data ---------- */
  function seed() {
    const now = iso(new Date());
    const users = [
      {
        id: "DEO126", role: "deo", password: "Abcd@2026",
        name: "Rahul Kumar", fatherName: "Suresh Kumar", motherName: "Sunita Devi",
        dob: "1999-05-14", gender: "Male", category: "GEN",
        mobile: "9717323761", altMobile: "", email: "rahul.demo@example.com",
        state: "Uttar Pradesh", district: "Meerut", tehsil: "Sardhana", pincode: "250342",
        address: "House No. 45, Gandhi Nagar, Sardhana, Meerut",
        qualification: "12th",
        bank: { bankName: "State Bank of India", holder: "Rahul Kumar", account: "30214587961", ifsc: "SBIN0001234" },
        status: "active", joinedAt: iso(daysAgo(95))
      },
      {
        id: "DEO127", role: "deo", password: "Abcd@2026",
        name: "Priya Sharma", fatherName: "Ramesh Sharma", motherName: "Kavita Sharma",
        dob: "2001-11-02", gender: "Female", category: "OBC",
        mobile: "9811100022", altMobile: "", email: "priya.demo@example.com",
        state: "Delhi", district: "East Delhi", tehsil: "Shahdara", pincode: "110032",
        address: "B-12, Vivek Vihar, Shahdara, Delhi",
        qualification: "Graduation",
        bank: { bankName: "Punjab National Bank", holder: "Priya Sharma", account: "1452000100023", ifsc: "PUNB0145200" },
        status: "active", joinedAt: iso(daysAgo(40))
      },
      {
        id: "VR101", role: "verifier", password: "Abcd@2026",
        name: "Anjali Verma", fatherName: "Mahesh Verma", motherName: "Rekha Verma",
        dob: "1994-03-21", gender: "Female", category: "GEN",
        mobile: "9990011223", email: "verifier.demo@example.com",
        state: "Uttar Pradesh", district: "Meerut", tehsil: "Meerut", pincode: "250001",
        address: "12, Civil Lines, Meerut",
        qualification: "Post Graduation",
        status: "active", joinedAt: iso(daysAgo(200))
      },
      {
        id: "ADMIN", role: "admin", password: "Admin@2026",
        name: "Super Admin", mobile: "9000000000", email: "admin.demo@example.com",
        status: "active", joinedAt: iso(daysAgo(365))
      }
    ];

    const assignments = [
      {
        id: "ASG001", deoId: "DEO126", taskType: "Student Academic Record",
        area: { state: "Uttar Pradesh", district: "Meerut", block: "Sardhana", village: "Ward 1 – 5" },
        target: 60, rate: 10, deadline: iso(daysAgo(-20)).slice(0, 10),
        note: "Enter Class 10 & 12 student records from the school registers of the listed wards.",
        status: "active", createdAt: iso(daysAgo(90)), seenAt: iso(daysAgo(90))
      },
      {
        id: "ASG002", deoId: "DEO126", taskType: "School Survey Form",
        area: { state: "Uttar Pradesh", district: "Meerut", block: "Sardhana", village: "Village Salawa" },
        target: 40, rate: 10, deadline: iso(daysAgo(-35)).slice(0, 10),
        note: "Survey forms of government schools in Salawa village.",
        status: "active", createdAt: iso(daysAgo(2)), seenAt: null
      },
      {
        id: "ASG003", deoId: "DEO127", taskType: "Scholarship Application Data",
        area: { state: "Delhi", district: "East Delhi", block: "Shahdara", village: "Vivek Vihar" },
        target: 50, rate: 10, deadline: iso(daysAgo(-25)).slice(0, 10),
        note: "Scholarship applications received in the September batch.",
        status: "active", createdAt: iso(daysAgo(30)), seenAt: iso(daysAgo(29))
      }
    ];

    const firstNames = ["Aman", "Pooja", "Rohit", "Neha", "Vikas", "Sneha", "Arjun", "Kajal", "Deepak", "Riya", "Sachin", "Muskan", "Ankit", "Simran", "Gaurav", "Nisha", "Manish", "Payal", "Harsh", "Tanu"];
    const lastNames = ["Singh", "Yadav", "Sharma", "Gupta", "Chauhan", "Tyagi", "Saini", "Jain", "Verma", "Kumar"];
    const fathers = ["Rajesh", "Mukesh", "Satish", "Anil", "Sunil", "Vinod", "Ashok", "Ravi", "Pramod", "Naresh"];
    const schools = ["Govt. Inter College Sardhana", "Saraswati Vidya Mandir", "Kisan Inter College", "Adarsh Public School", "Rajkiya Balika Inter College"];

    const entries = [];
    let n = 1;
    const make = (deoId, asg, day, status, rIdx) => {
      const i = n;
      const first = firstNames[i % firstNames.length];
      const gender = i % 2 ? "Female" : "Male";
      const cls = i % 3 ? "10th" : "12th";
      const pct = 45 + ((i * 37) % 50) + (i % 10) / 10;
      let submitted = daysAgo(day, 10 + (i % 7));
      if (submitted > new Date()) submitted = new Date(Date.now() - (i % 5 + 1) * 3600000);
      const e = {
        id: "ENT" + pad(n++, 5), deoId, assignmentId: asg.id, rate: asg.rate,
        data: {
          studentName: first + " " + lastNames[i % lastNames.length],
          fatherName: fathers[i % fathers.length] + " " + lastNames[i % lastNames.length],
          gender, dob: (2006 + (i % 4)) + "-" + pad(1 + (i % 12), 2) + "-" + pad(1 + (i % 27), 2),
          className: cls, rollNo: String(240000 + i * 13),
          school: schools[i % schools.length], board: i % 4 ? "UP Board" : "CBSE",
          percentage: pct.toFixed(1), village: asg.area.village, pincode: asg.area.state === "Delhi" ? "110032" : "250342",
          mobile: "98" + pad((i * 7919) % 100000000, 8)
        },
        status, reason: status === "rejected" ? REJECT_REASONS[rIdx % REJECT_REASONS.length] : "",
        submittedAt: iso(submitted),
        verifiedAt: status === "pending" ? null : iso(new Date(submitted.getTime() + 86400000)),
        verifierId: status === "pending" ? null : "VR101"
      };
      entries.push(e);
    };

    // DEO126 – three months of history on ASG001
    for (let d = 88; d >= 3; d -= 2) {
      const k = d % 11;
      const status = k === 0 || k === 5 ? "rejected" : "approved";
      make("DEO126", assignments[0], d, status, d);
    }
    // recent pending ones
    [2, 1, 1, 0, 0].forEach((d) => make("DEO126", assignments[0], d, "pending", 0));
    // DEO127
    for (let d = 28; d >= 1; d -= 3) make("DEO127", assignments[2], d, d % 9 === 0 ? "rejected" : d < 6 ? "pending" : "approved", d);

    return {
      users, assignments, entries,
      settings: { rate: 10, payoutWindow: "15th – 25th of every month" },
      counters: { deo: 127, entry: n - 1, assignment: 3 },
      createdAt: now
    };
  }

  /* ---------- Persistence ---------- */
  let db;
  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* storage full / blocked */ }
  }
  load();

  /* ---------- Session ---------- */
  function getSession(role) {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_PREFIX + role) || "null");
      return s && getUser(s.id) && getUser(s.id).role === role ? s : null;
    } catch (e) { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_PREFIX + user.role, JSON.stringify({ id: user.id, role: user.role, at: Date.now() }));
  }
  function clearSession(role) { localStorage.removeItem(SESSION_PREFIX + role); }
  // All roles that currently have someone logged in, e.g. [{role:"deo", user:{...}}]
  function activeSessions() {
    return ROLES.map((r) => { const s = getSession(r); return s ? { role: r, user: getUser(s.id) } : null; }).filter(Boolean);
  }

  /* ---------- Users ---------- */
  const getUser = (id) => db.users.find((u) => u.id === id) || null;

  function login(role, loginId, password) {
    const key = String(loginId || "").trim().toLowerCase();
    const user = db.users.find((u) =>
      u.role === role &&
      (u.id.toLowerCase() === key || (u.mobile && u.mobile === key) || (u.email && u.email.toLowerCase() === key))
    );
    if (!user || user.password !== password) return { ok: false, msg: "Invalid ID / Mobile / Email or Password." };
    if (user.status === "blocked") return { ok: false, msg: "This account has been blocked by the admin." };
    setSession(user);
    return { ok: true, user };
  }

  function genPassword(name) {
    const base = (String(name).replace(/[^A-Za-z]/g, "").slice(0, 4) || "User");
    const cap = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    return cap + "@" + (1000 + Math.floor(Math.random() * 9000));
  }

  function registerDeo(data) {
    if (db.users.some((u) => u.mobile === data.mobile)) return { ok: false, msg: "This mobile number is already registered." };
    if (db.users.some((u) => u.email && u.email.toLowerCase() === data.email.toLowerCase())) return { ok: false, msg: "This email ID is already registered." };
    db.counters.deo += 1;
    const user = Object.assign({}, data, {
      id: "DEO" + db.counters.deo, role: "deo", password: genPassword(data.name),
      status: "active", joinedAt: iso(new Date())
    });
    db.users.push(user);
    save();
    return { ok: true, user };
  }

  function updateUser(id, patch) {
    const u = getUser(id);
    if (!u) return null;
    Object.assign(u, patch);
    save();
    return u;
  }

  function changePassword(id, oldPw, newPw) {
    const u = getUser(id);
    if (!u || u.password !== oldPw) return { ok: false, msg: "Current password is incorrect." };
    u.password = newPw; save();
    return { ok: true };
  }

  /* ---------- Assignments ---------- */
  const assignmentsFor = (deoId) => db.assignments.filter((a) => a.deoId === deoId);
  const getAssignment = (id) => db.assignments.find((a) => a.id === id) || null;

  function createAssignment(a) {
    db.counters.assignment += 1;
    const rec = Object.assign({ status: "active", createdAt: iso(new Date()), seenAt: null }, a, {
      id: "ASG" + pad(db.counters.assignment, 3)
    });
    db.assignments.push(rec); save();
    return rec;
  }
  function markAssignmentsSeen(deoId) {
    let changed = false;
    db.assignments.forEach((a) => { if (a.deoId === deoId && !a.seenAt) { a.seenAt = iso(new Date()); changed = true; } });
    if (changed) save();
  }
  function setAssignmentStatus(id, status) { const a = getAssignment(id); if (a) { a.status = status; save(); } }

  /* ---------- Entries ---------- */
  const entriesFor = (deoId) => db.entries.filter((e) => e.deoId === deoId);
  const getEntry = (id) => db.entries.find((e) => e.id === id) || null;

  function addEntry(deoId, assignmentId, data) {
    const asg = getAssignment(assignmentId);
    db.counters.entry += 1;
    const e = {
      id: "ENT" + pad(db.counters.entry, 5), deoId, assignmentId, rate: asg ? asg.rate : db.settings.rate,
      data, status: "pending", reason: "", submittedAt: iso(new Date()), verifiedAt: null, verifierId: null
    };
    db.entries.push(e); save();
    return e;
  }
  function resubmitEntry(id, data) {
    const e = getEntry(id);
    if (!e) return null;
    e.data = data; e.status = "pending"; e.reason = ""; e.resubmitted = true;
    e.submittedAt = iso(new Date()); e.verifiedAt = null; e.verifierId = null;
    save(); return e;
  }
  function verifyEntry(id, verifierId, approve, reason) {
    const e = getEntry(id);
    if (!e) return null;
    e.status = approve ? "approved" : "rejected";
    e.reason = approve ? "" : reason;
    e.verifiedAt = iso(new Date());
    e.verifierId = verifierId;
    save(); return e;
  }

  /* ---------- Stats ---------- */
  function statsOf(list) {
    const s = { total: list.length, pending: 0, approved: 0, rejected: 0, earnings: 0 };
    list.forEach((e) => {
      s[e.status] += 1;
      if (e.status === "approved") s.earnings += Number(e.rate) || 0;
    });
    return s;
  }

  function monthlyHistory(list) {
    const map = {};
    list.forEach((e) => {
      const d = new Date(e.submittedAt);
      const key = d.getFullYear() + "-" + pad(d.getMonth() + 1, 2);
      if (!map[key]) map[key] = { key, total: 0, pending: 0, approved: 0, rejected: 0, earnings: 0 };
      map[key].total += 1;
      map[key][e.status] += 1;
      if (e.status === "approved") map[key].earnings += Number(e.rate) || 0;
    });
    const now = new Date();
    const curKey = now.getFullYear() + "-" + pad(now.getMonth() + 1, 2);
    return Object.values(map).sort((a, b) => (a.key < b.key ? 1 : -1)).map((m) => {
      m.payout = m.key === curKey ? "In progress" : m.pending ? "Under verification" : "Paid";
      return m;
    });
  }

  function reset() { db = seed(); save(); }
  // Re-read the database (used when another tab changed it).
  function reload() { load(); }

  window.Store = {
    STATES, TASK_TYPES, REJECT_REASONS,
    DB_KEY, SESSION_PREFIX, ROLES,
    get db() { return db; },
    save, reset, reload,
    getSession, setSession, clearSession, activeSessions,
    getUser, login, registerDeo, updateUser, changePassword,
    assignmentsFor, getAssignment, createAssignment, markAssignmentsSeen, setAssignmentStatus,
    entriesFor, getEntry, addEntry, resubmitEntry, verifyEntry,
    statsOf, monthlyHistory
  };
})();

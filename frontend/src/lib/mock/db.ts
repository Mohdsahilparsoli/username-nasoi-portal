/**
 * Mock database stored in the browser (localStorage).
 * It exists only until the Express + PostgreSQL backend is ready.
 * Nothing outside src/lib/api imports this file, so swapping it out
 * later does not touch any page or component.
 */
import { REJECT_REASONS } from "@/lib/constants";
import type { Assignment, Entry, Settings, UserRecord } from "@/types";

export const DB_KEY = "nasoi_next_db_v1";

export interface Db {
  users: UserRecord[];
  assignments: Assignment[];
  entries: Entry[];
  settings: Settings;
  counters: { deo: number; entry: number; assignment: number };
}

const pad = (n: number, len: number) => String(n).padStart(len, "0");
const iso = (d: Date) => d.toISOString();
function daysAgo(n: number, h = 11) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, (n * 7) % 60, 0, 0);
  return d;
}

function seed(): Db {
  const users: UserRecord[] = [
    {
      id: "DEO126", role: "deo", name: "Rahul Kumar", fatherName: "Suresh Kumar", motherName: "Sunita Devi",
      dob: "1999-05-14", gender: "Male", category: "GEN", mobile: "9717323761", email: "rahul.demo@example.com",
      state: "Uttar Pradesh", district: "Meerut", tehsil: "Sardhana", pincode: "250342",
      address: "House No. 45, Gandhi Nagar, Sardhana, Meerut", qualification: "12th",
      bank: { bankName: "State Bank of India", holder: "RAHUL KUMAR", account: "30214587961", ifsc: "SBIN0001234" },
      status: "active", joinedAt: iso(daysAgo(95)),
    },
    {
      id: "DEO127", role: "deo", name: "Priya Sharma", fatherName: "Ramesh Sharma", motherName: "Kavita Sharma",
      dob: "2001-11-02", gender: "Female", category: "OBC", mobile: "9811100022", email: "priya.demo@example.com",
      state: "Delhi", district: "East Delhi", tehsil: "Shahdara", pincode: "110032",
      address: "B-12, Vivek Vihar, Shahdara, Delhi", qualification: "Graduation",
      bank: { bankName: "Punjab National Bank", holder: "PRIYA SHARMA", account: "1452000100023", ifsc: "PUNB0145200" },
      status: "active", joinedAt: iso(daysAgo(40)),
    },
    {
      id: "VR101", role: "verifier", name: "Anjali Verma", fatherName: "Mahesh Verma", motherName: "Rekha Verma",
      dob: "1994-03-21", gender: "Female", mobile: "9990011223", email: "verifier.demo@example.com",
      state: "Uttar Pradesh", district: "Meerut", address: "12, Civil Lines, Meerut", qualification: "Post Graduation",
      status: "active", joinedAt: iso(daysAgo(200)),
    },
    {
      id: "ADMIN", role: "admin", name: "Super Admin", mobile: "9000000000",
      email: "admin.demo@example.com", status: "active", joinedAt: iso(daysAgo(365)),
    },
  ];

  const assignments: Assignment[] = [
    {
      id: "ASG001", deoId: "DEO126", taskType: "Student Academic Record",
      area: { state: "Uttar Pradesh", district: "Meerut", block: "Sardhana", village: "Ward 1 – 5" },
      target: 60, rate: 10, deadline: iso(daysAgo(-20)).slice(0, 10),
      note: "Enter Class 10 & 12 student records from the school registers of the listed wards.",
      status: "active", createdAt: iso(daysAgo(90)), seenAt: iso(daysAgo(90)),
    },
    {
      id: "ASG002", deoId: "DEO126", taskType: "School Survey Form",
      area: { state: "Uttar Pradesh", district: "Meerut", block: "Sardhana", village: "Village Salawa" },
      target: 40, rate: 10, deadline: iso(daysAgo(-35)).slice(0, 10),
      note: "Survey forms of government schools in Salawa village.",
      status: "active", createdAt: iso(daysAgo(2)), seenAt: null,
    },
    {
      id: "ASG003", deoId: "DEO127", taskType: "Scholarship Application Data",
      area: { state: "Delhi", district: "East Delhi", block: "Shahdara", village: "Vivek Vihar" },
      target: 50, rate: 10, deadline: iso(daysAgo(-25)).slice(0, 10),
      note: "Scholarship applications received in the September batch.",
      status: "active", createdAt: iso(daysAgo(30)), seenAt: iso(daysAgo(29)),
    },
  ];

  const first = ["Aman", "Pooja", "Rohit", "Neha", "Vikas", "Sneha", "Arjun", "Kajal", "Deepak", "Riya", "Sachin", "Muskan", "Ankit", "Simran", "Gaurav", "Nisha", "Manish", "Payal", "Harsh", "Tanu"];
  const last = ["Singh", "Yadav", "Sharma", "Gupta", "Chauhan", "Tyagi", "Saini", "Jain", "Verma", "Kumar"];
  const fathers = ["Rajesh", "Mukesh", "Satish", "Anil", "Sunil", "Vinod", "Ashok", "Ravi", "Pramod", "Naresh"];
  const schools = ["Govt. Inter College Sardhana", "Saraswati Vidya Mandir", "Kisan Inter College", "Adarsh Public School", "Rajkiya Balika Inter College"];

  const entries: Entry[] = [];
  let n = 1;
  const make = (deoId: string, a: Assignment, day: number, status: Entry["status"], r: number) => {
    const i = n;
    let submitted = daysAgo(day, 10 + (i % 7));
    if (submitted > new Date()) submitted = new Date(Date.now() - ((i % 5) + 1) * 3600000);
    const ln = last[i % last.length];
    entries.push({
      id: "ENT" + pad(n++, 5), deoId, assignmentId: a.id, rate: a.rate,
      data: {
        studentName: `${first[i % first.length]} ${ln}`, fatherName: `${fathers[i % fathers.length]} ${ln}`,
        gender: i % 2 ? "Female" : "Male", dob: `${2006 + (i % 4)}-${pad(1 + (i % 12), 2)}-${pad(1 + (i % 27), 2)}`,
        className: i % 3 ? "10th" : "12th", rollNo: String(240000 + i * 13), school: schools[i % schools.length],
        board: i % 4 ? "UP Board" : "CBSE", percentage: (45 + ((i * 37) % 50) + (i % 10) / 10).toFixed(1),
        village: a.area.village, pincode: a.area.state === "Delhi" ? "110032" : "250342",
        mobile: "98" + pad((i * 7919) % 100000000, 8),
      },
      status, reason: status === "rejected" ? REJECT_REASONS[r % REJECT_REASONS.length] : "",
      submittedAt: iso(submitted),
      verifiedAt: status === "pending" ? null : iso(new Date(submitted.getTime() + 86400000)),
      verifierId: status === "pending" ? null : "VR101",
    });
  };
  for (let d = 88; d >= 3; d -= 2) make("DEO126", assignments[0], d, d % 11 === 0 || d % 11 === 5 ? "rejected" : "approved", d);
  [2, 1, 1, 0, 0].forEach((d) => make("DEO126", assignments[0], d, "pending", 0));
  for (let d = 28; d >= 1; d -= 3) make("DEO127", assignments[2], d, d % 9 === 0 ? "rejected" : d < 6 ? "pending" : "approved", d);

  return {
    users, assignments, entries,
    settings: { rate: 10, payoutWindow: "15th – 25th of every month" },
    counters: { deo: 127, entry: n - 1, assignment: 3 },
  };
}

let cache: Db | null = null;

export function getDb(): Db {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = seed());
  try {
    const raw = localStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as Db) : null;
  } catch {
    cache = null;
  }
  if (!cache?.users) {
    cache = seed();
    saveDb();
  }
  return cache;
}

export function saveDb() {
  if (!cache || typeof window === "undefined") return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked */
  }
}

/** Another tab changed the data: drop the in-memory copy. */
export function reloadDb() {
  cache = null;
}

export function resetDb() {
  cache = seed();
  saveDb();
}

export const nextId = (kind: keyof Db["counters"], prefix: string, width: number) => {
  const db = getDb();
  db.counters[kind] += 1;
  return prefix + (width ? pad(db.counters[kind], width) : db.counters[kind]);
};

import { z } from "zod";
import { RX, zMobile, zPincode, zRequired } from "@/lib/validation";

const mustTick = (msg: string) => z.boolean().refine((v) => v === true, msg);

/* Verhoeff checksum – every valid Aadhaar number passes it. */
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
export function isValidAadhaar(n: string) {
  if (!/^[2-9]\d{11}$/.test(n)) return false;
  let c = 0;
  n.split("").reverse().forEach((ch, i) => (c = D[c][P[i % 8][Number(ch)]]));
  return c === 0;
}
export const maskAadhaar = (n?: string) => (n && n.length === 12 ? `XXXX XXXX ${n.slice(-4)}` : "—");

export const REGISTER_AS = [
  { value: "deo", label: "Data Entry Operator (DEO)", hint: "Enter school & student records in your assigned area" },
  { value: "verifier", label: "Verifier (VR)", hint: "Check and approve records entered by operators" },
] as const;

/** Same rules as the server (nasoi-backend). */
const personName = (label: string) =>
  zRequired(label, 3).max(60, `${label} is too long`).regex(/^[A-Za-z][A-Za-z .'-]*$/, `${label} can contain only letters and spaces`);
const shortText = (label: string) => zRequired(label, 2).max(60, `${label} is too long`);

export const PASSWORD_HINT = "At least 8 characters, with letters and numbers";

/** One Zod schema per step – each step is validated on its own before moving on. */
export const personalSchema = z.object({
  role: z.enum(["deo", "verifier"], { error: "Choose Data Entry Operator or Verifier" }),
  name: personName("Candidate full name"),
  fatherName: personName("Father's name"),
  motherName: personName("Mother's name"),
  dob: zRequired("Date of birth").refine((v) => {
    const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86400000);
    return age >= 18 && age <= 65;
  }, "You must be between 18 and 65 years old"),
  email: z.string().trim().max(80, "Email ID is too long").email("Enter a valid email ID"),
  mobile: zMobile,
  gender: z.string().min(1, "Select gender"),
  category: z.string().min(1, "Select category"),
  religion: z.string().min(1, "Select religion"),
});

export const addressSchema = z.object({
  country: z.string().min(1, "Select country"),
  state: z.string().min(1, "Select state / union territory"),
  district: z.string().min(1, "Select district"),
  tehsil: shortText("Sub district"),
  postOffice: shortText("Post office name"),
  pincode: zPincode,
  policeStation: shortText("Police station name"),
  address: zRequired("Full address", 10).max(200, "Full address is too long"),
});

export const bankSchema = z
  .object({
    bankName: zRequired("Bank name", 3).max(60, "Bank name is too long"),
    holder: personName("Account holder name"),
    account: z.string().regex(RX.account, "Account number should be 9–18 digits"),
    account2: z.string().min(1, "Please re-enter the account number"),
    ifsc: z.string().trim().toUpperCase().regex(RX.ifsc, "Enter a valid 11-character IFSC code (e.g. SBIN0001234)"),
  })
  .refine((v) => v.account === v.account2, { path: ["account2"], message: "Account numbers do not match" });

export const BANK_DOC_TYPES = ["Bank Passbook", "Cancelled Cheque"] as const;

const PAN_RX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const documentsSchema = z.object({
  qualification: z.string().min(1, "Select your highest qualification"),
  aadhaar: z.string().refine(isValidAadhaar, "Enter a valid 12-digit Aadhaar number"),
  aadhaarDocName: z.string().min(1, "Please upload your Aadhaar card"),
  // PAN card is optional, but if a number or a file is given, both are needed.
  pan: z.string().trim().toUpperCase().refine((v) => v === "" || PAN_RX.test(v), "Enter a valid PAN (e.g. ABCDE1234F)"),
  panDocName: z.string(),
  bankDocType: z.string().min(1, "Choose bank passbook or cancelled cheque"),
  bankDocName: z.string().min(1, "Please upload the bank passbook or cancelled cheque"),
  photoName: z.string().min(1, "Please upload your passport size photo"),
  photo: z.string().optional(),
  signatureName: z.string().min(1, "Please upload your signature"),
  signature: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.pan && !v.panDocName) ctx.addIssue({ code: "custom", path: ["panDocName"], message: "Please upload your PAN card" });
  if (!v.pan && v.panDocName) ctx.addIssue({ code: "custom", path: ["pan"], message: "Enter the PAN number for the uploaded card" });
});

export const declarationSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/\d/, "Password must contain a number"),
    password2: z.string().min(1, "Please re-enter the password"),
    declare: mustTick("Please accept the declaration"),
    terms: mustTick("Please accept the Terms & Conditions"),
  })
  .refine((v) => v.password === v.password2, { path: ["password2"], message: "Passwords do not match" });

export const STEP_SCHEMAS = [personalSchema, addressSchema, bankSchema, documentsSchema, declarationSchema] as const;

export const STEPS = [
  { key: "personal", title: "Personal Details", short: "Personal" },
  { key: "address", title: "Address Details", short: "Address" },
  { key: "bank", title: "Banking Details", short: "Bank" },
  { key: "documents", title: "Documents & Qualification", short: "Documents" },
  { key: "review", title: "Preview & Submit", short: "Preview" },
] as const;

export type RegistrationForm = z.input<typeof personalSchema> &
  z.input<typeof addressSchema> &
  z.input<typeof bankSchema> &
  z.input<typeof documentsSchema> &
  z.input<typeof declarationSchema>;

export const EMPTY_FORM: RegistrationForm = {
  role: "" as "deo",
  name: "", fatherName: "", motherName: "", dob: "", email: "", mobile: "", gender: "", category: "", religion: "",
  country: "India", state: "", district: "", tehsil: "", postOffice: "", pincode: "", policeStation: "", address: "",
  bankName: "", holder: "", account: "", account2: "", ifsc: "",
  qualification: "", aadhaar: "", aadhaarDocName: "", pan: "", panDocName: "", bankDocType: "", bankDocName: "",
  photoName: "", photo: "", signatureName: "", signature: "",
  password: "", password2: "",
  declare: false, terms: false,
};

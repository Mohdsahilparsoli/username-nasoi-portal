import { z } from "zod";
import { RX, zMobile, zOptionalMobile, zPincode, zRequired } from "@/lib/validation";

const mustTick = (msg: string) => z.boolean().refine((v) => v === true, msg);

/** One Zod schema per step – each step is validated on its own before moving on. */
export const eligibilitySchema = z.object({
  eligible: mustTick("Please confirm you have passed Class 10th"),
  docConfirm: mustTick("Please confirm you have a valid Class 10th certificate"),
});

export const personalSchema = z.object({
  name: zRequired("Full name", 3),
  fatherName: zRequired("Father's name", 3),
  motherName: zRequired("Mother's name", 3),
  dob: zRequired("Date of birth").refine((v) => {
    const age = (Date.now() - new Date(v).getTime()) / (365.25 * 86400000);
    return age >= 18 && age <= 65;
  }, "You must be between 18 and 65 years old"),
  gender: z.string().min(1, "Select gender"),
  category: z.string().min(1, "Select category"),
  religion: z.string().trim().optional(),
});

export const contactSchema = z
  .object({
    mobile: zMobile,
    altMobile: zOptionalMobile,
    email: z.string().trim().email("Enter a valid email ID"),
    state: z.string().min(1, "Select state"),
    district: z.string().min(1, "Select district"),
    tehsil: zRequired("Tehsil / Sub district"),
    pincode: zPincode,
    address: zRequired("Full address", 10),
  })
  .refine((v) => !v.altMobile || v.altMobile !== v.mobile, {
    path: ["altMobile"],
    message: "Alternate number must be different",
  });

export const bankSchema = z
  .object({
    bankName: zRequired("Bank name", 3),
    holder: zRequired("Account holder name", 3),
    account: z.string().regex(RX.account, "Account number should be 9–18 digits"),
    account2: z.string().min(1, "Please re-enter the account number"),
    ifsc: z.string().trim().toUpperCase().regex(RX.ifsc, "Enter a valid 11-character IFSC code (e.g. SBIN0001234)"),
  })
  .refine((v) => v.account === v.account2, { path: ["account2"], message: "Account numbers do not match" });

export const documentsSchema = z.object({
  qualification: z.string().min(1, "Select your highest qualification"),
  photo: z.string().min(1, "Please upload a passport size photo"),
  certificateName: z.string().min(1, "Please upload your qualification certificate"),
});

export const declarationSchema = z.object({
  declare: mustTick("Please accept the declaration"),
  terms: mustTick("Please accept the Terms & Conditions"),
});

export const STEP_SCHEMAS = [
  eligibilitySchema,
  personalSchema,
  contactSchema,
  bankSchema,
  documentsSchema,
  declarationSchema,
] as const;

export const STEPS = [
  { key: "eligibility", title: "Eligibility", short: "Eligibility" },
  { key: "personal", title: "Personal Details", short: "Personal" },
  { key: "contact", title: "Contact & Address", short: "Contact" },
  { key: "bank", title: "Bank Details", short: "Bank" },
  { key: "documents", title: "Qualification & Documents", short: "Documents" },
  { key: "review", title: "Review & Submit", short: "Review" },
] as const;

export type RegistrationForm = z.input<typeof eligibilitySchema> &
  z.input<typeof personalSchema> &
  z.input<typeof contactSchema> &
  z.input<typeof bankSchema> &
  z.input<typeof documentsSchema> &
  z.input<typeof declarationSchema>;

export const EMPTY_FORM: RegistrationForm = {
  eligible: false, docConfirm: false,
  name: "", fatherName: "", motherName: "", dob: "", gender: "", category: "", religion: "",
  mobile: "", altMobile: "", email: "", state: "", district: "", tehsil: "", pincode: "", address: "",
  bankName: "", holder: "", account: "", account2: "", ifsc: "",
  qualification: "", photo: "", certificateName: "",
  declare: false, terms: false,
};

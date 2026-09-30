import { z } from "zod";

export const RX = {
  mobile: /^[6-9]\d{9}$/,
  pincode: /^[1-9]\d{5}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  account: /^\d{9,18}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/,
};

export const zMobile = z.string().trim().regex(RX.mobile, "Enter a valid 10-digit mobile number");
export const zOptionalMobile = z
  .string()
  .trim()
  .refine((v) => v === "" || RX.mobile.test(v), "Enter a valid 10-digit mobile number")
  .optional();
export const zPincode = z.string().trim().regex(RX.pincode, "Enter a valid 6-digit pincode");
export const zRequired = (label: string, min = 1) =>
  z.string().trim().min(min, min > 1 ? `${label} is too short` : `${label} is required`);

/** Data entry record (entered by DEO, checked by Verifier). */
export const entrySchema = z.object({
  studentName: zRequired("Student name", 3),
  fatherName: zRequired("Father's name", 3),
  gender: zRequired("Gender"),
  dob: zRequired("Date of birth").refine((v) => new Date(v) <= new Date(), "Date cannot be in the future"),
  className: zRequired("Class"),
  rollNo: zRequired("Roll number"),
  school: zRequired("School name", 3),
  board: zRequired("Board"),
  percentage: z
    .string()
    .trim()
    .min(1, "Percentage is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, "Enter 0 – 100"),
  village: zRequired("Village / Ward"),
  pincode: zPincode,
  mobile: zOptionalMobile,
});
export type EntryForm = z.infer<typeof entrySchema>;

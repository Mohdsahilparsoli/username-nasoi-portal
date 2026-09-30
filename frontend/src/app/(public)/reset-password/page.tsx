import { AuthPage } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

// The reset token must never leak to other sites through the Referer header.
export const metadata = { title: "Reset Password", referrer: "no-referrer" as const };

export default function ResetPasswordPage() {
  return (
    <AuthPage>
      <ResetPasswordForm />
    </AuthPage>
  );
}

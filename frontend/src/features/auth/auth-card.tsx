import Image from "next/image";

/** Card shell shared by the login, forgot-password and reset-password pages. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="px-6 pt-7 text-center">
        <Image src="/brand/logo.png" alt="NASOI" width={112} height={112} unoptimized className="mx-auto size-24" priority />
        <p className="mt-2 text-lg font-bold text-primary">National Academic Services of India</p>
      </div>
      <div className="tricolor mt-5" />
      {children}
    </div>
  );
}

export function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-110px)] place-items-center bg-gradient-to-br from-primary-soft to-saffron-soft px-4 py-10">
      {children}
    </div>
  );
}

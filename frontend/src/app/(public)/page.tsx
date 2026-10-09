import { LogIn, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-navy via-primary to-[#2a55b8] py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
          <Image
            src="/brand/logo.png"
            alt="National Academic Services of India"
            width={176}
            height={176}
            unoptimized
            priority
            className="size-36 rounded-full bg-white p-1.5 shadow-2xl sm:size-44"
          />
          <h1 className="mt-6 text-3xl font-bold leading-tight text-white sm:text-5xl">National Academic Services of India</h1>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="saffron" size="lg">
              <Link href="/register"><UserPlus /> New Registration</Link>
            </Button>
            <Button asChild variant="onDark" size="lg">
              <Link href="/login"><LogIn /> Login</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-saffron-soft py-12 text-center">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="mt-1 text-muted">Registration takes about 5 minutes.</p>
        <Button asChild className="mt-4" size="lg">
          <Link href="/register"><UserPlus /> New Registration</Link>
        </Button>
      </section>
    </>
  );
}

import { SiteFooter } from "@/components/layout/site-footer";
import { DemoStrip, SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoStrip />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

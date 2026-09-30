export function PageBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="bg-navy py-10 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-slate-300">{subtitle}</p>
      </div>
    </section>
  );
}

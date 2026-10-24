// Editorial section: a small italic heading in the margin, content to the right.
export function Section({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-12 ${className}`}>
      <div className="lg:col-span-3">
        <h2 className="font-serif text-[1.6rem] italic leading-tight">{title}</h2>
        {aside && <div className="meta mt-2 max-w-[30ch]">{aside}</div>}
      </div>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  );
}

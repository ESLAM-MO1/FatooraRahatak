interface HeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section className="py-16 text-center text-white" style={{ backgroundColor: "var(--blue-deep)" }}>
      <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
      {subtitle != null && <div className="text-[15px] opacity-80">{subtitle}</div>}
    </section>
  );
}

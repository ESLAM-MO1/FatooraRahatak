interface HeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  imageUrl?: string;
}

export default function Hero({ title, subtitle, imageUrl }: HeroProps) {
  return (
    <section
      className="relative py-16 text-center text-white overflow-hidden"
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "var(--blue-deep)" }
      }
    >
      {imageUrl && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "var(--blue-deep)", opacity: 0.55 }}
        />
      )}
      <div className="relative z-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        {subtitle != null && <div className="text-[15px] opacity-80">{subtitle}</div>}
      </div>
    </section>
  );
}

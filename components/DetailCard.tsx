export default function DetailCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--sub)] mb-1">{label}</p>
      <p className="text-[15px] font-bold text-[var(--ink)]">{value ?? "—"}</p>
    </div>
  );
}

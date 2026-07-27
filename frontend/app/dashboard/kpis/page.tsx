"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface KpiData {
  mrr: number;
  arr: number;
  activeStoresCount: number;
  trialToPaidConversion: number;
  churnRate: number;
  monthlyGrowth: { month: string; newStores: number; cancelledSubscriptions: number }[];
  packageDistribution: { packageName: string; storeCount: number }[];
  topRevenueStores: { id: number; storeName: string; packageName: string; monthlyRevenue: number }[];
  atRiskStores: { id: number; storeName: string; ownerName: string; ownerEmail: string; packageName: string; lastLoginAt: string | null; createdAt: string }[];
}

function LineChart({ data }: { data: { month: string; newStores: number; cancelledSubscriptions: number }[] }) {
  const w = 700, h = 260, pad = 40;
  const allVals = data.flatMap(d => [d.newStores, d.cancelledSubscriptions]);
  const max = Math.max(...allVals, 1);
  const xStep = (w - pad * 2) / (data.length - 1 || 1);
  const yScale = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const newLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${pad + i * xStep} ${yScale(d.newStores)}`).join(" ");
  const canLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${pad + i * xStep} ${yScale(d.cancelledSubscriptions)}`).join(" ");

  const yTicks = [0, Math.round(max / 2), max];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ maxHeight: 260 }}>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={pad} y1={yScale(t)} x2={w - pad} y2={yScale(t)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={pad - 8} y={yScale(t) + 4} textAnchor="end" className="text-[10px] fill-[var(--sub)]">{t}</text>
        </g>
      ))}
      <path d={newLine} fill="none" stroke="var(--blue)" strokeWidth="2" />
      {data.map((d, i) => (
        <circle key={i} cx={pad + i * xStep} cy={yScale(d.newStores)} r="3" fill="var(--blue)" />
      ))}
      <path d={canLine} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
      {data.map((d, i) => (
        <circle key={i} cx={pad + i * xStep} cy={yScale(d.cancelledSubscriptions)} r="3" fill="#ef4444" />
      ))}
      {data.filter((_, i) => i % 2 === 0 || i === data.length - 1).map((d, fi) => {
        const i = data.indexOf(d);
        return (
          <text key={i} x={pad + i * xStep} y={h - 6} textAnchor="middle" className="text-[9px] fill-[var(--sub)]">
            {d.month}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({ data }: { data: { packageName: string; storeCount: number }[] }) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + d.storeCount, 0) || 1;
  const cx = 120, cy = 120, r = 80, ir = 50;
  const colors = ["#12A8DB", "#1EC8C8", "#C9A227", "#8A7B1F"];
  let acc = 0;
  const arcs = data.map((d, i) => {
    const pct = d.storeCount / total;
    const angle = pct * 360;
    const start = acc;
    acc += angle;
    const sr = ((start - 90) * Math.PI) / 180;
    const er = ((start + angle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
    const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
    const xi1 = cx + ir * Math.cos(sr), yi1 = cy + ir * Math.sin(sr);
    const xi2 = cx + ir * Math.cos(er), yi2 = cy + ir * Math.sin(er);
    const large = angle > 180 ? 1 : 0;
    return (
      <g key={i}>
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`}
          fill={colors[i % colors.length]}
        />
      </g>
    );
  });

  return (
    <svg viewBox="0 0 240 200" className="w-full h-auto" style={{ maxHeight: 200 }}>
      {arcs}
      <text x={cx} y={cy - 4} textAnchor="middle" className="text-lg font-bold fill-[var(--ink)]">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-[var(--sub)]">{t("kpis.total")}</text>
    </svg>
  );
}

export default function KpisPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/kpis")
      .then(res => setData(res.data.data))
      .catch(() => setError(t("kpis.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <LoadingState />;

  if (error) return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={t("kpis.title")} />
      <div className="alert alert--danger">{error}</div>
    </div>
  );

  if (!data) return null;

  const formatCurrency = (v: number) => v.toLocaleString("ar-SA") + " " + t("common.currency");

  const donutColors = ["#12A8DB", "#1EC8C8", "#C9A227", "#8A7B1F"];

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  };

  const safeDisplay = (val: string | null | undefined) => {
    if (!val || val === "string" || /^[?\s]{2,}$/.test(val) || /^\?{2,}/.test(val)) return t("common.unspecified");
    return val;
  };

  const ROW_STYLES = ["bg-white", "bg-[var(--blue-50)]"];

  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={t("kpis.title")} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card p-4 flex flex-col items-center text-center">
          <p className="text-[13px] text-[var(--sub)] mb-1">{t("kpis.mrr")}</p>
          <p className="text-[22px] font-bold text-[var(--blue)]">{formatCurrency(data.mrr)}</p>
        </div>
        <div className="card p-4 flex flex-col items-center text-center">
          <p className="text-[13px] text-[var(--sub)] mb-1">{t("kpis.arr")}</p>
          <p className="text-[22px] font-bold text-[var(--blue)]">{formatCurrency(data.arr)}</p>
        </div>
        <div className="card p-4 flex flex-col items-center text-center">
          <p className="text-[13px] text-[var(--sub)] mb-1">{t("kpis.activeStores")}</p>
          <p className="text-[22px] font-bold text-[var(--green)]">{data.activeStoresCount}</p>
        </div>
        <div className="card p-4 flex flex-col items-center text-center">
          <p className="text-[13px] text-[var(--sub)] mb-1">{t("kpis.conversion")}</p>
          <p className={`text-[22px] font-bold ${data.trialToPaidConversion >= 30 ? "text-[var(--green)]" : data.trialToPaidConversion >= 15 ? "text-[var(--gold)]" : "text-red-500"}`}>
            {data.trialToPaidConversion}%
          </p>
        </div>
        <div className="card p-4 flex flex-col items-center text-center">
          <p className="text-[13px] text-[var(--sub)] mb-1">{t("kpis.churnRate")}</p>
          <p className={`text-[22px] font-bold ${data.churnRate <= 5 ? "text-[var(--green)]" : data.churnRate <= 10 ? "text-[var(--gold)]" : "text-red-500"}`}>
            {data.churnRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-[14px] font-bold text-[var(--ink)] mb-3">{t("kpis.monthlyGrowth")}</h3>
          {data.monthlyGrowth.length > 0 ? (
            <>
              <div className="flex items-center gap-4 text-[11px] text-[var(--sub)] mb-2">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[var(--blue)] inline-block" /> {t("kpis.newStores")}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> {t("kpis.cancelled")}</span>
              </div>
              <LineChart data={data.monthlyGrowth} />
            </>
          ) : (
            <p className="text-[13px] text-[var(--sub)] py-8 text-center">{t("kpis.noData")}</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-[14px] font-bold text-[var(--ink)] mb-3">{t("kpis.packageDist")}</h3>
          {data.packageDistribution.length > 0 ? (
            <>
              <DonutChart data={data.packageDistribution} />
              <div className="mt-2 space-y-1.5">
                {data.packageDistribution.map((p, i) => (
                  <div key={p.packageName} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: donutColors[i % donutColors.length] }} />
                    <span className="flex-1 text-[var(--ink)]">{p.packageName}</span>
                    <span className="font-bold text-[var(--ink)]">{p.storeCount}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[var(--sub)] py-8 text-center">{t("kpis.noData")}</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[14px] font-bold text-[var(--ink)]">{t("kpis.topRevenue")}</h3>
        </div>
        {data.topRevenueStores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[12px] font-bold text-[var(--sub)] bg-[var(--blue-50)]">
                  <th className="px-4 py-3 text-right">#</th>
                  <th className="px-4 py-3 text-right">{t("kpis.storeName")}</th>
                  <th className="px-4 py-3 text-right">{t("kpis.packageName")}</th>
                  <th className="px-4 py-3 text-right">{t("kpis.monthlyRevenue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.topRevenueStores.map((s, i) => (
                  <tr key={s.id} className={ROW_STYLES[i % 2] + " text-[13px] border-b border-[var(--border)]"}>
                    <td className="px-4 py-3 text-[var(--sub)]">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-[var(--ink)]">{safeDisplay(s.storeName)}</td>
                    <td className="px-4 py-3 text-[var(--sub)]">{safeDisplay(s.packageName)}</td>
                    <td className="px-4 py-3 font-bold text-[var(--green)]">{formatCurrency(s.monthlyRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--sub)] py-8 text-center">{t("kpis.noData")}</p>
        )}
      </div>

      <div className="card">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--ink)]">{t("kpis.atRisk")}</h3>
          {data.atRiskStores.length > 0 && (
            <span className="badge badge--red">{data.atRiskStores.length}</span>
          )}
        </div>
        {data.atRiskStores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[12px] font-bold text-[var(--sub)] bg-[var(--blue-50)]">
                  <th className="px-4 py-3 text-right">{t("kpis.storeName")}</th>
                  <th className="px-4 py-3 text-right">{t("kpis.ownerName")}</th>
                  <th className="px-4 py-3 text-right">{t("kpis.packageName")}</th>
                  <th className="px-4 py-3 text-right">{t("kpis.lastLogin")}</th>
                </tr>
              </thead>
              <tbody>
                {data.atRiskStores.map((s, i) => (
                  <tr key={s.id} className={ROW_STYLES[i % 2] + " text-[13px] border-b border-[var(--border)]"}>
                    <td className="px-4 py-3 font-bold text-[var(--ink)]">{safeDisplay(s.storeName)}</td>
                    <td className="px-4 py-3 text-[var(--sub)]">
                      {safeDisplay(s.ownerName)}
                      {s.ownerEmail && s.ownerEmail !== "string" && !/^\?{2,}/.test(s.ownerEmail) ? (
                        <><br /><span className="text-[11px]">{s.ownerEmail}</span></>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--sub)]">{safeDisplay(s.packageName)}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge--red">{formatDate(s.lastLoginAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--sub)] py-8 text-center">{t("kpis.noAtRisk")}</p>
        )}
      </div>
    </div>
  );
}

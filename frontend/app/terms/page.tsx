"use client"; import { useEffect, useState } from "react"; import { useTranslation } from "react-i18next"; import { SiteLayout } from "../site-layout"; import LoadingState from "@/components/LoadingState"; import "@/lib/i18n/config";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";
interface PD { title: string; content: string }
export default function Page() {
  const { t } = useTranslation();
  const [data, setData] = useState<PD | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { fetch(`${API}/site/pages/terms-of-use`).then(r => r.json()).then(j => setData(j.data)).catch(() => setError(t("error.serverError"))).finally(() => setLoading(false)); }, []);
  if (loading) return <SiteLayout><LoadingState /></SiteLayout>;
  if (error) return <SiteLayout><div className="max-w-3xl mx-auto px-4 py-16 text-center"><p className="text-[var(--sub)]">{error}</p></div></SiteLayout>;
  return <SiteLayout><article className="max-w-3xl mx-auto px-4 py-16"><h1 className="text-3xl font-extrabold mb-6" style={{color:"var(--blue-deep)"}}>{data?.title}</h1><div className="prose prose-lg" dangerouslySetInnerHTML={{__html: data?.content || ""}} /></article></SiteLayout>;
}

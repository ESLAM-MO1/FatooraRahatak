"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

export default function ReturnPolicyPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [policyText, setPolicyText] = useState<string | null>(null);
  const [returnDays, setReturnDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/public/stores/${slug}/return-policy`);
        setPolicyText(res.data.data.returnPolicyText);
        setReturnDays(res.data.data.returnPolicyDays ?? null);
      } catch (err: any) {
        setError(err.response?.data?.message || t("returnPolicy.errorLoading"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="alert alert--danger mb-4">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {returnDays && returnDays > 0 ? (
          <div className="mb-4 rounded-lg bg-blue-50 text-blue-800 border border-blue-100 px-4 py-3 text-sm font-medium">
            {t("returnPolicy.daysNotice", { days: returnDays })}
          </div>
        ) : null}
        {policyText ? (
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">{policyText}</p>
        ) : (
          <p className="text-gray-500">{t("returnPolicy.notSet")}</p>
        )}
      </div>
    </div>
  );
}

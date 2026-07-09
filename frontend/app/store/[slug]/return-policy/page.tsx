"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function ReturnPolicyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [policyText, setPolicyText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/public/stores/${slug}/return-policy`);
        setPolicyText(res.data.data.returnPolicyText);
      } catch (err: any) {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل سياسة الاسترجاع");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← العودة للمتجر
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">سياسة الاسترجاع</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {policyText ? (
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">{policyText}</p>
        ) : (
          <p className="text-gray-500">لا توجد سياسة استرجاع محددة حاليًا</p>
        )}
      </div>
    </div>
  );
}
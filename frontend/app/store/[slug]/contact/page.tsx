"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface ContactData {
  phone: string | null;
  email: string | null;
  address: string | null;
}

export default function ContactPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/public/stores/${slug}/contact`);
        setContact(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل بيانات التواصل");
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

  const hasAnyContactInfo = contact && (contact.phone || contact.email || contact.address);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← العودة للمتجر
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">تواصل معنا</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
        {!hasAnyContactInfo ? (
          <p className="text-gray-500">لا توجد بيانات تواصل محددة حاليًا</p>
        ) : (
          <>
            {contact?.phone && (
              <div>
                <p className="text-sm text-gray-500">رقم الجوال</p>
                <p className="text-gray-800 font-medium">{contact.phone}</p>
              </div>
            )}
            {contact?.email && (
              <div>
                <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                <p className="text-gray-800 font-medium">{contact.email}</p>
              </div>
            )}
            {contact?.address && (
              <div>
                <p className="text-sm text-gray-500">العنوان</p>
                <p className="text-gray-800 font-medium">{contact.address}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
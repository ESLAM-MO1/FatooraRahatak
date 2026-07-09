"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;

  const [checking, setChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkStoreStatus = async () => {
      setChecking(true);
      try {
        const res = await api.get(`/public/stores/${slug}`);
        setIsOffline(res.data.data.isOnline === false);
      } catch {
        // لو المتجر مش موجود أصلاً أو أي خطأ تاني، نسيب صفحات الأبناء
        // تتعامل مع الحالة دي بنفسها (زي ما كانت بتعمل قبل هذا التعديل)
        setIsOffline(false);
      } finally {
        setChecking(false);
      }
    };

    checkStoreStatus();
  }, [slug]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center max-w-md">
          <p className="text-xl font-bold text-gray-800 mb-2">المتجر غير متاح حاليًا</p>
          <p className="text-gray-500 text-sm">
            هذا المتجر متوقف مؤقتًا عن استقبال الزيارات من صاحب المتجر. حاول مرة أخرى لاحقًا.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <div className="flex-1">{children}</div>

      <footer className="border-t border-gray-200 bg-white mt-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center gap-6 text-sm text-gray-500">
          <Link href={`/store/${slug}/return-policy`} className="hover:text-blue-600 hover:underline">
            سياسة الاسترجاع
          </Link>
          <Link href={`/store/${slug}/contact`} className="hover:text-blue-600 hover:underline">
            تواصل معنا
          </Link>
        </div>
      </footer>
    </div>
  );
}
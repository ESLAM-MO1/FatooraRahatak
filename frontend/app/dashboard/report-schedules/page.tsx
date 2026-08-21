"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";

// صفحة "إدارة التقارير" دُمجت داخل /dashboard/reports (تبويب "جدولة التقارير").
// هذه الصفحة موجودة فقط عشان أي رابط أو مفضلة قديمة يشتغل بدون كسر.
export default function ReportSchedulesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/reports?tab=schedules");
  }, [router]);

  return <LoadingState />;
}
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface ContactData {
  phone: string | null;
  email: string | null;
  address: string | null;
}

export default function ContactPage() {
  const { t } = useTranslation();
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
        setError(t("error.serverError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const hasAnyContactInfo = contact && (contact.phone || contact.email || contact.address);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
        {!hasAnyContactInfo ? (
          <p className="text-gray-500">{t("storeContact.noData")}</p>
        ) : (
          <>
            {contact?.phone && (
              <div>
                <p className="text-sm text-gray-500">{t("storeContact.phoneLabel")}</p>
                <p className="text-gray-800 font-medium">{contact.phone}</p>
              </div>
            )}
            {contact?.email && (
              <div>
                <p className="text-sm text-gray-500">{t("storeContact.emailLabel")}</p>
                <p className="text-gray-800 font-medium">{contact.email}</p>
              </div>
            )}
            {contact?.address && (
              <div>
                <p className="text-sm text-gray-500">{t("storeContact.addressLabel")}</p>
                <p className="text-gray-800 font-medium">{contact.address}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

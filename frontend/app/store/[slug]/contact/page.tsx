"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { useStore } from "@/components/StoreContext";
import StoreSocialLinks from "@/components/store-templates/StoreSocialLinks";
import { resolveSocialUrl } from "@/components/store-templates/social";
import { MailIcon, PhoneIcon, MapPinIcon } from "@/components/store-templates/icons";

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

  const store = useStore();

  const hasSocial = store &&
    !!(store.facebookUrl || store.instagramUrl || store.whatsappUrl || store.snapchatUrl || store.tiktokUrl || store.telegramUrl || store.linkedinUrl);

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      {error && (
        <div className="alert alert--danger mb-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 space-y-5">
        <h1 className="text-lg font-extrabold text-gray-900">{t("storefront.contactHeading")}</h1>

        {!hasAnyContactInfo ? (
          <p className="text-gray-500">{t("storeContact.noData")}</p>
        ) : (
          <div className="grid gap-4">
            {contact?.phone && (
              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <span className="flex items-center justify-center shrink-0 rounded-xl text-white" style={{ width: 46, height: 46, background: "#2563eb" }}>
                  <PhoneIcon size={20} />
                </span>
                <span>
                  <span className="block text-[12px] text-gray-500">{t("storeContact.phoneLabel")}</span>
                  <span className="block text-gray-800 font-bold" dir="ltr">{contact.phone}</span>
                </span>
              </a>
            )}
            {contact?.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <span className="flex items-center justify-center shrink-0 rounded-xl text-white" style={{ width: 46, height: 46, background: "#ea580c" }}>
                  <MailIcon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-gray-500">{t("storeContact.emailLabel")}</span>
                  <span className="block text-gray-800 font-bold truncate" dir="ltr">{contact.email}</span>
                </span>
              </a>
            )}
            {contact?.address && (
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <span className="flex items-center justify-center shrink-0 rounded-xl text-white" style={{ width: 46, height: 46, background: "#16a34a" }}>
                  <MapPinIcon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-gray-500">{t("storeContact.addressLabel")}</span>
                  <span className="block text-gray-800 font-bold">{contact.address}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {hasSocial && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[13px] font-bold text-gray-800 mb-3">{t("storefront.followUs")}</p>
            <StoreSocialLinks
              urls={{
                facebook: resolveSocialUrl(store?.facebookUrl),
                instagram: resolveSocialUrl(store?.instagramUrl),
                whatsapp: resolveSocialUrl(store?.whatsappUrl),
                snapchat: resolveSocialUrl(store?.snapchatUrl),
                tiktok: resolveSocialUrl(store?.tiktokUrl),
                telegram: resolveSocialUrl(store?.telegramUrl),
                linkedin: resolveSocialUrl(store?.linkedinUrl),
              }}
              linkClassName="flex items-center justify-center rounded-xl transition-transform hover:scale-105"
              linkStyle={{ width: 40, height: 40, background: "#f3f4f6", color: "#374151" }}
              iconSize={18}
            />
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export default function CreateStorePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateSlug = (slug: string) => {
    if (!slug) {
      setSlugError(t("createStore.slugRequired"));
      return false;
    }
    if (!SLUG_REGEX.test(slug)) {
      setSlugError(t("createStore.slugInvalid"));
      return false;
    }
    setSlugError("");
    return true;
  };

  const handleSlugChange = (value: string) => {
    setStoreSlug(value);
    if (value) validateSlug(value);
    else setSlugError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateSlug(storeSlug)) return;

    setLoading(true);
    try {
      await api.post("/stores", {
        storeName,
        storeSlug,
        defaultLanguage: "ar",
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || t("createStore.createError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader icon="store" title={t("store.create")} />

      <div className="card p-6 max-w-lg">
        {error && <div className="alert alert--danger mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              {t("store.name")}
            </label>
            <div className="field-shell">
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                placeholder={t("createStore.namePlaceholder")}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              {t("createStore.slug")}
            </label>
            <div className="field-shell">
              <input
                type="text"
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                dir="ltr"
                placeholder="my-store"
              />
            </div>
            {slugError ? (
              <p className="text-[var(--danger)] text-[11.5px] mt-1.5">{slugError}</p>
            ) : (
              <p className="text-[var(--sub)] text-[11.5px] mt-1.5">
                {t("createStore.slugHint")}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {loading ? t("createStore.creating") : t("createStore.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

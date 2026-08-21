"use client";
import { useParams, redirect } from "next/navigation";
import { useStore } from "@/components/StoreContext";
import StoreContentPage from "@/components/store-templates/StoreContentPage";
import { useStorePageContent } from "@/lib/storePages";

export default function PrivacyPolicyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const store = useStore();
  const { title, content, isEnabled } = useStorePageContent("privacy-policy");

  if (!isEnabled) redirect(`/store/${slug}`);
  return <StoreContentPage slug={slug} title={title} content={content} storeName={store.storeName} />;
}
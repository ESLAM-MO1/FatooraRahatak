"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const BANNER_SLUGS = ["zahbe", "lmsah", "ramzrahatk"];
const BANNER_DOMAINS = ["rahtkm.sa", "rrahtkm.com", "rahatk.sa", "thqah.net", "wudrahatk.com", "ruknrahatk.com", "rafahrahatak.com"];

export default function StoreFooterBanner() {
  const params = useParams();
  const slug = String(params?.slug || "").toLowerCase();
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname.toLowerCase().replace(/^www\./, ""));
  }, []);

  if (!BANNER_SLUGS.includes(slug) && !BANNER_DOMAINS.includes(host)) return null;

  return (
    <div className="flex justify-center px-4 pb-6">
      <img src="https://rahtk.sa/uploads/footer-banner.png" alt="" className="block w-full max-w-[560px] lg:max-w-[900px] h-auto" />
    </div>
  );
}

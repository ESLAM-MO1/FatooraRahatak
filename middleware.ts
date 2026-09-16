import { NextRequest, NextResponse } from "next/server";

const PLATFORM_HOSTNAMES = ["rahtk.sa", "www.rahtk.sa", "localhost"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  const isPlatformHost = PLATFORM_HOSTNAMES.includes(hostname);
  if (isPlatformHost) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(
      `${API_BASE}/public/stores/resolve-domain?domain=${encodeURIComponent(hostname)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.next();
    }
    const json = await res.json();
    const slug = json?.data?.slug;
    if (!slug) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith(`/store/${slug}`)) {
      url.pathname = `/store/${slug}${url.pathname === "/" ? "" : url.pathname}`;
    }
    return NextResponse.rewrite(url);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

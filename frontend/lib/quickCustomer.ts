export interface QuickLoginCustomer {
  userId?: number | null;
  fullName: string;
  email: string;
  phone: string;
  lastAddress?: string;
  sessionToken?: string;
  orderCount?: number;
  recentOrders: { orderNumber: string; totalAmount: number; status: string }[];
}

const keyFor = (slug: string) => `quick_customer_${slug}`;

export function getQuickCustomer(slug: string): QuickLoginCustomer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(slug));
    if (!raw) return null;
    return JSON.parse(raw) as QuickLoginCustomer;
  } catch {
    return null;
  }
}

export function setQuickCustomer(slug: string, customer: QuickLoginCustomer | null) {
  if (typeof window === "undefined") return;
  try {
    if (customer) {
      localStorage.setItem(keyFor(slug), JSON.stringify(customer));
    } else {
      localStorage.removeItem(keyFor(slug));
    }
  } catch {
    /* ignore */
  }
}

export function clearQuickCustomer(slug: string) {
  setQuickCustomer(slug, null);
}

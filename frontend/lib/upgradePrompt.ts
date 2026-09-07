const UPGRADE_EVENT = "upgrade-prompt";

export function triggerUpgradePrompt(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { message } }));
}

export function onUpgradePrompt(cb: (message: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ message: string }>).detail;
    cb(detail?.message || "");
  };
  window.addEventListener(UPGRADE_EVENT, handler);
  return () => window.removeEventListener(UPGRADE_EVENT, handler);
}

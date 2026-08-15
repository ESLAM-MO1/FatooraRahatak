"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface ManagedDomain {
  id: number; domainName: string; storeId?: number; storeName?: string; status: string;
  dnsStatus: string; sslStatus: string; isPrimary: boolean; createdAt: string; type: string;
}
interface SslCert {
  id: number; managedDomainId: number; domainName: string; issuer: string;
  expiresAt: string; status: string; lastRenewedAt?: string;
}
interface DnsRecord {
  id: number; recordType: string; name: string; value: string; ttl: number;
  priority?: number; status: string;
}
interface RedirectRule {
  id: number; sourceDomain: string; targetUrl: string; redirectType: number;
  isActive: boolean; createdAt: string;
}
interface EmailSetup {
  id: number; domainName: string; mailboxName: string; emailAddress: string;
  isActive: boolean; provider: string; createdAt: string;
}
interface RegistrationRequest {
  id: number; domainName: string; registrantName: string; registrantEmail: string;
  status: string; createdAt: string;
}
interface BlacklistEntry {
  id: number; domainOrPattern: string; reason: string; addedByAdmin: string; createdAt: string;
}

type TabKey = "subdomains" | "custom-domains" | "ssl" | "dns" | "redirects" | "monitoring" | "email" | "registration" | "blacklist";

const TAB_INFO: Record<TabKey, { descKey: string; example: string }> = {
  subdomains: { descKey: "domains.tabSubdomainsDesc", example: "mystore.fatoora.app" },
  "custom-domains": { descKey: "domains.tabCustomDomainsDesc", example: "myshop.com" },
  ssl: { descKey: "domains.tabSslDesc", example: "https://" },
  dns: { descKey: "domains.tabDnsDesc", example: "A / CNAME / MX" },
  redirects: { descKey: "domains.tabRedirectsDesc", example: "301 / 302" },
  monitoring: { descKey: "domains.tabMonitoringDesc", example: "google.com" },
  email: { descKey: "domains.tabEmailDesc", example: "info@myshop.com" },
  registration: { descKey: "domains.tabRegistrationDesc", example: ".com / .net" },
  blacklist: { descKey: "domains.tabBlacklistDesc", example: "*.spam.com" },
};

export default function DomainsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<TabKey>("subdomains");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [domains, setDomains] = useState<ManagedDomain[]>([]);
  const [sslCerts, setSslCerts] = useState<SslCert[]>([]);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);
  const [emailSetups, setEmailSetups] = useState<EmailSetup[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  const [domainLookup, setDomainLookup] = useState<{ available: boolean; registrant?: string } | null>(null);
  const [lookupDomain, setLookupDomain] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifyDomain, setVerifyDomain] = useState("");

  const [showAddDomain, setShowAddDomain] = useState(false);
  const [showAddDns, setShowAddDns] = useState(false);
  const [showAddRedirect, setShowAddRedirect] = useState(false);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);

  const [newDomainName, setNewDomainName] = useState("");
  const [newStoreId, setNewStoreId] = useState("");
  const [dnsForm, setDnsForm] = useState({ recordType: "A", name: "", value: "", ttl: 3600, priority: 0 });
  const [redirectForm, setRedirectForm] = useState({ sourceDomain: "", targetUrl: "", redirectType: 302, isActive: true });
  const [emailForm, setEmailForm] = useState({ domainName: "", mailboxName: "", provider: "Zoho" });
  const [regForm, setRegForm] = useState({ domainName: "", registrantName: "", registrantEmail: "" });
  const [blacklistForm, setBlacklistForm] = useState({ domainOrPattern: "", reason: "" });

  const loadDomains = () => {
    setLoading(true); setError("");
    api.get("/admin/domains").then(r => { setDomains(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadSsl = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/ssl").then(r => { setSslCerts(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadDns = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/dns-records").then(r => { setDnsRecords(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadRedirects = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/redirects").then(r => { setRedirects(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadEmails = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/email-setups").then(r => { setEmailSetups(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadRegistrations = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/registrations").then(r => { setRegistrations(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };
  const loadBlacklist = () => {
    setLoading(true); setError("");
    api.get("/admin/domains/blacklist").then(r => { setBlacklist(r.data.data); setLoading(false); }).catch(() => { setError(t("domains.loadError")); setLoading(false); });
  };

  useEffect(() => {
    const loaders: Record<TabKey, () => void> = {
      subdomains: loadDomains,
      "custom-domains": loadDomains,
      ssl: loadSsl,
      dns: loadDns,
      redirects: loadRedirects,
      monitoring: loadDomains,
      email: loadEmails,
      registration: loadRegistrations,
      blacklist: loadBlacklist,
    };
    loaders[activeTab]();
  }, [activeTab]);

  const statusBadge = (status: string) => {
    const s = status || "";
    const lower = s.toLowerCase();
    const cls = lower === "active" || lower === "verified" || lower === "issued" || lower === "completed" || lower === "available"
      ? "badge badge--green"
      : lower === "pending" || lower === "pendingdns" || lower === "issuing"
      ? "badge badge--yellow"
      : lower === "failed" || lower === "expired"
      ? "badge badge--red"
      : "badge badge--gray";
    const key = lower === "pendingdns" ? "domains.status.pendingDns" : `domains.status.${lower}`;
    return <span className={cls}>{t(key, { defaultValue: s })}</span>;
  };

  const handleCreateDomain = async () => {
    try {
      const type = activeTab === "subdomains" ? "Subdomain" : "Custom";
      await api.post("/admin/domains", { domainName: newDomainName, storeId: Number(newStoreId) || null, type });
      setShowAddDomain(false); setNewDomainName(""); setNewStoreId(""); loadDomains();
    } catch { setError(t("domains.actionError")); }
  };
  const handleVerifyDns = async () => {
    try {
      const r = await api.get(`/admin/domains/verify-dns?domain=${verifyDomain}`);
      setVerificationResult(r.data.data);
    } catch { setVerificationResult(null); setError(t("domains.actionError")); }
  };
  const handleRequestSsl = async (domainId: number) => {
    try { await api.post(`/admin/domains/ssl/${domainId}/request`); loadSsl(); } catch { setError(t("domains.actionError")); }
  };
  const handleRenewSsl = async () => {
    try { await api.post("/admin/domains/ssl/renew-expiring"); loadSsl(); } catch { setError(t("domains.actionError")); }
  };
  const handleCreateDns = async () => {
    try { await api.post("/admin/domains/dns-records", dnsForm); setShowAddDns(false); loadDns(); } catch { setError(t("domains.actionError")); }
  };
  const handleDeleteDns = async (id: number) => {
    try { await api.delete(`/admin/domains/dns-records/${id}`); loadDns(); } catch { setError(t("domains.actionError")); }
  };
  const handleCreateRedirect = async () => {
    try { await api.post("/admin/domains/redirects", redirectForm); setShowAddRedirect(false); loadRedirects(); } catch { setError(t("domains.actionError")); }
  };
  const handleToggleRedirect = async (id: number, current: boolean) => {
    try { await api.put(`/admin/domains/redirects/${id}`, { ...redirectForm, isActive: !current }); loadRedirects(); } catch { setError(t("domains.actionError")); }
  };
  const handleDeleteRedirect = async (id: number) => {
    try { await api.delete(`/admin/domains/redirects/${id}`); loadRedirects(); } catch { setError(t("domains.actionError")); }
  };
  const handleCreateEmail = async () => {
    try { await api.post("/admin/domains/email-setups", emailForm); setShowAddEmail(false); loadEmails(); } catch { setError(t("domains.actionError")); }
  };
  const handleToggleEmail = async (id: number) => {
    try { await api.put(`/admin/domains/email-setups/${id}/toggle`); loadEmails(); } catch { setError(t("domains.actionError")); }
  };
  const handleDeleteEmail = async (id: number) => {
    try { await api.delete(`/admin/domains/email-setups/${id}`); loadEmails(); } catch { setError(t("domains.actionError")); }
  };
  const handleRegister = async () => {
    try { await api.post("/admin/domains/registrations", regForm); setShowRegister(false); loadRegistrations(); } catch { setError(t("domains.actionError")); }
  };
  const handleAddBlacklist = async () => {
    try { await api.post("/admin/domains/blacklist", blacklistForm); setShowAddBlacklist(false); loadBlacklist(); } catch { setError(t("domains.actionError")); }
  };
  const handleRemoveBlacklist = async (id: number) => {
    try { await api.delete(`/admin/domains/blacklist/${id}`); loadBlacklist(); } catch { setError(t("domains.actionError")); }
  };
  const handleLookup = async () => {
    try { const r = await api.get(`/admin/domains/lookup?domain=${lookupDomain}`); setDomainLookup(r.data.data); } catch { setError(t("domains.actionError")); }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "subdomains", label: t("domains.tabSubdomains") },
    { key: "custom-domains", label: t("domains.tabCustomDomains") },
    { key: "ssl", label: t("domains.tabSsl") },
    { key: "dns", label: t("domains.tabDns") },
    { key: "redirects", label: t("domains.tabRedirects") },
    { key: "monitoring", label: t("domains.tabMonitoring") },
    { key: "email", label: t("domains.tabEmail") },
    { key: "registration", label: t("domains.tabRegistration") },
    { key: "blacklist", label: t("domains.tabBlacklist") },
  ];

  const openAdd = (tab: TabKey) => {
    setShowAddDomain(false); setShowAddDns(false); setShowAddRedirect(false);
    setShowAddEmail(false); setShowRegister(false); setShowAddBlacklist(false);
    if (tab === "subdomains" || tab === "custom-domains") setShowAddDomain(true);
    if (tab === "dns") setShowAddDns(true);
    if (tab === "redirects") setShowAddRedirect(true);
    if (tab === "email") setShowAddEmail(true);
    if (tab === "registration") setShowRegister(true);
    if (tab === "blacklist") setShowAddBlacklist(true);
  };

  const sectionTitle: Record<TabKey, string> = {
    subdomains: t("domains.createSubdomain"),
    "custom-domains": t("domains.bindCustomDomain"),
    ssl: t("domains.renewExpiring"),
    dns: t("domains.addDnsRecord"),
    redirects: t("domains.addRedirect"),
    monitoring: t("domains.domainLookup"),
    email: t("domains.setupEmail"),
    registration: t("domains.newRegistration"),
    blacklist: t("domains.addToBlacklist"),
  };

  const emptyKey: Record<TabKey, string> = {
    subdomains: "domains.emptySubdomains",
    "custom-domains": "domains.emptyCustomDomains",
    ssl: "domains.emptySsl",
    dns: "domains.emptyDns",
    redirects: "domains.emptyRedirects",
    monitoring: "",
    email: "domains.emptyEmails",
    registration: "domains.emptyRegistrations",
    blacklist: "domains.emptyBlacklist",
  };

  const EmptyState = ({ tabKey }: { tabKey: TabKey }) => {
    if (tabKey === "monitoring") return null;
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--sub)", lineHeight: 1.7, marginBottom: "1rem" }}>{t(emptyKey[tabKey])}</p>
        <button className="btn btn-primary btn-sm" onClick={() => openAdd(tabKey)}>{t("domains.startCreating")}</button>
      </div>
    );
  };

  const currentCount = (tabKey: TabKey): number => {
    if (tabKey === "subdomains") return domains.filter(d => d.type === "Subdomain").length;
    if (tabKey === "custom-domains") return domains.filter(d => d.type === "Custom").length;
    if (tabKey === "ssl") return sslCerts.length;
    if (tabKey === "dns") return dnsRecords.length;
    if (tabKey === "redirects") return redirects.length;
    if (tabKey === "monitoring") return domains.length;
    if (tabKey === "email") return emailSetups.length;
    if (tabKey === "registration") return registrations.length;
    return blacklist.length;
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US");

  return (
    <div className="space-y-5">
      <PageHeader icon="globe" title={t("domains.title")} />

      <div className="card card-accent" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ color: "var(--ink)", lineHeight: 1.8, fontSize: 14 }}>{t("domains.pageIntro")}</p>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="tabs-bar">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Explanation banner for current tab */}
      <div className="card" style={{ padding: "1rem 1.25rem", background: "var(--bg-soft, #f7f8fa)" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <p style={{ flexGrow: 1, color: "var(--ink)", lineHeight: 1.7, fontSize: 14, margin: 0 }}>
            {t(TAB_INFO[activeTab].descKey)}
          </p>
          <span className="badge badge--blue" style={{ direction: "ltr" }}>{TAB_INFO[activeTab].example}</span>
        </div>
      </div>

      {loading && <LoadingState />}

      {/* ───── Subdomains ───── */}
      {activeTab === "subdomains" && (
        <div className="space-y-4">
          <div className="flex gap-2" style={{ alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => setShowAddDomain(true)}>{t("domains.createSubdomain")}</button>
            <span style={{ color: "var(--sub)", fontSize: 13 }}>{t("domains.platformSuffix")} <strong dir="ltr">{t("domains.suffixExample")}</strong></span>
          </div>
          {showAddDomain && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.domainName")} value={newDomainName} onChange={e => setNewDomainName(e.target.value)} />
              <input className="field-input" placeholder={t("domains.storeId")} value={newStoreId} onChange={e => setNewStoreId(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleCreateDomain}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDomain(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.store")}</th><th>{t("domains.status")}</th><th>{t("domains.dnsStatus")}</th><th>{t("domains.sslStatus")}</th><th>{t("domains.createdAt")}</th>
              </tr></thead>
              <tbody>
                {domains.filter(d => d.type === "Subdomain").map(d => (
                  <tr key={d.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{d.domainName}</td>
                    <td>{d.storeName || "-"}</td>
                    <td>{statusBadge(d.status)}</td>
                    <td>{statusBadge(d.dnsStatus)}</td>
                    <td>{statusBadge(d.sslStatus)}</td>
                    <td>{fmtDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("subdomains") === 0 && <EmptyState tabKey="subdomains" />}
        </div>
      )}

      {/* ───── Custom Domains ───── */}
      {activeTab === "custom-domains" && (
        <div className="space-y-4">
          <div className="flex gap-2" style={{ alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => setShowAddDomain(true)}>{t("domains.bindCustomDomain")}</button>
            <span style={{ color: "var(--sub)", fontSize: 13 }}>{t("domains.ownDomainExample")}</span>
          </div>
          {showAddDomain && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.domainName")} value={newDomainName} onChange={e => setNewDomainName(e.target.value)} />
              <input className="field-input" placeholder={t("domains.storeId")} value={newStoreId} onChange={e => setNewStoreId(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleCreateDomain}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDomain(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-bold">{t("domains.dnsVerification")}</h3>
            <div className="flex gap-2">
              <input className="field-input flex-1" placeholder="example.com" value={verifyDomain} onChange={e => setVerifyDomain(e.target.value)} />
              <button className="btn btn-primary" onClick={handleVerifyDns}>{t("domains.verify")}</button>
            </div>
            {verificationResult && (
              <div className="text-sm space-y-1">
                <p>{t("domains.domain")}: <strong dir="ltr">{verificationResult.domain}</strong></p>
                <p>{t("domains.resolvedIp")}: <strong dir="ltr">{verificationResult.resolvedIp || "-"}</strong></p>
                <p>{t("domains.resolvedCname")}: <strong dir="ltr">{verificationResult.resolvedCname || "-"}</strong></p>
                <p>{t("domains.expectedIp")}: <strong dir="ltr">{verificationResult.expectedIp || "-"}</strong></p>
                <p>{t("domains.expectedCname")}: <strong dir="ltr">{verificationResult.expectedCname || "-"}</strong></p>
                <p>{t("domains.matched")}: <span className={verificationResult.matched ? "badge badge--green" : "badge badge--red"}>{verificationResult.matched ? t("domains.yes") : t("domains.no")}</span></p>
              </div>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.store")}</th><th>{t("domains.status")}</th><th>{t("domains.dnsStatus")}</th><th>{t("domains.isPrimary")}</th><th>{t("domains.createdAt")}</th>
              </tr></thead>
              <tbody>
                {domains.filter(d => d.type === "Custom").map(d => (
                  <tr key={d.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{d.domainName}</td>
                    <td>{d.storeName || "-"}</td>
                    <td>{statusBadge(d.status)}</td>
                    <td>{statusBadge(d.dnsStatus)}</td>
                    <td>{d.isPrimary ? <span className="badge badge--green">{t("domains.yes")}</span> : "-"}</td>
                    <td>{fmtDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("custom-domains") === 0 && <EmptyState tabKey="custom-domains" />}
        </div>
      )}

      {/* ───── SSL ───── */}
      {activeTab === "ssl" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleRenewSsl}>{t("domains.renewExpiring")}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.issuer")}</th><th>{t("domains.expiresAt")}</th><th>{t("domains.status")}</th><th>{t("domains.lastRenewed")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {sslCerts.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{c.domainName}</td>
                    <td>{c.issuer}</td>
                    <td>{fmtDate(c.expiresAt)}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td>{c.lastRenewedAt ? fmtDate(c.lastRenewedAt) : "-"}</td>
                    <td><button className="btn btn-sm btn-primary" onClick={() => handleRequestSsl(c.managedDomainId)}>{t("domains.requestSsl")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("ssl") === 0 && <EmptyState tabKey="ssl" />}
        </div>
      )}

      {/* ───── DNS Records ───── */}
      {activeTab === "dns" && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowAddDns(true)}>{t("domains.addDnsRecord")}</button>
          {showAddDns && (
            <div className="card p-4 space-y-3">
              <select className="field-input" value={dnsForm.recordType} onChange={e => setDnsForm({ ...dnsForm, recordType: e.target.value })}>
                <option value="A">A</option><option value="AAAA">AAAA</option><option value="CNAME">CNAME</option>
                <option value="MX">MX</option><option value="TXT">TXT</option><option value="NS">NS</option>
              </select>
              <input className="field-input" placeholder={t("domains.name")} value={dnsForm.name} onChange={e => setDnsForm({ ...dnsForm, name: e.target.value })} />
              <input className="field-input" placeholder={t("domains.value")} value={dnsForm.value} onChange={e => setDnsForm({ ...dnsForm, value: e.target.value })} />
              <input className="field-input" type="number" placeholder={t("domains.ttl")} value={dnsForm.ttl} onChange={e => setDnsForm({ ...dnsForm, ttl: Number(e.target.value) })} />
              {dnsForm.recordType === "MX" && (
                <input className="field-input" type="number" placeholder={t("domains.priority")} value={dnsForm.priority} onChange={e => setDnsForm({ ...dnsForm, priority: Number(e.target.value) })} />
              )}
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleCreateDns}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDns(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.type")}</th><th>{t("domains.name")}</th><th>{t("domains.value")}</th><th>{t("domains.ttl")}</th><th>{t("domains.priority")}</th><th>{t("domains.status")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {dnsRecords.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge--blue">{r.recordType}</span></td>
                    <td dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{r.name}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>{r.value}</td>
                    <td>{r.ttl}</td>
                    <td>{r.priority ?? "-"}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteDns(r.id)}>{t("domains.delete")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("dns") === 0 && <EmptyState tabKey="dns" />}
        </div>
      )}

      {/* ───── Redirects ───── */}
      {activeTab === "redirects" && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowAddRedirect(true)}>{t("domains.addRedirect")}</button>
          {showAddRedirect && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.sourceDomain")} value={redirectForm.sourceDomain} onChange={e => setRedirectForm({ ...redirectForm, sourceDomain: e.target.value })} />
              <input className="field-input" placeholder={t("domains.targetUrl")} value={redirectForm.targetUrl} onChange={e => setRedirectForm({ ...redirectForm, targetUrl: e.target.value })} />
              <select className="field-input" value={redirectForm.redirectType} onChange={e => setRedirectForm({ ...redirectForm, redirectType: Number(e.target.value) })}>
                <option value={301}>301 (Permanent)</option><option value={302}>302 (Temporary)</option>
              </select>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleCreateRedirect}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddRedirect(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.sourceDomain")}</th><th>{t("domains.targetUrl")}</th><th>{t("domains.type")}</th><th>{t("domains.status")}</th><th>{t("domains.createdAt")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {redirects.map(r => (
                  <tr key={r.id}>
                    <td dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{r.sourceDomain}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>{r.targetUrl}</td>
                    <td>{r.redirectType === 301 ? "301" : "302"}</td>
                    <td>{r.isActive ? <span className="badge badge--green">{t("domains.active")}</span> : <span className="badge badge--gray">{t("domains.inactive")}</span>}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td className="flex gap-1">
                      <button className="btn btn-sm btn-ghost" onClick={() => handleToggleRedirect(r.id, r.isActive)}>
                        {r.isActive ? t("domains.deactivate") : t("domains.activate")}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRedirect(r.id)}>{t("domains.delete")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("redirects") === 0 && <EmptyState tabKey="redirects" />}
        </div>
      )}

      {/* ───── Monitoring ───── */}
      {activeTab === "monitoring" && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">{t("domains.domainLookup")}</h3>
            <div className="flex gap-2 mb-3">
              <input className="field-input flex-1" placeholder={t("domains.enterDomain")} value={lookupDomain} onChange={e => setLookupDomain(e.target.value)} />
              <button className="btn btn-primary" onClick={handleLookup}>{t("domains.lookup")}</button>
            </div>
            {domainLookup && (
              <div className="text-sm space-y-1">
                <p>{t("domains.domain")}: <strong dir="ltr">{lookupDomain}</strong></p>
                <p>{t("domains.availability")}: {domainLookup.available ? <span className="badge badge--green">{t("domains.available")}</span> : <span className="badge badge--red">{t("domains.taken")}</span>}</p>
                {domainLookup.registrant && <p>{t("domains.registrant")}: {domainLookup.registrant}</p>}
              </div>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.store")}</th><th>{t("domains.dnsStatus")}</th><th>{t("domains.sslStatus")}</th><th>{t("domains.status")}</th>
              </tr></thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{d.domainName}</td>
                    <td>{d.storeName || "-"}</td>
                    <td>{statusBadge(d.dnsStatus)}</td>
                    <td>{statusBadge(d.sslStatus)}</td>
                    <td>{statusBadge(d.status)}</td>
                  </tr>
                ))}
                {domains.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── Professional Email ───── */}
      {activeTab === "email" && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowAddEmail(true)}>{t("domains.setupEmail")}</button>
          {showAddEmail && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.domainName")} value={emailForm.domainName} onChange={e => setEmailForm({ ...emailForm, domainName: e.target.value })} />
              <input className="field-input" placeholder={t("domains.mailboxName")} value={emailForm.mailboxName} onChange={e => setEmailForm({ ...emailForm, mailboxName: e.target.value })} />
              <select className="field-input" value={emailForm.provider} onChange={e => setEmailForm({ ...emailForm, provider: e.target.value })}>
                <option value="Zoho">Zoho</option><option value="Google">Google Workspace</option><option value="Microsoft">Microsoft 365</option>
              </select>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleCreateEmail}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddEmail(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.mailboxName")}</th><th>{t("domains.emailAddress")}</th><th>{t("domains.provider")}</th><th>{t("domains.status")}</th><th>{t("domains.createdAt")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {emailSetups.map(e => (
                  <tr key={e.id}>
                    <td dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{e.domainName}</td>
                    <td>{e.mailboxName}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>{e.emailAddress}</td>
                    <td>{e.provider}</td>
                    <td>{e.isActive ? <span className="badge badge--green">{t("domains.active")}</span> : <span className="badge badge--gray">{t("domains.inactive")}</span>}</td>
                    <td>{fmtDate(e.createdAt)}</td>
                    <td className="flex gap-1">
                      <button className="btn btn-sm btn-ghost" onClick={() => handleToggleEmail(e.id)}>
                        {e.isActive ? t("domains.deactivate") : t("domains.activate")}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEmail(e.id)}>{t("domains.delete")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("email") === 0 && <EmptyState tabKey="email" />}
        </div>
      )}

      {/* ───── Registration ───── */}
      {activeTab === "registration" && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}>{t("domains.newRegistration")}</button>
          {showRegister && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.domainName")} value={regForm.domainName} onChange={e => setRegForm({ ...regForm, domainName: e.target.value })} />
              <input className="field-input" placeholder={t("domains.registrantName")} value={regForm.registrantName} onChange={e => setRegForm({ ...regForm, registrantName: e.target.value })} />
              <input className="field-input" placeholder={t("domains.registrantEmail")} value={regForm.registrantEmail} onChange={e => setRegForm({ ...regForm, registrantEmail: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleRegister}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowRegister(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.registrantName")}</th><th>{t("domains.registrantEmail")}</th><th>{t("domains.status")}</th><th>{t("domains.createdAt")}</th>
              </tr></thead>
              <tbody>
                {registrations.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: isAr ? "right" : "left" }}>{r.domainName}</td>
                    <td>{r.registrantName}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>{r.registrantEmail}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("registration") === 0 && <EmptyState tabKey="registration" />}
        </div>
      )}

      {/* ───── Blacklist ───── */}
      {activeTab === "blacklist" && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={() => setShowAddBlacklist(true)}>{t("domains.addToBlacklist")}</button>
          {showAddBlacklist && (
            <div className="card p-4 space-y-3">
              <input className="field-input" placeholder={t("domains.domainOrPattern")} value={blacklistForm.domainOrPattern} onChange={e => setBlacklistForm({ ...blacklistForm, domainOrPattern: e.target.value })} />
              <input className="field-input" placeholder={t("domains.reason")} value={blacklistForm.reason} onChange={e => setBlacklistForm({ ...blacklistForm, reason: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleAddBlacklist}>{t("domains.save")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddBlacklist(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainOrPattern")}</th><th>{t("domains.reason")}</th><th>{t("domains.addedBy")}</th><th>{t("domains.createdAt")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {blacklist.map(b => (
                  <tr key={b.id}>
                    <td className="font-medium" dir="ltr" style={{ textAlign: "left" }}>{b.domainOrPattern}</td>
                    <td>{b.reason}</td>
                    <td>{b.addedByAdmin}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => handleRemoveBlacklist(b.id)}>{t("domains.remove")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentCount("blacklist") === 0 && <EmptyState tabKey="blacklist" />}
        </div>
      )}

      {/* ───── Quick tips ───── */}
      <div className="card" style={{ padding: "1rem 1.25rem", borderColor: "var(--border)", borderStyle: "dashed" }}>
        <h3 className="text-sm font-bold mb-2">{t("domains.managementTips")}</h3>
        <ul style={{ margin: 0, paddingInlineStart: "1.1rem", color: "var(--sub)", fontSize: 13, lineHeight: 1.9 }}>
          <li>{t("domains.tip1")}</li>
          <li>{t("domains.tip2")}</li>
          <li>{t("domains.tip3")}</li>
        </ul>
      </div>
    </div>
  );
}
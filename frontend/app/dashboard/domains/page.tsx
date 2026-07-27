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
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifyDomain, setVerifyDomain] = useState("");

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
    const cls = status === "Active" || status === "active" || status === "Verified" || status === "Issued" || status === "available"
      ? "badge badge--green" : status === "Pending" || status === "pending" || status === "Issuing"
      ? "badge badge--yellow" : "badge badge--red";
    return <span className={cls}>{status}</span>;
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

  return (
    <div className="space-y-6">
      <PageHeader icon="settings" title={t("domains.title")} />

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === tab.key ? "text-[var(--blue)] border-[var(--blue)]" : "text-[var(--sub)] border-transparent hover:text-[var(--ink)]"
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {error && <div className="alert alert--danger">{error}</div>}
      {loading && <LoadingState />}

      {/* ───── Subdomains ───── */}
      {activeTab === "subdomains" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn--primary" onClick={() => setShowAddDomain(true)}>{t("domains.createSubdomain")}</button>
          </div>
          {showAddDomain && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.domainName")} value={newDomainName} onChange={e => setNewDomainName(e.target.value)} />
              <input className="field" placeholder={t("domains.storeId")} value={newStoreId} onChange={e => setNewStoreId(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleCreateDomain}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddDomain(false)}>{t("domains.cancel")}</button>
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
                    <td className="font-medium">{d.domainName}</td>
                    <td>{d.storeName || "-"}</td>
                    <td>{statusBadge(d.status)}</td>
                    <td>{statusBadge(d.dnsStatus)}</td>
                    <td>{statusBadge(d.sslStatus)}</td>
                    <td>{new Date(d.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                  </tr>
                ))}
                {domains.filter(d => d.type === "Subdomain").length === 0 && (
                  <tr><td colSpan={6} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── Custom Domains ───── */}
      {activeTab === "custom-domains" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn--primary" onClick={() => setShowAddDomain(true)}>{t("domains.bindCustomDomain")}</button>
          </div>
          {showAddDomain && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.domainName")} value={newDomainName} onChange={e => setNewDomainName(e.target.value)} />
              <input className="field" placeholder={t("domains.storeId")} value={newStoreId} onChange={e => setNewStoreId(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleCreateDomain}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddDomain(false)}>{t("domains.cancel")}</button>
              </div>
            </div>
          )}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-bold">{t("domains.dnsVerification")}</h3>
            <div className="flex gap-2">
              <input className="field flex-1" placeholder="example.com" value={verifyDomain} onChange={e => setVerifyDomain(e.target.value)} />
              <button className="btn btn--primary" onClick={handleVerifyDns}>{t("domains.verify")}</button>
            </div>
            {verificationResult && (
              <div className="text-sm space-y-1">
                <p>{t("domains.domain")}: <strong>{verificationResult.domain}</strong></p>
                <p>{t("domains.resolvedIp")}: <strong>{verificationResult.resolvedIp || "-"}</strong></p>
                <p>{t("domains.resolvedCname")}: <strong>{verificationResult.resolvedCname || "-"}</strong></p>
                <p>{t("domains.expectedIp")}: <strong>{verificationResult.expectedIp || "-"}</strong></p>
                <p>{t("domains.expectedCname")}: <strong>{verificationResult.expectedCname || "-"}</strong></p>
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
                    <td className="font-medium">{d.domainName}</td>
                    <td>{d.storeName || "-"}</td>
                    <td>{statusBadge(d.status)}</td>
                    <td>{statusBadge(d.dnsStatus)}</td>
                    <td>{d.isPrimary ? <span className="badge badge--green">{t("domains.yes")}</span> : "-"}</td>
                    <td>{new Date(d.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                  </tr>
                ))}
                {domains.filter(d => d.type === "Custom").length === 0 && (
                  <tr><td colSpan={6} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── SSL ───── */}
      {activeTab === "ssl" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn btn--primary" onClick={handleRenewSsl}>{t("domains.renewExpiring")}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>{t("domains.domainName")}</th><th>{t("domains.issuer")}</th><th>{t("domains.expiresAt")}</th><th>{t("domains.status")}</th><th>{t("domains.lastRenewed")}</th><th>{t("domains.actions")}</th>
              </tr></thead>
              <tbody>
                {sslCerts.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.domainName}</td>
                    <td>{c.issuer}</td>
                    <td>{new Date(c.expiresAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td>{c.lastRenewedAt ? new Date(c.lastRenewedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "-"}</td>
                    <td><button className="btn btn--sm btn--primary" onClick={() => handleRequestSsl(c.managedDomainId)}>{t("domains.requestSsl")}</button></td>
                  </tr>
                ))}
                {sslCerts.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── DNS Records ───── */}
      {activeTab === "dns" && (
        <div className="space-y-4">
          <button className="btn btn--primary" onClick={() => setShowAddDns(true)}>{t("domains.addDnsRecord")}</button>
          {showAddDns && (
            <div className="card p-4 space-y-3">
              <select className="field" value={dnsForm.recordType} onChange={e => setDnsForm({ ...dnsForm, recordType: e.target.value })}>
                <option value="A">A</option><option value="AAAA">AAAA</option><option value="CNAME">CNAME</option>
                <option value="MX">MX</option><option value="TXT">TXT</option><option value="NS">NS</option>
              </select>
              <input className="field" placeholder={t("domains.name")} value={dnsForm.name} onChange={e => setDnsForm({ ...dnsForm, name: e.target.value })} />
              <input className="field" placeholder={t("domains.value")} value={dnsForm.value} onChange={e => setDnsForm({ ...dnsForm, value: e.target.value })} />
              <input className="field" type="number" placeholder={t("domains.ttl")} value={dnsForm.ttl} onChange={e => setDnsForm({ ...dnsForm, ttl: Number(e.target.value) })} />
              {dnsForm.recordType === "MX" && (
                <input className="field" type="number" placeholder={t("domains.priority")} value={dnsForm.priority} onChange={e => setDnsForm({ ...dnsForm, priority: Number(e.target.value) })} />
              )}
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleCreateDns}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddDns(false)}>{t("domains.cancel")}</button>
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
                    <td>{r.name}</td>
                    <td className="dir-ltr text-left" style={{ direction: "ltr", textAlign: "left" }}>{r.value}</td>
                    <td>{r.ttl}</td>
                    <td>{r.priority ?? "-"}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td><button className="btn btn--sm btn--danger" onClick={() => handleDeleteDns(r.id)}>{t("domains.delete")}</button></td>
                  </tr>
                ))}
                {dnsRecords.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── 301 Redirects ───── */}
      {activeTab === "redirects" && (
        <div className="space-y-4">
          <button className="btn btn--primary" onClick={() => setShowAddRedirect(true)}>{t("domains.addRedirect")}</button>
          {showAddRedirect && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.sourceDomain")} value={redirectForm.sourceDomain} onChange={e => setRedirectForm({ ...redirectForm, sourceDomain: e.target.value })} />
              <input className="field" placeholder={t("domains.targetUrl")} value={redirectForm.targetUrl} onChange={e => setRedirectForm({ ...redirectForm, targetUrl: e.target.value })} />
              <select className="field" value={redirectForm.redirectType} onChange={e => setRedirectForm({ ...redirectForm, redirectType: Number(e.target.value) })}>
                <option value={301}>301 (Permanent)</option><option value={302}>302 (Temporary)</option>
              </select>
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleCreateRedirect}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddRedirect(false)}>{t("domains.cancel")}</button>
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
                    <td>{r.sourceDomain}</td>
                    <td className="dir-ltr text-left" style={{ direction: "ltr", textAlign: "left" }}>{r.targetUrl}</td>
                    <td>{r.redirectType === 301 ? "301" : "302"}</td>
                    <td>{r.isActive ? <span className="badge badge--green">{t("domains.active")}</span> : <span className="badge badge--gray">{t("domains.inactive")}</span>}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                    <td className="flex gap-1">
                      <button className="btn btn--sm btn--ghost" onClick={() => handleToggleRedirect(r.id, r.isActive)}>
                        {r.isActive ? t("domains.deactivate") : t("domains.activate")}
                      </button>
                      <button className="btn btn--sm btn--danger" onClick={() => handleDeleteRedirect(r.id)}>{t("domains.delete")}</button>
                    </td>
                  </tr>
                ))}
                {redirects.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── Monitoring ───── */}
      {activeTab === "monitoring" && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">{t("domains.domainLookup")}</h3>
            <div className="flex gap-2 mb-3">
              <input className="field flex-1" placeholder={t("domains.enterDomain")} value={lookupDomain} onChange={e => setLookupDomain(e.target.value)} />
              <button className="btn btn--primary" onClick={handleLookup}>{t("domains.lookup")}</button>
            </div>
            {domainLookup && (
              <div className="text-sm space-y-1">
                <p>{t("domains.domain")}: <strong>{lookupDomain}</strong></p>
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
                    <td className="font-medium">{d.domainName}</td>
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
          <button className="btn btn--primary" onClick={() => setShowAddEmail(true)}>{t("domains.setupEmail")}</button>
          {showAddEmail && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.domainName")} value={emailForm.domainName} onChange={e => setEmailForm({ ...emailForm, domainName: e.target.value })} />
              <input className="field" placeholder={t("domains.mailboxName")} value={emailForm.mailboxName} onChange={e => setEmailForm({ ...emailForm, mailboxName: e.target.value })} />
              <select className="field" value={emailForm.provider} onChange={e => setEmailForm({ ...emailForm, provider: e.target.value })}>
                <option value="Zoho">Zoho</option><option value="Google">Google Workspace</option><option value="Microsoft">Microsoft 365</option>
              </select>
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleCreateEmail}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddEmail(false)}>{t("domains.cancel")}</button>
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
                    <td>{e.domainName}</td>
                    <td>{e.mailboxName}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>{e.emailAddress}</td>
                    <td>{e.provider}</td>
                    <td>{e.isActive ? <span className="badge badge--green">{t("domains.active")}</span> : <span className="badge badge--gray">{t("domains.inactive")}</span>}</td>
                    <td>{new Date(e.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                    <td className="flex gap-1">
                      <button className="btn btn--sm btn--ghost" onClick={() => handleToggleEmail(e.id)}>
                        {e.isActive ? t("domains.deactivate") : t("domains.activate")}
                      </button>
                      <button className="btn btn--sm btn--danger" onClick={() => handleDeleteEmail(e.id)}>{t("domains.delete")}</button>
                    </td>
                  </tr>
                ))}
                {emailSetups.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── Domain Registration ───── */}
      {activeTab === "registration" && (
        <div className="space-y-4">
          <button className="btn btn--primary" onClick={() => setShowRegister(true)}>{t("domains.newRegistration")}</button>
          {showRegister && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.domainName")} value={regForm.domainName} onChange={e => setRegForm({ ...regForm, domainName: e.target.value })} />
              <input className="field" placeholder={t("domains.registrantName")} value={regForm.registrantName} onChange={e => setRegForm({ ...regForm, registrantName: e.target.value })} />
              <input className="field" placeholder={t("domains.registrantEmail")} value={regForm.registrantEmail} onChange={e => setRegForm({ ...regForm, registrantEmail: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleRegister}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowRegister(false)}>{t("domains.cancel")}</button>
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
                    <td className="font-medium">{r.domainName}</td>
                    <td>{r.registrantName}</td>
                    <td>{r.registrantEmail}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                  </tr>
                ))}
                {registrations.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── Blacklist ───── */}
      {activeTab === "blacklist" && (
        <div className="space-y-4">
          <button className="btn btn--primary" onClick={() => setShowAddBlacklist(true)}>{t("domains.addToBlacklist")}</button>
          {showAddBlacklist && (
            <div className="card p-4 space-y-3">
              <input className="field" placeholder={t("domains.domainOrPattern")} value={blacklistForm.domainOrPattern} onChange={e => setBlacklistForm({ ...blacklistForm, domainOrPattern: e.target.value })} />
              <input className="field" placeholder={t("domains.reason")} value={blacklistForm.reason} onChange={e => setBlacklistForm({ ...blacklistForm, reason: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn btn--primary" onClick={handleAddBlacklist}>{t("domains.save")}</button>
                <button className="btn btn--ghost" onClick={() => setShowAddBlacklist(false)}>{t("domains.cancel")}</button>
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
                    <td className="font-medium dir-ltr" style={{ direction: "ltr", textAlign: "left" }}>{b.domainOrPattern}</td>
                    <td>{b.reason}</td>
                    <td>{b.addedByAdmin}</td>
                    <td>{new Date(b.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</td>
                    <td><button className="btn btn--sm btn--danger" onClick={() => handleRemoveBlacklist(b.id)}>{t("domains.remove")}</button></td>
                  </tr>
                ))}
                {blacklist.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-[var(--sub)] py-8">{t("domains.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

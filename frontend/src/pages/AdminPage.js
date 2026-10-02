import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mail, MessageSquare, Activity, LogOut } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

function fmt(s) {
  try { return new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === "admin") {
      api.get("/analytics/summary").then(({ data }) => setSummary(data)).catch(() => {});
      api.get("/leads").then(({ data }) => setLeads(data)).catch(() => {});
    }
  }, [user]);

  if (loading || !user || user.role !== "admin") {
    return <div className="pt-40 pb-40 text-center text-[#767B78]">Loading admin panel...</div>;
  }

  const t = summary?.totals || {};
  const cards = [
    { icon: Users, label: "Registered users", value: t.users ?? "—" },
    { icon: Mail, label: "Newsletter sign-ups", value: t.newsletter ?? "—" },
    { icon: MessageSquare, label: "Enquiries", value: t.enquiries ?? "—" },
    { icon: Activity, label: "Tracked events", value: t.events ?? "—" },
  ];

  return (
    <div className="pt-28 pb-20 min-h-screen bg-[#F5F2EC]" data-testid="admin-page">
      <Seo title="Admin · CRM & Analytics | VOYARA Travel" description="VOYARA internal CRM and analytics dashboard." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="overline text-[#2A4038] mb-1">Internal · CRM & Analytics</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Marketing dashboard</h1>
          </div>
          <VButton variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} data-testid="admin-logout-btn"><LogOut size={15} /> Sign out</VButton>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#E2DDD5] bg-white p-6" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <c.icon size={20} className="text-[#2A4038] mb-3" />
              <p className="font-serif text-3xl font-semibold text-[#1C1E1D]">{c.value}</p>
              <p className="text-xs text-[#767B78] mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {["overview", "leads"].map((x) => (
            <button key={x} onClick={() => setTab(x)} data-testid={`admin-tab-${x}`}
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-all capitalize ${tab === x ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]" : "bg-white text-[#4A4E4B] border-[#E2DDD5]"}`}>
              {x === "overview" ? "Event analytics" : `CRM leads (${leads.length})`}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-6" data-testid="admin-overview">
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-6">
              <h2 className="font-serif text-xl font-semibold mb-5">Events by type</h2>
              <div className="space-y-3">
                {(summary?.by_event || []).map((e) => {
                  const max = Math.max(...(summary.by_event.map((x) => x.count)));
                  return (
                    <div key={e.event}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-mono text-xs text-[#4A4E4B]">{e.event}</span>
                        <span className="font-semibold text-[#2A4038]">{e.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#EFECE6] overflow-hidden">
                        <div className="h-full bg-[#2A4038]" style={{ width: `${(e.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(!summary || summary.by_event.length === 0) && <p className="text-sm text-[#767B78]">No events recorded yet. Browse the site to generate analytics.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-6">
              <h2 className="font-serif text-xl font-semibold mb-5">Recent activity</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(summary?.recent || []).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm border-b border-[#EFECE6] pb-2">
                    <span className="font-mono text-xs text-[#2D312E]">{r.event}</span>
                    <span className="text-xs text-[#767B78]">{fmt(r.created_at)}</span>
                  </div>
                ))}
                {(!summary || summary.recent.length === 0) && <p className="text-sm text-[#767B78]">No activity yet.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="rounded-2xl border border-[#E2DDD5] bg-white overflow-hidden" data-testid="admin-leads">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F2EC] text-left">
                  <tr>
                    {["Type", "Name", "Email", "Destination", "Budget", "Date"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold text-[#4A4E4B] text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-[#EFECE6]" data-testid={`lead-row-${l.id}`}>
                      <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2A4038]/8 text-[#2A4038] capitalize">{l.type}</span></td>
                      <td className="px-4 py-3 text-[#1C1E1D]">{l.name || l.first_name || "—"}</td>
                      <td className="px-4 py-3 text-[#4A4E4B]">{l.email}</td>
                      <td className="px-4 py-3 text-[#4A4E4B]">{l.destination || "—"}</td>
                      <td className="px-4 py-3 text-[#4A4E4B]">{l.budget || "—"}</td>
                      <td className="px-4 py-3 text-[#767B78] text-xs">{fmt(l.created_at)}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#767B78]">No leads captured yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

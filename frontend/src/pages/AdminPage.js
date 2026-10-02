import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mail, MessageSquare, Activity, LogOut, FileText, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";
import api, { formatApiErrorDetail } from "../lib/api";

const BLOG_CATEGORIES = ["Travel Guides", "Destination Inspiration", "Travel Tips", "Budget Travel", "Couples", "Adventure", "City Breaks"];

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
    return <div className="pt-40 pb-40 text-center text-[#767B78]">Loading admin panel…</div>;
  }

  const t = summary?.totals || {};
  const cards = [
    { icon: Users, label: "Registered users", value: t.users ?? "—" },
    { icon: Mail, label: "Newsletter sign-ups", value: t.newsletter ?? "—" },
    { icon: MessageSquare, label: "Enquiries", value: t.enquiries ?? "—" },
    { icon: Activity, label: "Tracked events", value: t.events ?? "—" },
  ];

  const TABS = [
    { id: "overview", label: "Event analytics" },
    { id: "leads", label: `CRM leads (${leads.length})` },
    { id: "articles", label: "Blog editor" },
  ];

  return (
    <div className="pt-28 pb-20 min-h-screen bg-[#F5F2EC]" data-testid="admin-page">
      <Seo title="Admin · CRM & Analytics | DORIN Travel" description="DORIN internal CRM, analytics and content dashboard." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="overline text-[#2A4038] mb-1">Internal · CRM, Analytics & Content</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold">DORIN marketing dashboard</h1>
          </div>
          <VButton variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} data-testid="admin-logout-btn"><LogOut size={15} /> Sign out</VButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#E2DDD5] bg-white p-6" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <c.icon size={20} className="text-[#2A4038] mb-3" />
              <p className="font-serif text-3xl font-semibold text-[#1C1E1D]">{c.value}</p>
              <p className="text-xs text-[#767B78] mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((x) => (
            <button key={x.id} onClick={() => setTab(x.id)} data-testid={`admin-tab-${x.id}`}
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-all ${tab === x.id ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]" : "bg-white text-[#4A4E4B] border-[#E2DDD5]"}`}>
              {x.label}
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

        {tab === "articles" && <BlogEditor />}
      </div>
    </div>
  );
}

const EMPTY = { title: "", category: BLOG_CATEGORIES[0], excerpt: "", image: "", content: "", author: "The DORIN Team", read_time: "5 min read" };

function BlogEditor() {
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {id,...} = edit
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get("/admin/blog").then(({ data }) => setArticles(data)).catch(() => toast.error("Couldn't load articles."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setEditing({}); };
  const openEdit = (a) => {
    setForm({ title: a.title, category: a.category, excerpt: a.excerpt, image: a.image, content: a.content || "", author: a.author, read_time: a.read_time });
    setEditing(a);
  };
  const close = () => { setEditing(null); setForm(EMPTY); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.excerpt || !form.image || !form.content) {
      toast.error("Title, excerpt, image URL and content are required.");
      return;
    }
    setBusy(true);
    try {
      if (editing && editing.id) {
        await api.put(`/blog/${editing.id}`, form);
        toast.success("Article updated.");
      } else {
        await api.post("/blog", form);
        toast.success("Article published.");
      }
      close();
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Couldn't save article.");
    } finally { setBusy(false); }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/blog/${a.id}`);
      toast.success("Article deleted.");
      load();
    } catch { toast.error("Couldn't delete article."); }
  };

  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-2.5 text-sm outline-none focus:border-[#2A4038] transition-colors";

  return (
    <div data-testid="admin-articles">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl font-semibold flex items-center gap-2"><FileText size={18} /> Travel Journal articles</h2>
        <VButton variant="accent" size="sm" onClick={openNew} data-testid="article-new-btn"><Plus size={15} /> New article</VButton>
      </div>

      <div className="rounded-2xl border border-[#E2DDD5] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F2EC] text-left">
              <tr>
                {["Title", "Category", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[#4A4E4B] text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-t border-[#EFECE6]" data-testid={`article-row-${a.slug}`}>
                  <td className="px-4 py-3 text-[#1C1E1D] font-medium max-w-md">{a.title}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2A4038]/8 text-[#2A4038]">{a.category}</span></td>
                  <td className="px-4 py-3 text-[#767B78] text-xs">{a.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(a)} className="text-[#2A4038] hover:text-[#1E2F28]" data-testid={`article-edit-${a.slug}`} aria-label="Edit"><Pencil size={16} /></button>
                      <button onClick={() => remove(a)} className="text-[#C86D51] hover:text-[#B0593B]" data-testid={`article-delete-${a.slug}`} aria-label="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[#767B78]">No articles yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1E1D]/60 backdrop-blur-sm" onClick={close} data-testid="article-editor-modal">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FDFBF7] rounded-3xl p-7 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} className="absolute top-5 right-5 text-[#767B78] hover:text-[#1C1E1D]" aria-label="Close" data-testid="article-editor-close"><X size={22} /></button>
            <h3 className="font-serif text-2xl font-semibold mb-5">{editing.id ? "Edit article" : "New article"}</h3>
            <form onSubmit={save} className="space-y-3.5">
              <input className={field} placeholder="Article title" value={form.title} onChange={set("title")} data-testid="article-title-input" />
              <div className="grid sm:grid-cols-2 gap-3.5">
                <select className={field} value={form.category} onChange={set("category")} data-testid="article-category-select">
                  {BLOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className={field} placeholder="Read time (e.g. 6 min read)" value={form.read_time} onChange={set("read_time")} data-testid="article-readtime-input" />
              </div>
              <input className={field} placeholder="Author" value={form.author} onChange={set("author")} data-testid="article-author-input" />
              <input className={field} placeholder="Cover image URL (https://…)" value={form.image} onChange={set("image")} data-testid="article-image-input" />
              <textarea className={field} rows={2} placeholder="Short excerpt" value={form.excerpt} onChange={set("excerpt")} data-testid="article-excerpt-input" />
              <textarea className={field} rows={8} placeholder="Full article content (separate paragraphs with a blank line)" value={form.content} onChange={set("content")} data-testid="article-content-input" />
              <div className="flex gap-3 pt-1">
                <VButton type="submit" variant="primary" disabled={busy} data-testid="article-save-btn">{busy ? "Saving…" : editing.id ? "Update article" : "Publish article"}</VButton>
                <VButton type="button" variant="ghost" onClick={close}>Cancel</VButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

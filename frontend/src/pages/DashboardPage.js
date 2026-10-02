import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plane, Heart, Tag, Settings, User, LogOut, MapPin } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";
import { usePlanTrip } from "../context/PlanTripContext";
import api, { formatApiErrorDetail } from "../lib/api";
import { track } from "../lib/analytics";
import { DESTINATIONS, OFFERS, TRIP_TYPES, BUDGETS } from "../data/content";

const TABS = [
  { id: "trips", label: "My Trips", icon: Plane },
  { id: "destinations", label: "Saved Destinations", icon: Heart },
  { id: "offers", label: "Saved Offers", icon: Tag },
  { id: "preferences", label: "Travel Preferences", icon: Settings },
  { id: "account", label: "Account Details", icon: User },
];

export default function DashboardPage() {
  const { user, loading, logout, setUserData } = useAuth();
  const { openPlanner } = usePlanTrip();
  const navigate = useNavigate();
  const [tab, setTab] = useState("trips");
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!loading && (!user || !user.id)) navigate("/login");
    if (user && user.role === "admin") navigate("/admin");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.id) {
      track("dashboard_view");
      api.get("/me/trips").then(({ data }) => setTrips(data)).catch(() => {});
    }
  }, [user]);

  if (loading || !user || !user.id) {
    return <div className="pt-40 pb-40 text-center text-[#767B78]">Loading your dashboard...</div>;
  }

  const savedDest = DESTINATIONS.filter((d) => (user.saved_destinations || []).includes(d.id));
  const savedOffers = OFFERS.filter((o) => (user.saved_offers || []).includes(o.id));

  const removeSaved = async (type, id) => {
    try {
      const { data } = await api.post("/me/saved", { type, item_id: id });
      setUserData({ ...user, [type === "destination" ? "saved_destinations" : "saved_offers"]: type === "destination" ? data.saved_destinations : data.saved_offers });
    } catch { toast.error("Couldn't update."); }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen bg-[#F5F2EC]" data-testid="dashboard-page">
      <Seo title="My Dashboard | DORIN Travel" description="Manage your trips, saved destinations and travel preferences." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="overline text-[#2A4038] mb-1">Your travel hub</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Welcome back, {user.first_name}</h1>
          </div>
          <VButton variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} data-testid="logout-btn">
            <LogOut size={15} /> Sign out
          </VButton>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <aside className="rounded-2xl border border-[#E2DDD5] bg-white p-3 h-fit lg:sticky lg:top-28">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); track("dashboard_tab", { tab: t.id }); }} data-testid={`dashboard-tab-${t.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${tab === t.id ? "bg-[#2A4038] text-[#FDFBF7]" : "text-[#4A4E4B] hover:bg-[#EFECE6]"}`}>
                <t.icon size={17} /> {t.label}
              </button>
            ))}
          </aside>

          <section className="rounded-2xl border border-[#E2DDD5] bg-white p-6 sm:p-8 min-h-[400px]">
            {tab === "trips" && (
              <div data-testid="tab-trips">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-semibold">My Trips</h2>
                  <VButton variant="accent" size="sm" onClick={() => openPlanner("dashboard")} data-testid="dashboard-plan-btn">Plan a new trip</VButton>
                </div>
                {trips.length === 0 ? (
                  <EmptyState title="No trips yet" text="Your enquiries and trip requests will appear here." />
                ) : (
                  <div className="space-y-3">
                    {trips.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl border border-[#E2DDD5] p-4" data-testid={`trip-${t.id}`}>
                        <div>
                          <p className="font-semibold text-[#1C1E1D]">{t.destination || "Bespoke trip"} {t.trip_type && `· ${t.trip_type}`}</p>
                          <p className="text-xs text-[#767B78] font-mono mt-0.5">{t.travel_dates || "Dates TBC"}</p>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#2A4038]/8 text-[#2A4038]">{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "destinations" && (
              <div data-testid="tab-destinations">
                <h2 className="font-serif text-2xl font-semibold mb-6">Saved Destinations</h2>
                {savedDest.length === 0 ? (
                  <EmptyState title="Nothing saved yet" text="Tap the heart on any destination to save it here." link="/destinations" linkLabel="Explore destinations" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {savedDest.map((d) => (
                      <div key={d.id} className="rounded-xl overflow-hidden border border-[#E2DDD5]" data-testid={`saved-dest-${d.id}`}>
                        <Link to={`/destinations/${d.id}`}><img src={d.image} alt={d.name} className="w-full h-32 object-cover" /></Link>
                        <div className="p-4 flex items-center justify-between">
                          <div><p className="font-serif text-lg font-semibold">{d.name}</p><p className="text-xs text-[#767B78]">{d.country}</p></div>
                          <button onClick={() => removeSaved("destination", d.id)} className="text-xs text-[#C86D51] font-medium hover:underline" data-testid={`remove-dest-${d.id}`}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "offers" && (
              <div data-testid="tab-offers">
                <h2 className="font-serif text-2xl font-semibold mb-6">Saved Offers</h2>
                {savedOffers.length === 0 ? (
                  <EmptyState title="No saved offers" text="Save offers to compare them later." link="/offers" linkLabel="Browse offers" />
                ) : (
                  <div className="space-y-3">
                    {savedOffers.map((o) => (
                      <div key={o.id} className="flex items-center gap-4 rounded-xl border border-[#E2DDD5] p-3" data-testid={`saved-offer-${o.id}`}>
                        <img src={o.image} alt={o.title} className="w-20 h-16 rounded-lg object-cover" />
                        <div className="flex-1">
                          <p className="font-semibold text-[#1C1E1D]">{o.title}</p>
                          <p className="text-xs text-[#767B78] flex items-center gap-1"><MapPin size={11} /> {o.destination} · £{o.price} pp</p>
                        </div>
                        <button onClick={() => removeSaved("offer", o.id)} className="text-xs text-[#C86D51] font-medium hover:underline" data-testid={`remove-offer-${o.id}`}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "preferences" && <PreferencesTab user={user} setUserData={setUserData} />}

            {tab === "account" && (
              <div data-testid="tab-account">
                <h2 className="font-serif text-2xl font-semibold mb-6">Account Details</h2>
                <dl className="space-y-4 max-w-md">
                  <Row label="Name" value={`${user.first_name} ${user.last_name}`} />
                  <Row label="Email" value={user.email} />
                  <Row label="Member since" value={user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—"} />
                  <Row label="Marketing emails" value={user.marketing_opt_in ? "Subscribed" : "Not subscribed"} />
                </dl>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-[#EFECE6] pb-3">
      <dt className="text-sm text-[#767B78]">{label}</dt>
      <dd className="text-sm font-medium text-[#1C1E1D]">{value}</dd>
    </div>
  );
}

function EmptyState({ title, text, link, linkLabel }) {
  return (
    <div className="text-center py-16 rounded-xl border border-dashed border-[#E2DDD5]">
      <p className="font-serif text-xl mb-1.5">{title}</p>
      <p className="text-sm text-[#767B78] mb-5">{text}</p>
      {link && <VButton as={Link} to={link} variant="outline" size="sm">{linkLabel}</VButton>}
    </div>
  );
}

function PreferencesTab({ user, setUserData }) {
  const p = user.preferences || {};
  const [tripTypes, setTripTypes] = useState(p.trip_types || []);
  const [budget, setBudget] = useState(p.budget || "");
  const [airport, setAirport] = useState(p.home_airport || "");
  const [busy, setBusy] = useState(false);

  const toggle = (t) => setTripTypes((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/me/preferences", { trip_types: tripTypes, budget, home_airport: airport, newsletter: user.marketing_opt_in });
      setUserData(data);
      track("preferences_updated");
      toast.success("Preferences saved.");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-3 text-sm outline-none focus:border-[#2A4038] transition-colors";

  return (
    <div data-testid="tab-preferences">
      <h2 className="font-serif text-2xl font-semibold mb-6">Travel Preferences</h2>
      <p className="text-sm text-[#4A4E4B] mb-3">Preferred trip types</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TRIP_TYPES.map((t) => (
          <button key={t} onClick={() => toggle(t)} data-testid={`pref-type-${t.toLowerCase().replace(/\s+/g, "-")}`}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${tripTypes.includes(t) ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]" : "text-[#4A4E4B] border-[#E2DDD5] hover:border-[#2A4038]"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
        <div>
          <label className="block text-sm text-[#4A4E4B] mb-1.5">Typical budget (pp)</label>
          <select className={field} value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="pref-budget">
            <option value="">No preference</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#4A4E4B] mb-1.5">Home airport</label>
          <input className={field} placeholder="e.g. London Heathrow" value={airport} onChange={(e) => setAirport(e.target.value)} data-testid="pref-airport" />
        </div>
      </div>
      <VButton variant="primary" className="mt-6" onClick={save} disabled={busy} data-testid="save-preferences-btn">
        {busy ? "Saving..." : "Save preferences"}
      </VButton>
    </div>
  );
}

import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Clock, Check, ArrowRight, Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import DestinationCard from "../components/DestinationCard";
import { usePlanTrip } from "../context/PlanTripContext";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";
import api from "../lib/api";
import { DESTINATIONS, priceLabel } from "../data/content";
import NotFoundPage from "./NotFoundPage";

export default function DestinationDetailPage() {
  const { id } = useParams();
  const d = DESTINATIONS.find((x) => x.id === id);
  const { openPlanner } = usePlanTrip();
  const { user, setUserData } = useAuth();

  useEffect(() => { if (d) track("destination_page_view", { destination: id }); }, [id]); // eslint-disable-line

  if (!d) return <NotFoundPage />;

  const related = DESTINATIONS.filter((x) => x.region === d.region && x.id !== d.id).slice(0, 3);
  const saved = user && user.saved_destinations && user.saved_destinations.includes(d.id);

  const save = async () => {
    if (!user || !user.id) { toast.info("Sign in to save destinations."); return; }
    try {
      const { data } = await api.post("/me/saved", { type: "destination", item_id: d.id });
      setUserData({ ...user, saved_destinations: data.saved_destinations });
      track("destination_saved", { destination: d.id });
    } catch { toast.error("Couldn't update saved items."); }
  };

  return (
    <div data-testid="destination-detail-page">
      <Seo title={`${d.name}, ${d.country} | VOYARA Travel`} description={`${d.short} Discover VOYARA's ${d.name} holidays ${priceLabel(d.price).toLowerCase()} per person. Personalised itineraries and handpicked stays.`} />

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[460px] flex items-end">
        <img src={d.image} alt={`${d.name}, ${d.country}`} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12 text-white">
          <Link to="/destinations" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-5 transition-colors" data-testid="back-to-destinations">
            <ArrowLeft size={16} /> All destinations
          </Link>
          <p className="flex items-center gap-1.5 text-white/80 mb-2"><MapPin size={16} /> {d.country} · {d.region}</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium">{d.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="bg-white/95 text-[#2A4038] font-semibold px-4 py-1.5 rounded-full text-sm font-mono">{priceLabel(d.price)} pp</span>
            <span className="flex items-center gap-1.5 text-sm text-white/85"><Clock size={15} /> {d.duration}</span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          <div>
            <p className="overline text-[#2A4038] mb-3">Best for {d.bestFor.toLowerCase()}</p>
            <h2 className="font-serif text-3xl font-semibold mb-5">Why you'll love {d.name}</h2>
            <p className="text-lg text-[#4A4E4B] font-light leading-relaxed">{d.long}</p>

            <h3 className="font-serif text-2xl font-semibold mt-12 mb-5">What's included</h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {d.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 rounded-xl border border-[#E2DDD5] bg-white p-4">
                  <Check size={18} className="text-[#2A4038] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#2D312E]">{h}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              {d.tripTypes.map((t) => (
                <span key={t} className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-[#EFECE6] text-[#2A4038]">{t}</span>
              ))}
            </div>
          </div>

          {/* Booking card */}
          <aside>
            <div className="lg:sticky lg:top-28 rounded-2xl border border-[#E2DDD5] bg-white p-7 shadow-sm">
              <p className="text-sm text-[#767B78]">Holidays to {d.name}</p>
              <p className="font-serif text-4xl font-semibold text-[#2A4038] mt-1">£{d.price.toLocaleString("en-GB")}</p>
              <p className="text-xs text-[#767B78]">per person · {d.duration}</p>
              <VButton variant="accent" size="lg" className="w-full mt-6" data-testid="detail-plan-trip-btn"
                onClick={() => { track("plan_my_trip_click", { source: "destination-detail", destination: d.id }); openPlanner("destination-detail", { destination: d.name, trip_type: d.tripTypes[0] }); }}>
                Request a Quote
              </VButton>
              <VButton variant="outline" size="md" className="w-full mt-3" onClick={save} data-testid="detail-save-btn">
                <Heart size={16} className={saved ? "fill-[#C86D51] text-[#C86D51]" : ""} /> {saved ? "Saved" : "Save destination"}
              </VButton>
              <p className="text-xs text-[#767B78] text-center mt-4">Free, no-obligation quote within 24 hours.</p>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-[#F5F2EC] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-serif text-3xl font-semibold">More in {d.region}</h2>
              <VButton as={Link} to="/destinations" variant="ghost" size="sm">View all <ArrowRight size={15} /></VButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => <DestinationCard key={r.id} d={r} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

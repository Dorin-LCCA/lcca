import { useEffect, useState } from "react";
import { Clock, MapPin, Check, Heart } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { usePlanTrip } from "../context/PlanTripContext";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";
import api from "../lib/api";
import { OFFERS } from "../data/content";

const TABS = ["All", "Featured", "Weekend", "Early booking", "Seasonal", "Luxury", "Long haul"];

export default function OffersPage() {
  const { openPlanner } = usePlanTrip();
  const { user, setUserData } = useAuth();
  const [tab, setTab] = useState("All");
  useEffect(() => { track("page_view", { page: "offers" }); }, []);

  const filtered = tab === "All" ? OFFERS : OFFERS.filter((o) => o.tag === tab);

  const save = async (o) => {
    if (!user || !user.id) { toast.info("Sign in to save offers to your account."); return; }
    try {
      const { data } = await api.post("/me/saved", { type: "offer", item_id: o.id });
      setUserData({ ...user, saved_offers: data.saved_offers });
      track("offer_saved", { offer: o.id });
    } catch { toast.error("Couldn't update saved items."); }
  };

  return (
    <div data-testid="offers-page">
      <Seo title="Travel Offers & Deals | VOYARA Travel" description="Discover VOYARA's latest travel offers: weekend escapes, early booking deals, seasonal breaks and luxury getaways. Premium holidays at transparent prices." />

      <section className="relative pt-36 pb-16 bg-[#2A4038] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="overline text-[#D4A359] mb-4">Handpicked deals</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium max-w-2xl text-balance">Travel offers worth packing for</h1>
          <p className="mt-5 text-lg text-white/75 font-light max-w-xl">
            Carefully selected escapes at genuinely good prices, with no hidden costs and the same personal service as everything we do.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-wrap gap-2.5 mb-10">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); track("offers_filter", { tag: t }); }} data-testid={`offers-tab-${t.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-all ${tab === t ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]" : "bg-white text-[#4A4E4B] border-[#E2DDD5] hover:border-[#2A4038]"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((o) => {
            const saved = user && user.saved_offers && user.saved_offers.includes(o.id);
            return (
              <article key={o.id} data-testid={`offer-card-${o.id}`} className="group rounded-2xl overflow-hidden bg-white border border-[#E2DDD5] flex flex-col transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={o.image} alt={o.destination} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 bg-[#C86D51] text-white text-xs font-semibold px-3 py-1 rounded-full font-mono uppercase tracking-wide">{o.tag}</span>
                  <button onClick={() => save(o)} aria-label="Save offer" data-testid={`save-offer-${o.id}`}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
                    <Heart size={16} className={saved ? "fill-[#C86D51] text-[#C86D51]" : "text-[#2A4038]"} />
                  </button>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="flex items-center gap-1.5 text-xs text-[#767B78] mb-1"><MapPin size={13} /> {o.destination}</p>
                  <h3 className="font-serif text-2xl font-semibold">{o.title}</h3>
                  <p className="text-sm text-[#4A4E4B] mt-2 leading-relaxed">{o.blurb}</p>
                  <div className="mt-4 mb-4 space-y-1.5">
                    {o.includes.map((inc) => (
                      <p key={inc} className="flex items-center gap-2 text-xs text-[#4A4E4B]"><Check size={14} className="text-[#2A4038]" /> {inc}</p>
                    ))}
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-4 border-t border-[#EFECE6]">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-[#767B78] font-mono"><Clock size={12} /> {o.duration}</p>
                      <p className="font-serif text-2xl font-semibold text-[#2A4038]">£{o.price}<span className="text-xs text-[#767B78] font-sans font-normal"> pp</span></p>
                    </div>
                    <VButton variant="primary" size="sm" data-testid={`offer-view-${o.id}`}
                      onClick={() => { track("offer_click", { offer: o.id }); openPlanner("offer", { destination: o.destination, trip_type: "" }); }}>
                      View Offer
                    </VButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import DestinationCard from "../components/DestinationCard";
import { usePlanTrip } from "../context/PlanTripContext";
import { track } from "../lib/analytics";
import { DESTINATIONS, REGIONS, TRIP_TYPES, BUDGETS, DURATIONS, budgetMatch } from "../data/content";

export default function DestinationsPage() {
  const [params] = useSearchParams();
  const { openPlanner } = usePlanTrip();
  const [q, setQ] = useState(params.get("q") || "");
  const [region, setRegion] = useState("");
  const [tripType, setTripType] = useState(params.get("type") || "");
  const [budget, setBudget] = useState(params.get("budget") || "");
  const [duration, setDuration] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { track("page_view", { page: "destinations" }); }, []);

  const results = useMemo(() => {
    return DESTINATIONS.filter((d) => {
      if (q && !(`${d.name} ${d.country} ${d.short}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (region && d.region !== region) return false;
      if (tripType && !d.tripTypes.includes(tripType)) return false;
      if (budget && !budgetMatch(d.price, budget)) return false;
      if (duration) {
        const n = parseInt(d.duration);
        if (duration === "2-4 nights" && n > 4) return false;
        if (duration === "5-7 nights" && (n < 5 || n > 7)) return false;
        if (duration === "8+ nights" && n < 8) return false;
      }
      return true;
    });
  }, [q, region, tripType, budget, duration]);

  const clear = () => { setQ(""); setRegion(""); setTripType(""); setBudget(""); setDuration(""); };
  const sel = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-2.5 text-sm outline-none focus:border-[#2A4038] transition-colors";

  const Filters = () => (
    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
      <div>
        <label className="block text-xs font-semibold text-[#4A4E4B] mb-1.5">Region</label>
        <select className={sel} value={region} onChange={(e) => setRegion(e.target.value)} data-testid="filter-region">
          <option value="">All regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#4A4E4B] mb-1.5">Trip type</label>
        <select className={sel} value={tripType} onChange={(e) => setTripType(e.target.value)} data-testid="filter-trip-type">
          <option value="">All types</option>
          {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#4A4E4B] mb-1.5">Budget (pp)</label>
        <select className={sel} value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="filter-budget">
          <option value="">Any budget</option>
          {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#4A4E4B] mb-1.5">Duration</label>
        <select className={sel} value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="filter-duration">
          <option value="">Any length</option>
          {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <VButton variant="ghost" size="sm" onClick={clear} className="col-span-2 lg:col-span-1" data-testid="clear-filters-btn">
        <X size={15} /> Clear filters
      </VButton>
    </div>
  );

  return (
    <div data-testid="destinations-page">
      <Seo title="Destinations | VOYARA Travel" description="Explore VOYARA's handpicked destinations across Europe, Asia, the Middle East and beyond. Filter by region, budget, trip type and duration to find your perfect escape." />

      {/* Page hero */}
      <section className="relative pt-36 pb-16 bg-[#2A4038] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="overline text-[#D4A359] mb-4">Explore the world</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium max-w-2xl text-balance">Find your next destination</h1>
          <p className="mt-5 text-lg text-white/75 font-light max-w-xl">
            From weekend city breaks to once-in-a-lifetime escapes, filter by what matters to you and discover where you'll go next.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Search bar */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#767B78]" />
            <input
              className="w-full rounded-full border border-[#E2DDD5] bg-white pl-11 pr-4 py-3.5 text-sm outline-none focus:border-[#2A4038] transition-colors"
              placeholder="Search destinations, e.g. Lisbon, beach, Italy..."
              value={q} onChange={(e) => setQ(e.target.value)} data-testid="destinations-search-input" aria-label="Search destinations"
            />
          </div>
          <VButton variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} data-testid="toggle-filters-btn">
            <SlidersHorizontal size={16} /> Filters
          </VButton>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-28 rounded-2xl border border-[#E2DDD5] bg-white p-6">
              <h2 className="font-serif text-xl font-semibold mb-5 flex items-center gap-2"><SlidersHorizontal size={18} /> Filters</h2>
              <Filters />
            </div>
          </aside>

          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#767B78]" data-testid="results-count">{results.length} destination{results.length !== 1 ? "s" : ""} found</p>
            </div>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((d) => <DestinationCard key={d.id} d={d} />)}
              </div>
            ) : (
              <div className="text-center py-20 rounded-2xl border border-dashed border-[#E2DDD5]">
                <p className="font-serif text-2xl mb-2">No matches just yet</p>
                <p className="text-[#767B78] mb-6">Try adjusting your filters, or let us plan something bespoke.</p>
                <VButton variant="accent" onClick={() => openPlanner("destinations-empty")} data-testid="empty-plan-btn">Plan My Trip</VButton>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

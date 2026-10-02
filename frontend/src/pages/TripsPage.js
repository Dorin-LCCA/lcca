import { useEffect } from "react";
import { Clock, Check, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import SectionHeading from "../components/SectionHeading";
import { usePlanTrip } from "../context/PlanTripContext";
import { track } from "../lib/analytics";
import { EXPERIENCES } from "../data/content";

export default function TripsPage() {
  const { openPlanner } = usePlanTrip();
  useEffect(() => { track("page_view", { page: "experiences" }); }, []);

  return (
    <div data-testid="trips-page">
      <Seo title="Trips & Experiences | VOYARA Travel" description="Explore VOYARA's curated travel experiences: city breaks, beach escapes, adventure trips, romantic getaways, family holidays and luxury journeys. Find the trip made for you." />

      <section className="relative pt-36 pb-16 bg-[#2A4038] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="overline text-[#D4A359] mb-4">Travel your way</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium max-w-2xl text-balance">Trips & experiences</h1>
          <p className="mt-5 text-lg text-white/75 font-light max-w-xl">
            However you like to travel, we've curated an experience around it, each one handpicked, personalised and ready to make your own.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20">
        {EXPERIENCES.map((ex, i) => (
          <article key={ex.id} data-testid={`experience-detail-${ex.id}`} className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] [direction:ltr]">
              <img src={ex.image} alt={ex.title} loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute top-4 left-4 bg-[#FDFBF7]/95 text-[#2A4038] text-xs font-semibold px-3 py-1.5 rounded-full font-mono">From £{ex.price} pp</span>
            </div>
            <div className="[direction:ltr]">
              <p className="overline text-[#2A4038] mb-3">Experience {String(i + 1).padStart(2, "0")}</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold">{ex.title}</h2>
              <p className="mt-4 text-[#4A4E4B] leading-relaxed">{ex.description}</p>
              <div className="flex items-center gap-5 mt-5 text-sm text-[#767B78]">
                <span className="flex items-center gap-1.5 font-mono"><Clock size={15} /> {ex.duration}</span>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2.5 mt-6">
                {ex.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-[#2D312E]">
                    <Check size={16} className="text-[#2A4038] mt-0.5 shrink-0" /> {h}
                  </li>
                ))}
              </ul>
              <VButton variant="accent" className="mt-8" data-testid={`experience-view-${ex.id}`}
                onClick={() => { track("experience_view_click", { experience: ex.id }); openPlanner("experience", { trip_type: ex.title }); }}>
                View Experience <ArrowRight size={16} />
              </VButton>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-[#F5F2EC] py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <SectionHeading align="center" overline="Something bespoke?" title="Can't find quite the right trip?"
            subtitle="Tell us what you have in mind and our specialists will design a one-of-a-kind itinerary just for you." />
          <VButton variant="primary" size="lg" className="mt-8" onClick={() => openPlanner("experiences-cta")} data-testid="trips-plan-btn">
            Start Planning
          </VButton>
        </div>
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Compass, Eye, ShieldCheck, Leaf, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import SectionHeading from "../components/SectionHeading";
import { usePlanTrip } from "../context/PlanTripContext";
import { track } from "../lib/analytics";
import { TEAM, TESTIMONIALS } from "../data/content";

const VALUES = [
  { icon: Compass, title: "Personal", text: "We plan around you, never a template. Your trip should feel like it was designed for you, because it was." },
  { icon: Eye, title: "Curious", text: "We're travellers first. We chase the hidden corners and share what we genuinely love, not just what sells." },
  { icon: ShieldCheck, title: "Transparent", text: "Clear pricing, honest advice and no hidden costs. You'll always know exactly what you're booking and why." },
  { icon: Leaf, title: "Responsible", text: "We favour partners who respect people and places, so your travels leave a lighter footprint." },
];

const STEPS = [
  { n: "01", title: "Tell us what you want", text: "Share your dates, budget and the kind of trip you're dreaming about." },
  { n: "02", title: "Discover your options", text: "We curate a shortlist of destinations, stays and experiences made for you." },
  { n: "03", title: "Personalise your trip", text: "Refine every detail together until the itinerary feels exactly right." },
  { n: "04", title: "Start your journey", text: "Travel with confidence, with our UK team on hand the whole way." },
];

export default function AboutPage() {
  const { openPlanner } = usePlanTrip();
  useEffect(() => { track("page_view", { page: "about" }); }, []);

  return (
    <div data-testid="about-page">
      <Seo title="About Us | DORIN Travel" description="DORIN is a modern digital travel agency built on the belief that travel should feel personal. Discover our story, mission and values, and how we plan trips." />

      <section className="relative pt-36 pb-20 bg-[#2A4038] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="overline text-[#D4A359] mb-4">Our story</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.1] text-balance">Travel should feel personal.</h1>
            <p className="mt-6 text-lg text-white/80 font-light leading-relaxed">
              DORIN began with a simple frustration: planning a great trip had become overwhelming. Endless tabs, generic packages and no one who actually knew you. We built a different kind of travel company, one that blends digital convenience with real human expertise.
            </p>
          </div>
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
            <img src="https://images.unsplash.com/photo-1501868984184-76121ed6a6e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="Travel planning with maps and a journal" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <p className="overline text-[#2A4038] mb-4">Our mission</p>
        <p className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.25] text-[#1C1E1D] text-balance">
          To make discovering and planning travel simpler, more personal and more inspiring.
        </p>
      </section>

      {/* Values */}
      <section className="bg-[#F5F2EC] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading overline="What we stand for" title="The values behind every trip" align="center" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white border border-[#E2DDD5] p-7">
                <div className="w-12 h-12 rounded-full bg-[#2A4038]/8 flex items-center justify-center mb-5">
                  <v.icon size={22} className="text-[#2A4038]" />
                </div>
                <h3 className="font-serif text-xl font-medium mb-2">{v.title}</h3>
                <p className="text-sm text-[#4A4E4B] leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <SectionHeading overline="How it works" title="Four simple steps to your next trip"
          subtitle="From first idea to final boarding pass, we make the whole journey effortless." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-[#E2DDD5] bg-white p-7">
              <span className="font-serif text-5xl font-semibold text-[#EFECE6]">{s.n}</span>
              <h3 className="font-serif text-xl font-medium mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-[#4A4E4B] leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-[#F5F2EC] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading overline="The people" title="Meet the specialists"
            subtitle="A small, passionate team of travellers who've been to the places we send you." />
          <div className="grid sm:grid-cols-2 gap-8 mt-14 max-w-2xl">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-2xl overflow-hidden bg-white border border-[#E2DDD5]">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={t.image} alt={t.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold">{t.name}</h3>
                  <p className="text-sm text-[#C86D51] font-medium mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews anchor */}
      <section id="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 scroll-mt-24">
        <SectionHeading overline="Why customers trust us" title="What our travellers say" align="center" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <figure key={i} className="rounded-2xl bg-[#F5F2EC] p-7">
              <blockquote className="text-[#2D312E] leading-relaxed">"{t.review}"</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-[#2A4038]">— {t.name}, {t.location} · <span className="font-normal text-[#767B78] font-mono text-xs">{t.trip}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1C211E] text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-balance">Ready to travel better?</h2>
          <p className="mt-4 text-white/75">Let's plan a trip that feels like it was made just for you.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <VButton variant="accent" size="lg" onClick={() => openPlanner("about-cta")} data-testid="about-plan-btn">Plan My Trip <ArrowRight size={18} /></VButton>
            <VButton as={Link} to="/destinations" variant="light" size="lg" data-testid="about-explore-btn">Explore Destinations</VButton>
          </div>
        </div>
      </section>
    </div>
  );
}

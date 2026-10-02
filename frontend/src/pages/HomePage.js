import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Compass, Sparkles, ShieldCheck, HeartHandshake, ArrowRight, Star, Instagram, ChevronRight } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import SectionHeading from "../components/SectionHeading";
import DestinationCard from "../components/DestinationCard";
import NewsletterForm from "../components/NewsletterForm";
import useReveal from "../hooks/useReveal";
import { usePlanTrip } from "../context/PlanTripContext";
import { track } from "../lib/analytics";
import { DESTINATIONS, EXPERIENCES, OFFERS, TESTIMONIALS, SOCIAL_GALLERY, TRIP_TYPES, BUDGETS, priceLabel } from "../data/content";

const HERO = "https://images.unsplash.com/photo-1633321088768-b994237c8aa8?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState({ where: "", when: "", travellers: "2", type: "", budget: "" });
  const set = (k) => (e) => setQ((s) => ({ ...s, [k]: e.target.value }));
  const field = "w-full bg-transparent text-sm text-[#1C1E1D] placeholder:text-[#767B78] outline-none";

  const submit = (e) => {
    e.preventDefault();
    track("trip_planner_search", { ...q });
    const params = new URLSearchParams();
    if (q.type) params.set("type", q.type);
    if (q.budget) params.set("budget", q.budget);
    if (q.where) params.set("q", q.where);
    navigate(`/destinations?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      data-testid="hero-trip-planner"
      className="bg-[#FDFBF7] rounded-2xl sm:rounded-full shadow-2xl p-2.5 sm:p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-1 items-stretch"
    >
      <div className="lg:col-span-2 px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-[#E2DDD5]">
        <label className="block overline text-[#2A4038] text-[0.6rem] mb-0.5">Where</label>
        <input className={field} placeholder="Destination or city" value={q.where} onChange={set("where")} data-testid="hero-where-input" aria-label="Where" />
      </div>
      <div className="px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-[#E2DDD5]">
        <label className="block overline text-[#2A4038] text-[0.6rem] mb-0.5">When</label>
        <input className={field} placeholder="Any month" value={q.when} onChange={set("when")} data-testid="hero-when-input" aria-label="When" />
      </div>
      <div className="px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-[#E2DDD5]">
        <label className="block overline text-[#2A4038] text-[0.6rem] mb-0.5">Trip type</label>
        <select className={field} value={q.type} onChange={set("type")} data-testid="hero-type-select" aria-label="Trip type">
          <option value="">Any</option>
          {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="px-4 py-2.5 border-b sm:border-b-0 sm:border-r border-[#E2DDD5]">
        <label className="block overline text-[#2A4038] text-[0.6rem] mb-0.5">Budget</label>
        <select className={field} value={q.budget} onChange={set("budget")} data-testid="hero-budget-select" aria-label="Budget">
          <option value="">Any</option>
          {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-center p-1">
        <VButton type="submit" variant="accent" size="md" className="w-full h-full" data-testid="hero-find-trip-btn">
          <Search size={16} /> Find My Trip
        </VButton>
      </div>
    </form>
  );
}

const WHY = [
  { icon: Sparkles, title: "Personalised recommendations", text: "Every itinerary is tailored to how you actually like to travel, never copy-pasted." },
  { icon: Compass, title: "Handpicked experiences", text: "Hotels and experiences we've visited and vetted, so you book with total confidence." },
  { icon: ShieldCheck, title: "Trusted travel support", text: "UK-based specialists on hand around the clock, with full financial protection." },
  { icon: HeartHandshake, title: "Travel planning made simple", text: "One point of contact and transparent pricing from first idea to final boarding pass." },
];

function WhyChooseUs() {
  const [ref, inView] = useReveal();
  return (
    <section className="bg-[#2A4038] text-white py-20 sm:py-28" data-testid="why-choose-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading overline="Why VOYARA" title="Travel better, from the very first click." light
          subtitle="We blend inspiration with genuine expertise so your trip feels personal, protected and effortless." />
        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {WHY.map((w, i) => (
            <div key={w.title} className={`reveal ${inView ? "in-view" : ""} rounded-2xl bg-white/[0.06] border border-white/10 p-7 hover:bg-white/[0.1] transition-colors`} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="w-12 h-12 rounded-full bg-[#C86D51]/20 flex items-center justify-center mb-5">
                <w.icon size={22} className="text-[#D4A359]" />
              </div>
              <h3 className="font-serif text-xl font-medium mb-2">{w.title}</h3>
              <p className="text-sm text-white/70 leading-relaxed">{w.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stars({ n }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} className={i <= n ? "fill-[#D4A359] text-[#D4A359]" : "text-[#D4A359]/30"} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { openPlanner } = usePlanTrip();
  const featured = OFFERS[0];

  return (
    <div data-testid="home-page">
      <Seo title="VOYARA Travel | Discover More. Travel Better." description="VOYARA is a modern digital travel agency helping you discover inspiring destinations, curated experiences and personalised holidays. Explore destinations, plan your trip and request a quote." />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden" data-testid="hero-section">
        <img src={HERO} alt="Amalfi Coast cliffside village overlooking the turquoise Mediterranean sea" className="absolute inset-0 w-full h-full object-cover ken-burns" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12 lg:pb-16 pt-32">
          <div className="max-w-2xl text-white reveal in-view">
            <p className="overline text-[#D4A359] mb-5">Personalised travel, beautifully planned</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.08] tracking-tight text-balance">
              Your next adventure starts here.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/85 font-light leading-relaxed max-w-xl">
              Discover inspiring destinations, carefully selected experiences and personalised travel ideas designed around the way you want to travel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <VButton as={Link} to="/destinations" size="lg" variant="light" data-testid="hero-explore-btn" onClick={() => track("cta_click", { cta: "explore_destinations", source: "hero" })}>
                Explore Destinations <ArrowRight size={18} />
              </VButton>
              <VButton size="lg" variant="accent" data-testid="hero-plan-trip-btn" onClick={() => { track("plan_my_trip_click", { source: "hero" }); openPlanner("hero"); }}>
                Plan My Trip
              </VButton>
            </div>
          </div>
        </div>
      </section>

      {/* TRIP PLANNER SEARCH */}
      <section className="relative z-10 -mt-10 sm:-mt-9 px-4 sm:px-6 lg:px-8" aria-label="Trip planner">
        <div className="max-w-5xl mx-auto">
          <HeroSearch />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-5 text-xs text-[#767B78]">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#2A4038]" /> ABTA & ATOL protected</span>
            <span className="flex items-center gap-1.5"><Star size={14} className="text-[#D4A359] fill-[#D4A359]" /> 4.9/5 from 2,400+ travellers</span>
            <span className="flex items-center gap-1.5"><HeartHandshake size={14} className="text-[#2A4038]" /> UK-based specialists</span>
          </div>
        </div>
      </section>

      {/* POPULAR DESTINATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28" data-testid="popular-destinations-section">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <SectionHeading overline="Popular right now" title="Destinations our travellers love"
            subtitle="Hand-selected places worth the journey, from weekend city breaks to far-flung escapes." />
          <VButton as={Link} to="/destinations" variant="outline" size="sm" data-testid="view-all-destinations-btn">
            View all destinations <ChevronRight size={16} />
          </VButton>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DESTINATIONS.slice(0, 8).map((d) => <DestinationCard key={d.id} d={d} />)}
        </div>
      </section>

      {/* TRAVEL YOUR WAY */}
      <section className="bg-[#F5F2EC] py-20 sm:py-28" data-testid="experiences-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading overline="Travel your way" title="Every kind of trip, thoughtfully curated"
            subtitle="However you like to travel, we have an experience designed around it." align="center" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {EXPERIENCES.map((ex) => (
              <Link key={ex.id} to="/experiences" data-testid={`experience-card-${ex.id}`} onClick={() => track("experience_card_click", { experience: ex.id })}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4] block">
                <img src={ex.image} alt={ex.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <h3 className="font-serif text-2xl font-medium mb-1.5">{ex.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{ex.short}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold mt-3 text-[#D4A359] group-hover:gap-2.5 transition-all">
                    Discover <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <WhyChooseUs />

      {/* FEATURED OFFER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28" data-testid="featured-offer-section">
        <div className="grid lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-[#E2DDD5] bg-white">
          <div className="relative min-h-[340px] lg:min-h-full">
            <img src={featured.image} alt="Santorini caldera at sunset" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <span className="absolute top-5 left-5 bg-[#C86D51] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full font-mono uppercase tracking-wider">Limited offer</span>
          </div>
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <p className="overline text-[#2A4038] mb-3">Featured escape</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold">{featured.title}</h2>
            <p className="mt-3 text-[#4A4E4B] leading-relaxed">{featured.blurb}</p>
            <div className="flex items-baseline gap-2 mt-6">
              <span className="font-serif text-4xl font-semibold text-[#2A4038]">£{featured.price}</span>
              <span className="text-sm text-[#767B78]">per person · {featured.duration}</span>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {featured.includes.map((inc) => (
                <li key={inc} className="text-sm text-[#4A4E4B] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86D51]" /> {inc}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <VButton as={Link} to="/offers" variant="primary" data-testid="featured-view-offer-btn" onClick={() => track("offer_click", { offer: featured.id, source: "home-featured" })}>
                View Offer <ArrowRight size={16} />
              </VButton>
              <VButton variant="ghost" onClick={() => openPlanner("featured-offer", { destination: "Santorini", trip_type: "Romantic Escape" })} data-testid="featured-plan-btn">
                Request a Quote
              </VButton>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#F5F2EC] py-20 sm:py-28" data-testid="testimonials-section" id="reviews">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading overline="What our travellers say" title="Trusted by travellers across the UK"
            subtitle="Real words from real trips. This is why people keep coming back to VOYARA." align="center" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} data-testid={`testimonial-${i}`} className="rounded-2xl bg-white border border-[#E2DDD5] p-7 flex flex-col">
                <Stars n={t.rating} />
                <blockquote className="mt-4 text-[#2D312E] leading-relaxed flex-1">"{t.review}"</blockquote>
                <figcaption className="mt-5 pt-5 border-t border-[#EFECE6] flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#2A4038] text-[#FDFBF7] flex items-center justify-center font-serif text-lg">{t.name[0]}</span>
                  <div>
                    <p className="font-semibold text-sm text-[#1C1E1D]">{t.name}, {t.location}</p>
                    <p className="text-xs text-[#767B78] font-mono">{t.trip}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER / CRM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28" data-testid="newsletter-section">
        <div className="rounded-3xl bg-[#1C211E] text-white p-8 sm:p-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="overline text-[#D4A359] mb-3">Join the Travel Club</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-balance">Get travel inspiration in your inbox</h2>
            <p className="mt-4 text-white/75 leading-relaxed max-w-md">
              Discover new destinations, exclusive travel ideas and selected offers. Tell us what you love and we'll tailor what we send.
            </p>
          </div>
          <div className="bg-white/[0.04] rounded-2xl p-6 border border-white/10">
            <NewsletterForm variant="section" testidPrefix="home-newsletter" />
          </div>
        </div>
      </section>

      {/* SOCIAL GALLERY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28" data-testid="social-gallery-section">
        <SectionHeading overline="@voyaratravel" title="Follow the journey" align="center"
          subtitle="Tag #VoyaraTravel to be featured. Real moments from our travellers around the world." />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-12">
          {SOCIAL_GALLERY.map((src, i) => (
            <a key={i} href="https://instagram.com" target="_blank" rel="noopener noreferrer" data-testid={`social-tile-${i}`}
              className="group relative aspect-square rounded-xl overflow-hidden" onClick={() => track("social_click", { platform: "instagram", tile: i })}>
              <img src={src} alt="Travel moment shared on Instagram" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-[#2A4038]/0 group-hover:bg-[#2A4038]/40 transition-colors flex items-center justify-center">
                <Instagram size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden" data-testid="final-cta-section">
        <img src="https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" alt="Dramatic mountain landscape at golden hour" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-[#1C211E]/80" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center py-24 sm:py-32 text-white">
          <h2 className="font-serif text-4xl sm:text-5xl font-medium text-balance">Where will you go next?</h2>
          <p className="mt-5 text-lg text-white/80 font-light max-w-xl mx-auto">
            Tell us what kind of trip you're dreaming about and we'll help you start planning.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <VButton size="lg" variant="accent" onClick={() => { track("plan_my_trip_click", { source: "final-cta" }); openPlanner("final-cta"); }} data-testid="final-cta-plan-btn">
              Plan My Trip <ArrowRight size={18} />
            </VButton>
            <VButton as={Link} to="/offers" size="lg" variant="light" data-testid="final-cta-offers-btn">
              Find Your Escape
            </VButton>
          </div>
        </div>
      </section>
    </div>
  );
}

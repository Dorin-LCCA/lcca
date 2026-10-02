import { useEffect, useState } from "react";
import { MapPin, Mail, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import SectionHeading from "../components/SectionHeading";
import api, { formatApiErrorDetail } from "../lib/api";
import { track } from "../lib/analytics";
import { FAQS, TRIP_TYPES, BUDGETS } from "../data/content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", destination: "", travel_dates: "", travellers: "2", budget: "", message: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { track("page_view", { page: "contact" }); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-3 text-sm outline-none focus:border-[#2A4038] transition-colors";

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Please complete your name, email and message."); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/leads/contact", form);
      track("contact_form_submitted", { destination: form.destination, budget: form.budget });
      toast.success(data.message);
      setForm({ name: "", email: "", phone: "", destination: "", travel_dates: "", travellers: "2", budget: "", message: "" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Something went wrong.");
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="contact-page">
      <Seo title="Contact Us | DORIN Travel" description="Get in touch with DORIN Travel. Send a travel enquiry, request a quote, or visit our London office. UK-based specialists ready to help plan your trip." />

      <section className="relative pt-36 pb-14 bg-[#2A4038] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="overline text-[#D4A359] mb-4">We'd love to hear from you</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium max-w-2xl text-balance">Let's start planning</h1>
          <p className="mt-5 text-lg text-white/75 font-light max-w-xl">
            Tell us about your trip and a specialist will be in touch within one business day.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          {/* Form */}
          <form onSubmit={submit} className="rounded-2xl border border-[#E2DDD5] bg-white p-7 sm:p-9" data-testid="contact-form">
            <h2 className="font-serif text-2xl font-semibold mb-6">Send an enquiry</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input className={field} placeholder="Full name *" value={form.name} onChange={set("name")} data-testid="contact-name" aria-label="Full name" required />
              <input className={field} type="email" placeholder="Email address *" value={form.email} onChange={set("email")} data-testid="contact-email" aria-label="Email" required />
              <input className={field} placeholder="Phone number" value={form.phone} onChange={set("phone")} data-testid="contact-phone" aria-label="Phone" />
              <input className={field} placeholder="Destination of interest" value={form.destination} onChange={set("destination")} data-testid="contact-destination" aria-label="Destination" />
              <input className={field} placeholder="Travel dates (e.g. Sept 2026)" value={form.travel_dates} onChange={set("travel_dates")} data-testid="contact-dates" aria-label="Travel dates" />
              <select className={field} value={form.travellers} onChange={set("travellers")} data-testid="contact-travellers" aria-label="Travellers">
                {["1", "2", "3", "4", "5+"].map((n) => <option key={n} value={n}>{n} traveller{n !== "1" ? "s" : ""}</option>)}
              </select>
              <select className={field} value={form.budget} onChange={set("budget")} data-testid="contact-budget" aria-label="Budget">
                <option value="">Budget (pp)</option>
                {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className={field} value={form.trip_type || ""} onChange={set("trip_type")} data-testid="contact-trip-type" aria-label="Trip type">
                <option value="">Trip type</option>
                {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea className={`${field} mt-4`} rows={4} placeholder="Tell us about your ideal trip *" value={form.message} onChange={set("message")} data-testid="contact-message" aria-label="Message" required />
            <VButton type="submit" variant="accent" size="lg" className="mt-5 w-full sm:w-auto" disabled={busy} data-testid="contact-submit-btn">
              {busy ? "Sending..." : "Send Enquiry"}
            </VButton>
            <p className="text-xs text-[#767B78] mt-4">Your enquiry is sent securely. We'll only use your details to respond and never share them.</p>
          </form>

          {/* Info */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-7 space-y-5">
              {[
                { icon: Mail, label: "Email", value: "hello@dorintravel.com" },
                { icon: Phone, label: "Phone", value: "+44 20 7946 0123" },
                { icon: Clock, label: "Opening hours", value: "Mon–Fri 9am–7pm · Sat 10am–4pm" },
                { icon: MapPin, label: "London office", value: "24 Carnaby Street, Soho, London W1F" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2A4038]/8 flex items-center justify-center shrink-0">
                    <item.icon size={18} className="text-[#2A4038]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#767B78] font-mono uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm text-[#1C1E1D] font-medium mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#E2DDD5] h-64">
              <iframe
                title="DORIN London office map"
                data-testid="contact-map"
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-0.145%2C51.510%2C-0.130%2C51.517&layer=mapnik&marker=51.5135%2C-0.1385"
              />
            </div>
          </aside>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#F5F2EC] py-20 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeading align="center" overline="Good to know" title="Frequently asked questions" />
          <Accordion type="single" collapsible className="mt-10" data-testid="faq-accordion">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-[#E2DDD5]">
                <AccordionTrigger className="text-left font-serif text-lg font-medium hover:no-underline py-5" data-testid={`faq-trigger-${i}`}>
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[#4A4E4B] leading-relaxed text-base pb-5">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}

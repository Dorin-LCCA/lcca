import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import VButton from "./VButton";
import { usePlanTrip } from "../context/PlanTripContext";
import { TRIP_TYPES, BUDGETS } from "../data/content";
import api, { formatApiErrorDetail } from "../lib/api";
import { track } from "../lib/analytics";

export default function TripPlannerModal() {
  const { open, prefill, closePlanner } = usePlanTrip();
  const [form, setForm] = useState({
    name: "", email: "", destination: "", travel_dates: "",
    travellers: "2", trip_type: "", budget: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        destination: prefill.destination || f.destination,
        trip_type: prefill.trip_type || f.trip_type,
      }));
      track("plan_trip_modal_open", { source: prefill.source || "unknown" });
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePlanner();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePlanner]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Please add your name and email so we can reach you.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/leads/enquiry", form);
      track("trip_enquiry_submitted", { destination: form.destination, trip_type: form.trip_type, budget: form.budget });
      toast.success(data.message);
      closePlanner();
      setForm({ name: "", email: "", destination: "", travel_dates: "", travellers: "2", trip_type: "", budget: "", message: "" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-3 text-sm text-[#1C1E1D] placeholder:text-[#767B78] focus:border-[#2A4038] focus:ring-0 outline-none transition-colors";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C1E1D]/60 backdrop-blur-sm animate-[dorin-fade-up_0.3s_ease]"
      onClick={closePlanner}
      data-testid="plan-trip-modal"
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FDFBF7] rounded-3xl p-7 sm:p-9 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closePlanner}
          className="absolute top-5 right-5 text-[#767B78] hover:text-[#1C1E1D] transition-colors"
          data-testid="plan-trip-close"
          aria-label="Close"
        >
          <X size={22} />
        </button>
        <p className="overline text-[#2A4038] mb-2">Plan My Trip</p>
        <h2 className="font-serif text-3xl font-semibold mb-1.5">Let's build your escape</h2>
        <p className="text-sm text-[#4A4E4B] mb-6">
          Tell us what you're dreaming about and a specialist will reply within 24 hours with tailored ideas.
        </p>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <input className={field} placeholder="Full name" value={form.name} onChange={set("name")} data-testid="plan-name-input" aria-label="Full name" required />
            <input className={field} type="email" placeholder="Email address" value={form.email} onChange={set("email")} data-testid="plan-email-input" aria-label="Email" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <input className={field} placeholder="Where to? (e.g. Santorini)" value={form.destination} onChange={set("destination")} data-testid="plan-destination-input" aria-label="Destination" />
            <input className={field} placeholder="When? (e.g. Sept 2026)" value={form.travel_dates} onChange={set("travel_dates")} data-testid="plan-dates-input" aria-label="Travel dates" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <select className={field} value={form.trip_type} onChange={set("trip_type")} data-testid="plan-trip-type-select" aria-label="Trip type">
              <option value="">Trip type</option>
              {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={field} value={form.budget} onChange={set("budget")} data-testid="plan-budget-select" aria-label="Budget">
              <option value="">Budget (pp)</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <select className={field} value={form.travellers} onChange={set("travellers")} data-testid="plan-travellers-select" aria-label="Travellers">
              {["1", "2", "3", "4", "5+"].map((n) => <option key={n} value={n}>{n} traveller{n !== "1" ? "s" : ""}</option>)}
            </select>
          </div>
          <textarea className={field} rows={3} placeholder="Anything else we should know?" value={form.message} onChange={set("message")} data-testid="plan-message-input" aria-label="Message" />
          <VButton type="submit" variant="accent" size="lg" className="w-full" disabled={submitting} data-testid="plan-submit-btn">
            {submitting ? "Sending..." : "Request a Quote"}
          </VButton>
          <p className="text-xs text-[#767B78] text-center">
            By submitting you agree to be contacted about your enquiry. We never share your details.
          </p>
        </form>
      </div>
    </div>
  );
}

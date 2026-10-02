import { useState } from "react";
import { toast } from "sonner";
import VButton from "./VButton";
import api, { formatApiErrorDetail } from "../lib/api";
import { track } from "../lib/analytics";

const INTERESTS = ["City Breaks", "Beach", "Luxury", "Adventure", "Budget", "Family"];

export default function NewsletterForm({ variant = "section", testidPrefix = "newsletter" }) {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [busy, setBusy] = useState(false);

  const toggle = (i) =>
    setInterests((arr) => (arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i]));

  const submit = async (e) => {
    e.preventDefault();
    if (!first || !email) {
      toast.error("Please add your first name and email.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/leads/newsletter", {
        first_name: first, email, interests, consent: true,
      });
      track("newsletter_signup", { source: variant, interests });
      toast.success(data.message);
      setFirst(""); setEmail(""); setInterests([]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const dark = variant === "footer";
  const input = dark
    ? "w-full rounded-full bg-white/10 border border-white/20 px-5 py-3 text-sm text-white placeholder:text-white/60 outline-none focus:border-white/50 transition-colors"
    : "w-full rounded-full bg-white border border-[#E2DDD5] px-5 py-3.5 text-sm text-[#1C1E1D] placeholder:text-[#767B78] outline-none focus:border-[#2A4038] transition-colors";

  return (
    <form onSubmit={submit} className="w-full" data-testid={`${testidPrefix}-form`}>
      <div className={`flex flex-col ${dark ? "sm:flex-row" : "sm:flex-row"} gap-3`}>
        <input
          className={input}
          placeholder="First name"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          data-testid={`${testidPrefix}-firstname-input`}
          aria-label="First name"
          required
        />
        <input
          className={input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid={`${testidPrefix}-email-input`}
          aria-label="Email address"
          required
        />
        <VButton
          type="submit"
          variant={dark ? "accent" : "primary"}
          className="whitespace-nowrap shrink-0"
          disabled={busy}
          data-testid={`${testidPrefix}-submit-btn`}
        >
          {busy ? "Joining..." : "Join the Travel Club"}
        </VButton>
      </div>
      {!dark && (
        <div className="flex flex-wrap gap-2 mt-4">
          {INTERESTS.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => toggle(i)}
              data-testid={`${testidPrefix}-interest-${i.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
                interests.includes(i)
                  ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]"
                  : "bg-transparent text-[#4A4E4B] border-[#E2DDD5] hover:border-[#2A4038]"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      )}
      <p className={`text-xs mt-3 ${dark ? "text-white/60" : "text-[#767B78]"}`}>
        We'll only send travel inspiration and offers. Unsubscribe anytime. See our Privacy Policy.
      </p>
    </form>
  );
}

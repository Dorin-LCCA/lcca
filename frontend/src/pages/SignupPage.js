import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";

const HERO = "https://images.unsplash.com/photo-1633321088768-b994237c8aa8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", confirm: "" });
  const [marketing, setMarketing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-3 text-sm outline-none focus:border-[#2A4038] transition-colors";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    const res = await register({
      first_name: form.first_name, last_name: form.last_name, email: form.email,
      password: form.password, marketing_opt_in: marketing,
    });
    setBusy(false);
    if (res.ok) {
      track("account_registration", { marketing_opt_in: marketing });
      toast.success("Welcome to VOYARA! Your account is ready.");
      navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="signup-page">
      <Seo title="Create Account | VOYARA Travel" description="Create your free VOYARA Travel account to save destinations, track enquiries and get personalised travel recommendations." />
      <div className="flex items-center justify-center p-6 sm:p-10 pt-28 lg:pt-10 order-2 lg:order-1">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden font-serif text-2xl font-semibold block mb-8">VOYARA<span className="text-[#C86D51]">.</span></Link>
          <p className="overline text-[#2A4038] mb-2">Join the Travel Club</p>
          <h1 className="font-serif text-3xl font-semibold mb-6">Create your account</h1>

          {error && <div className="mb-4 text-sm text-[#B0593B] bg-[#C86D51]/10 border border-[#C86D51]/30 rounded-lg px-4 py-3" data-testid="signup-error">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input className={field} placeholder="First name" value={form.first_name} onChange={set("first_name")} data-testid="signup-firstname" aria-label="First name" required />
              <input className={field} placeholder="Last name" value={form.last_name} onChange={set("last_name")} data-testid="signup-lastname" aria-label="Last name" required />
            </div>
            <input className={field} type="email" placeholder="Email address" value={form.email} onChange={set("email")} data-testid="signup-email" aria-label="Email" required />
            <input className={field} type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set("password")} data-testid="signup-password" aria-label="Password" required />
            <input className={field} type="password" placeholder="Confirm password" value={form.confirm} onChange={set("confirm")} data-testid="signup-confirm" aria-label="Confirm password" required />
            <label className="flex items-start gap-2.5 text-sm text-[#4A4E4B] cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} data-testid="signup-marketing" className="accent-[#2A4038] mt-0.5" />
              Send me travel inspiration, destination ideas and exclusive offers.
            </label>
            <VButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy} data-testid="signup-submit">
              {busy ? "Creating account..." : "Create Account"}
            </VButton>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-[#E2DDD5] flex-1" />
            <span className="text-xs text-[#767B78]">or</span>
            <div className="h-px bg-[#E2DDD5] flex-1" />
          </div>
          <VButton variant="outline" size="lg" className="w-full" onClick={() => toast.info("Google sign-up would be enabled in production.")} data-testid="google-signup">
            Continue with Google
          </VButton>

          <p className="text-sm text-[#4A4E4B] text-center mt-6">
            Already have an account? <Link to="/login" className="text-[#2A4038] font-semibold hover:underline" data-testid="go-to-login">Sign in</Link>
          </p>
        </div>
      </div>
      <div className="relative hidden lg:block order-1 lg:order-2">
        <img src={HERO} alt="Amalfi Coast" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#2A4038]/50" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Link to="/" className="font-serif text-3xl font-semibold">VOYARA<span className="text-[#C86D51]">.</span></Link>
          <p className="font-serif text-2xl mt-4 max-w-sm">Start planning smarter. Save places you love and pick up where you left off.</p>
        </div>
      </div>
    </div>
  );
}

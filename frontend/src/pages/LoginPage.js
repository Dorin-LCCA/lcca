import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";

const HERO = "https://images.unsplash.com/photo-1672622851784-0dbd3df4c088?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const field = "w-full rounded-xl border border-[#E2DDD5] bg-[#FDFBF7] px-4 py-3 text-sm outline-none focus:border-[#2A4038] transition-colors";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      track("login", { method: "password" });
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <Seo title="Login | VOYARA Travel" description="Sign in to your VOYARA Travel account to manage your trips, saved destinations and travel preferences." />
      <div className="relative hidden lg:block">
        <img src={HERO} alt="Santorini at sunset" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#2A4038]/50" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Link to="/" className="font-serif text-3xl font-semibold">VOYARA<span className="text-[#C86D51]">.</span></Link>
          <p className="font-serif text-2xl mt-4 max-w-sm">Your trips, saved places and preferences, all in one place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 pt-28 lg:pt-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden font-serif text-2xl font-semibold block mb-8">VOYARA<span className="text-[#C86D51]">.</span></Link>
          <p className="overline text-[#2A4038] mb-2">Welcome back</p>
          <h1 className="font-serif text-3xl font-semibold mb-6">Sign in to your account</h1>

          {error && <div className="mb-4 text-sm text-[#B0593B] bg-[#C86D51]/10 border border-[#C86D51]/30 rounded-lg px-4 py-3" data-testid="login-error">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <input className={field} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" aria-label="Email" required />
            <div className="relative">
              <input className={field} type={show ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" aria-label="Password" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#767B78]" aria-label="Toggle password">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#4A4E4B] cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} data-testid="login-remember" className="accent-[#2A4038]" /> Remember me
              </label>
              <button type="button" onClick={() => toast.info("Password reset link would be emailed to you.")} className="text-[#2A4038] font-medium hover:underline" data-testid="forgot-password">Forgot password?</button>
            </div>
            <VButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy} data-testid="login-submit">
              {busy ? "Signing in..." : "Login"}
            </VButton>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-[#E2DDD5] flex-1" />
            <span className="text-xs text-[#767B78]">or</span>
            <div className="h-px bg-[#E2DDD5] flex-1" />
          </div>
          <VButton variant="outline" size="lg" className="w-full" onClick={() => toast.info("Google sign-in would be enabled in production.")} data-testid="google-login">
            Continue with Google
          </VButton>

          <p className="text-sm text-[#4A4E4B] text-center mt-6">
            New to VOYARA? <Link to="/signup" className="text-[#2A4038] font-semibold hover:underline" data-testid="go-to-signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

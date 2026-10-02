import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Sparkles, Heart } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import { useAuth } from "../context/AuthContext";

const HERO = "https://images.unsplash.com/photo-1672622851784-0dbd3df4c088?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
  </svg>
);

const PERKS = [
  { icon: Heart, text: "Save destinations and offers you love" },
  { icon: Sparkles, text: "Get recommendations tailored to you" },
  { icon: ShieldCheck, text: "Track your enquiries in one place" },
];

export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && user.id) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <Seo title="Sign In | DORIN Travel" description="Sign in to your DORIN Travel account with Google to manage your trips, saved destinations and travel preferences." />
      <div className="relative hidden lg:block">
        <img src={HERO} alt="Santorini at sunset" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#2A4038]/55" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Link to="/" className="font-serif text-3xl font-semibold">DORIN<span className="text-[#C86D51]">.</span></Link>
          <p className="font-serif text-2xl mt-4 max-w-sm">Your trips, saved places and preferences, all in one place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 pt-28 lg:pt-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden font-serif text-2xl font-semibold block mb-8">DORIN<span className="text-[#C86D51]">.</span></Link>
          <p className="overline text-[#2A4038] mb-2">Welcome to DORIN TRAVEL</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold mb-3">Sign in or create your account</h1>
          <p className="text-[#4A4E4B] mb-8">One tap with Google. No passwords to remember, no forms to fill.</p>

          <VButton variant="light" size="lg" className="w-full border border-[#E2DDD5] !bg-white hover:!bg-[#F5F2EC]" onClick={loginWithGoogle} data-testid="google-login-btn">
            <GoogleIcon /> Continue with Google
          </VButton>

          <ul className="mt-8 space-y-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-[#4A4E4B]">
                <span className="w-8 h-8 rounded-full bg-[#2A4038]/8 flex items-center justify-center shrink-0">
                  <p.icon size={15} className="text-[#2A4038]" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>

          <p className="text-xs text-[#767B78] mt-8">
            By continuing you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

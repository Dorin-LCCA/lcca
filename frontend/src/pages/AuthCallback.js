import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const { processSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = location.hash || window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login", { replace: true });
      return;
    }
    const sessionId = decodeURIComponent(match[1]);
    processSession(sessionId)
      .then((u) => {
        window.history.replaceState(null, "", window.location.pathname);
        navigate(u && u.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      })
      .catch(() => {
        toast.error("Sign-in failed. Please try again.");
        navigate("/login", { replace: true });
      });
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#2A4038] border-t-transparent animate-spin mx-auto mb-5" />
        <p className="font-serif text-2xl text-[#1C1E1D]">Signing you in…</p>
        <p className="text-sm text-[#767B78] mt-1">One moment while we prepare your travel hub.</p>
      </div>
    </div>
  );
}

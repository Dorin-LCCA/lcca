import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, User, LayoutDashboard } from "lucide-react";
import VButton from "../VButton";
import { useAuth } from "../../context/AuthContext";
import { usePlanTrip } from "../../context/PlanTripContext";
import { track } from "../../lib/analytics";

const LINKS = [
  { to: "/destinations", label: "Destinations" },
  { to: "/experiences", label: "Trips & Experiences" },
  { to: "/offers", label: "Offers" },
  { to: "/blog", label: "Travel Journal" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { openPlanner } = usePlanTrip();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const isAuthed = user && user.id;

  return (
    <header
      data-testid="main-navbar"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FDFBF7]/92 backdrop-blur-md border-b border-[#E2DDD5] py-3"
          : "bg-gradient-to-b from-black/35 to-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link
          to="/"
          data-testid="nav-logo"
          className={`font-serif text-2xl tracking-tight font-semibold transition-colors ${
            scrolled ? "text-[#1C1E1D]" : "text-white"
          }`}
        >
          DORIN<span className="text-[#C86D51]">.</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-link-${l.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors relative after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:bg-[#C86D51] after:transition-all ${
                  isActive ? "after:w-full" : "after:w-0 hover:after:w-full"
                } ${scrolled ? "text-[#2D312E] hover:text-[#2A4038]" : "text-white/90 hover:text-white"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {isAuthed ? (
            <VButton
              as={Link}
              to={user.role === "admin" ? "/admin" : "/dashboard"}
              variant={scrolled ? "outline" : "light"}
              size="sm"
              data-testid="nav-dashboard-btn"
            >
              <LayoutDashboard size={16} /> {user.role === "admin" ? "Admin" : "Dashboard"}
            </VButton>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login-link"
              className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${
                scrolled ? "text-[#2D312E] hover:text-[#2A4038]" : "text-white/90 hover:text-white"
              }`}
            >
              <User size={16} /> Login / Sign Up
            </Link>
          )}
          <VButton
            size="sm"
            variant="accent"
            data-testid="nav-plan-trip-btn"
            onClick={() => {
              track("plan_my_trip_click", { source: "navbar" });
              openPlanner("navbar");
            }}
          >
            Plan Your Trip
          </VButton>
        </div>

        <button
          className={`lg:hidden p-2 rounded-full ${scrolled ? "text-[#1C1E1D]" : "text-white"}`}
          onClick={() => setOpen((o) => !o)}
          data-testid="mobile-menu-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 bg-[#FDFBF7] ${
          open ? "max-h-[32rem] border-b border-[#E2DDD5]" : "max-h-0"
        }`}
      >
        <nav className="px-6 py-4 flex flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`mobile-nav-link-${l.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="py-3 text-[#2D312E] font-medium border-b border-[#EFECE6] last:border-0"
            >
              {l.label}
            </NavLink>
          ))}
          <div className="flex flex-col gap-3 pt-4">
            {isAuthed ? (
              <VButton as={Link} to={user.role === "admin" ? "/admin" : "/dashboard"} variant="outline" data-testid="mobile-dashboard-btn">
                {user.role === "admin" ? "Admin Panel" : "My Dashboard"}
              </VButton>
            ) : (
              <VButton as={Link} to="/login" variant="outline" data-testid="mobile-login-link">
                Login / Sign Up
              </VButton>
            )}
            <VButton
              variant="accent"
              data-testid="mobile-plan-trip-btn"
              onClick={() => {
                track("plan_my_trip_click", { source: "mobile-nav" });
                openPlanner("mobile-nav");
              }}
            >
              Plan Your Trip
            </VButton>
          </div>
        </nav>
      </div>
    </header>
  );
}

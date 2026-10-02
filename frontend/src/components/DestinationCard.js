import { Link } from "react-router-dom";
import { Heart, MapPin, ArrowRight } from "lucide-react";
import { priceLabel } from "../data/content";
import { track } from "../lib/analytics";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";

export default function DestinationCard({ d, onSaveToggle }) {
  const { user, setUserData } = useAuth();
  const saved = user && user.saved_destinations && user.saved_destinations.includes(d.id);

  const save = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !user.id) {
      toast.info("Sign in to save destinations to your account.");
      return;
    }
    try {
      const { data } = await api.post("/me/saved", { type: "destination", item_id: d.id });
      setUserData({ ...user, saved_destinations: data.saved_destinations });
      track("destination_saved", { destination: d.id });
      onSaveToggle && onSaveToggle();
    } catch {
      toast.error("Couldn't update saved items.");
    }
  };

  return (
    <Link
      to={`/destinations/${d.id}`}
      data-testid={`destination-card-${d.id}`}
      onClick={() => track("destination_card_click", { destination: d.id })}
      className="group block rounded-2xl overflow-hidden bg-white border border-[#E2DDD5] transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={d.image}
          alt={`${d.name}, ${d.country}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <button
          onClick={save}
          aria-label="Save destination"
          data-testid={`save-destination-${d.id}`}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart size={16} className={saved ? "fill-[#C86D51] text-[#C86D51]" : "text-[#2A4038]"} />
        </button>
        <span className="absolute top-3 left-3 bg-[#FDFBF7]/95 text-[#2A4038] text-xs font-semibold px-3 py-1 rounded-full font-mono">
          {priceLabel(d.price)}
        </span>
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <p className="flex items-center gap-1 text-xs text-white/80 mb-0.5"><MapPin size={12} /> {d.country}</p>
          <h3 className="font-serif text-2xl font-semibold">{d.name}</h3>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm text-[#4A4E4B] leading-relaxed line-clamp-2">{d.short}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-[#767B78] font-mono">{d.duration}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2A4038] group-hover:gap-2.5 transition-all">
            Explore <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}

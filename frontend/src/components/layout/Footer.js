import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube, MapPin, Mail, Phone } from "lucide-react";
import NewsletterForm from "../NewsletterForm";

const COLS = [
  {
    title: "Explore",
    links: [
      { to: "/destinations", label: "Destinations" },
      { to: "/experiences", label: "Experiences" },
      { to: "/offers", label: "Offers" },
      { to: "/blog", label: "Travel Journal" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact" },
      { to: "/about#reviews", label: "Reviews" },
      { to: "/contact#faq", label: "FAQ" },
    ],
  },
  {
    title: "Support",
    links: [
      { to: "/contact", label: "Help Centre" },
      { to: "/legal/terms", label: "Terms & Conditions" },
      { to: "/legal/privacy", label: "Privacy Policy" },
      { to: "/legal/cookies", label: "Cookie Policy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#1C211E] text-[#E7E3DC]" data-testid="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        {/* Newsletter band */}
        <div className="border-b border-white/10 pb-12 mb-12 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-serif text-3xl font-semibold text-white">Get travel inspiration in your inbox</h3>
            <p className="text-white/70 mt-2 max-w-md">
              Discover new destinations, exclusive travel ideas and selected offers, straight to your inbox.
            </p>
          </div>
          <NewsletterForm variant="footer" testidPrefix="footer-newsletter" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-serif text-2xl font-semibold text-white">
              VOYARA<span className="text-[#C86D51]">.</span>
            </Link>
            <p className="text-white/60 text-sm mt-3 italic font-serif">Discover more. Travel better.</p>
            <div className="flex gap-3 mt-5">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`footer-social-${i}`}
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-[#C86D51] hover:border-[#C86D51] transition-colors"
                  aria-label="Social media"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="overline text-[#C86D51] mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      data-testid={`footer-link-${l.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="overline text-[#C86D51] mb-4">Get in touch</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> 24 Carnaby Street, Soho, London W1F</li>
              <li className="flex items-center gap-2"><Phone size={16} /> +44 20 7946 0123</li>
              <li className="flex items-center gap-2"><Mail size={16} /> hello@voyaratravel.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} VOYARA Travel Ltd. All rights reserved. ABTA & ATOL protected.</p>
          <p>A fictional brand created for a Digital Business & E-Marketing project.</p>
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import api from "../lib/api";
import { track } from "../lib/analytics";

const CATEGORIES = ["All", "Travel Guides", "Destination Inspiration", "Travel Tips", "Budget Travel", "Couples", "Adventure", "City Breaks"];

function fmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

export default function BlogPage() {
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => { track("page_view", { page: "blog" }); }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/blog", { params: category !== "All" ? { category } : {} })
      .then(({ data }) => setArticles(data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [category]);

  const [featured, ...rest] = articles;

  return (
    <div data-testid="blog-page">
      <Seo title="Travel Journal | Destination Guides & Travel Inspiration | DORIN" description="The DORIN Travel Journal: destination guides, travel tips, budget advice and inspiration for your next adventure. Read stories from our specialists and travellers." />

      <section className="relative pt-36 pb-14 bg-[#F5F2EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="overline text-[#2A4038] mb-4">The DORIN Journal</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium text-balance">Travel Journal</h1>
          <p className="mt-5 text-lg text-[#4A4E4B] font-light max-w-xl mx-auto">
            Inspiration, guides and stories for your next adventure.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap gap-2.5 justify-center mb-12">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCategory(c); track("blog_filter", { category: c }); }} data-testid={`blog-category-${c.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-all ${category === c ? "bg-[#2A4038] text-[#FDFBF7] border-[#2A4038]" : "bg-white text-[#4A4E4B] border-[#E2DDD5] hover:border-[#2A4038]"}`}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-[#767B78] py-20">Loading articles...</p>
        ) : articles.length === 0 ? (
          <p className="text-center text-[#767B78] py-20">No articles in this category yet.</p>
        ) : (
          <>
            {/* Featured article */}
            {featured && (
              <Link to={`/blog/${featured.slug}`} data-testid="blog-featured" onClick={() => track("blog_article_click", { slug: featured.slug, position: "featured" })}
                className="group grid lg:grid-cols-2 gap-8 rounded-3xl overflow-hidden bg-white border border-[#E2DDD5] mb-14 hover:shadow-xl transition-all duration-500">
                <div className="relative aspect-[16/11] lg:aspect-auto overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-[#C86D51] font-mono uppercase tracking-wide">{featured.category}</span>
                  <h2 className="font-serif text-3xl lg:text-4xl font-semibold mt-3 group-hover:text-[#2A4038] transition-colors">{featured.title}</h2>
                  <p className="mt-4 text-[#4A4E4B] leading-relaxed">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 mt-6 text-xs text-[#767B78] font-mono">
                    <span>{fmtDate(featured.date)}</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {featured.read_time}</span>
                  </div>
                  <span className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#2A4038] group-hover:gap-3 transition-all">Read Article <ArrowRight size={16} /></span>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {rest.map((a) => (
                <Link key={a.slug} to={`/blog/${a.slug}`} data-testid={`blog-card-${a.slug}`} onClick={() => track("blog_article_click", { slug: a.slug, position: "grid" })}
                  className="group rounded-2xl overflow-hidden bg-white border border-[#E2DDD5] flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-500">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={a.image} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute top-3 left-3 bg-[#FDFBF7]/95 text-[#2A4038] text-xs font-semibold px-3 py-1 rounded-full font-mono">{a.category}</span>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-serif text-xl font-semibold leading-snug group-hover:text-[#2A4038] transition-colors">{a.title}</h3>
                    <p className="text-sm text-[#4A4E4B] mt-2.5 leading-relaxed line-clamp-3 flex-1">{a.excerpt}</p>
                    <div className="flex items-center gap-4 mt-5 text-xs text-[#767B78] font-mono">
                      <span>{fmtDate(a.date)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {a.read_time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

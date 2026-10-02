import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import VButton from "../components/VButton";
import NewsletterForm from "../components/NewsletterForm";
import { usePlanTrip } from "../context/PlanTripContext";
import api from "../lib/api";
import { track } from "../lib/analytics";
import NotFoundPage from "./NotFoundPage";

function fmtDate(s) {
  try { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { openPlanner } = usePlanTrip();
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    api.get(`/blog/${slug}`)
      .then(({ data }) => { setArticle(data); setStatus("ok"); track("blog_article_view", { slug }); })
      .catch(() => setStatus("notfound"));
  }, [slug]);

  if (status === "notfound") return <NotFoundPage />;
  if (status === "loading" || !article) return <div className="pt-40 pb-40 text-center text-[#767B78]">Loading article...</div>;

  const paragraphs = article.content.split("\n\n");

  return (
    <div data-testid="blog-article-page">
      <Seo title={`${article.title} | DORIN Travel Journal`} description={article.excerpt} />

      <section className="relative h-[60vh] min-h-[400px] flex items-end">
        <img src={article.image} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 w-full pb-12 text-white">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-5 transition-colors" data-testid="back-to-blog">
            <ArrowLeft size={16} /> Travel Journal
          </Link>
          <span className="text-xs font-semibold text-[#D4A359] font-mono uppercase tracking-wide">{article.category}</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium mt-3 text-balance">{article.title}</h1>
          <div className="flex items-center gap-4 mt-5 text-sm text-white/80 font-mono">
            <span>{article.author}</span>
            <span>·</span>
            <span>{fmtDate(article.date)}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {article.read_time}</span>
          </div>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <p className="font-serif text-xl sm:text-2xl text-[#2D312E] leading-relaxed mb-8 font-medium">{article.excerpt}</p>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-lg text-[#2D312E] leading-[1.85] mb-6 font-light">{p}</p>
        ))}

        <div className="mt-12 rounded-2xl bg-[#2A4038] text-white p-8 text-center">
          <h3 className="font-serif text-2xl font-semibold">Inspired to travel?</h3>
          <p className="text-white/75 mt-2 mb-6">Let our specialists turn this inspiration into your next trip.</p>
          <VButton variant="accent" onClick={() => { track("plan_my_trip_click", { source: "blog-article" }); openPlanner("blog-article"); }} data-testid="article-plan-btn">
            Plan My Trip <ArrowRight size={16} />
          </VButton>
        </div>
      </article>

      {article.related && article.related.length > 0 && (
        <section className="bg-[#F5F2EC] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-semibold mb-8">Keep reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {article.related.map((r) => (
                <Link key={r.slug} to={`/blog/${r.slug}`} data-testid={`related-article-${r.slug}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-[#E2DDD5] hover:shadow-lg transition-all">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={r.image} alt={r.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold text-[#C86D51] font-mono uppercase">{r.category}</span>
                    <h3 className="font-serif text-lg font-semibold mt-1.5 group-hover:text-[#2A4038] transition-colors">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-[#E2DDD5] bg-white p-8">
          <h3 className="font-serif text-2xl font-semibold mb-2">Never miss a story</h3>
          <p className="text-sm text-[#4A4E4B] mb-5">Join the Travel Club for fresh guides and offers in your inbox.</p>
          <NewsletterForm variant="section" testidPrefix="article-newsletter" />
        </div>
      </section>
    </div>
  );
}

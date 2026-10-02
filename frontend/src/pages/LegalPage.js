import Seo from "../components/Seo";
import { Link, useParams } from "react-router-dom";
import VButton from "../components/VButton";

const DOCS = {
  terms: {
    title: "Terms & Conditions",
    body: [
      "These terms govern your use of the DORIN Travel website and services. By using our site you agree to these terms.",
      "DORIN acts as a travel agent arranging holidays and experiences. All bookings are subject to the terms of the relevant travel providers, which will be shared with you before you book.",
      "Prices shown are indicative, per person and subject to availability. Final pricing is confirmed in your personalised quote.",
      "This is a fictional brand created for a university Digital Business & E-Marketing project and does not sell real travel.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We respect your privacy. This policy explains what information we collect and how we use it.",
      "We collect the details you provide through our enquiry, newsletter and account forms, such as your name, email, travel preferences and budget, so we can respond to you and tailor recommendations.",
      "Your data is stored securely and is never sold. Newsletter data is structured so it can be synced with a CRM or email marketing platform. You can unsubscribe or request deletion at any time.",
      "This is a fictional brand created for an academic project.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    body: [
      "We use a small number of cookies to make the site work and to understand how it is used.",
      "Essential cookies keep you signed in. Analytics events help us measure page views, offer clicks and form submissions so we can improve the experience.",
      "The site is structured so that Google Analytics or a similar platform could be connected to these events.",
      "This is a fictional brand created for an academic project.",
    ],
  },
};

export default function LegalPage() {
  const { doc } = useParams();
  const content = DOCS[doc] || DOCS.terms;
  return (
    <div data-testid="legal-page" className="pt-36 pb-20">
      <Seo title={`${content.title} | DORIN Travel`} description={`${content.title} for DORIN Travel.`} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="overline text-[#2A4038] mb-3">Legal</p>
        <h1 className="font-serif text-4xl font-semibold mb-8">{content.title}</h1>
        {content.body.map((p, i) => (
          <p key={i} className="text-lg text-[#2D312E] leading-[1.8] mb-5 font-light">{p}</p>
        ))}
        <VButton as={Link} to="/" variant="outline" className="mt-6">Back to home</VButton>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import VButton from "../components/VButton";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center pt-36 pb-20 px-4" data-testid="not-found-page">
      <Seo title="Page not found | VOYARA Travel" description="The page you were looking for could not be found." />
      <div className="text-center max-w-md">
        <p className="font-serif text-7xl font-semibold text-[#2A4038]">404</p>
        <h1 className="font-serif text-3xl font-semibold mt-4">This destination doesn't exist</h1>
        <p className="text-[#4A4E4B] mt-3">The page you're looking for may have moved. Let's get you back on the map.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <VButton as={Link} to="/" variant="primary">Back to home</VButton>
          <VButton as={Link} to="/destinations" variant="outline">Explore destinations</VButton>
        </div>
      </div>
    </div>
  );
}

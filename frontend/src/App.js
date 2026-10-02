import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { PlanTripProvider } from "./context/PlanTripContext";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import TripPlannerModal from "./components/TripPlannerModal";

import HomePage from "./pages/HomePage";
import DestinationsPage from "./pages/DestinationsPage";
import DestinationDetailPage from "./pages/DestinationDetailPage";
import TripsPage from "./pages/TripsPage";
import OffersPage from "./pages/OffersPage";
import BlogPage from "./pages/BlogPage";
import BlogArticlePage from "./pages/BlogArticlePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import LegalPage from "./pages/LegalPage";
import NotFoundPage from "./pages/NotFoundPage";

function Shell() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:id" element={<DestinationDetailPage />} />
          <Route path="/experiences" element={<TripsPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/legal/:doc" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <TripPlannerModal />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlanTripProvider>
          <ScrollToTop />
          <Shell />
          <Toaster position="top-center" richColors closeButton />
        </PlanTripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

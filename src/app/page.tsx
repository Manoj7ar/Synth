import LandingPage from "@/components/landing/landing-page";

export default function Home() {
  // Always show the landing page at `/` (localhost:3000), regardless of auth state.
  return <LandingPage />;
}


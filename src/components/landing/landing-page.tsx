import Navigation from "@/components/landing/sections/navigation";
import HeroSection from "@/components/landing/sections/hero";
import ProcessSteps from "@/components/landing/sections/process-steps";
import WhySynth from "@/components/landing/sections/why-synth";
import Footer from "@/components/landing/sections/footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#0a0a0a] text-white">
      <Navigation />
      <HeroSection />
      <ProcessSteps />
      <WhySynth />
      <Footer />
    </main>
  );
}

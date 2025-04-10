import FeaturedProperties from "@/components/home/FeaturedProperties";
import HeroSection from "@/components/home/HeroSection";
import PropertyTypesOverview from "@/components/home/PropertyTypesOverview";

export default function Home() {
  return (
    <div className="bg-fixed bg-cover bg-center min-h-screen" 
         style={{ backgroundImage: "url('/images/background.jpg')" }}>
      <div className="relative z-10">
        {/* Your scrollable content sections go here */}
        <section className="flex items-center justify-center bg-opacity-50 bg-black">
          <HeroSection />
        </section>
        
        <PropertyTypesOverview />
        
        <FeaturedProperties />
      </div>
    </div>
  );
}
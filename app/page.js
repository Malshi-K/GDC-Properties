import ConsultServices from "@/components/home/ConsultServices";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import HeroSection from "@/components/home/HeroSection";
import PropertyLocationMap from "@/components/home/PropertyLocationMap";
import PropertyTypesOverview from "@/components/home/PropertyTypesOverview";

export default function Home() {
  return (
    <div className="bg-fixed bg-cover bg-center min-h-screen" 
         style={{ backgroundImage: "url('/images/hero-bg.png')" }}>
      <div className="relative z-10">
        <section className="flex items-center justify-center bg-opacity-50 bg-black">
          <HeroSection />
        </section>
        
        <PropertyTypesOverview />
        
        <FeaturedProperties />
        <ConsultServices />
        <PropertyLocationMap />
      </div>
    </div>
  );
}
import React from "react";
import Image from "next/image";

const PropertyTypesOverview = () => {
  const propertyTypes = [
    {
      icon: "/images/access-more-icon.png", // Similar to stars icon in screenshot
      title: "Apartments",
    },
    {
      icon: "/images/planet-icon.png", // Similar to earth icon in screenshot
      title: "Houses",
    },
    {
      icon: "/images/money-icon.png", // Similar to money/hand icon in screenshot
      title: "Town Houses",
    },
    {
      icon: "/images/money-icon.png", // Similar to money/hand icon in screenshot
      title: "Units",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {propertyTypes.map((type, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 relative">
                  <Image
                    src={type.icon}
                    alt={type.title}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {type.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropertyTypesOverview;

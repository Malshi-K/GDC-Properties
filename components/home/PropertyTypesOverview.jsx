import React from "react";
import Image from "next/image";

const PropertyTypesOverview = () => {
  const propertyTypes = [
    {
      icon: "/images/icons/1.png", 
      title: "Apartments",
    },
    {
      icon: "/images/icons/2.png", 
      title: "Houses",
    },
    {
      icon: "/images/icons/3.png", 
      title: "Town Houses",
    },
    {
      icon: "/images/icons/4.png", 
      title: "Units",
    },
  ];

  return (
    <section className="py-5 md:py-10 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {propertyTypes.map((type, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-40 h-40 relative">
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

"use client";
import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  
  // Featured properties data
  const properties = [
    {
      id: 1,
      title: "Apartment",
      price: "$399 / Month",
      image: "/images/properties/1.jpg"
    },
    {
      id: 2,
      title: "House",
      price: "$199 / Month",
      image: "/images/properties/2.jpg"
    },
    {
      id: 3,
      title: "Town House",
      price: "$249 / Month",
      image: "/images/properties/3.jpg"
    },
    {
      id: 4,
      title: "Unit",
      price: "$499 / Month",
      image: "/images/properties/4.jpg"
    }
  ];

  // Scroll to the next set of items
  const scrollNext = () => {
    if (scrollRef.current) {
      setCurrentIndex(prev => {
        const newIndex = Math.min(prev + 1, properties.length - 3);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / 3),
          behavior: 'smooth'
        });
        return newIndex;
      });
    }
  };

  // Scroll to the previous set of items
  const scrollPrev = () => {
    if (scrollRef.current) {
      setCurrentIndex(prev => {
        const newIndex = Math.max(prev - 1, 0);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / 3),
          behavior: 'smooth'
        });
        return newIndex;
      });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-custom-gray text-white">
      <div className="w-full max-w-7xl  container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Properties</h2>
            <p className="text-gray-300">Explore the featured properties</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={scrollPrev} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300"
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={scrollNext} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300"
              disabled={currentIndex >= properties.length - 3}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex space-x-6 overflow-x-hidden scroll-smooth"
        >
          {properties.map((property) => (
            <div 
              key={property.id} 
              className="min-w-[calc(33.333%-16px)] flex-shrink-0 bg-custom-red rounded-lg overflow-hidden"
            >
              <div className="relative h-60 w-full">
                <Image 
                  src={property.image} 
                  alt={property.title}
                  fill
                  className="object-cover"
                />
                
              </div>
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">{property.title}</h3>
                <p className="text-right font-bold">{property.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
// components/ConsultServices.js
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

export default function ConsultServices() {
  return (
    <div className="container mx-auto max-w-full">
      <div className="relative overflow-hidden min-h-[500px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/about.jpg"
            alt="Luxury Property"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-custom-blue/60"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center min-h-[500px] p-8 md:p-16">
          <div className="text-center max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              What's your property worth?<br />              
            </h2>

            <p className="text-white/90 mb-10 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              Our appraisals are free and can be carried out in person or virtually.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">              
              <Link
                href="/contact"
                className="bg-custom-orange hover:bg-custom-yellow text-white px-8 py-4 rounded-full flex items-center justify-center transition duration-300 font-semibold text-lg min-w-[200px]"
              >
                <span className="mr-2">Book Appraisal</span>
                <FaArrowRight className="text-white" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

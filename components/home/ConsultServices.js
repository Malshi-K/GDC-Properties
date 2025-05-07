// components/ConsultServices.js
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaCheck, FaArrowRight } from "react-icons/fa";

export default function ConsultServices() {
  return (
    <div className="py-16 px-4 md:px-40 bg-white text-custom-gray">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1">
            <Image
              src="/images/about.jpg"
              alt="Luxury Property"
              width={500}
              height={600}
              className="rounded-lg object-cover shadow-lg"
            />
          </div>

          <div className="order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Find your dream property <br />
              <span className="text-custom-red">with us today!</span>
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              At GDC Properties, we understand that buying or selling a home is
              one of life's biggest decisions. Our experienced agents are
              dedicated to providing exceptional service tailored to your unique
              needs and preferences.
            </p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
              <Link
                href="/search"
                className="bg-custom-gray hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center justify-center transition duration-300"
              >
                <span className="mr-2">View Properties</span>
              </Link>

              <Link
                href="/contact"
                className="bg-custom-red hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center justify-center transition duration-300"
              >
                <span className="mr-2">Contact Us</span>
                <FaArrowRight className="text-white" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// components/contact/ContactMap.js
import React from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function ContactMap() {
  return (
    <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-40 bg-white">
      <div className="container mx-auto">
        {/* Google Maps Section - Two Column Layout */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h5 className="text-custom-red uppercase tracking-wider mb-2 text-sm sm:text-base">
              OUR LOCATIONS
            </h5>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-gray">
              Service <span className="text-custom-red">Areas</span>
            </h2>
            <p className="text-gray-600 mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base">
              Explore our service areas in detail with these interactive maps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Waikato Map */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-80">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d810225.9663872005!2d173.85240543797616!3d-37.509211057591564!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6d6d39b8c63698f5%3A0x400ef6143a2adc0!2sWaikato%20District%2C%20Waikato%20Region%2C%20New%20Zealand!5e0!3m2!1sen!2slk!4v1749789844762!5m2!1sen!2slk"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Waikato Region Map"
                ></iframe>
              </div>
            </div>

            {/* Bay of Plenty Map */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="h-80">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1611348.7395012814!2d174.45652067386717!3d-37.92656377036171!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6d6f1de3b5bd5365%3A0xfb884e9e43e1e910!2sBay%20of%20Plenty%20Region%2C%20New%20Zealand!5e0!3m2!1sen!2slk!4v1749789882459!5m2!1sen!2slk"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Bay of Plenty Region Map"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

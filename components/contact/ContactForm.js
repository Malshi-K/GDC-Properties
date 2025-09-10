// components/ContactForm.js
import React from "react";
import { FaEnvelope, FaPhoneVolume } from "react-icons/fa";

export default function ContactForm() {
  const contactInfo = [
    {
      icon: <FaPhoneVolume className="text-custom-orange text-xl sm:text-2xl" />,
      title: "Phone Number",
      content: "+64 7 838 0090",
    },
    {
      icon: <FaEnvelope className="text-custom-orange text-xl sm:text-2xl" />,
      title: "Email Address",
      content: "info@gdcdigital.net",
    },
  ];

  return (
    <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-40 bg-gray-100 text-gray-600">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 sm:mt-10 items-center">
          {/* Left Side - Centered Contact Description */}
          <div className="flex flex-col justify-center">
            <div className="text-center lg:text-left mb-6">
              <h5 className="text-custom-orange uppercase tracking-wider mb-2 text-sm sm:text-base">
                CONTACT US
              </h5>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Get In <span className="text-custom-orange">Touch</span>
              </h2>
              <p className="text-gray-600 mt-2 sm:mt-4 text-sm sm:text-base">
                We're here to help with all your property needs. Reach out to us
                through any of the channels below.
              </p>
            </div>
            
            {/* Contact Info Cards */}
            <div className="space-y-4">
              {contactInfo?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center p-4 sm:p-6"
                >
                  <div className="mr-4 sm:mr-6">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-custom-blue">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {item.content}
                    </p>
                  </div>
                </div>
              )) || <p className="text-gray-500">No contact information available.</p>}
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="text-xl sm:text-2xl font-bold text-custom-blue mb-6">
              Send us a Message
            </h3>
            <form className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-full focus:outline-none focus:border-custom-orange focus:ring-1 focus:ring-custom-orange text-sm sm:text-base transition-colors duration-200"
                    required
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-full focus:outline-none focus:border-custom-orange focus:ring-1 focus:ring-custom-orange text-sm sm:text-base transition-colors duration-200"
                    required
                  />
                </div>
              </div>
              
              <div>
                <input
                  type="text"
                  placeholder="Your Subject"
                  className="w-full p-3 sm:p-4 border border-gray-300 rounded-full focus:outline-none focus:border-custom-orange focus:ring-1 focus:ring-custom-orange text-sm sm:text-base transition-colors duration-200"
                  required
                />
              </div>
              
              <div>
                <textarea
                  rows="5"
                  placeholder="Your Message"
                  className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-custom-orange focus:ring-1 focus:ring-custom-orange text-sm sm:text-base transition-colors duration-200 resize-vertical"
                  required
                ></textarea>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-custom-orange text-white py-3 sm:py-4 px-6 sm:px-8 rounded-full hover:bg-opacity-90 transition-all duration-300 text-sm sm:text-base font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
// components/ContactForm.js
import React from 'react';
import { FaPhone, FaEnvelope, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';

export default function ContactForm() {
  const contactInfo = [
    {
      icon: <FaPhone className="text-custom-red text-xl sm:text-2xl" />,
      title: 'Phone Number',
      content: '+64 7 838 0090'
    },
    {
      icon: <FaEnvelope className="text-custom-red text-xl sm:text-2xl" />,
      title: 'Email Address',
      content: 'info@gdcdigital.net'
    },
    {
      icon: <FaGlobe className="text-custom-red text-xl sm:text-2xl" />,
      title: 'Websites',
      content: 'www.gdcgroup.co.nz'
    },
    {
      icon: <FaMapMarkerAlt className="text-custom-red text-xl sm:text-2xl" />,
      title: 'Address',
      content: '89 Church Road, Pukete, Hamilton 3200'
    }
  ];

  return (
    <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-40 bg-gray-100 text-gray-600">
      <div className="container mx-auto">
        <div className="text-center mb-6">
          <h5 className="text-custom-red uppercase tracking-wider mb-2 text-sm sm:text-base">CONTACT US</h5>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Get In <span className="text-custom-red">Touch</span>
          </h2>
          <p className="text-gray-600 mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam lectus venenatis
            elit at feugiat. Pellentesque volutpat ipsum dolor.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 sm:mt-10">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {contactInfo.map((item, index) => (
                <div key={index} className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                  <div className="mr-3 sm:mr-4 mt-1">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">{item.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base break-words">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <form className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red text-sm sm:text-base"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red text-sm sm:text-base"
                />
              </div>
              <input
                type="text"
                placeholder="Your Subject"
                className="w-full p-2 sm:p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red text-sm sm:text-base"
              />
              <textarea
                rows="4"
                placeholder="Your Message"
                className="w-full p-2 sm:p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red text-sm sm:text-base"
              ></textarea>
              <div className="flex justify-center sm:justify-start">
                <button
                  type="submit"
                  className="bg-custom-red text-white py-2 sm:py-3 px-4 sm:px-6 rounded hover:bg-orange-600 transition duration-300 text-sm sm:text-base"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


// components/ContactForm.js
import React from 'react';
import { FaPhone, FaEnvelope, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';

export default function ContactForm() {
  const contactInfo = [
    {
      icon: <FaPhone className="text-custom-red text-2xl" />,
      title: 'Phone Number',
      content: '+64 7 838 0090'
    },
    {
      icon: <FaEnvelope className="text-custom-red text-2xl" />,
      title: 'Email Address',
      content: 'info@gdcdigital.net'
    },
    {
      icon: <FaGlobe className="text-custom-red text-2xl" />,
      title: 'Websites',
      content: 'www.gdcgroup.co.nz'
    },
    {
      icon: <FaMapMarkerAlt className="text-custom-red text-2xl" />,
      title: 'Address',
      content: '89 Church Road, Pukete, Hamilton 3200'
    }
  ];

  return (
    <div className="py-16 px-40 bg-gray-100 text-gray-600">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h5 className="text-custom-red uppercase tracking-wider mb-2">CONTACT US</h5>
          <h2 className="text-3xl md:text-4xl font-bold">
            Get In <span className="text-custom-red">Touch</span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam lectus venenatis
            elit at feugiat. Pellentesque volutpat ipsum dolor.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactInfo.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="mr-4">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-gray-600">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red"
                />
              </div>
              <input
                type="text"
                placeholder="Your Subject"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red"
              />
              <textarea
                rows="5"
                placeholder="Your Message"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-custom-red"
              ></textarea>
              <button
                type="submit"
                className="bg-custom-red text-white py-3 px-6 rounded hover:bg-orange-600 transition duration-300"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
// components/GlobalOffices.js
import React from 'react';
import Image from 'next/image';
import { FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

export default function GlobalOffices() {
  const officeLocations = [
    {
      title: 'Contact Us',
      subtitle: 'Our friendly team is here to help.',
      description: '99 Street SE, Big City, PNU 23456',
      icon: <FaEnvelope className="text-white text-3xl" />
    },
    {
      title: 'Office',
      subtitle: 'Come say hello at our office HQ.',
      description: '99 Street SE, Big City, PNU 23456',
      icon: <FaMapMarkerAlt className="text-white text-3xl" />
    },
    {
      title: 'Phone',
      subtitle: 'Mon-Fri from 8am to 5pm',
      description: '123-456-7890',
      icon: <FaPhone className="text-white text-3xl" />
    },
  ];

  return (
    <div className="py-16 px-4 md:px-40 text-gray-600">
      <div className="container mx-auto">
        <div className="items-center">
          <div>
            <h5 className="text-custom-red uppercase tracking-wider mb-2 text-lg">GET IN TOUCH</h5>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Our Offices <span className="text-custom-red">Located</span> All <br />
              Over The World
            </h2>
            <p className="text-gray-600 mb-12 max-w-xl text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam lectus venenatis 
              elit at feugiat. Pellentesque volutpat ipsum dolor, vitae venenatis odio posuere quis.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {officeLocations.map((office, index) => (
                <div 
                  key={index} 
                  className="bg-custom-gray text-white p-10 rounded-lg text-center flex flex-col items-center"
                >
                  <div className="bg-custom-red rounded-full w-16 h-16 flex items-center justify-center mb-6">
                    {office.icon}
                  </div>
                  <h3 className="text-white font-bold text-4xl mb-2">{office.title}</h3>
                  <h4 className="text-gray-300 mb-4 text-lg">{office.subtitle}</h4>
                  
                  <div>
                    <p className="text-gray-300">{office.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
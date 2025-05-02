
// components/ContactHero.js
import React from 'react';
import Link from 'next/link';

export default function ContactHero() {
  return (
    <div className="relative bg-gray-800 text-white py-20">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-black opacity-40"></div>
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{
            backgroundImage: "url('/images/background.jpg')",
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: -1
          }}
        ></div>
      </div>
      
      <div className="container mx-auto px-40 py-20 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Contact <span className="text-custom-red">Us</span>
        </h1>
        <div className="flex items-center text-sm">
          <Link href="/" className="hover:text-orange-400">Home</Link>
          <span className="mx-2">/</span>
          <span>Contact Us</span>
        </div>
      </div>
    </div>
  );
}
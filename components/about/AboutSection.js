// components/AboutSection.js
import React from "react";
import Image from "next/image";

const AboutSection = () => {
  return (
    <div className="bg-white">
      {/* Main content container */}
      <div className="container mx-auto py-16 px-4 md:px-8 lg:px-40">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left side - Image with red borders */}
          <div className="w-full lg:w-1/2 relative">
            {/* Red border lines */}
            <div className="absolute top-0 right-0 w-24 h-full border-t-2 border-r-2 border-custom-orange z-10"></div>
            <div className="absolute bottom-0 left-0 w-full h-24 border-l-2 border-b-2 border-custom-orange z-10"></div>

            {/* Image centered within the borders */}
            <div
              className="relative h-[500px] mx-auto my-10"
              style={{ width: "90%" }}
            >
              <Image
                src="/images/background.jpg"
                alt="Property Image"
                fill
                className="object-cover rounded-md"
                priority
              />
            </div>
          </div>

          {/* Right side - Text content */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center text-gray-700">
            <div className="max-w-xl">
              <h3 className="text-custom-orange font-medium mb-2">OUR STORY</h3>

              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-custom-blue">
                ABOUT GDC{" "}
                <span className="font-light text-custom-yellow">PROPERTIES</span>
              </h1>

              <div className="space-y-6">
                <p className="text-xl">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>

                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum
                  dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                  cupidatat non proident, sunt in culpa qui officia deserunt
                  mollit anim id est laborum.
                </p>

                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum
                  dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                  cupidatat non proident, sunt in culpa qui officia deserunt
                  mollit anim id est laborum.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;

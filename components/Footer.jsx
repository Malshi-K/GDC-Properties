// components/Footer.jsx
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-custom-gray border-t border-gray-200 py-8 md:py-12">
      <div className="container w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Logo and Contact */}
          <div className="flex flex-col space-y-4 items-center sm:items-start">
            <div className="mb-2">
              <Image
                src="/images/properties logo.png"
                alt="JustRent Logo"
                width={180}
                height={60}
                className="h-auto w-auto max-w-[180px]"
              />
            </div>
          </div>

          {/* Quick Link */}
          <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-start">
            <h3 className="font-bold text-custom-red mb-4 text-xl">Quick Link</h3>
            <ul className="space-y-2 text-center sm:text-left">
              <li>
                <Link
                  href="/"
                  className="text-white hover:text-custom-yellow transition-colors duration-200"
                >
                  Home
                </Link>
              </li>

              <li>
                <Link
                  href="/search"
                  className="text-white hover:text-custom-yellow transition-colors duration-200"
                >
                  Search
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white hover:text-custom-yellow transition-colors duration-200"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-start">
            <h3 className="font-bold text-custom-red mb-4 text-xl">Property Types</h3>
            <ul className="space-y-2 text-center sm:text-left">
              <li>
                <p className="text-white hover:text-custom-yellow cursor-pointer transition-colors duration-200">
                  Apartments
                </p>
              </li>
              <li>
                <p className="text-white hover:text-custom-yellow cursor-pointer transition-colors duration-200">Houses</p>
              </li>
              <li>
                <p className="text-white hover:text-custom-yellow cursor-pointer transition-colors duration-200">
                  Town Houses
                </p>
              </li>
              <li>
                <p className="text-white hover:text-custom-yellow cursor-pointer transition-colors duration-200">Unit</p>
              </li>
            </ul>
          </div>

          {/* Getting Started and Support */}
          <div className="space-y-6 mt-4 sm:mt-0 flex flex-col items-center sm:items-start">
            <div className="flex flex-col items-center sm:items-start">
              <h3 className="font-bold text-custom-red mb-4 text-xl">
                Getting Started
              </h3>
              <ul className="space-y-2 text-center sm:text-left">
                <li>
                  <Link
                    href="/signup"
                    className="text-white hover:text-custom-yellow transition-colors duration-200"
                  >
                    Sign-in
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <h3 className="font-bold text-custom-red mb-4 text-xl">Get in touch</h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-center sm:justify-start">
                  <svg
                    className="w-4 h-4 mr-2 text-text-white flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                  <a
                    href="mailto:info@gdcdigital.net"
                    className="text-white hover:text-custom-yellow transition-colors duration-200 break-all"
                  >
                    info@gdcdigital.net
                  </a>
                </li>
                <li className="flex items-center justify-center sm:justify-start">
                  <svg
                    className="w-4 h-4 mr-2 text-text-white flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                  </svg>
                  <a
                    href="tel:+6478380090"
                    className="text-white hover:text-custom-yellow transition-colors duration-200"
                  >
                    +64 7 838 0090
                  </a>
                </li>
                <li className="flex items-start justify-center sm:justify-start">
                  <svg
                    className="w-4 h-4 mr-2 text-text-white flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <p className="text-white hover:text-custom-yellow transition-colors duration-200 break-words">
                    89 Church Road, Pukete, Hamilton 3200
                  </p>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div className="mt-4 flex justify-center sm:justify-start w-full">
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 text-red-600 rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 text-red-600 rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 text-red-600 rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 mt-8 md:mt-12 pt-6 md:pt-8 text-center text-sm text-text-white">
          © {new Date().getFullYear()}{" "}
          <Link
            href="https://www.gdcdigital.net/"
            className="text-white hover:text-custom-yellow transition-colors duration-200"
          >
            GDC Digital Solutions.
          </Link>{" "}
          All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
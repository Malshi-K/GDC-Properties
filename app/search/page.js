export const dynamic = 'force-dynamic'
import { Suspense } from "react";
import SearchResults from "@/components/search/SearchResults";
import { PageTitle } from "@/components/PageTitle";

export default function SearchPage() {
  return (
    <>
      <PageTitle />
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {/* Search filters skeleton */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="h-8 bg-gray-300 rounded w-1/3 mx-auto mb-4"></div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-pulse">
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div></div>
                    <div className="h-10 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </div>
              
              {/* Loading indicator */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">Loading properties...</h2>
                <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin mx-auto"></div>
              </div>
            </div>
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </>
  );
}
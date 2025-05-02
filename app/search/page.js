import { Suspense } from 'react';
import SearchResults from "@/components/search/SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading properties...</h2>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
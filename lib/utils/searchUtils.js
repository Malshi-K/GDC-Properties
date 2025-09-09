// /lib/utils/searchUtils.js

/**
 * Shared utilities for property search functionality
 * Used by both home page PropertySearchForm and search results page
 */

export const propertySearchService = {
  /**
   * Generate smart price points based on actual property data
   * @param {number} min - Minimum price from database
   * @param {number} max - Maximum price from database
   * @param {number} count - Number of price points to generate
   * @returns {number[]} Array of price points
   */
  generatePricePoints(min, max, count = 6) {
    min = Math.max(0, Number(min) || 0);
    max = Math.max(min + 1000, Number(max) || min + 1000000);

    const result = [];
    const range = max - min;

    // Use logarithmic distribution for better price ranges
    for (let i = 0; i < count; i++) {
      let price;
      if (i === 0) {
        price = min;
      } else if (i === count - 1) {
        price = max;
      } else {
        // Logarithmic distribution for middle values
        const logMin = Math.log(min || 1);
        const logMax = Math.log(max);
        const logStep = (logMax - logMin) / (count - 1);
        price = Math.exp(logMin + logStep * i);
      }

      // Round to nearest 1000 for cleaner values
      price = Math.round(price / 1000) * 1000;

      // Avoid duplicates
      if (result.indexOf(price) === -1) {
        result.push(price);
      }
    }

    return result.sort((a, b) => a - b);
  },

  /**
   * Process form options from raw database data
   * @param {Object} rawData - Raw data from database queries
   * @returns {Object} Processed form options
   */
  processFormOptionsFromRawData(rawData = {}) {
    const { locationsData, pricesData, bedroomsData, bathroomsData } = rawData;

    // Always coerce to arrays
    const safeLocations = Array.isArray(locationsData) ? locationsData : [];
    const safePrices = Array.isArray(pricesData) ? pricesData : [];
    const safeBedrooms = Array.isArray(bedroomsData) ? bedroomsData : [];
    const safeBathrooms = Array.isArray(bathroomsData) ? bathroomsData : [];

    // Process locations
    const uniqueLocations = safeLocations
      .map((item) => item.location)
      .filter((location) => location && location.trim() !== "")
      .filter((location, index, arr) => arr.indexOf(location) === index)
      .sort();

    // Process prices
    const validPrices = safePrices
      .map((item) => Number(item.price))
      .filter((price) => !isNaN(price) && price > 0)
      .sort((a, b) => a - b);

    let priceRanges = { minPrices: [], maxPrices: [] };
    if (validPrices.length > 0) {
      const minPrice = validPrices[0];
      const maxPrice = validPrices[validPrices.length - 1];

      // Generate min prices (starting from minimum, going to ~80% of max)
      const minPricePoints = this.generatePricePoints(
        minPrice,
        maxPrice * 0.8,
        6
      );

      // Generate max prices (starting from ~20% above min, going to maximum)
      const maxPricePoints = this.generatePricePoints(
        minPrice * 1.2,
        maxPrice,
        6
      );

      priceRanges = {
        minPrices: minPricePoints,
        maxPrices: maxPricePoints,
      };
    }

    // Process bedrooms - get unique, valid bedroom counts
    const uniqueBedrooms = safeBedrooms
      .map((item) => Number(item.bedrooms))
      .filter((value) => !isNaN(value) && value > 0 && value <= 20)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a - b);

    // Process bathrooms - get unique, valid bathroom counts
    const uniqueBathrooms = safeBathrooms
      .map((item) => Number(item.bathrooms))
      .filter((value) => !isNaN(value) && value > 0 && value <= 20)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a - b);

    return {
      locations: uniqueLocations,
      priceRanges:
        priceRanges.minPrices.length > 0
          ? priceRanges
          : this.getFallbackPriceRanges(),
      bedroomOptions:
        uniqueBedrooms.length > 0 ? uniqueBedrooms : this.getFallbackBedrooms(),
      bathroomOptions:
        uniqueBathrooms.length > 0
          ? uniqueBathrooms
          : this.getFallbackBathrooms(),
      // Store original data for reference
      stats: {
        totalLocations: uniqueLocations.length,
        priceRange:
          validPrices.length > 0
            ? {
                min: validPrices[0],
                max: validPrices[validPrices.length - 1],
              }
            : null,
        bedroomRange:
          uniqueBedrooms.length > 0
            ? {
                min: uniqueBedrooms[0],
                max: uniqueBedrooms[uniqueBedrooms.length - 1],
              }
            : null,
        bathroomRange:
          uniqueBathrooms.length > 0
            ? {
                min: uniqueBathrooms[0],
                max: uniqueBathrooms[uniqueBathrooms.length - 1],
              }
            : null,
      },
    };
  },

  /**
   * Get fallback price ranges when no data is available
   */
  getFallbackPriceRanges() {
    return {
      minPrices: [50000, 100000, 200000, 300000, 500000, 750000],
      maxPrices: [200000, 400000, 600000, 800000, 1000000, 2000000],
    };
  },

  /**
   * Get fallback bedroom options when no data is available
   */
  getFallbackBedrooms() {
    return [1, 2, 3, 4, 5];
  },

  /**
   * Get fallback bathroom options when no data is available
   */
  getFallbackBathrooms() {
    return [1, 1.5, 2, 2.5, 3, 4];
  },

  /**
   * Build Supabase query filters from form data
   * @param {Object} formData - Form data object
   * @returns {Array} Array of filter objects for Supabase
   */
  buildSearchFilters(formData) {
    const filters = [];

    if (formData.location && formData.location.trim() !== "") {
      filters.push({
        column: "location",
        operator: "eq",
        value: formData.location,
      });
    }

    if (formData.property_type && formData.property_type.trim() !== "") {
      filters.push({
        column: "property_type",
        operator: "eq",
        value: formData.property_type,
      });
    }

    if (formData.minPrice && formData.minPrice.trim() !== "") {
      const minPriceNum = parseInt(formData.minPrice);
      if (!isNaN(minPriceNum)) {
        filters.push({ column: "price", operator: "gte", value: minPriceNum });
      }
    }

    if (formData.maxPrice && formData.maxPrice.trim() !== "") {
      const maxPriceNum = parseInt(formData.maxPrice);
      if (!isNaN(maxPriceNum)) {
        filters.push({ column: "price", operator: "lte", value: maxPriceNum });
      }
    }

    if (formData.bedrooms && formData.bedrooms.trim() !== "") {
      const bedroomsNum = parseInt(formData.bedrooms);
      if (!isNaN(bedroomsNum)) {
        filters.push({
          column: "bedrooms",
          operator: "gte",
          value: bedroomsNum,
        });
      }
    }

    if (formData.bathrooms && formData.bathrooms.trim() !== "") {
      const bathroomsNum = parseFloat(formData.bathrooms);
      if (!isNaN(bathroomsNum)) {
        filters.push({
          column: "bathrooms",
          operator: "gte",
          value: bathroomsNum,
        });
      }
    }

    return filters;
  },

  /**
   * Convert URL search params to form data object
   * @param {URLSearchParams} searchParams - URL search parameters
   * @returns {Object} Form data object
   */
  searchParamsToFormData(searchParams) {
    if (!searchParams) {
      return {
        location: "",
        property_type: "",
        minPrice: "",
        maxPrice: "",
        bedrooms: "",
        bathrooms: "",
      };
    }

    return {
      location: searchParams.get("location") || "",
      property_type: searchParams.get("property_type") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      bedrooms: searchParams.get("bedrooms") || "",
      bathrooms: searchParams.get("bathrooms") || "",
    };
  },

  /**
   * Convert form data to URL search params string
   * @param {Object} formData - Form data object
   * @returns {string} URL search params string
   */
  formDataToSearchParams(formData) {
    const queryParams = Object.entries(formData)
      .filter(([_, value]) => value !== "")
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    return new URLSearchParams(queryParams).toString();
  },

  /**
   * Format price for display
   * @param {number} price - Price amount
   * @returns {string} Formatted price string
   */
  formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  },

  /**
   * Format bathrooms with decimal handling
   * @param {number} value - Bathroom count
   * @returns {string} Formatted bathroom string
   */
  formatBathrooms(value) {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  },

  /**
   * Validate form data
   * @param {Object} formData - Form data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateFormData(formData) {
    const errors = [];

    // Validate price range
    if (formData.minPrice && formData.maxPrice) {
      const minPrice = parseInt(formData.minPrice);
      const maxPrice = parseInt(formData.maxPrice);

      if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > maxPrice) {
        errors.push("Minimum price cannot be greater than maximum price");
      }
    }

    // Validate bedrooms
    if (formData.bedrooms) {
      const bedrooms = parseInt(formData.bedrooms);
      if (isNaN(bedrooms) || bedrooms < 0 || bedrooms > 20) {
        errors.push("Invalid number of bedrooms");
      }
    }

    // Validate bathrooms
    if (formData.bathrooms) {
      const bathrooms = parseFloat(formData.bathrooms);
      if (isNaN(bathrooms) || bathrooms < 0 || bathrooms > 20) {
        errors.push("Invalid number of bathrooms");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Get human-readable search summary
   * @param {Object} formData - Form data object
   * @returns {string} Human-readable search summary
   */
  getSearchSummary(formData) {
    const parts = [];

    if (formData.property_type) {
      const propertyType = PROPERTY_TYPES.find(
        (t) => t.value === formData.property_type
      );
      if (propertyType) {
        parts.push(propertyType.label);
      }
    }

    if (formData.location) {
      parts.push(`in ${formData.location}`);
    }

    if (formData.minPrice || formData.maxPrice) {
      const minPrice = formData.minPrice
        ? this.formatPrice(parseInt(formData.minPrice))
        : "";
      const maxPrice = formData.maxPrice
        ? this.formatPrice(parseInt(formData.maxPrice))
        : "";

      if (minPrice && maxPrice) {
        parts.push(`${minPrice} - ${maxPrice}`);
      } else if (minPrice) {
        parts.push(`from ${minPrice}`);
      } else if (maxPrice) {
        parts.push(`up to ${maxPrice}`);
      }
    }

    if (formData.bedrooms) {
      parts.push(`${formData.bedrooms}+ bedrooms`);
    }

    if (formData.bathrooms) {
      parts.push(
        `${this.formatBathrooms(parseFloat(formData.bathrooms))}+ bathrooms`
      );
    }

    return parts.length > 0 ? parts.join(", ") : "All properties";
  },
};

/**
 * Property types configuration
 * Shared between home page and search results page
 */
export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "units", label: "Units" },
];

/**
 * Cache TTL constants
 */
export const CACHE_TTL = {
  FORM_OPTIONS: 30 * 60 * 1000, // 30 minutes
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes
  PROPERTY_DETAILS: 10 * 60 * 1000, // 10 minutes
};

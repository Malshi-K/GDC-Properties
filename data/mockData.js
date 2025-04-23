// app/dashboard/owner/data/mockData.js

// Mock viewing requests data
export const mockViewingRequests = [
    {
      id: 1,
      propertyId: 1,
      propertyTitle: "Luxurious Beach House",
      userName: "Michael Brown",
      userEmail: "michael.brown@example.com",
      userPhone: "(555) 234-5678",
      requestDate: "2023-05-18T09:30:00",
      proposedDate: "2023-05-23T14:00:00",
      status: "pending", // pending, approved, declined
      message: "I'm interested in viewing this property as soon as possible.",
    },
    {
      id: 2,
      propertyId: 3,
      propertyTitle: "Hillside Villa",
      userName: "Emma Wilson",
      userEmail: "emma.wilson@example.com",
      userPhone: "(555) 345-6789",
      requestDate: "2023-05-17T11:45:00",
      proposedDate: "2023-05-22T10:00:00",
      status: "approved",
      message:
        "I would like to see this property in person to evaluate if it meets my needs.",
    },
    {
      id: 3,
      propertyId: 2,
      propertyTitle: "Modern Downtown Apartment",
      userName: "David Lee",
      userEmail: "david.lee@example.com",
      userPhone: "(555) 456-7890",
      requestDate: "2023-05-15T16:20:00",
      proposedDate: "2023-05-20T13:30:00",
      status: "declined",
      message:
        "I'm looking for a property in this area and this one caught my attention.",
    },
  ];
  
  // Mock rental applications data
  export const mockRentalApplications = [
    {
      id: 1,
      propertyId: 1,
      propertyTitle: "Luxurious Beach House",
      userName: "Jennifer Taylor",
      userEmail: "jennifer.taylor@example.com",
      userPhone: "(555) 567-8901",
      applicationDate: "2023-05-16T14:30:00",
      status: "pending", // pending, approved, rejected
      message:
        "I'm very interested in this property and would like to apply for rental.",
      employmentStatus: "Employed",
      income: "150000",
      creditScore: "Excellent",
    },
    {
      id: 2,
      propertyId: 4,
      propertyTitle: "Cozy Beach Townhouse",
      userName: "Robert Garcia",
      userEmail: "robert.garcia@example.com",
      userPhone: "(555) 678-9012",
      applicationDate: "2023-05-14T10:15:00",
      status: "approved",
      message:
        "I've been looking for a property like this for a while and would love to apply.",
      employmentStatus: "Self-employed",
      income: "120000",
      creditScore: "Good",
    },
    {
      id: 3,
      propertyId: 2,
      propertyTitle: "Modern Downtown Apartment",
      userName: "Susan Martinez",
      userEmail: "susan.martinez@example.com",
      userPhone: "(555) 789-0123",
      applicationDate: "2023-05-12T09:45:00",
      status: "rejected",
      message:
        "I'm interested in applying for this property for a long-term rental.",
      employmentStatus: "Employed",
      income: "90000",
      creditScore: "Fair",
    },
  ];
  
  // Helper functions for formatting
  export const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  export const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };
  
  export const getStatusColor = (status, type) => {
    if (type === "viewing") {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        case "declined":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    } else {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        case "rejected":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
  };
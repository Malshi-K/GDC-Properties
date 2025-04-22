// 'use client';

// import { useState, useEffect } from 'react';
// import { useUser } from '../../contexts/UserContext';
// import ProtectedRoute from '../../components/ProtectedRoute';
// import { supabase } from '@/lib/superbase';

// export default function ProfilePage() {
//   const { user, profile, refreshProfile } = useUser();
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState(null);
//   const [error, setError] = useState(null);
  
//   // Form state
//   const [formData, setFormData] = useState({
//     full_name: '',
//     phone: '',
//     address: '',
//     preferences: ''
//   });

//   // Load profile data when user is available
//   useEffect(() => {
//     if (profile) {
//       setFormData({
//         full_name: profile.full_name || '',
//         phone: profile.phone || '',
//         address: profile.address || '',
//         preferences: profile.preferences || ''
//       });
//     }
//   }, [profile]);

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setMessage(null);

//     try {
//       const { error } = await supabase
//         .from('profiles')
//         .upsert({
//           id: user.id,
//           full_name: formData.full_name,
//           phone: formData.phone,
//           address: formData.address,
//           preferences: formData.preferences,
//           updated_at: new Date()
//         });

//       if (error) throw error;
      
//       // Refresh profile data
//       await refreshProfile();
//       setMessage('Profile updated successfully!');
//     } catch (error) {
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle form field changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   return (
//     <ProtectedRoute>
//       <div className="container mx-auto py-8 px-4 md:px-0 mt-12">
//         <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
//           <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
          
//           {message && (
//             <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
//               {message}
//             </div>
//           )}
          
//           {error && (
//             <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
//               {error}
//             </div>
//           )}

//           <div className="mb-6 p-4 bg-gray-50 rounded-lg">
//             <p className="text-sm text-gray-600">Email: {user?.email}</p>
//             <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
//           </div>
          
//           <form onSubmit={handleSubmit}>
//             <div className="mb-4">
//               <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="full_name">
//                 Full Name
//               </label>
//               <input
//                 id="full_name"
//                 name="full_name"
//                 type="text"
//                 value={formData.full_name}
//                 onChange={handleChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
//               />
//             </div>
            
//             <div className="mb-4">
//               <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
//                 Phone Number
//               </label>
//               <input
//                 id="phone"
//                 name="phone"
//                 type="tel"
//                 value={formData.phone}
//                 onChange={handleChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
//               />
//             </div>
            
//             <div className="mb-4">
//               <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
//                 Address
//               </label>
//               <input
//                 id="address"
//                 name="address"
//                 type="text"
//                 value={formData.address}
//                 onChange={handleChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
//               />
//             </div>
            
//             <div className="mb-6">
//               <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preferences">
//                 Property Preferences
//               </label>
//               <textarea
//                 id="preferences"
//                 name="preferences"
//                 value={formData.preferences}
//                 onChange={handleChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
//                 rows="4"
//                 placeholder="E.g., preferred locations, number of bedrooms, price range, etc."
//               ></textarea>
//             </div>
            
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-custom-red text-white py-2 px-4 rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50"
//             >
//               {loading ? 'Saving...' : 'Save Profile'}
//             </button>
//           </form>
//         </div>
//       </div>
//     </ProtectedRoute>
//   );
// }
"use client";

import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useEffect, useState, useRef } from 'react';

export default function GlobalLoadingIndicator() {
  const { isLoading } = useGlobalData();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const longLoadingTimeoutRef = useRef(null);
  const loadStartTimeRef = useRef(null);
  
  // Add a slight delay before showing to avoid flashing for quick operations
  useEffect(() => {
    // When loading begins
    if (isLoading) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (longLoadingTimeoutRef.current) {
        clearTimeout(longLoadingTimeoutRef.current); 
      }
      
      // Record when loading started
      loadStartTimeRef.current = Date.now();
      
      // Delay showing the indicator for very quick operations (300ms)
      timeoutRef.current = setTimeout(() => {
        setVisible(true);
      }, 300);
      
      // Set a timeout for very long operations (10+ seconds)
      // This will automatically hide the indicator if loading gets stuck
      longLoadingTimeoutRef.current = setTimeout(() => {
        console.warn('Loading state has been active for over 10 seconds, auto-hiding indicator');
        setVisible(false);
      }, 10000);
    } 
    // When loading ends
    else {
      // If we were previously loading, calculate how long we were loading
      if (visible && loadStartTimeRef.current) {
        const loadDuration = Date.now() - loadStartTimeRef.current;
        
        // For very quick loads (under 500ms), hide immediately
        if (loadDuration < 500) {
          setVisible(false);
        } 
        // For longer loads, give a small delay before hiding to avoid flickering
        else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            setVisible(false);
          }, 200);
        }
      } else {
        // If we weren't visible yet, just clear the timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
      
      // Clear the long loading timeout
      if (longLoadingTimeoutRef.current) {
        clearTimeout(longLoadingTimeoutRef.current);
      }
      
      // Reset the load start time
      loadStartTimeRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (longLoadingTimeoutRef.current) {
        clearTimeout(longLoadingTimeoutRef.current);
      }
    };
  }, [isLoading, visible]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <div className="h-full bg-custom-orange animate-progress-bar"></div>
    </div>
  );
}

// Add this to your CSS if not already present
// @keyframes progressBar {
//   0% { width: 0; }
//   20% { width: 20%; }
//   50% { width: 50%; }
//   80% { width: 80%; }
//   100% { width: 95%; }
// }
// 
// .animate-progress-bar {
//   animation: progressBar 3s ease-in-out infinite;
// }
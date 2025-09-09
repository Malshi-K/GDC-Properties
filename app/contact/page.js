// page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import ContactForm from '@/components/contact/ContactForm';
import ContactMap from '@/components/contact/ContactMap';
import { PageTitle } from '@/components/PageTitle';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageTitle />      
      <ContactForm />
      <ContactMap />
    </div>
  );
}
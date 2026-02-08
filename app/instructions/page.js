'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InstructionsPage() {
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const response = await fetch('/api/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const orgName = organization?.name || 'LIMHS CAFETERIA';
  const supportWhatsApp = organization?.support_whatsapp || '0311-2345678';
  const lostCardFee = organization?.lost_card_fee || 500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div
        className="text-white py-8 px-4"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #f59e0b 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {organization?.logo_url && (
            <img
              src={organization.logo_url}
              alt="Logo"
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{orgName}</h1>
          <p className="text-xl md:text-2xl font-semibold text-yellow-300">
            SCAN CARD TO GET YOUR MEAL TOKEN!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How to Get Your Meal
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-600 mb-1">
                  SCAN YOUR MEMBERSHIP CARD
                </h3>
                <p className="text-gray-600">
                  Place your membership card QR code in front of the scanner at the token station.
                  The system will automatically read your card and display your information.
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0">
                <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-600 mb-1">
                  GENERATE YOUR TOKEN NUMBER
                </h3>
                <p className="text-gray-600">
                  Once your card is verified, click the "Generate Token" button.
                  A unique token number will be generated for your meal and a receipt will be printed.
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0">
                <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6" />
                </svg>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-600 mb-1">
                  COLLECT YOUR MEAL AFTER VERIFYING TOKEN
                </h3>
                <p className="text-gray-600">
                  Take your token receipt to the collection counter.
                  The staff will verify your token and serve your meal.
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0">
                <svg className="w-16 h-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Important Rules
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-gray-700">Please scan your card before every meal</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-gray-700">Lost card fee: <strong className="text-red-600">Rs. {lostCardFee}</strong></span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-gray-700">One card per person - cards are non-transferable</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-700">Tokens are valid only for the current day</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span className="text-gray-700">Keep your token receipt until meal collection</span>
            </li>
          </ul>
        </div>

        {/* Meal Times */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Meal Timings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h3 className="font-bold text-yellow-700 mb-1">Breakfast</h3>
              <p className="text-2xl font-bold text-yellow-600">6:00 AM - 10:00 AM</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <h3 className="font-bold text-orange-700 mb-1">Lunch</h3>
              <p className="text-2xl font-bold text-orange-600">11:00 AM - 3:00 PM</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-bold text-blue-700 mb-1">Dinner</h3>
              <p className="text-2xl font-bold text-blue-600">5:00 PM - 9:00 PM</p>
            </div>
          </div>
        </div>

        {/* Support Contact */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-6 md:p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Need Assistance?</h2>
          <p className="mb-4">Contact us on WhatsApp for any help or queries</p>
          <a
            href={`https://wa.me/${supportWhatsApp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {supportWhatsApp}
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-x-4">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Token Verification
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-4 text-center text-sm">
        <p>{orgName} - Meal Token System</p>
      </div>
    </div>
  );
}

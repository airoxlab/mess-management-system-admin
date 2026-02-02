'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate, formatTime } from '@/lib/utils';
import { MEAL_TYPE_LABELS } from '@/lib/constants';

export const TokenReceipt = forwardRef(function TokenReceipt(
  { token, member, organization },
  ref
) {
  if (!token) return null;

  const orgName = organization?.name || 'LIMHS CAFETERIA';
  const supportWhatsApp = organization?.support_whatsapp || '0311-2345678';

  return (
    <div
      ref={ref}
      className="receipt bg-white p-4 text-black"
      style={{ width: '80mm', fontFamily: 'monospace' }}
    >
      {/* Header with Logo */}
      <div className="text-center mb-4">
        {organization?.logo_url && (
          <div className="flex justify-center mb-2">
            <img
              src={organization.logo_url}
              alt="Logo"
              className="h-10 object-contain"
            />
          </div>
        )}
        <h1 className="text-lg font-bold uppercase">
          {orgName}
        </h1>
        <p className="text-sm font-semibold">TOKEN RECEIPT</p>
        <div className="border-b-2 border-black border-dashed my-2" />
      </div>

      {/* Token Number - Large and prominent */}
      <div className="text-center my-4 py-3 bg-gray-100 rounded-lg">
        <p className="text-xs text-gray-600 uppercase">Token Number</p>
        <p className="text-5xl font-bold tracking-wider">
          {String(token.token_no).padStart(3, '0')}
        </p>
        <p className="text-sm font-semibold text-gray-700 mt-1">
          {MEAL_TYPE_LABELS[token.meal_type]}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center my-4">
        <div className="p-2 border border-gray-300 rounded-lg">
          <QRCodeSVG
            value={token.id}
            size={100}
            level="M"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-black border-dashed my-3" />

      {/* Details Table */}
      <div className="text-sm space-y-2">
        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
          <span className="text-gray-600">Token No:</span>
          <span className="font-bold">{String(token.token_no).padStart(4, '0')}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
          <span className="text-gray-600">Member ID:</span>
          <span className="font-bold">{member?.member_id}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
          <span className="text-gray-600">Meal:</span>
          <span className="font-bold">{MEAL_TYPE_LABELS[token.meal_type]}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
          <span className="text-gray-600">Date:</span>
          <span className="font-bold">{formatDate(token.token_date, 'dd-MM-yyyy')}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
          <span className="text-gray-600">Time:</span>
          <span className="font-bold">{formatTime(token.token_time, 'hh:mm a')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="font-bold uppercase">{token.status}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-black border-dashed my-3" />

      {/* Balance Info */}
      <div className="text-center my-3 py-2 bg-green-50 rounded-lg border border-green-200">
        <p className="text-xs text-gray-600">Balance After This Meal</p>
        <p className="text-2xl font-bold text-green-600">{member?.balance_meals} meals</p>
      </div>

      {/* Divider */}
      <div className="border-b-2 border-black border-dashed my-3" />

      {/* Instructions */}
      <div className="text-center text-xs mt-4 space-y-2">
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <p className="font-semibold text-blue-800">How to Collect Your Meal:</p>
          <p className="text-blue-700">1. Go to the collection counter</p>
          <p className="text-blue-700">2. Show this token receipt</p>
          <p className="text-blue-700">3. Collect your meal after verification</p>
        </div>

        <p className="font-bold mt-3">Thank you!</p>

        {/* WhatsApp Support */}
        <div className="mt-3 pt-2 border-t border-dashed border-gray-400">
          <p className="text-gray-600">For Assistance:</p>
          <p className="font-bold text-green-600 text-sm">WhatsApp: {supportWhatsApp}</p>
        </div>

        <div className="border-b border-black border-dashed my-2" />
        <p className="text-[10px] text-gray-500">
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
});

export default TokenReceipt;

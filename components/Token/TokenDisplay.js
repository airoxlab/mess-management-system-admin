'use client';

import { QRCodeSVG } from 'qrcode.react';
import { formatDate, formatTime } from '@/lib/utils';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

export function TokenDisplay({
  token,
  member,
  onPrint,
  onNewScan,
  printing,
}) {
  if (!token) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
      {/* Success header */}
      <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Token Generated!</h2>
        <p className="text-green-100">Present this at the collection counter</p>
      </div>

      {/* Token details */}
      <div className="p-6 text-center">
        {/* Token number */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Token Number</p>
          <p className="text-5xl font-bold text-gray-900">
            #{String(token.token_no).padStart(3, '0')}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
            <QRCodeSVG
              value={token.id}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Member</p>
            <p className="font-medium text-gray-900">{member?.name}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Meal Type</p>
            <p className="font-medium text-gray-900">
              {MEAL_TYPE_LABELS[token.meal_type]}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Date</p>
            <p className="font-medium text-gray-900">
              {formatDate(token.token_date)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Time</p>
            <p className="font-medium text-gray-900">
              {formatTime(token.token_time)}
            </p>
          </div>
        </div>

        {/* Balance remaining */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <p className="text-sm text-blue-600">Remaining Balance</p>
          <p className="text-2xl font-bold text-blue-700">
            {member?.balance_meals} meals
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
        <Button
          variant="outline"
          onClick={onPrint}
          className="flex-1"
          loading={printing}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          }
        >
          Print Receipt
        </Button>
        <Button
          variant="primary"
          onClick={onNewScan}
          className="flex-1"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M6 20h2M6 8h2v4m0 0v8m8-8v8m0-8h.01" />
            </svg>
          }
        >
          New Scan
        </Button>
      </div>
    </div>
  );
}

export default TokenDisplay;

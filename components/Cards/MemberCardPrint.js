'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils';

export const MemberCardPrint = forwardRef(function MemberCardPrint(
  { members, organization },
  ref
) {
  const orgName = organization?.name || 'LIMHS CAFETERIA';
  const supportWhatsApp = organization?.support_whatsapp || '0311-2345678';
  const lostCardFee = organization?.lost_card_fee || 500;

  return (
    <div ref={ref} className="p-4">
      {/* Print styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
          }

          .card {
            page-break-inside: avoid;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>

      <div className="card-grid grid grid-cols-2 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="card bg-white rounded-xl overflow-hidden border border-gray-200"
            style={{ width: '85.6mm', height: '53.98mm' }}
          >
            {/* Card Front */}
            <div className="h-full flex flex-col">
              {/* Header with gradient - matching image design */}
              <div
                className="px-3 py-2 text-white"
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #f59e0b 100%)',
                }}
              >
                <div className="flex items-center gap-2">
                  {organization?.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt="Logo"
                      className="w-7 h-7 rounded-full bg-white object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold">L</span>
                    </div>
                  )}
                  <h3 className="font-bold text-xs">{orgName}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-2 flex">
                {/* Left: Photo + Member Info */}
                <div className="flex-1 flex gap-2">
                  {/* Member Photo */}
                  <div className="flex-shrink-0">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-12 h-12 rounded object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-lg border border-gray-200">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs truncate">
                      {member.name}
                    </p>
                    <div className="mt-0.5 space-y-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-gray-500">Member ID:</span>
                        <span className="font-mono font-bold text-blue-600 text-[10px]">
                          {member.member_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-gray-500">Valid Until:</span>
                        <span className="font-medium text-gray-700 text-[10px]">
                          {formatDate(member.valid_until, 'MM/yyyy')}
                        </span>
                      </div>
                      {member.contact && (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-gray-500">Contact:</span>
                          <span className="font-medium text-gray-700 text-[10px]">
                            {member.contact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: QR Code */}
                <div className="flex flex-col items-center justify-center ml-2">
                  <div className="p-1 bg-white border border-gray-300 rounded">
                    <QRCodeSVG
                      value={member.member_id}
                      size={50}
                      level="M"
                    />
                  </div>
                </div>
              </div>

              {/* Footer with rules and support */}
              <div className="bg-gray-100 border-t border-gray-200">
                {/* Rules */}
                <div className="px-2 py-0.5 text-[7px] text-gray-600 flex items-center justify-center gap-2 border-b border-gray-200">
                  <span>• Scan card before meals</span>
                  <span>• Lost card fee: Rs. {lostCardFee}</span>
                  <span>• One card per person</span>
                </div>
                {/* Support */}
                <div className="px-2 py-0.5 flex items-center justify-center gap-1 text-[8px]">
                  <span className="text-gray-600">WhatsApp Support:</span>
                  <span className="font-bold text-green-600">{supportWhatsApp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default MemberCardPrint;

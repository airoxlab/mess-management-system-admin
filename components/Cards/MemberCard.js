'use client';

import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils';

export function MemberCard({ member, organization, className }) {
  const orgName = organization?.name || 'LIMHS CAFETERIA';
  const supportPhone = organization?.support_phone || '0300-0000000';
  const supportWhatsApp = organization?.support_whatsapp || '0311-2345678';
  const lostCardFee = organization?.lost_card_fee || 500;

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-lg ${className}`}
      style={{ width: '85.6mm', height: '53.98mm' }}
    >
      {/* Card Front */}
      <div className="h-full flex flex-col">
        {/* Header with gradient - matching image design */}
        <div
          className="px-4 py-2 text-white"
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #f59e0b 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt="Logo"
                  className="w-8 h-8 rounded-full bg-white object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">L</span>
                </div>
              )}
              <div>
                <h3 className="font-bold text-sm leading-tight">
                  {orgName}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Yellow accent bar + info */}
        <div className="flex-1 flex">
          {/* Left side with photo and info */}
          <div className="flex-1 p-3 flex gap-3">
            {/* Member Photo */}
            <div className="flex-shrink-0">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-14 h-14 rounded-lg object-cover border-2 border-primary-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-600 font-bold text-xl border-2 border-primary-200">
                  {member.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate leading-tight">
                {member.name}
              </p>
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-500 uppercase">ID:</span>
                  <span className="font-mono font-bold text-primary-600 text-xs">
                    {member.member_id}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-500 uppercase">Valid:</span>
                  <span className="font-medium text-gray-700 text-xs">
                    {formatDate(member.valid_until, 'MM/yyyy')}
                  </span>
                </div>
                {member.contact && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500 uppercase">Tel:</span>
                    <span className="font-medium text-gray-700 text-xs">
                      {member.contact}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center justify-center pr-3">
            <div className="p-1.5 bg-white border border-gray-300 rounded-lg shadow-sm">
              <QRCodeSVG
                value={member.member_id}
                size={60}
                level="M"
              />
            </div>
          </div>
        </div>

        {/* Footer with rules and support */}
        <div className="bg-gray-100 border-t border-gray-200">
          {/* Rules */}
          <div className="px-3 py-1 text-[8px] text-gray-600 flex items-center justify-center gap-3 border-b border-gray-200">
            <span>• Scan card before meals</span>
            <span>• Lost card fee: Rs. {lostCardFee}</span>
            <span>• One card per person</span>
          </div>
          {/* Support */}
          <div className="px-3 py-1 flex items-center justify-center gap-2 text-[9px]">
            <span className="text-gray-600">WhatsApp Support:</span>
            <span className="font-bold text-green-600">{supportWhatsApp}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberCard;

'use client';

import { Button } from '@/components/ui/Button';
import { formatDate, getStatusColor, isCardExpired } from '@/lib/utils';
import { MEAL_TYPE_LABELS, getCurrentMealType } from '@/lib/constants';

export function ScanResult({
  member,
  onGenerateToken,
  onCancel,
  loading,
  error,
}) {
  if (!member) return null;

  const isExpired = isCardExpired(member.valid_until);
  const isInactive = member.status !== 'active';
  const hasNoMeals = member.balance_meals <= 0;
  const currentMealType = getCurrentMealType();

  const canGenerateToken = !isExpired && !isInactive && !hasNoMeals;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
      {/* Member Info */}
      <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
            {member.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{member.name}</h2>
            <p className="text-primary-100">{member.member_id}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        {/* Balance */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="text-gray-600">Meal Balance</span>
          <span className={`text-3xl font-bold ${
            hasNoMeals ? 'text-red-600' : 'text-green-600'
          }`}>
            {member.balance_meals} meals
          </span>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(member.status)}`}>
            {member.status?.toUpperCase()}
          </span>
          {isExpired && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              CARD EXPIRED
            </span>
          )}
        </div>

        {/* Valid Until */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Valid Until</span>
          <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {formatDate(member.valid_until)}
          </span>
        </div>

        {/* Current Meal Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Current Meal</span>
          <span className="text-gray-900 font-medium">
            {MEAL_TYPE_LABELS[currentMealType]}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Warning messages */}
        {!canGenerateToken && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
            {isExpired && <p>Card has expired. Please renew membership.</p>}
            {isInactive && <p>Account is not active. Please contact admin.</p>}
            {hasNoMeals && !isExpired && !isInactive && (
              <p>No meals remaining. Please top up your balance.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={onGenerateToken}
          className="flex-1"
          disabled={!canGenerateToken || loading}
          loading={loading}
        >
          Generate Token
        </Button>
      </div>
    </div>
  );
}

export default ScanResult;

'use client';

import { cn } from '@/lib/utils';

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  className,
}) {
  const colors = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      trend: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      trend: 'text-green-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'bg-yellow-100 text-yellow-600',
      trend: 'text-yellow-600',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      trend: 'text-purple-600',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      trend: 'text-red-600',
    },
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <p className={cn('mt-2 text-sm font-medium', colors[color].trend)}>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', colors[color].icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {children}
    </div>
  );
}

export default StatsCard;

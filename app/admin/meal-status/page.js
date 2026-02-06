'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { formatDate, formatTime } from '@/lib/utils';
import api from '@/lib/api-client';

const MEMBER_TYPE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  staff: 'Staff',
};

const MEMBER_TYPE_COLORS = {
  student: 'bg-blue-100 text-blue-700',
  faculty: 'bg-purple-100 text-purple-700',
  staff: 'bg-amber-100 text-amber-700',
};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(preset) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().split('T')[0];
      return { startDate: s, endDate: s };
    }
    case '3days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    }
    case 'week': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    }
    case 'all': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    }
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}

// Count statuses across all days for a member
function getMemberSummary(member) {
  let collected = 0, skipped = 0, missed = 0, pending = 0;
  member.days.forEach((day) => {
    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const s = day[meal].status;
      if (s === 'collected') collected++;
      else if (s === 'skipped') skipped++;
      else if (s === 'missed') missed++;
      else if (s === 'pending') pending++;
    });
  });
  return { collected, skipped, missed, pending };
}

export default function MealStatusPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMeal, setFilterMeal] = useState('any');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(getToday());
  const [expandedMembers, setExpandedMembers] = useState(new Set());

  const isSingleDay = dates.length <= 1;

  const fetchMealStatus = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/meal-status?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
        setStats(data.stats || null);
        setDates(data.dates || []);
      } else {
        toast.error(data.error || 'Failed to fetch meal status');
      }
    } catch (err) {
      toast.error('Failed to fetch meal status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (datePreset === 'custom') {
      fetchMealStatus(customDate, customDate);
    } else {
      const { startDate, endDate } = getDateRange(datePreset);
      fetchMealStatus(startDate, endDate);
    }
  }, [datePreset, customDate, fetchMealStatus]);

  // Auto-expand logic: expand all for short ranges, collapse for long ranges
  useEffect(() => {
    if (!loading && members.length > 0) {
      if (dates.length > 1 && dates.length <= 7) {
        setExpandedMembers(new Set(members.map((m) => m.id)));
      } else {
        setExpandedMembers(new Set());
      }
    }
  }, [loading, members, dates]);

  const toggleMember = (memberId) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const expandAll = () => setExpandedMembers(new Set(filteredMembers.map((m) => m.id)));
  const collapseAll = () => setExpandedMembers(new Set());

  // Filter and sort
  const filteredMembers = members
    .filter((m) => {
      if (filterType !== 'all' && m.member_type !== filterType) return false;

      if (m.days.length > 0 && filterStatus !== 'all') {
        const latest = m.days[0];
        const hasMeal = (meal) => meal.status === 'collected' || meal.status === 'pending';

        if (filterStatus === 'taking') {
          if (filterMeal === 'breakfast' && !hasMeal(latest.breakfast)) return false;
          if (filterMeal === 'lunch' && !hasMeal(latest.lunch)) return false;
          if (filterMeal === 'dinner' && !hasMeal(latest.dinner)) return false;
          if (filterMeal === 'any' && !hasMeal(latest.breakfast) && !hasMeal(latest.lunch) && !hasMeal(latest.dinner)) return false;
        } else if (filterStatus === 'not_taking') {
          if (filterMeal === 'breakfast' && hasMeal(latest.breakfast)) return false;
          if (filterMeal === 'lunch' && hasMeal(latest.lunch)) return false;
          if (filterMeal === 'dinner' && hasMeal(latest.dinner)) return false;
          if (filterMeal === 'any' && (hasMeal(latest.breakfast) || hasMeal(latest.lunch) || hasMeal(latest.dinner))) return false;
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.identifier?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Members with more skips/misses sort to top
      const getSkipScore = (member) => {
        let score = 0;
        member.days.forEach((day) => {
          ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
            if (day[meal].status === 'skipped' || day[meal].status === 'missed') score++;
          });
        });
        return score;
      };
      return getSkipScore(b) - getSkipScore(a);
    });

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meal Status</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Track daily meal attendance for all members</p>
          </div>
          {datePreset === 'today' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live - Today
            </span>
          )}
        </div>
      </div>

      {/* All filters in one row */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, ID, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Member Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap"
          >
            <option value="all">All Types</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Staff</option>
          </select>

          {/* Meal Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap"
          >
            <option value="all">All Status</option>
            <option value="taking">Taking Meal</option>
            <option value="not_taking">Not Taking</option>
          </select>

          {/* Meal Type */}
          <select
            value={filterMeal}
            onChange={(e) => setFilterMeal(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap"
          >
            <option value="any">Any Meal</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>

          {/* Date Preset */}
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap font-medium"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="3days">3 Days</option>
            <option value="week">This Week</option>
            <option value="all">All Time</option>
            <option value="custom">Custom</option>
          </select>

          {datePreset === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              max={getToday()}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none whitespace-nowrap"
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taking Meal</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.taking_meal}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Not Taking Meal</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.not_taking_meal}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Meal Breakdown</p>
                <div className="flex gap-3 mt-1">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">B</p>
                    <p className="text-sm font-bold text-gray-900">{stats.breakfast_taking}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">L</p>
                    <p className="text-sm font-bold text-gray-900">{stats.lunch_taking}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">D</p>
                    <p className="text-sm font-bold text-gray-900">{stats.dinner_taking}</p>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Showing count + expand/collapse for range */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing {filteredMembers.length} of {members.length} members
          {dates.length > 1 && <span className="ml-1">({dates.length} days)</span>}
        </span>
        {!isSingleDay && filteredMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-lg">No members found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : isSingleDay ? (
        <SingleDayView members={filteredMembers} />
      ) : (
        <RangeView
          members={filteredMembers}
          expandedMembers={expandedMembers}
          toggleMember={toggleMember}
        />
      )}
    </div>
  );
}

/* ====================== Single Day Table View ====================== */
function SingleDayView({ members }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Breakfast</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lunch</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dinner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => {
              const day = member.days[0];
              if (!day) return null;

              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.identifier}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${MEMBER_TYPE_COLORS[member.member_type]}`}>
                      {MEMBER_TYPE_LABELS[member.member_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-[200px] truncate">{member.department}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge meal={day.breakfast} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge meal={day.lunch} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge meal={day.dinner} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====================== Range (Multi-Day) Card View ====================== */
function RangeView({ members, expandedMembers, toggleMember }) {
  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isExpanded = expandedMembers.has(member.id);
        const summary = getMemberSummary(member);

        return (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Card Header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleMember(member.id)}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">
                    {member.identifier} · {member.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Summary counts */}
                <div className="flex items-center gap-2 text-xs">
                  {summary.collected > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {summary.collected}
                    </span>
                  )}
                  {summary.skipped > 0 && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      {summary.skipped}
                    </span>
                  )}
                  {summary.missed > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {summary.missed}
                    </span>
                  )}
                  {summary.pending > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {summary.pending}
                    </span>
                  )}
                </div>

                {/* Type badge */}
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${MEMBER_TYPE_COLORS[member.member_type]}`}>
                  {MEMBER_TYPE_LABELS[member.member_type]}
                </span>
              </div>
            </div>

            {/* Expanded: per-day rows */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {/* Column headers */}
                <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Breakfast</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Lunch</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Dinner</span>
                </div>

                {member.days.map((day, idx) => (
                  <div
                    key={day.date}
                    className={`grid grid-cols-4 px-4 py-2.5 items-center ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">{formatDate(day.date, 'MMM dd')}</p>
                      <p className="text-xs text-gray-400">{formatDate(day.date, 'EEEE')}</p>
                    </div>
                    <div className="text-center">
                      <StatusBadge meal={day.breakfast} compact />
                    </div>
                    <div className="text-center">
                      <StatusBadge meal={day.lunch} compact />
                    </div>
                    <div className="text-center">
                      <StatusBadge meal={day.dinner} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ====================== Status Badge Component ====================== */
function StatusBadge({ meal, compact = false }) {
  if (!meal) return null;

  switch (meal.status) {
    case 'collected':
      return (
        <span className="inline-flex items-center gap-1.5 text-green-700">
          <span className={`flex items-center justify-center rounded-full bg-green-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {meal.time ? formatTime(meal.time, 'h:mm a') : 'Collected'}
          </span>
        </span>
      );

    case 'skipped':
      return (
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className={`flex items-center justify-center rounded-full bg-slate-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
          <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Skipped</span>
        </span>
      );

    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-600">
          <span className={`flex items-center justify-center rounded-full bg-amber-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Pending</span>
        </span>
      );

    case 'missed':
      return (
        <span className="inline-flex items-center gap-1.5 text-red-600">
          <span className={`flex items-center justify-center rounded-full bg-red-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Missed</span>
        </span>
      );

    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-gray-400">
          <span className={`flex items-center justify-center rounded-full bg-gray-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Cancelled</span>
        </span>
      );

    case 'not_in_package':
      return (
        <span className={compact ? 'text-base' : 'text-lg'}>&#10060;</span>
      );

    default:
      return <span className="text-xs text-gray-400">-</span>;
  }
}

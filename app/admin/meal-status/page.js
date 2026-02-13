'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { formatDate, formatTime } from '@/lib/utils';
import api from '@/lib/api-client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Determine which meal is currently active based on time and settings
// Fully dynamic - works with any time configuration from settings
function getActiveMeal(mealTimings) {
  if (!mealTimings) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMin = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const meals = [
    { name: 'breakfast', start: toMin(mealTimings.breakfast_start), end: toMin(mealTimings.breakfast_end) },
    { name: 'lunch', start: toMin(mealTimings.lunch_start), end: toMin(mealTimings.lunch_end) },
    { name: 'dinner', start: toMin(mealTimings.dinner_start), end: toMin(mealTimings.dinner_end) },
  ];

  // 1. Check if current time is within any meal's active range
  for (const meal of meals) {
    if (meal.start <= meal.end) {
      // Normal range (e.g., 07:00 - 09:00)
      if (currentMinutes >= meal.start && currentMinutes < meal.end) return meal.name;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      if (currentMinutes >= meal.start || currentMinutes < meal.end) return meal.name;
    }
  }

  // 2. Not in any meal — find next upcoming meal
  const sortedMeals = [...meals].sort((a, b) => a.start - b.start);
  for (const meal of sortedMeals) {
    if (meal.start > currentMinutes) return meal.name;
  }

  // 3. Past all meals today — return first meal of next day
  return sortedMeals[0].name;
}

export default function MealStatusPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMeal, setFilterMeal] = useState('any');
  const [filterGender, setFilterGender] = useState('all');
  const [filterMenuOption, setFilterMenuOption] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(getToday());
  const [expandedMembers, setExpandedMembers] = useState(new Set());
  const [mealTimings, setMealTimings] = useState(null);
  const [activeMeal, setActiveMeal] = useState(null);
  const mealTimingsRef = useRef(null);
  const [manualConfirmModal, setManualConfirmModal] = useState(null);
  const [menuOptions, setMenuOptions] = useState([]);
  const [selectedMenuOption, setSelectedMenuOption] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [exportModal, setExportModal] = useState({ open: false });
  const [selectedColumns, setSelectedColumns] = useState({
    member: true,
    type: true,
    department: true,
    breakfast: true,
    lunch: true,
    dinner: true
  });

  const isSingleDay = dates.length <= 1;

  // Fetch meal timings from organization settings
  useEffect(() => {
    const fetchTimings = async () => {
      try {
        const res = await api.get(`/api/organization?t=${Date.now()}`);
        if (res.ok) {
          const text = await res.text();
          const data = text ? JSON.parse(text) : {};
          if (data.organization) {
            const s = data.organization.settings || {};
            const timings = {
              breakfast_start: s.breakfast_start || '07:00',
              breakfast_end: s.breakfast_end || '09:00',
              lunch_start: s.lunch_start || '12:00',
              lunch_end: s.lunch_end || '14:00',
              dinner_start: s.dinner_start || '19:00',
              dinner_end: s.dinner_end || '21:00',
            };
            mealTimingsRef.current = timings;
            setMealTimings(timings);
            setActiveMeal(getActiveMeal(timings));
          }
        }
      } catch (err) {
        console.error('Failed to fetch meal timings:', err);
      }
    };
    fetchTimings();

    // Update active meal every minute using ref (always has latest timings)
    const interval = setInterval(() => {
      if (mealTimingsRef.current) {
        setActiveMeal(getActiveMeal(mealTimingsRef.current));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchMealStatus = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching + force no-store
      const res = await api.get(
        `/api/meal-status?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
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

  const handleOpenManualConfirm = async (member, date, mealType) => {
    // Fetch available menu options for this date and meal type
    try {
      const res = await api.get(`/api/menu-options?date=${date}&meal_type=${mealType}`);
      const data = await res.json();
      if (res.ok) {
        setMenuOptions(data.options || []);
      } else {
        setMenuOptions([]);
      }
    } catch (err) {
      setMenuOptions([]);
    }

    setManualConfirmModal({
      member,
      date,
      mealType,
    });
    setSelectedMenuOption('');
  };

  const handleConfirmMeal = async () => {
    if (!manualConfirmModal) return;

    const { member, date, mealType } = manualConfirmModal;

    setConfirming(true);
    try {
      const res = await api.post('/api/meal-status/manual-confirm', {
        member_id: member.id,
        member_type: member.member_type,
        date,
        meal_type: mealType,
        menu_option_id: selectedMenuOption || null,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Meal confirmed for ${member.name}`);
        setManualConfirmModal(null);
        setSelectedMenuOption('');

        // Refresh meal status
        if (datePreset === 'custom') {
          fetchMealStatus(customDate, customDate);
        } else {
          const { startDate, endDate } = getDateRange(datePreset);
          fetchMealStatus(startDate, endDate);
        }
      } else {
        toast.error(data.error || 'Failed to confirm meal');
      }
    } catch (err) {
      toast.error('Failed to confirm meal');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (datePreset === 'custom') {
      fetchMealStatus(customDate, customDate);
    } else {
      const { startDate, endDate } = getDateRange(datePreset);
      fetchMealStatus(startDate, endDate);
    }
  }, [datePreset, customDate, fetchMealStatus]);

  // Auto-refresh meal status every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (datePreset === 'custom') {
        fetchMealStatus(customDate, customDate);
      } else {
        const { startDate, endDate } = getDateRange(datePreset);
        fetchMealStatus(startDate, endDate);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
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

  // Get unique menu options from all members
  const uniqueMenuOptions = React.useMemo(() => {
    const options = new Set();
    members.forEach((m) => {
      m.days.forEach((day) => {
        if (day.breakfast?.menuOption) options.add(day.breakfast.menuOption);
        if (day.lunch?.menuOption) options.add(day.lunch.menuOption);
        if (day.dinner?.menuOption) options.add(day.dinner.menuOption);
      });
    });
    return Array.from(options).sort();
  }, [members]);

  // Filter and sort
  const filteredMembers = members
    .filter((m) => {
      if (filterType !== 'all' && m.member_type !== filterType) return false;
      if (filterGender !== 'all' && m.gender !== filterGender) return false;

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

      // Filter by menu option
      if (filterMenuOption !== 'all' && m.days.length > 0) {
        const latest = m.days[0];
        const hasMenuOption = (meal) => meal.menuOption === filterMenuOption;
        const meals = filterMeal === 'any' ? ['breakfast', 'lunch', 'dinner'] : [filterMeal];
        if (!meals.some(mealType => hasMenuOption(latest[mealType]))) return false;
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

  // Toggle column visibility
  const toggleColumn = (column) => {
    setSelectedColumns(prev => {
      const newState = { ...prev, [column]: !prev[column] };

      // Ensure at least one column is selected
      const hasSelection = Object.values(newState).some(v => v);
      if (!hasSelection) {
        toast.error('At least one column must be selected');
        return prev;
      }

      return newState;
    });
  };

  // Generate PDF with selected columns
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Use filtered members
    const membersToExport = filteredMembers;

    if (membersToExport.length === 0) {
      toast.error('No members to export. Please adjust your filters.');
      return;
    }

    // Build column definitions based on selected columns
    const columnMap = {
      member: { header: 'Member', dataKey: 'member' },
      type: { header: 'Type', dataKey: 'type' },
      department: { header: 'Department', dataKey: 'department' },
      breakfast: { header: 'Breakfast', dataKey: 'breakfast' },
      lunch: { header: 'Lunch', dataKey: 'lunch' },
      dinner: { header: 'Dinner', dataKey: 'dinner' }
    };

    const columns = Object.entries(selectedColumns)
      .filter(([key, selected]) => selected)
      .map(([key]) => columnMap[key]);

    if (columns.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }

    // PDF Header with green background
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MEAL STATUS REPORT', pageWidth / 2, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(8);
    const filterText = `Date: ${datePreset === 'custom' ? customDate : datePreset.toUpperCase()} | Type: ${filterType} | Status: ${filterStatus} | Meal: ${filterMeal}`;
    doc.text(filterText, pageWidth / 2, 29, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    // Prepare table data - for single day view
    const tableData = membersToExport.map((member) => {
      const row = {};
      if (selectedColumns.member) row.member = member.name || member.full_name || '-';
      if (selectedColumns.type) row.type = MEMBER_TYPE_LABELS[member.member_type] || '-';
      if (selectedColumns.department) row.department = member.department || '-';

      // Get meal status from first day
      const day = member.days && member.days[0];
      if (day) {
        if (selectedColumns.breakfast) {
          const b = day.breakfast;
          row.breakfast = b.status === 'collected' ? `Confirmed ${b.menu_option || ''}`.trim() :
                        b.status === 'skipped' ? 'Skipped' :
                        b.status === 'missed' ? 'Missed' : 'Pending';
        }
        if (selectedColumns.lunch) {
          const l = day.lunch;
          row.lunch = l.status === 'collected' ? `Confirmed ${l.menu_option || ''}`.trim() :
                     l.status === 'skipped' ? 'Skipped' :
                     l.status === 'missed' ? 'Missed' : 'Pending';
        }
        if (selectedColumns.dinner) {
          const d = day.dinner;
          row.dinner = d.status === 'collected' ? `Confirmed ${d.menu_option || ''}`.trim() :
                      d.status === 'skipped' ? 'Skipped' :
                      d.status === 'missed' ? 'Missed' : 'Pending';
        }
      }

      return row;
    });

    // Generate table using autoTable plugin
    autoTable(doc, {
      startY: 40,
      head: [columns.map(col => col.header)],
      body: tableData.map(row => columns.map(col => row[col.dataKey] || '-')),
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      margin: { left: 10, right: 10 },
    });

    // Footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        'Cafeteria Management System',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 10,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    // Save PDF with date in filename
    const filename = `Meal_Status_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success(`Exported ${membersToExport.length} members to PDF`);

    // Close modal
    setExportModal({ open: false });
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meal Status</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Track daily meal attendance for all members</p>
          </div>
          <div className="flex items-center gap-2">
            {datePreset === 'today' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live - Auto-refresh: 30s
              </span>
            )}
            <button
              onClick={() => setExportModal({ open: true })}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              title="Export to PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Export PDF
            </button>
            <button
              onClick={() => {
                const { startDate, endDate } = getDateRange(datePreset);
                fetchMealStatus(startDate, endDate);
                toast.success('Refreshed');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              title="Refresh meal status data"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
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

          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          {/* Menu Option Filter */}
          <select
            value={filterMenuOption}
            onChange={(e) => setFilterMenuOption(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white whitespace-nowrap"
          >
            <option value="all">All Dishes</option>
            {uniqueMenuOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
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
        <SingleDayView
          members={filteredMembers}
          activeMeal={activeMeal}
          dates={dates}
          onManualConfirm={handleOpenManualConfirm}
        />
      ) : (
        <RangeView
          members={filteredMembers}
          expandedMembers={expandedMembers}
          toggleMember={toggleMember}
          activeMeal={activeMeal}
          dates={dates}
          onManualConfirm={handleOpenManualConfirm}
        />
      )}

      {/* Manual Confirmation Modal */}
      {manualConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setManualConfirmModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manually Confirm Meal
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Member:</span> {manualConfirmModal.member.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span> {formatDate(manualConfirmModal.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Meal:</span> {manualConfirmModal.mealType.charAt(0).toUpperCase() + manualConfirmModal.mealType.slice(1)}
                </p>
              </div>

              {menuOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Menu Option (Optional)
                  </label>
                  <select
                    value={selectedMenuOption}
                    onChange={(e) => setSelectedMenuOption(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">None</option>
                    {menuOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.option_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setManualConfirmModal(null)}
                  disabled={confirming}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMeal}
                  disabled={confirming}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {confirming ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming...
                    </>
                  ) : (
                    'Confirm Meal'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      {exportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setExportModal({ open: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Export Meal Status to PDF
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Select which columns to include in the PDF export:
            </p>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg mb-4">
              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.member}
                  onChange={() => toggleColumn('member')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Member Name</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.type}
                  onChange={() => toggleColumn('type')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Type</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.department}
                  onChange={() => toggleColumn('department')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Department</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.breakfast}
                  onChange={() => toggleColumn('breakfast')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Breakfast</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.lunch}
                  onChange={() => toggleColumn('lunch')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Lunch</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedColumns.dinner}
                  onChange={() => toggleColumn('dinner')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Dinner</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Exporting {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} based on active filters
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setExportModal({ open: false })}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePDF}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================== Single Day Table View ====================== */
function SingleDayView({ members, activeMeal, dates, onManualConfirm }) {
  const mealHeaderClass = (meal) =>
    `text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
      activeMeal === meal
        ? 'bg-green-200 text-green-900 border-b-2 border-green-500'
        : 'text-gray-500'
    }`;

  const mealCellClass = (meal) =>
    `px-4 py-3 text-center ${activeMeal === meal ? 'bg-green-100' : ''}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
              <th className={mealHeaderClass('breakfast')}>Breakfast</th>
              <th className={mealHeaderClass('lunch')}>Lunch</th>
              <th className={mealHeaderClass('dinner')}>Dinner</th>
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
                  <td className={mealCellClass('breakfast')}>
                    <StatusBadge
                      meal={day.breakfast}
                      member={member}
                      date={day.date}
                      mealType="breakfast"
                      onManualConfirm={onManualConfirm}
                    />
                  </td>
                  <td className={mealCellClass('lunch')}>
                    <StatusBadge
                      meal={day.lunch}
                      member={member}
                      date={day.date}
                      mealType="lunch"
                      onManualConfirm={onManualConfirm}
                    />
                  </td>
                  <td className={mealCellClass('dinner')}>
                    <StatusBadge
                      meal={day.dinner}
                      member={member}
                      date={day.date}
                      mealType="dinner"
                      onManualConfirm={onManualConfirm}
                    />
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
function RangeView({ members, expandedMembers, toggleMember, activeMeal, dates, onManualConfirm }) {
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
                  {summary.pending > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {summary.pending}
                    </span>
                  )}
                  {summary.skipped > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {summary.skipped}
                    </span>
                  )}
                  {summary.missed > 0 && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      {summary.missed}
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
                  <span className={`text-xs font-semibold uppercase tracking-wider text-center rounded px-2 py-1 ${activeMeal === 'breakfast' ? 'bg-green-200 text-green-900' : 'text-gray-500'}`}>Breakfast</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider text-center rounded px-2 py-1 ${activeMeal === 'lunch' ? 'bg-green-200 text-green-900' : 'text-gray-500'}`}>Lunch</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider text-center rounded px-2 py-1 ${activeMeal === 'dinner' ? 'bg-green-200 text-green-900' : 'text-gray-500'}`}>Dinner</span>
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
                    <div className={`text-center ${activeMeal === 'breakfast' ? 'bg-green-100 rounded' : ''}`}>
                      <StatusBadge
                        meal={day.breakfast}
                        compact
                        member={member}
                        date={day.date}
                        mealType="breakfast"
                        onManualConfirm={onManualConfirm}
                      />
                    </div>
                    <div className={`text-center ${activeMeal === 'lunch' ? 'bg-green-100 rounded' : ''}`}>
                      <StatusBadge
                        meal={day.lunch}
                        compact
                        member={member}
                        date={day.date}
                        mealType="lunch"
                        onManualConfirm={onManualConfirm}
                      />
                    </div>
                    <div className={`text-center ${activeMeal === 'dinner' ? 'bg-green-100 rounded' : ''}`}>
                      <StatusBadge
                        meal={day.dinner}
                        compact
                        member={member}
                        date={day.date}
                        mealType="dinner"
                        onManualConfirm={onManualConfirm}
                      />
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
function StatusBadge({ meal, compact = false, member, date, mealType, onManualConfirm }) {
  if (!meal) return null;

  const renderBadgeContent = () => {
    switch (meal.status) {
      case 'collected':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-green-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {meal.time ? formatTime(meal.time, 'h:mm a') : 'Collected'}
              </span>
              {meal.menuOption && (
                <span className={`text-gray-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                  {meal.menuOption}
                </span>
              )}
            </div>
          </>
        );

      case 'skipped':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-red-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Skipped</span>
              {meal.menuOption && (
                <span className={`text-gray-500 line-through ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                  {meal.menuOption}
                </span>
              )}
            </div>
          </>
        );

      case 'pending':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-green-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Confirmed</span>
              {meal.menuOption && (
                <span className={`text-gray-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                  {meal.menuOption}
                </span>
              )}
            </div>
          </>
        );

      case 'missed':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-red-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Missed</span>
              {meal.menuOption && (
                <span className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                  {meal.menuOption}
                </span>
              )}
            </div>
          </>
        );

      case 'not_selected':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-gray-200 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <span className={`font-medium text-gray-500 ${compact ? 'text-[11px]' : 'text-xs'}`}>Not Selected</span>
              {onManualConfirm && member && date && mealType && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualConfirm(member, date, mealType);
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              )}
            </div>
          </>
        );

      case 'cancelled':
        return (
          <>
            <span className={`flex items-center justify-center rounded-full bg-gray-100 ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>Cancelled</span>
              {meal.menuOption && (
                <span className={`text-gray-500 line-through ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                  {meal.menuOption}
                </span>
              )}
            </div>
          </>
        );

      case 'not_in_package':
        return <span className={compact ? 'text-base' : 'text-lg'}>&#10060;</span>;

      default:
        return <span className="text-xs text-gray-400">-</span>;
    }
  };

  const statusColor =
    meal.status === 'collected' || meal.status === 'pending' ? 'text-green-700' :
    meal.status === 'skipped' || meal.status === 'missed' ? 'text-red-600' :
    meal.status === 'cancelled' || meal.status === 'not_selected' ? 'text-gray-400' : '';

  return (
    <span className={`inline-flex items-center gap-1.5 ${statusColor}`}>
      {renderBadgeContent()}
    </span>
  );
}

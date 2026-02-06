'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO, startOfDay } from 'date-fns';

/**
 * PackageCalendar - Interactive calendar for meal package management
 *
 * Props:
 * - startDate: string (YYYY-MM-DD) - Package start date
 * - endDate: string (YYYY-MM-DD) - Package end date
 * - disabledDays: string[] - Array of disabled dates (YYYY-MM-DD format) - legacy support
 * - disabledMeals: object - { [date]: { breakfast: bool, lunch: bool, dinner: bool } } - per-meal disabling
 * - onToggleDay: (date: string) => void - Callback when a day is toggled (legacy)
 * - onToggleMeal: (date: string, meal: string) => void - Callback when a specific meal is toggled
 * - breakfastEnabled: boolean - Whether breakfast is enabled
 * - lunchEnabled: boolean - Whether lunch is enabled
 * - dinnerEnabled: boolean - Whether dinner is enabled
 * - consumedDates: { breakfast: string[], lunch: string[], dinner: string[] } - Dates where meals were consumed
 * - readOnly: boolean - If true, calendar is view-only
 * - showMealIndicators: boolean - Show meal type indicators on each day
 */
export default function PackageCalendar({
  startDate,
  endDate,
  disabledDays = [],
  disabledMeals = {},
  onToggleDay,
  onToggleMeal,
  breakfastEnabled = false,
  lunchEnabled = false,
  dinnerEnabled = false,
  consumedDates = { breakfast: [], lunch: [], dinner: [] },
  readOnly = false,
  showMealIndicators = true,
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      return startOfMonth(parseISO(startDate));
    }
    return startOfMonth(new Date());
  });

  const parsedStartDate = startDate ? parseISO(startDate) : null;
  const parsedEndDate = endDate ? parseISO(endDate) : null;

  // Generate days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad the start with days from previous month to align with week
    const startDay = monthStart.getDay(); // 0 = Sunday
    const paddingStart = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - (i + 1));
      paddingStart.push({ date, isCurrentMonth: false });
    }

    // Pad the end with days from next month
    const endDay = monthEnd.getDay();
    const paddingEnd = [];
    for (let i = 1; i < 7 - endDay; i++) {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i);
      paddingEnd.push({ date, isCurrentMonth: false });
    }

    return [
      ...paddingStart,
      ...days.map(date => ({ date, isCurrentMonth: true })),
      ...paddingEnd,
    ];
  }, [currentMonth]);

  // Check if a date is within the package range
  const isInRange = (date) => {
    if (!parsedStartDate || !parsedEndDate) return false;
    return isWithinInterval(startOfDay(date), {
      start: startOfDay(parsedStartDate),
      end: startOfDay(parsedEndDate),
    });
  };

  // Check if a date is fully disabled (all meals disabled)
  const isDisabled = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Legacy support for disabledDays array
    if (disabledDays.includes(dateStr)) return true;
    // Check if all enabled meals are disabled for this date
    const mealStatus = disabledMeals[dateStr];
    if (!mealStatus) return false;
    const enabledMeals = [];
    if (breakfastEnabled) enabledMeals.push('breakfast');
    if (lunchEnabled) enabledMeals.push('lunch');
    if (dinnerEnabled) enabledMeals.push('dinner');
    return enabledMeals.every(meal => mealStatus[meal] === true);
  };

  // Check if a specific meal is disabled for a date
  const isMealDisabled = (date, meal) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Check legacy disabledDays array first
    if (disabledDays.includes(dateStr)) return true;
    // Check specific meal in disabledMeals object
    if (!disabledMeals || !disabledMeals[dateStr]) return false;
    return disabledMeals[dateStr][meal] === true;
  };

  // Handle meal click
  const handleMealClick = (e, date, meal) => {
    e.stopPropagation();
    if (readOnly) return;
    if (!isInRange(date)) return;
    if (onToggleMeal) {
      const dateStr = format(date, 'yyyy-MM-dd');
      onToggleMeal(dateStr, meal);
    }
  };

  // Check if meals were consumed on a date
  const getConsumedMeals = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      breakfast: consumedDates.breakfast?.includes(dateStr) || false,
      lunch: consumedDates.lunch?.includes(dateStr) || false,
      dinner: consumedDates.dinner?.includes(dateStr) || false,
    };
  };

  // Handle day click for toggling
  const handleDayClick = (date) => {
    if (readOnly) return;
    if (!isInRange(date)) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    if (onToggleDay) {
      onToggleDay(dateStr);
    }
  };

  // Get day cell styling
  const getDayClasses = (date, isCurrentMonth) => {
    const inRange = isInRange(date);
    const disabled = isDisabled(date);
    const consumed = getConsumedMeals(date);
    const hasConsumed = consumed.breakfast || consumed.lunch || consumed.dinner;
    const today = isSameDay(date, new Date());

    let classes = 'relative h-10 sm:h-12 flex flex-col items-center justify-center transition-all ';

    if (!isCurrentMonth) {
      classes += 'text-gray-300 ';
    } else if (!inRange) {
      classes += 'text-gray-400 ';
    } else if (disabled) {
      classes += 'cursor-pointer ';
    } else if (hasConsumed) {
      classes += 'cursor-pointer ';
    } else {
      classes += 'cursor-pointer ';
    }

    if (today && isCurrentMonth) {
      classes += 'font-bold ';
    }

    return classes;
  };

  // Get the inner circle styling for the date number
  const getDateCircleClasses = (date, isCurrentMonth) => {
    const inRange = isInRange(date);
    const disabled = isDisabled(date);
    const consumed = getConsumedMeals(date);
    const hasConsumed = consumed.breakfast || consumed.lunch || consumed.dinner;
    const today = isSameDay(date, new Date());

    let classes = 'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-all ';

    if (!isCurrentMonth) {
      classes += 'text-gray-300 ';
    } else if (!inRange) {
      classes += 'text-gray-400 ';
    } else if (disabled) {
      classes += 'bg-red-100 text-red-500 line-through hover:bg-red-200 ';
    } else if (hasConsumed) {
      classes += 'bg-green-500 text-white ';
    } else {
      classes += 'bg-primary-500 text-white hover:bg-primary-600 ';
    }

    if (today && isCurrentMonth && inRange && !disabled && !hasConsumed) {
      classes += 'ring-2 ring-offset-1 ring-primary-300 ';
    }

    return classes;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Calculate meal counts
  const mealCounts = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) {
      return { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
    }

    const allDays = eachDayOfInterval({ start: parsedStartDate, end: parsedEndDate });
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isDisabledDay = disabledDays.includes(dateStr);
      const mealStatus = disabledMeals[dateStr] || {};

      if (!isDisabledDay) {
        if (breakfastEnabled && !mealStatus.breakfast) breakfastCount++;
        if (lunchEnabled && !mealStatus.lunch) lunchCount++;
        if (dinnerEnabled && !mealStatus.dinner) dinnerCount++;
      }
    });

    return {
      breakfast: breakfastCount,
      lunch: lunchCount,
      dinner: dinnerCount,
      total: breakfastCount + lunchCount + dinnerCount,
    };
  }, [parsedStartDate, parsedEndDate, disabledDays, disabledMeals, breakfastEnabled, lunchEnabled, dinnerEnabled]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend - At the top */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-3 text-xs justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Consumed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-gray-600">Disabled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
            <span className="text-gray-600">Out of range</span>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 p-1.5 bg-gray-100">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const inRange = isInRange(date);
          const consumed = getConsumedMeals(date);
          const today = isSameDay(date, new Date());

          return (
            <div
              key={index}
              className={`
                relative min-h-[56px] p-1 rounded-lg bg-white
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${inRange && isCurrentMonth ? 'shadow-sm' : ''}
                ${today && isCurrentMonth ? 'ring-2 ring-primary-400' : ''}
              `}
            >
              {/* Date number - clickable to toggle whole day */}
              <div
                onClick={() => !readOnly && inRange && isCurrentMonth && handleDayClick(date)}
                className={`
                  text-center text-sm font-semibold mb-1
                  ${!isCurrentMonth ? 'text-gray-300'
                    : !inRange ? 'text-gray-400'
                    : today ? 'text-primary-600'
                    : 'text-gray-700'}
                  ${!readOnly && inRange && isCurrentMonth ? 'cursor-pointer hover:underline' : ''}
                `}
              >
                {format(date, 'd')}
              </div>

              {/* Meal indicators - Large clickable buttons */}
              {showMealIndicators && isCurrentMonth && inRange && (
                <div className="flex justify-center gap-1">
                  {breakfastEnabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMealClick(e, date, 'breakfast');
                      }}
                      className={`
                        w-4 h-4 rounded-full transition-all duration-150
                        hover:scale-125 active:scale-110 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-offset-1
                        ${consumed.breakfast
                          ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300'
                          : isMealDisabled(date, 'breakfast')
                          ? 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-200'
                          : 'bg-amber-400 hover:bg-amber-500 focus:ring-amber-300'}
                      `}
                      title={`Breakfast - ${consumed.breakfast ? 'Consumed' : isMealDisabled(date, 'breakfast') ? 'DISABLED - Click to enable' : 'Available - Click to disable'}`}
                    />
                  )}
                  {lunchEnabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMealClick(e, date, 'lunch');
                      }}
                      className={`
                        w-4 h-4 rounded-full transition-all duration-150
                        hover:scale-125 active:scale-110 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-offset-1
                        ${consumed.lunch
                          ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300'
                          : isMealDisabled(date, 'lunch')
                          ? 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-200'
                          : 'bg-orange-400 hover:bg-orange-500 focus:ring-orange-300'}
                      `}
                      title={`Lunch - ${consumed.lunch ? 'Consumed' : isMealDisabled(date, 'lunch') ? 'DISABLED - Click to enable' : 'Available - Click to disable'}`}
                    />
                  )}
                  {dinnerEnabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMealClick(e, date, 'dinner');
                      }}
                      className={`
                        w-4 h-4 rounded-full transition-all duration-150
                        hover:scale-125 active:scale-110 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-offset-1
                        ${consumed.dinner
                          ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300'
                          : isMealDisabled(date, 'dinner')
                          ? 'bg-gray-300 hover:bg-gray-400 focus:ring-gray-200'
                          : 'bg-indigo-400 hover:bg-indigo-500 focus:ring-indigo-300'}
                      `}
                      title={`Dinner - ${consumed.dinner ? 'Consumed' : isMealDisabled(date, 'dinner') ? 'DISABLED - Click to enable' : 'Available - Click to disable'}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Meal counts summary */}
      {(parsedStartDate && parsedEndDate) && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Meal Counts:</div>
          <div className="flex flex-wrap gap-3">
            {breakfastEnabled && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-gray-600 text-xs">Breakfast: <strong>{mealCounts.breakfast}</strong></span>
              </div>
            )}
            {lunchEnabled && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-gray-600 text-xs">Lunch: <strong>{mealCounts.lunch}</strong></span>
              </div>
            )}
            {dinnerEnabled && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-gray-600 text-xs">Dinner: <strong>{mealCounts.dinner}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-gray-700 text-xs">Total: <strong className="text-primary-600">{mealCounts.total}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions for partial_full_time */}
      {!readOnly && onToggleDay && (
        <div className="p-2 border-t border-gray-200 bg-blue-50">
          <p className="text-xs text-blue-700">
            Click on any day within the package period to enable/disable it.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate meal counts based on date range and disabled meals
 */
export function calculateMealCounts(startDate, endDate, disabledDays = [], breakfastEnabled, lunchEnabled, dinnerEnabled, disabledMeals = {}) {
  if (!startDate || !endDate) {
    return { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
  }

  const parsedStart = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const parsedEnd = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const allDays = eachDayOfInterval({ start: parsedStart, end: parsedEnd });
  let breakfastCount = 0;
  let lunchCount = 0;
  let dinnerCount = 0;

  allDays.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isDisabledDay = disabledDays.includes(dateStr);
    const mealStatus = disabledMeals[dateStr] || {};

    if (!isDisabledDay) {
      if (breakfastEnabled && !mealStatus.breakfast) breakfastCount++;
      if (lunchEnabled && !mealStatus.lunch) lunchCount++;
      if (dinnerEnabled && !mealStatus.dinner) dinnerCount++;
    }
  });

  return {
    breakfast: breakfastCount,
    lunch: lunchCount,
    dinner: dinnerCount,
    total: breakfastCount + lunchCount + dinnerCount,
  };
}

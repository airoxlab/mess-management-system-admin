'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api-client';

export default function MenuOptionsPage() {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'week'
  const [weekDates, setWeekDates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [editingOption, setEditingOption] = useState(null);

  // For bulk add
  const [bulkAddData, setBulkAddData] = useState({
    meal_type: 'breakfast',
    date: '',
  });
  const [bulkOptions, setBulkOptions] = useState([
    { option_name: '', option_description: '', is_available: true, sort_order: 0 }
  ]);

  // For single edit
  const [formData, setFormData] = useState({
    meal_type: 'breakfast',
    date: '',
    option_name: '',
    option_description: '',
    is_available: true,
    sort_order: 0,
  });

  const MEAL_TYPES = [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'lunch', label: 'Lunch', icon: '🍛', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ];

  useEffect(() => {
    if (viewMode === 'week') {
      generateWeekDates(selectedDate);
    }
    fetchOptions();
  }, [selectedDate, viewMode]);

  const generateWeekDates = (date) => {
    const current = new Date(date);
    const dates = [];

    // Generate 7 days starting from the selected date
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    setWeekDates(dates);
  };

  const fetchOptions = async () => {
    setLoading(true);
    try {
      let url = '/api/menu-options';
      if (viewMode === 'single') {
        url += `?date=${selectedDate}`;
      } else {
        const startDate = weekDates[0];
        const endDate = weekDates[6];
        if (startDate && endDate) {
          url += `?start_date=${startDate}&end_date=${endDate}`;
        }
      }

      const response = await api.get(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setOptions(data.options || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch menu options');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOptions = async (e) => {
    e.preventDefault();

    // Validate that at least one option has a name
    const validOptions = bulkOptions.filter(opt => opt.option_name.trim());
    if (validOptions.length === 0) {
      toast.error('Please add at least one menu option');
      return;
    }

    try {
      // Create all options
      const promises = validOptions.map((opt, index) =>
        api.post('/api/menu-options', {
          meal_type: bulkAddData.meal_type,
          date: bulkAddData.date,
          option_name: opt.option_name.trim(),
          option_description: opt.option_description || null,
          is_available: opt.is_available,
          sort_order: opt.sort_order || index,
        })
      );

      const results = await Promise.all(promises);

      // Check if any failed
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to add ${failed.length} option(s)`);
      }

      toast.success(`${validOptions.length} menu option(s) added successfully`);
      setShowAddModal(false);
      resetBulkForm();
      fetchOptions();
    } catch (error) {
      toast.error(error.message || 'Failed to add menu options');
    }
  };

  const addBulkOptionRow = () => {
    setBulkOptions([...bulkOptions, { option_name: '', option_description: '', is_available: true, sort_order: bulkOptions.length }]);
  };

  const removeBulkOptionRow = (index) => {
    if (bulkOptions.length === 1) return; // Keep at least one
    const newOptions = bulkOptions.filter((_, i) => i !== index);
    setBulkOptions(newOptions);
  };

  const updateBulkOption = (index, field, value) => {
    const newOptions = [...bulkOptions];
    newOptions[index][field] = value;
    setBulkOptions(newOptions);
  };

  const handleUpdateOption = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/api/menu-options/${editingOption.id}`, formData);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success('Menu option updated successfully');
      setShowEditModal(false);
      setEditingOption(null);
      resetForm();
      fetchOptions();
    } catch (error) {
      toast.error(error.message || 'Failed to update menu option');
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (!confirm('Are you sure you want to delete this menu option?')) return;

    try {
      const response = await api.delete(`/api/menu-options/${optionId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Menu option deleted successfully');
      fetchOptions();
    } catch (error) {
      toast.error(error.message || 'Failed to delete menu option');
    }
  };

  const openAddModal = (mealType, date = selectedDate) => {
    setBulkAddData({
      meal_type: mealType,
      date: date,
    });
    setBulkOptions([
      { option_name: '', option_description: '', is_available: true, sort_order: 0 }
    ]);
    setShowAddModal(true);
  };

  const openEditModal = (option) => {
    setEditingOption(option);
    setFormData({
      meal_type: option.meal_type,
      date: option.date,
      option_name: option.option_name,
      option_description: option.option_description || '',
      is_available: option.is_available,
      sort_order: option.sort_order,
    });
    setShowEditModal(true);
  };

  const resetBulkForm = () => {
    setBulkAddData({
      meal_type: 'breakfast',
      date: selectedDate,
    });
    setBulkOptions([
      { option_name: '', option_description: '', is_available: true, sort_order: 0 }
    ]);
  };

  const resetForm = () => {
    setFormData({
      meal_type: 'breakfast',
      date: selectedDate,
      option_name: '',
      option_description: '',
      is_available: true,
      sort_order: 0,
    });
  };

  const getOptionsForMealAndDate = (mealType, date) => {
    return options.filter(opt => opt.meal_type === mealType && opt.date === date);
  };

  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    const days = viewMode === 'week' ? 7 : 1;
    current.setDate(current.getDate() + (direction === 'next' ? days : -days));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Menu Options</h1>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {showPreview ? 'Hide' : 'Show'} Member Preview
            </button>
          </div>
          <p className="text-gray-600">Create daily meal options for members to choose from</p>
        </div>

        {/* Date Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'single'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Single Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week View
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Today
                </button>
              </div>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Week View Dates */}
          {viewMode === 'week' && weekDates.length > 0 && (
            <div className="mt-4 grid grid-cols-7 gap-2">
              {weekDates.map((date, idx) => {
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div
                    key={date}
                    className={`text-center p-2 rounded-lg border ${
                      date === selectedDate
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <div className="text-xs font-medium">{dayName}</div>
                    <div className="text-sm">{dateObj.getDate()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading menu options...</p>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Single Day View */}
            {viewMode === 'single' && (
              <div className="space-y-6">
                {MEAL_TYPES.map((meal) => (
                  <MealSection
                    key={meal.value}
                    meal={meal}
                    date={selectedDate}
                    options={getOptionsForMealAndDate(meal.value, selectedDate)}
                    onAdd={() => openAddModal(meal.value)}
                    onEdit={openEditModal}
                    onDelete={handleDeleteOption}
                  />
                ))}
              </div>
            )}

            {/* Week View */}
            {viewMode === 'week' && weekDates.length > 0 && (
              <div className="space-y-6">
                {MEAL_TYPES.map((meal) => (
                  <div key={meal.value} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 px-3 py-1 rounded-lg ${meal.color}`}>
                        <span>{meal.icon}</span>
                        {meal.label}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {weekDates.map((date) => {
                        const dateOptions = getOptionsForMealAndDate(meal.value, date);
                        return (
                          <div key={date} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{formatDate(date)}</span>
                              <button
                                onClick={() => openAddModal(meal.value, date)}
                                className="text-primary-600 hover:text-primary-700"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                            {dateOptions.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No options</p>
                            ) : (
                              <ul className="space-y-1">
                                {dateOptions.map((opt) => (
                                  <li key={opt.id} className="text-xs text-gray-600 truncate" title={opt.option_name}>
                                    • {opt.option_name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Member Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Member View Preview</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mt-1">This is how members will see the menu options</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500">Date: {formatDate(selectedDate)}</p>
                </div>

                {MEAL_TYPES.map((meal) => {
                  const mealOptions = getOptionsForMealAndDate(meal.value, selectedDate).filter(opt => opt.is_available);
                  if (mealOptions.length === 0) return null;

                  return (
                    <div key={meal.value} className="border border-gray-200 rounded-lg p-4">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 mb-3 px-3 py-1 rounded-lg inline-flex ${meal.color}`}>
                        <span>{meal.icon}</span>
                        {meal.label}
                      </h3>

                      <div className="space-y-2">
                        {mealOptions.map((opt) => (
                          <div key={opt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <input type="radio" name={meal.value} className="mt-1" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{opt.option_name}</p>
                              {opt.option_description && (
                                <p className="text-sm text-gray-600 mt-1">{opt.option_description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add Modal (Bulk) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <h2 className="text-2xl font-bold text-gray-900">Add Menu Options</h2>
                <p className="text-sm text-gray-600 mt-1">Add one or multiple menu options at once</p>
              </div>

              <form onSubmit={handleAddOptions} className="p-6 space-y-6">
                {/* Common fields */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type *</label>
                    <select
                      value={bulkAddData.meal_type}
                      onChange={(e) => setBulkAddData({ ...bulkAddData, meal_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      {MEAL_TYPES.map((meal) => (
                        <option key={meal.value} value={meal.value}>
                          {meal.icon} {meal.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <input
                      type="date"
                      value={bulkAddData.date}
                      onChange={(e) => setBulkAddData({ ...bulkAddData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Option entries */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Menu Options</h3>
                    <button
                      type="button"
                      onClick={addBulkOptionRow}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Another
                    </button>
                  </div>

                  {bulkOptions.map((option, index) => (
                    <div key={index} className="relative p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                      {bulkOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkOptionRow(index)}
                          className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Option {index + 1} Name *
                          </label>
                          <input
                            type="text"
                            value={option.option_name}
                            onChange={(e) => updateBulkOption(index, 'option_name', e.target.value)}
                            placeholder="e.g., Chicken Karahi"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={option.option_description}
                            onChange={(e) => updateBulkOption(index, 'option_description', e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={option.is_available}
                              onChange={(e) => updateBulkOption(index, 'is_available', e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">Available</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetBulkForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Add {bulkOptions.filter(o => o.option_name.trim()).length} Option(s)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal (Single) */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Menu Option</h2>
              </div>

              <form onSubmit={handleUpdateOption} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                  <select
                    value={formData.meal_type}
                    onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {MEAL_TYPES.map((meal) => (
                      <option key={meal.value} value={meal.value}>
                        {meal.icon} {meal.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Option Name *</label>
                  <input
                    type="text"
                    value={formData.option_name}
                    onChange={(e) => setFormData({ ...formData, option_name: e.target.value })}
                    placeholder="e.g., Chicken Karahi"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.option_description}
                    onChange={(e) => setFormData({ ...formData, option_description: e.target.value })}
                    placeholder="Brief description of the dish"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_available" className="text-sm text-gray-700">
                    Available for members to select
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingOption(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Update Option
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Meal Section Component (for single day view)
function MealSection({ meal, date, options, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold flex items-center gap-2 px-3 py-1 rounded-lg ${meal.color}`}>
          <span>{meal.icon}</span>
          {meal.label}
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Option
        </button>
      </div>

      {options.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No options added yet</p>
          <p className="text-xs mt-1">Click "Add Option" to create menu choices for this meal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((option) => (
            <div
              key={option.id}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{option.option_name}</h4>
                  {!option.is_available && (
                    <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Unavailable</span>
                  )}
                </div>
                {option.option_description && (
                  <p className="text-sm text-gray-600">{option.option_description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Sort order: {option.sort_order}</p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onEdit(option)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(option.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

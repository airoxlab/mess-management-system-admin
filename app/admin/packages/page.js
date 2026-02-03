'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';

const WEEKDAYS = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const MEMBER_TYPES = [
  { id: 'student', label: 'Student', apiEndpoint: '/api/student-members' },
  { id: 'faculty', label: 'Faculty', apiEndpoint: '/api/faculty-members' },
  { id: 'staff', label: 'Staff', apiEndpoint: '/api/staff-members' },
];

const initialFormData = {
  member_id: '',
  member_type: 'student',
  breakfast_enabled: false,
  breakfast_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  breakfast_meals_per_day: 1,
  lunch_enabled: false,
  lunch_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  lunch_meals_per_day: 1,
  dinner_enabled: false,
  dinner_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  dinner_meals_per_day: 1,
  price: '',
  is_active: true,
};

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, pkg: null });
  const [viewModal, setViewModal] = useState({ open: false, pkg: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState(initialFormData);
  const [selectedMember, setSelectedMember] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mealFilter, setMealFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadPackages();
    loadAllMembers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/member-packages');
      if (!response.ok) throw new Error('Failed to load packages');
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      setLoadingMembers(true);
      // Fetch all members regardless of status
      const [studentsRes, facultyRes, staffRes] = await Promise.all([
        fetch('/api/student-members'),
        fetch('/api/faculty-members'),
        fetch('/api/staff-members'),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : { members: [] };
      const facultyData = facultyRes.ok ? await facultyRes.json() : { members: [] };
      const staffData = staffRes.ok ? await staffRes.json() : { members: [] };

      const students = (studentsData.members || []).map(m => ({ ...m, member_type: 'student' }));
      const faculty = (facultyData.members || []).map(m => ({ ...m, member_type: 'faculty' }));
      const staff = (staffData.members || []).map(m => ({ ...m, member_type: 'staff' }));

      setAllMembers([...students, ...faculty, ...staff]);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Get member info by id and type
  const getMemberInfo = (memberId, memberType) => {
    return allMembers.find(m => m.id === memberId && m.member_type === memberType);
  };

  // Get member display name
  const getMemberDisplayName = (member) => {
    if (!member) return '-';
    const id = member.member_type === 'student' ? member.roll_number : member.employee_id;
    return `${member.full_name} (${id})`;
  };

  // Filter members based on type and search query
  const filteredMembers = allMembers.filter(m => {
    if (formData.member_type !== 'all' && m.member_type !== formData.member_type) return false;
    if (memberSearchQuery) {
      const query = memberSearchQuery.toLowerCase();
      const name = m.full_name?.toLowerCase() || '';
      const id = (m.roll_number || m.employee_id || '')?.toLowerCase();
      if (!name.includes(query) && !id.includes(query)) return false;
    }
    return true;
  });

  // Get current meal check-ins for selected member
  const getMemberMealCheckIns = (member) => {
    if (!member) return null;

    if (member.member_type === 'student' && member.preferred_meal_plan) {
      return member.preferred_meal_plan;
    }
    if (member.member_type === 'faculty' && member.preferred_meal_plan) {
      if (member.preferred_meal_plan === 'full_day') {
        return ['breakfast', 'lunch', 'dinner'];
      }
      return [member.preferred_meal_plan];
    }
    if (member.member_type === 'staff' && member.meal_timing_preference) {
      return member.meal_timing_preference;
    }

    return [];
  };

  const openAddModal = () => {
    setEditingPackage(null);
    setFormData(initialFormData);
    setSelectedMember(null);
    setMemberSearchQuery('');
    setShowMemberDropdown(false);
    setModalOpen(true);
  };

  const openEditModal = (pkg) => {
    setEditingPackage(pkg);
    const member = getMemberInfo(pkg.member_id, pkg.member_type);
    setSelectedMember(member);
    setFormData({
      member_id: pkg.member_id,
      member_type: pkg.member_type,
      breakfast_enabled: pkg.breakfast_enabled || false,
      breakfast_days: pkg.breakfast_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      breakfast_meals_per_day: pkg.breakfast_meals_per_day || 1,
      lunch_enabled: pkg.lunch_enabled || false,
      lunch_days: pkg.lunch_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      lunch_meals_per_day: pkg.lunch_meals_per_day || 1,
      dinner_enabled: pkg.dinner_enabled || false,
      dinner_days: pkg.dinner_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      dinner_meals_per_day: pkg.dinner_meals_per_day || 1,
      price: pkg.price || '',
      is_active: pkg.is_active,
    });
    setModalOpen(true);
  };

  const handleMemberSelect = (e) => {
    const memberId = e.target.value;
    if (!memberId) {
      setSelectedMember(null);
      setFormData(prev => ({ ...prev, member_id: '' }));
      return;
    }

    const member = allMembers.find(m => m.id === memberId);
    setSelectedMember(member);
    setFormData(prev => ({
      ...prev,
      member_id: memberId,
      member_type: member?.member_type || 'student',
    }));
  };

  const handleMemberTypeFilter = (type) => {
    setFormData(prev => ({
      ...prev,
      member_type: type,
      member_id: '',
    }));
    setSelectedMember(null);
    setMemberSearchQuery('');
    setShowMemberDropdown(false);
  };

  const handleDayToggle = (mealType, day) => {
    const daysKey = `${mealType}_days`;
    setFormData(prev => {
      const currentDays = prev[daysKey] || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return { ...prev, [daysKey]: newDays };
    });
  };

  const handleMealToggle = (mealType) => {
    const enabledKey = `${mealType}_enabled`;
    setFormData(prev => ({
      ...prev,
      [enabledKey]: !prev[enabledKey],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.member_id) {
      toast.error('Please select a member');
      return;
    }

    if (!formData.breakfast_enabled && !formData.lunch_enabled && !formData.dinner_enabled) {
      toast.error('Please enable at least one meal type');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid package price');
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        breakfast_meals_per_day: parseInt(formData.breakfast_meals_per_day) || 1,
        lunch_meals_per_day: parseInt(formData.lunch_meals_per_day) || 1,
        dinner_meals_per_day: parseInt(formData.dinner_meals_per_day) || 1,
      };

      const url = editingPackage
        ? `/api/member-packages/${editingPackage.id}`
        : '/api/member-packages';
      const method = editingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save package');
      }

      toast.success(editingPackage ? 'Package updated successfully!' : 'Package created successfully!');

      // Update state directly without reloading
      if (editingPackage) {
        setPackages(prev => prev.map(p =>
          p.id === editingPackage.id ? data.package : p
        ));
      } else {
        setPackages(prev => [data.package, ...prev]);
      }
      setModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.pkg) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/member-packages/${deleteModal.pkg.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete package');
      }

      toast.success('Package deleted successfully');
      // Update state directly without reloading
      setPackages(prev => prev.filter(p => p.id !== deleteModal.pkg.id));
      setDeleteModal({ open: false, pkg: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Calculate total meals per month
  const calculateTotalMeals = (pkg) => {
    let total = 0;
    if (pkg.breakfast_enabled) {
      total += parseInt(pkg.breakfast_meals_per_day) || 0;
    }
    if (pkg.lunch_enabled) {
      total += parseInt(pkg.lunch_meals_per_day) || 0;
    }
    if (pkg.dinner_enabled) {
      total += parseInt(pkg.dinner_meals_per_day) || 0;
    }
    return total;
  };

  // Get type badge color
  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-700';
      case 'faculty': return 'bg-purple-100 text-purple-700';
      case 'staff': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter packages
  const filteredPackages = packages.filter(pkg => {
    // Type filter
    if (typeFilter !== 'all' && pkg.member_type !== typeFilter) return false;

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      if (pkg.is_active !== isActive) return false;
    }

    // Meal type filter
    if (mealFilter !== 'all') {
      if (mealFilter === 'breakfast' && !pkg.breakfast_enabled) return false;
      if (mealFilter === 'lunch' && !pkg.lunch_enabled) return false;
      if (mealFilter === 'dinner' && !pkg.dinner_enabled) return false;
    }

    // Search query
    if (searchQuery) {
      const member = getMemberInfo(pkg.member_id, pkg.member_type);
      if (!member) return false;
      const query = searchQuery.toLowerCase();
      return (
        member.full_name?.toLowerCase().includes(query) ||
        member.roll_number?.toLowerCase().includes(query) ||
        member.employee_id?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Meal Packages</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage meal packages for members</p>
        </div>
        <Button onClick={openAddModal} className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Package
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Types</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Staff</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Meal Type Filter */}
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Meals</option>
            <option value="breakfast">Has Breakfast</option>
            <option value="lunch">Has Lunch</option>
            <option value="dinner">Has Dinner</option>
          </select>

          {/* Clear Filters */}
          {(typeFilter !== 'all' || statusFilter !== 'all' || mealFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setMealFilter('all');
                setSearchQuery('');
              }}
              className="w-full sm:w-auto px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={loadPackages} className="w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>

        {/* Results count */}
        <div className="text-xs text-gray-500 mt-2">
          Showing {filteredPackages.length} of {packages.length} packages
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Meals</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Schedule</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredPackages.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">No packages yet. Add your first package!</td></tr>
            ) : (
              filteredPackages.map((pkg, index) => {
                const member = getMemberInfo(pkg.member_id, pkg.member_type);
                const totalMeals = calculateTotalMeals(pkg);
                return (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">{member?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">
                        {member?.roll_number || member?.employee_id || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize ${getTypeBadgeColor(pkg.member_type)}`}>
                        {pkg.member_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-lg font-bold text-primary-600">{totalMeals}</span>
                      <span className="text-xs text-gray-500">/month</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center space-x-1">
                        {pkg.breakfast_enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700" title={`Breakfast: ${pkg.breakfast_days?.length || 0} days`}>
                            ☀️
                          </span>
                        )}
                        {pkg.lunch_enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700" title={`Lunch: ${pkg.lunch_days?.length || 0} days`}>
                            🍽️
                          </span>
                        )}
                        {pkg.dinner_enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700" title={`Dinner: ${pkg.dinner_days?.length || 0} days`}>
                            🌙
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(pkg.price)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => setViewModal({ open: true, pkg })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => openEditModal(pkg)} className="p-1 text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, pkg })} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPackage ? 'Edit Package' : 'Add Package'} size="xl">
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto space-y-4 scrollbar-hide">
            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Member *</label>
              {!editingPackage && (
                <div className="flex space-x-2 mb-3">
                  {MEMBER_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleMemberTypeFilter(type.id)}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        formData.member_type === type.id
                          ? type.id === 'student' ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : type.id === 'faculty' ? 'bg-purple-50 border-purple-500 text-purple-700'
                          : 'bg-orange-50 border-orange-500 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {type.id === 'student' && (
                          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          </svg>
                        )}
                        {type.id === 'faculty' && (
                          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        {type.id === 'staff' && (
                          <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        {type.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* Searchable Dropdown */}
              {!editingPackage ? (
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search and select ${formData.member_type}...`}
                      value={selectedMember ? getMemberDisplayName(selectedMember) : memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setSelectedMember(null);
                        setFormData(prev => ({ ...prev, member_id: '' }));
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className={`w-4 h-4 transition-transform ${showMemberDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {showMemberDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredMembers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {memberSearchQuery ? `No ${formData.member_type} found matching "${memberSearchQuery}"` : `No ${formData.member_type} available`}
                        </div>
                      ) : (
                        filteredMembers.map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(member);
                              const memberMeals = getMemberMealCheckIns(member) || [];
                              setFormData(prev => ({
                                ...prev,
                                member_id: member.id,
                                member_type: member.member_type,
                                breakfast_enabled: memberMeals.includes('breakfast'),
                                lunch_enabled: memberMeals.includes('lunch'),
                                dinner_enabled: memberMeals.includes('dinner'),
                              }));
                              setMemberSearchQuery('');
                              setShowMemberDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${
                              formData.member_id === member.id ? 'bg-primary-100 text-primary-700' : 'text-gray-700'
                            }`}
                          >
                            {getMemberDisplayName(member)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedMember ? getMemberDisplayName(selectedMember) : '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                />
              )}
            </div>

            {/* Current Meal Check-ins */}
            {selectedMember && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Meal Check-ins</h4>
                <div className="flex flex-wrap gap-2">
                  {getMemberMealCheckIns(selectedMember)?.length > 0 ? (
                    getMemberMealCheckIns(selectedMember).map(meal => (
                      <span
                        key={meal}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                          meal === 'breakfast' ? 'bg-amber-100 text-amber-700' :
                          meal === 'lunch' ? 'bg-orange-100 text-orange-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}: Checked In
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No meal preferences set</span>
                  )}
                </div>
              </div>
            )}

            {/* Configure Meal Schedule */}
            {selectedMember && getMemberMealCheckIns(selectedMember)?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configure Meal Schedule</h4>
                <div className="space-y-3">
                  {/* Breakfast */}
                  {getMemberMealCheckIns(selectedMember)?.includes('breakfast') && (
                    <div className={`border rounded-lg p-4 ${formData.breakfast_enabled ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                      <div className={`flex items-center justify-between ${formData.breakfast_enabled ? 'mb-3' : ''}`}>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.breakfast_enabled}
                            onChange={() => handleMealToggle('breakfast')}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-medium">Breakfast</span>
                        </label>
                        {formData.breakfast_enabled && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Meals per Month:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={formData.breakfast_meals_per_day}
                              onChange={(e) => setFormData(prev => ({ ...prev, breakfast_meals_per_day: e.target.value }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            />
                          </div>
                        )}
                      </div>
                      {formData.breakfast_enabled && (
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((day) => (
                            <label
                              key={day.id}
                              className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                formData.breakfast_days?.includes(day.id)
                                  ? 'bg-amber-100 border-amber-400 text-amber-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.breakfast_days?.includes(day.id)}
                                onChange={() => handleDayToggle('breakfast', day.id)}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lunch */}
                  {getMemberMealCheckIns(selectedMember)?.includes('lunch') && (
                    <div className={`border rounded-lg p-4 ${formData.lunch_enabled ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'}`}>
                      <div className={`flex items-center justify-between ${formData.lunch_enabled ? 'mb-3' : ''}`}>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.lunch_enabled}
                            onChange={() => handleMealToggle('lunch')}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="font-medium">Lunch</span>
                        </label>
                        {formData.lunch_enabled && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Meals per Month:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={formData.lunch_meals_per_day}
                              onChange={(e) => setFormData(prev => ({ ...prev, lunch_meals_per_day: e.target.value }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            />
                          </div>
                        )}
                      </div>
                      {formData.lunch_enabled && (
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((day) => (
                            <label
                              key={day.id}
                              className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                formData.lunch_days?.includes(day.id)
                                  ? 'bg-orange-100 border-orange-400 text-orange-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.lunch_days?.includes(day.id)}
                                onChange={() => handleDayToggle('lunch', day.id)}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dinner */}
                  {getMemberMealCheckIns(selectedMember)?.includes('dinner') && (
                    <div className={`border rounded-lg p-4 ${formData.dinner_enabled ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'}`}>
                      <div className={`flex items-center justify-between ${formData.dinner_enabled ? 'mb-3' : ''}`}>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.dinner_enabled}
                            onChange={() => handleMealToggle('dinner')}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium">Dinner</span>
                        </label>
                        {formData.dinner_enabled && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Meals per Month:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={formData.dinner_meals_per_day}
                              onChange={(e) => setFormData(prev => ({ ...prev, dinner_meals_per_day: e.target.value }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                            />
                          </div>
                        )}
                      </div>
                      {formData.dinner_enabled && (
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((day) => (
                            <label
                              key={day.id}
                              className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                formData.dinner_days?.includes(day.id)
                                  ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.dinner_days?.includes(day.id)}
                                onChange={() => handleDayToggle('dinner', day.id)}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Package Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Price (PKR) *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 3000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active Package
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Save Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Package Modal */}
      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, pkg: null })} title="Package Details" size="lg">
        {viewModal.pkg && (() => {
          const pkg = viewModal.pkg;
          const member = getMemberInfo(pkg.member_id, pkg.member_type);
          const totalMeals = calculateTotalMeals(pkg);

          return (
            <div className="space-y-4">
              {/* Member Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Member Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Name</span>
                    <p className="font-medium">{member?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Type</span>
                    <p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize ${getTypeBadgeColor(pkg.member_type)}`}>{pkg.member_type}</span></p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">ID</span>
                    <p className="font-medium">{member?.roll_number || member?.employee_id || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></p>
                  </div>
                </div>
              </div>

              {/* Meal Schedule */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Meal Schedule</h4>
                <div className="space-y-3">
                  {pkg.breakfast_enabled && (
                    <div className="flex items-start">
                      <span className="w-24 text-amber-600 font-medium">☀️ Breakfast</span>
                      <div>
                        <p className="text-sm">{pkg.breakfast_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</p>
                        <p className="text-xs text-gray-500">{pkg.breakfast_meals_per_day} meal(s) per month</p>
                      </div>
                    </div>
                  )}
                  {pkg.lunch_enabled && (
                    <div className="flex items-start">
                      <span className="w-24 text-orange-600 font-medium">🍽️ Lunch</span>
                      <div>
                        <p className="text-sm">{pkg.lunch_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</p>
                        <p className="text-xs text-gray-500">{pkg.lunch_meals_per_day} meal(s) per month</p>
                      </div>
                    </div>
                  )}
                  {pkg.dinner_enabled && (
                    <div className="flex items-start">
                      <span className="w-24 text-indigo-600 font-medium">🌙 Dinner</span>
                      <div>
                        <p className="text-sm">{pkg.dinner_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</p>
                        <p className="text-xs text-gray-500">{pkg.dinner_meals_per_day} meal(s) per month</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">Total Meals per Month</span>
                    <p className="text-2xl font-bold text-primary-600">{totalMeals}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">Package Price</span>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setViewModal({ open: false, pkg: null })} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => { setViewModal({ open: false, pkg: null }); openEditModal(pkg); }} className="flex-1">
                  Edit Package
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pkg: null })}
        onConfirm={handleDelete}
        title="Delete Package"
        message={`Are you sure you want to delete this package? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

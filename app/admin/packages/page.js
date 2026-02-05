'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import PackageCalendar, { calculateMealCounts } from '@/components/PackageCalendar';
import {
  PACKAGE_TYPE,
  PACKAGE_TYPE_LABELS,
  PACKAGE_TYPE_DESCRIPTIONS,
  PACKAGE_STATUS_LABELS,
} from '@/lib/constants';

const MEMBER_TYPES = [
  { id: 'student', label: 'Student', apiEndpoint: '/api/student-members' },
  { id: 'faculty', label: 'Faculty', apiEndpoint: '/api/faculty-members' },
  { id: 'staff', label: 'Staff', apiEndpoint: '/api/staff-members' },
];

const getInitialFormData = () => ({
  member_id: '',
  member_type: 'student',
  package_type: 'full_time',
  start_date: '',
  end_date: '',
  breakfast_enabled: false,
  lunch_enabled: false,
  dinner_enabled: false,
  total_breakfast: 0,
  total_lunch: 0,
  total_dinner: 0,
  price: '',
  balance: '',
  breakfast_price: '',
  lunch_price: '',
  dinner_price: '',
  disabled_days: [],
  disabled_meals: {}, // { [date]: { breakfast: bool, lunch: bool, dinner: bool } }
  is_active: true,
});

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, pkg: null });
  const [viewModal, setViewModal] = useState({ open: false, pkg: null });
  const [renewModal, setRenewModal] = useState({ open: false, pkg: null });
  const [depositModal, setDepositModal] = useState({ open: false, pkg: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState(getInitialFormData());
  const [renewFormData, setRenewFormData] = useState({
    carry_over: true,
    total_breakfast: 30,
    total_lunch: 30,
    total_dinner: 30,
    price: '',
    start_date: '',
    end_date: '',
  });
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadPackages();
    loadAllMembers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPackages = async (retryCount = 0) => {
    try {
      setLoading(true);
      const response = await fetch('/api/member-packages-v2');
      if (!response.ok) throw new Error('Failed to load packages');
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      // Retry up to 2 times on network errors
      if (retryCount < 2) {
        console.log(`Retrying packages fetch... attempt ${retryCount + 2}`);
        setTimeout(() => loadPackages(retryCount + 1), 1000);
        return;
      }
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      setLoadingMembers(true);
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

  const getMemberInfo = (memberId, memberType) => {
    return allMembers.find(m => m.id === memberId && m.member_type === memberType);
  };

  const getMemberDisplayName = (member) => {
    if (!member) return '-';
    const id = member.member_type === 'student' ? member.roll_number : member.employee_id;
    return `${member.full_name} (${id})`;
  };

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

  const getMemberMealCheckIns = (member) => {
    if (!member) return null;

    const expandFullDay = (meals) => {
      if (!meals) return [];
      if (typeof meals === 'string') {
        if (meals === 'full_day' || meals === 'full') {
          return ['breakfast', 'lunch', 'dinner'];
        }
        return [meals];
      }
      if (Array.isArray(meals)) {
        if (meals.includes('full_day') || meals.includes('full')) {
          return ['breakfast', 'lunch', 'dinner'];
        }
        return meals;
      }
      return [];
    };

    if (member.member_type === 'student' && member.preferred_meal_plan) {
      return expandFullDay(member.preferred_meal_plan);
    }
    if (member.member_type === 'faculty' && member.preferred_meal_plan) {
      return expandFullDay(member.preferred_meal_plan);
    }
    if (member.member_type === 'staff' && member.meal_timing_preference) {
      return expandFullDay(member.meal_timing_preference);
    }

    return [];
  };

  // Get available meals for selected member
  const availableMeals = useMemo(() => {
    if (!selectedMember) return ['breakfast', 'lunch', 'dinner'];
    const memberMeals = getMemberMealCheckIns(selectedMember) || [];
    return memberMeals.length > 0 ? memberMeals : ['breakfast', 'lunch', 'dinner'];
  }, [selectedMember]);

  // Calculate meal counts based on form data
  const calculatedMealCounts = useMemo(() => {
    if (['full_time', 'partial_full_time'].includes(formData.package_type)) {
      return calculateMealCounts(
        formData.start_date,
        formData.end_date,
        formData.disabled_days,
        formData.breakfast_enabled,
        formData.lunch_enabled,
        formData.dinner_enabled,
        formData.disabled_meals
      );
    }
    return {
      breakfast: formData.total_breakfast || 0,
      lunch: formData.total_lunch || 0,
      dinner: formData.total_dinner || 0,
      total: (formData.total_breakfast || 0) + (formData.total_lunch || 0) + (formData.total_dinner || 0),
    };
  }, [formData]);

  const openAddModal = () => {
    setEditingPackage(null);
    setFormData(getInitialFormData());
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
      package_type: pkg.package_type,
      start_date: pkg.start_date || '',
      end_date: pkg.end_date || '',
      breakfast_enabled: pkg.breakfast_enabled || false,
      lunch_enabled: pkg.lunch_enabled || false,
      dinner_enabled: pkg.dinner_enabled || false,
      total_breakfast: pkg.total_breakfast || 0,
      total_lunch: pkg.total_lunch || 0,
      total_dinner: pkg.total_dinner || 0,
      price: pkg.price || '',
      balance: pkg.balance || '',
      breakfast_price: pkg.breakfast_price || '',
      lunch_price: pkg.lunch_price || '',
      dinner_price: pkg.dinner_price || '',
      disabled_days: pkg.disabled_days || [],
      disabled_meals: pkg.disabled_meals || {}, // Load disabled_meals from package
      is_active: pkg.is_active,
    });
    setModalOpen(true);
  };

  const openRenewModal = (pkg) => {
    const member = getMemberInfo(pkg.member_id, pkg.member_type);
    setSelectedMember(member);

    // Calculate remaining meals
    const remainingBreakfast = Math.max(0, pkg.total_breakfast - pkg.consumed_breakfast);
    const remainingLunch = Math.max(0, pkg.total_lunch - pkg.consumed_lunch);
    const remainingDinner = Math.max(0, pkg.total_dinner - pkg.consumed_dinner);

    setRenewFormData({
      carry_over: true,
      total_breakfast: 30,
      total_lunch: 30,
      total_dinner: 30,
      price: '',
      start_date: '',
      end_date: '',
      remaining: {
        breakfast: remainingBreakfast,
        lunch: remainingLunch,
        dinner: remainingDinner,
      },
    });
    setRenewModal({ open: true, pkg });
  };

  const openDepositModal = (pkg) => {
    setDepositAmount('');
    setDepositModal({ open: true, pkg });
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

  const handlePackageTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      package_type: type,
      // Reset type-specific fields
      start_date: '',
      end_date: '',
      disabled_days: [],
      disabled_meals: {},
      balance: '',
      breakfast_price: '',
      lunch_price: '',
      dinner_price: '',
    }));
  };

  const handleToggleDay = (dateStr) => {
    setFormData(prev => {
      const currentDisabled = prev.disabled_days || [];
      if (currentDisabled.includes(dateStr)) {
        return { ...prev, disabled_days: currentDisabled.filter(d => d !== dateStr) };
      } else {
        return { ...prev, disabled_days: [...currentDisabled, dateStr] };
      }
    });
  };

  const handleToggleMeal = (dateStr, meal) => {
    setFormData(prev => {
      // Create a completely new object for disabled_meals
      const currentDisabledMeals = {};

      // Deep copy all existing disabled meals
      Object.keys(prev.disabled_meals || {}).forEach(date => {
        currentDisabledMeals[date] = { ...prev.disabled_meals[date] };
      });

      // Initialize date entry if it doesn't exist
      if (!currentDisabledMeals[dateStr]) {
        currentDisabledMeals[dateStr] = { breakfast: false, lunch: false, dinner: false };
      }

      // Toggle the specific meal - simple boolean flip
      const currentValue = currentDisabledMeals[dateStr][meal] === true;
      currentDisabledMeals[dateStr][meal] = !currentValue;

      // Only clean up if ALL three meals are explicitly false (no disabled meals)
      const dateEntry = currentDisabledMeals[dateStr];
      if (dateEntry.breakfast !== true && dateEntry.lunch !== true && dateEntry.dinner !== true) {
        delete currentDisabledMeals[dateStr];
      }

      return { ...prev, disabled_meals: currentDisabledMeals };
    });
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

    // Validate based on package type
    if (['full_time', 'partial_full_time'].includes(formData.package_type)) {
      if (!formData.start_date || !formData.end_date) {
        toast.error('Start date and end date are required');
        return;
      }
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        toast.error('Start date must be before end date');
        return;
      }
    }

    if (formData.package_type === 'partial') {
      if (!formData.total_breakfast && !formData.total_lunch && !formData.total_dinner) {
        toast.error('Please enter meal counts');
        return;
      }
    }

    if (formData.package_type === 'daily_basis') {
      if (!formData.balance || parseFloat(formData.balance) <= 0) {
        toast.error('Please enter initial deposit amount');
        return;
      }
    }

    try {
      setSaving(true);

      // Prepare submit data
      const submitData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        balance: parseFloat(formData.balance) || 0,
        breakfast_price: parseFloat(formData.breakfast_price) || 0,
        lunch_price: parseFloat(formData.lunch_price) || 0,
        dinner_price: parseFloat(formData.dinner_price) || 0,
        total_breakfast: formData.breakfast_enabled ? (calculatedMealCounts.breakfast || parseInt(formData.total_breakfast) || 0) : 0,
        total_lunch: formData.lunch_enabled ? (calculatedMealCounts.lunch || parseInt(formData.total_lunch) || 0) : 0,
        total_dinner: formData.dinner_enabled ? (calculatedMealCounts.dinner || parseInt(formData.total_dinner) || 0) : 0,
      };

      const url = editingPackage
        ? `/api/member-packages-v2/${editingPackage.id}`
        : '/api/member-packages-v2';
      const method = editingPackage ? 'PUT' : 'POST';

      // Retry logic for network errors
      let response;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitData),
          });
          break; // Success, exit retry loop
        } catch (fetchError) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw new Error('Network error. Please check your connection and try again.');
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save package');
      }

      toast.success(editingPackage ? 'Package updated successfully!' : 'Package created successfully!');

      if (editingPackage) {
        setPackages(prev => prev.map(p =>
          p.id === editingPackage.id ? data.package : p
        ));
      } else {
        setPackages(prev => [data.package, ...prev]);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const pkg = renewModal.pkg;

      const response = await fetch(`/api/member-packages-v2/${pkg.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carry_over: renewFormData.carry_over,
          package_type: pkg.package_type,
          start_date: renewFormData.start_date || null,
          end_date: renewFormData.end_date || null,
          breakfast_enabled: pkg.breakfast_enabled,
          lunch_enabled: pkg.lunch_enabled,
          dinner_enabled: pkg.dinner_enabled,
          total_breakfast: parseInt(renewFormData.total_breakfast) || 0,
          total_lunch: parseInt(renewFormData.total_lunch) || 0,
          total_dinner: parseInt(renewFormData.total_dinner) || 0,
          price: parseFloat(renewFormData.price) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to renew package');
      }

      toast.success('Package renewed successfully!');

      // Update packages list
      setPackages(prev => {
        const updated = prev.map(p => p.id === pkg.id ? { ...p, status: 'renewed', is_active: false } : p);
        return [data.package, ...updated];
      });

      setRenewModal({ open: false, pkg: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    try {
      setSaving(true);
      const pkg = depositModal.pkg;

      const response = await fetch(`/api/member-packages-v2/${pkg.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add deposit');
      }

      toast.success(`Deposit of Rs. ${amount} added successfully!`);

      // Update package in list
      setPackages(prev => prev.map(p =>
        p.id === pkg.id ? data.package : p
      ));

      setDepositModal({ open: false, pkg: null });
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
      const response = await fetch(`/api/member-packages-v2/${deleteModal.pkg.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete package');
      }

      toast.success('Package deleted successfully');
      setPackages(prev => prev.filter(p => p.id !== deleteModal.pkg.id));
      setDeleteModal({ open: false, pkg: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-700';
      case 'faculty': return 'bg-purple-100 text-purple-700';
      case 'staff': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPackageTypeBadgeColor = (type) => {
    switch (type) {
      case 'full_time': return 'bg-green-100 text-green-700';
      case 'partial_full_time': return 'bg-teal-100 text-teal-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'daily_basis': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'renewed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPackageProgress = (pkg) => {
    if (pkg.package_type === 'daily_basis') {
      return null; // No progress for daily basis
    }

    const totalMeals = pkg.total_breakfast + pkg.total_lunch + pkg.total_dinner;
    const consumedMeals = pkg.consumed_breakfast + pkg.consumed_lunch + pkg.consumed_dinner;
    const percentage = totalMeals > 0 ? Math.round((consumedMeals / totalMeals) * 100) : 0;

    return { total: totalMeals, consumed: consumedMeals, percentage };
  };

  // Filter packages
  const filteredPackages = packages.filter(pkg => {
    if (typeFilter !== 'all' && pkg.member_type !== typeFilter) return false;
    if (packageTypeFilter !== 'all' && pkg.package_type !== packageTypeFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && (!pkg.is_active || pkg.status !== 'active')) return false;
      if (statusFilter === 'inactive' && pkg.is_active) return false;
    }

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
          <p className="text-xs sm:text-sm text-gray-500">Manage meal packages with 4 different membership types</p>
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
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Member Types</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={packageTypeFilter}
            onChange={(e) => setPackageTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Package Types</option>
            <option value="full_time">Full Time</option>
            <option value="partial_full_time">Partial Full Time</option>
            <option value="partial">Partial</option>
            <option value="daily_basis">Daily Basis</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive/Expired</option>
          </select>

          {(typeFilter !== 'all' || packageTypeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setPackageTypeFilter('all');
                setStatusFilter('all');
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

          <Button variant="outline" size="sm" onClick={loadPackages} className="w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>

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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Progress/Balance</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredPackages.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No packages found. Add your first package!</td></tr>
            ) : (
              filteredPackages.map((pkg, index) => {
                const member = getMemberInfo(pkg.member_id, pkg.member_type);
                const progress = getPackageProgress(pkg);

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
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getPackageTypeBadgeColor(pkg.package_type)}`}>
                        {PACKAGE_TYPE_LABELS[pkg.package_type]}
                      </span>
                      {pkg.start_date && pkg.end_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          {pkg.start_date} - {pkg.end_date}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {pkg.package_type === 'daily_basis' ? (
                        <div>
                          <span className="text-lg font-bold text-indigo-600">{formatCurrency(pkg.balance || 0)}</span>
                          <div className="text-xs text-gray-500">Balance</div>
                        </div>
                      ) : progress ? (
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-medium">{progress.consumed}</span>
                            <span className="text-xs text-gray-400">/</span>
                            <span className="text-sm text-gray-500">{progress.total}</span>
                          </div>
                          <div className="w-20 mx-auto h-1.5 bg-gray-200 rounded-full mt-1">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(pkg.status)}`}>
                        {PACKAGE_STATUS_LABELS[pkg.status] || pkg.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => setViewModal({ open: true, pkg })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {pkg.status === 'active' && (
                          <>
                            <button onClick={() => openEditModal(pkg)} className="p-1 text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => openRenewModal(pkg)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Renew">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            {pkg.package_type === 'daily_basis' && (
                              <button onClick={() => openDepositModal(pkg)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Add Deposit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              </button>
                            )}
                          </>
                        )}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPackage ? 'Edit Package' : 'Add Package'} size="2xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[450px]">
            {/* Left Column - Member & Package Type */}
            <div className="space-y-4">
              {/* Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Member *</label>
                {!editingPackage && (
                  <div className="flex space-x-2 mb-2">
                    {MEMBER_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleMemberTypeFilter(type.id)}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                          formData.member_type === type.id
                            ? type.id === 'student' ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : type.id === 'faculty' ? 'bg-purple-50 border-purple-500 text-purple-700'
                            : 'bg-orange-50 border-orange-500 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}

                {!editingPackage ? (
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      placeholder={`Search ${formData.member_type}...`}
                      value={selectedMember ? getMemberDisplayName(selectedMember) : memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setSelectedMember(null);
                        setFormData(prev => ({ ...prev, member_id: '' }));
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                    {showMemberDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredMembers.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No members found</div>
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
                              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
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

              {/* Package Type Selection - Dropdown */}
              {selectedMember && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Type *</label>
                  <select
                    value={formData.package_type}
                    onChange={(e) => handlePackageTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    {Object.entries(PACKAGE_TYPE).map(([key, value]) => (
                      <option key={value} value={value}>
                        {PACKAGE_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{PACKAGE_TYPE_DESCRIPTIONS[formData.package_type]}</p>
                </div>
              )}

              {/* Meal Toggles - Only show meals available for the member */}
              {selectedMember && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Meals * <span className="text-xs text-gray-400 font-normal">(Based on member's meal plan)</span>
                  </label>
                  <div className="flex gap-2">
                    {availableMeals.map(meal => (
                      <label
                        key={meal}
                        className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          formData[`${meal}_enabled`]
                            ? meal === 'breakfast' ? 'bg-amber-100 border-amber-400 text-amber-700'
                            : meal === 'lunch' ? 'bg-orange-100 border-orange-400 text-orange-700'
                            : 'bg-indigo-100 border-indigo-400 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData[`${meal}_enabled`]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${meal}_enabled`]: e.target.checked }))}
                          className="sr-only"
                        />
                        <span className="capitalize font-medium">{meal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range (for full_time and partial_full_time) */}
              {selectedMember && ['full_time', 'partial_full_time'].includes(formData.package_type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Meal Counts for partial */}
              {selectedMember && formData.package_type === 'partial' && (
                <div className="grid grid-cols-3 gap-3">
                  {formData.breakfast_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Breakfast</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.total_breakfast}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_breakfast: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  {formData.lunch_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lunch</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.total_lunch}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_lunch: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  {formData.dinner_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dinner</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.total_dinner}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_dinner: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Daily Basis Configuration */}
              {selectedMember && formData.package_type === 'daily_basis' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Initial Deposit (PKR) *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                      placeholder="e.g., 10000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {formData.breakfast_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Breakfast Price</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.breakfast_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, breakfast_price: e.target.value }))}
                          placeholder="150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                    {formData.lunch_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Lunch Price</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.lunch_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, lunch_price: e.target.value }))}
                          placeholder="200"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                    {formData.dinner_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dinner Price</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.dinner_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, dinner_price: e.target.value }))}
                          placeholder="200"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Package Price */}
              {selectedMember && formData.package_type !== 'daily_basis' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Package Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g., 5000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}

              {/* Summary */}
              {selectedMember && formData.package_type !== 'daily_basis' && (
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">Package Summary</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {formData.breakfast_enabled && (
                      <div>Breakfast: <strong>{calculatedMealCounts.breakfast}</strong></div>
                    )}
                    {formData.lunch_enabled && (
                      <div>Lunch: <strong>{calculatedMealCounts.lunch}</strong></div>
                    )}
                    {formData.dinner_enabled && (
                      <div>Dinner: <strong>{calculatedMealCounts.dinner}</strong></div>
                    )}
                    <div className="font-medium text-primary-700">
                      Total: <strong>{calculatedMealCounts.total}</strong> meals
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Calendar (only for full_time and partial_full_time) */}
            <div className="lg:border-l lg:pl-6">
              {selectedMember && ['full_time', 'partial_full_time'].includes(formData.package_type) &&
                formData.start_date && formData.end_date ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Days <span className="text-xs text-gray-400 font-normal">(click to enable/disable)</span>
                    </label>
                    <PackageCalendar
                      startDate={formData.start_date}
                      endDate={formData.end_date}
                      disabledDays={formData.disabled_days}
                      disabledMeals={formData.disabled_meals}
                      onToggleDay={handleToggleDay}
                      onToggleMeal={handleToggleMeal}
                      breakfastEnabled={formData.breakfast_enabled}
                      lunchEnabled={formData.lunch_enabled}
                      dinnerEnabled={formData.dinner_enabled}
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    {!selectedMember ? (
                      <p>Select a member to continue</p>
                    ) : !['full_time', 'partial_full_time'].includes(formData.package_type) ? (
                      <p>Calendar not available for this package type</p>
                    ) : (
                      <p>Select start and end dates to view calendar</p>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editingPackage ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, pkg: null })} title="Package Details" size="lg">
        {viewModal.pkg && (() => {
          const pkg = viewModal.pkg;
          const member = getMemberInfo(pkg.member_id, pkg.member_type);
          const progress = getPackageProgress(pkg);

          return (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Member Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{member?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-medium">{member?.roll_number || member?.employee_id || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Package Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getPackageTypeBadgeColor(pkg.package_type)}`}>{PACKAGE_TYPE_LABELS[pkg.package_type]}</span></p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(pkg.status)}`}>{PACKAGE_STATUS_LABELS[pkg.status]}</span></p>
                  </div>
                  {pkg.start_date && (
                    <div>
                      <span className="text-gray-500">Period:</span>
                      <p className="font-medium">{pkg.start_date} to {pkg.end_date}</p>
                    </div>
                  )}
                  {pkg.price > 0 && (
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <p className="font-medium">{formatCurrency(pkg.price)}</p>
                    </div>
                  )}
                </div>
              </div>

              {pkg.package_type === 'daily_basis' ? (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Balance & Prices</h4>
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-indigo-600">{formatCurrency(pkg.balance || 0)}</span>
                    <p className="text-xs text-gray-500">Current Balance</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {pkg.breakfast_enabled && (
                      <div className="p-2 bg-white rounded border">
                        <div className="text-amber-600 font-medium">Breakfast</div>
                        <div>{formatCurrency(pkg.breakfast_price || 0)}</div>
                      </div>
                    )}
                    {pkg.lunch_enabled && (
                      <div className="p-2 bg-white rounded border">
                        <div className="text-orange-600 font-medium">Lunch</div>
                        <div>{formatCurrency(pkg.lunch_price || 0)}</div>
                      </div>
                    )}
                    {pkg.dinner_enabled && (
                      <div className="p-2 bg-white rounded border">
                        <div className="text-indigo-600 font-medium">Dinner</div>
                        <div>{formatCurrency(pkg.dinner_price || 0)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Meal Progress</h4>
                  <div className="space-y-3">
                    {pkg.breakfast_enabled && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-amber-700">Breakfast</span>
                          <span>{pkg.consumed_breakfast} / {pkg.total_breakfast}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(pkg.consumed_breakfast / pkg.total_breakfast) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {pkg.lunch_enabled && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-orange-700">Lunch</span>
                          <span>{pkg.consumed_lunch} / {pkg.total_lunch}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(pkg.consumed_lunch / pkg.total_lunch) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {pkg.dinner_enabled && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-indigo-700">Dinner</span>
                          <span>{pkg.consumed_dinner} / {pkg.total_dinner}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(pkg.consumed_dinner / pkg.total_dinner) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {progress && (
                    <div className="mt-4 pt-3 border-t border-primary-200 text-center">
                      <span className="text-2xl font-bold text-primary-700">{progress.consumed} / {progress.total}</span>
                      <p className="text-xs text-gray-500">Total Meals Consumed</p>
                    </div>
                  )}
                </div>
              )}

              {pkg.carried_over_from_package_id && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Carried over: {pkg.carried_over_breakfast} breakfast, {pkg.carried_over_lunch} lunch, {pkg.carried_over_dinner} dinner from previous package
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setViewModal({ open: false, pkg: null })} className="flex-1">
                  Close
                </Button>
                {pkg.status === 'active' && (
                  <Button onClick={() => { setViewModal({ open: false, pkg: null }); openRenewModal(pkg); }} className="flex-1">
                    Renew Package
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Renew Modal */}
      <Modal isOpen={renewModal.open} onClose={() => setRenewModal({ open: false, pkg: null })} title="Renew Package" size="md">
        {renewModal.pkg && (
          <form onSubmit={handleRenew}>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Current Package Status</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  {renewModal.pkg.breakfast_enabled && (
                    <div className="p-2 bg-white rounded border">
                      <div className="text-amber-600">Remaining Breakfast</div>
                      <div className="text-xl font-bold">{renewFormData.remaining?.breakfast || 0}</div>
                    </div>
                  )}
                  {renewModal.pkg.lunch_enabled && (
                    <div className="p-2 bg-white rounded border">
                      <div className="text-orange-600">Remaining Lunch</div>
                      <div className="text-xl font-bold">{renewFormData.remaining?.lunch || 0}</div>
                    </div>
                  )}
                  {renewModal.pkg.dinner_enabled && (
                    <div className="p-2 bg-white rounded border">
                      <div className="text-indigo-600">Remaining Dinner</div>
                      <div className="text-xl font-bold">{renewFormData.remaining?.dinner || 0}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Carry over option - only for partial type */}
              {renewModal.pkg.package_type === 'partial' && (
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={renewFormData.carry_over}
                    onChange={(e) => setRenewFormData(prev => ({ ...prev, carry_over: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <div>
                    <div className="font-medium text-sm">Carry over remaining meals</div>
                    <div className="text-xs text-gray-500">Add remaining meals to the new package</div>
                  </div>
                </label>
              )}

              <div className="text-sm font-medium text-gray-700">New Package Configuration</div>

              {/* Date range for full_time and partial_full_time */}
              {['full_time', 'partial_full_time'].includes(renewModal.pkg.package_type) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={renewFormData.start_date}
                      onChange={(e) => setRenewFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={renewFormData.end_date}
                      onChange={(e) => setRenewFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Meal counts for partial */}
              {renewModal.pkg.package_type === 'partial' && (
                <div className="grid grid-cols-3 gap-4">
                  {renewModal.pkg.breakfast_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Breakfast</label>
                      <input
                        type="number"
                        min="0"
                        value={renewFormData.total_breakfast}
                        onChange={(e) => setRenewFormData(prev => ({ ...prev, total_breakfast: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  {renewModal.pkg.lunch_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lunch</label>
                      <input
                        type="number"
                        min="0"
                        value={renewFormData.total_lunch}
                        onChange={(e) => setRenewFormData(prev => ({ ...prev, total_lunch: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  {renewModal.pkg.dinner_enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dinner</label>
                      <input
                        type="number"
                        min="0"
                        value={renewFormData.total_dinner}
                        onChange={(e) => setRenewFormData(prev => ({ ...prev, total_dinner: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Package Price (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={renewFormData.price}
                  onChange={(e) => setRenewFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Final totals preview for partial with carry-over */}
              {renewModal.pkg.package_type === 'partial' && renewFormData.carry_over && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-sm font-medium text-green-700 mb-2">Final Totals (with carry-over)</div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {renewModal.pkg.breakfast_enabled && (
                      <div>
                        <div className="text-amber-700">Breakfast</div>
                        <div className="font-bold">{(parseInt(renewFormData.total_breakfast) || 0) + (renewFormData.remaining?.breakfast || 0)}</div>
                      </div>
                    )}
                    {renewModal.pkg.lunch_enabled && (
                      <div>
                        <div className="text-orange-700">Lunch</div>
                        <div className="font-bold">{(parseInt(renewFormData.total_lunch) || 0) + (renewFormData.remaining?.lunch || 0)}</div>
                      </div>
                    )}
                    {renewModal.pkg.dinner_enabled && (
                      <div>
                        <div className="text-indigo-700">Dinner</div>
                        <div className="font-bold">{(parseInt(renewFormData.total_dinner) || 0) + (renewFormData.remaining?.dinner || 0)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setRenewModal({ open: false, pkg: null })} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                Create New Package
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deposit Modal */}
      <Modal isOpen={depositModal.open} onClose={() => setDepositModal({ open: false, pkg: null })} title="Add Deposit" size="sm">
        {depositModal.pkg && (
          <form onSubmit={handleDeposit}>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs text-gray-500">Current Balance</span>
                <div className="text-2xl font-bold text-indigo-600">{formatCurrency(depositModal.pkg.balance || 0)}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount (PKR) *</label>
                <input
                  type="number"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>

              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="text-center bg-green-50 p-3 rounded-lg border border-green-200">
                  <span className="text-xs text-gray-500">New Balance</span>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency((depositModal.pkg.balance || 0) + parseFloat(depositAmount))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDepositModal({ open: false, pkg: null })} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                Add Deposit
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pkg: null })}
        onConfirm={handleDelete}
        title="Delete Package"
        message="Are you sure you want to delete this package? This action cannot be undone and will delete all associated history."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

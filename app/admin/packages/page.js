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
import api from '@/lib/api-client';

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
  discount: '',
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
  const [deactivateModal, setDeactivateModal] = useState({ open: false, pkg: null });
  const [reactivateModal, setReactivateModal] = useState({ open: false, pkg: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [packageHistory, setPackageHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState(getInitialFormData());
  const [renewFormData, setRenewFormData] = useState({
    carry_over: true,
    package_type: 'partial',
    total_breakfast: 0,
    total_lunch: 0,
    total_dinner: 0,
    breakfast_enabled: false,
    lunch_enabled: false,
    dinner_enabled: false,
    breakfast_price: '',
    lunch_price: '',
    dinner_price: '',
    price: '',
    discount: '',
    balance: '',
    start_date: '',
    end_date: '',
    disabled_days: [],
    disabled_meals: {},
  });
  const [depositAmount, setDepositAmount] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
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
      const response = await api.get('/api/member-packages-v2');
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
        api.get('/api/student-members'),
        api.get('/api/faculty-members'),
        api.get('/api/staff-members'),
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

  // Calculate meal counts for renew form
  const calculatedRenewMealCounts = useMemo(() => {
    if (['full_time', 'partial_full_time'].includes(renewFormData.package_type)) {
      return calculateMealCounts(
        renewFormData.start_date,
        renewFormData.end_date,
        renewFormData.disabled_days,
        renewFormData.breakfast_enabled,
        renewFormData.lunch_enabled,
        renewFormData.dinner_enabled,
        renewFormData.disabled_meals
      );
    }
    return {
      breakfast: parseInt(renewFormData.total_breakfast) || 0,
      lunch: parseInt(renewFormData.total_lunch) || 0,
      dinner: parseInt(renewFormData.total_dinner) || 0,
      total: (parseInt(renewFormData.total_breakfast) || 0) + (parseInt(renewFormData.total_lunch) || 0) + (parseInt(renewFormData.total_dinner) || 0),
    };
  }, [renewFormData]);

  // Helper: get all weekend dates (Sat/Sun) between start and end
  const getWeekendDates = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const weekends = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const day = current.getDay();
      if (day === 0 || day === 6) { // Sunday=0, Saturday=6
        weekends.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return weekends;
  };

  // Auto-disable weekends for partial_full_time (Add Package form)
  useEffect(() => {
    if (formData.package_type === 'partial_full_time' && formData.start_date && formData.end_date) {
      const weekends = getWeekendDates(formData.start_date, formData.end_date);
      setFormData(prev => ({ ...prev, disabled_days: weekends }));
    }
  }, [formData.package_type, formData.start_date, formData.end_date]);

  // Auto-disable weekends for partial_full_time (Renew form)
  useEffect(() => {
    if (renewFormData.package_type === 'partial_full_time' && renewFormData.start_date && renewFormData.end_date) {
      const weekends = getWeekendDates(renewFormData.start_date, renewFormData.end_date);
      setRenewFormData(prev => ({ ...prev, disabled_days: weekends }));
    }
  }, [renewFormData.package_type, renewFormData.start_date, renewFormData.end_date]);

  const handleRenewToggleDay = (dateStr) => {
    setRenewFormData(prev => ({
      ...prev,
      disabled_days: prev.disabled_days.includes(dateStr)
        ? prev.disabled_days.filter(d => d !== dateStr)
        : [...prev.disabled_days, dateStr],
    }));
  };

  const handleRenewToggleMeal = (dateStr, meal) => {
    setRenewFormData(prev => {
      const current = prev.disabled_meals[dateStr] || {};
      return {
        ...prev,
        disabled_meals: {
          ...prev.disabled_meals,
          [dateStr]: { ...current, [meal]: !current[meal] },
        },
      };
    });
  };

  const openAddModal = () => {
    setEditingPackage(null);
    setFormData(getInitialFormData());
    setSelectedMember(null);
    setMemberSearchQuery('');
    setShowMemberDropdown(false);
    setModalOpen(true);
  };

  const openViewModal = async (pkg) => {
    setViewModal({ open: true, pkg });
    setPackageHistory([]);
    setLoadingHistory(true);
    try {
      const response = await api.get(`/api/member-packages-v2/${pkg.id}`);
      if (response.ok) {
        const data = await response.json();
        setPackageHistory(data.package?.history || []);
        // Update pkg with full data including transactions
        if (data.package) {
          setViewModal({ open: true, pkg: { ...pkg, ...data.package } });
        }
      }
    } catch (error) {
      console.error('Error fetching package history:', error);
    } finally {
      setLoadingHistory(false);
    }
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
      discount: pkg.discount || '',
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
    // Block renewal for full_time/partial_full_time packages that are still active and not expired
    if (
      ['full_time', 'partial_full_time'].includes(pkg.package_type) &&
      getRealTimeStatus(pkg) === 'active'
    ) {
      toast.error('This member\'s package is still active and has not expired yet. Renewal is not allowed until the package expires.');
      return;
    }

    const member = getMemberInfo(pkg.member_id, pkg.member_type);
    setSelectedMember(member);

    const isExpired = getRealTimeStatus(pkg) === 'expired';

    // Expired packages have no remaining meals - they're gone
    const remainingBreakfast = isExpired ? 0 : Math.max(0, pkg.total_breakfast - pkg.consumed_breakfast);
    const remainingLunch = isExpired ? 0 : Math.max(0, pkg.total_lunch - pkg.consumed_lunch);
    const remainingDinner = isExpired ? 0 : Math.max(0, pkg.total_dinner - pkg.consumed_dinner);

    // Pre-fill all data from the original package
    setRenewFormData({
      carry_over: !isExpired,
      package_type: pkg.package_type,
      total_breakfast: pkg.total_breakfast || 0,
      total_lunch: pkg.total_lunch || 0,
      total_dinner: pkg.total_dinner || 0,
      breakfast_enabled: pkg.breakfast_enabled || false,
      lunch_enabled: pkg.lunch_enabled || false,
      dinner_enabled: pkg.dinner_enabled || false,
      breakfast_price: pkg.breakfast_price ?? '',
      lunch_price: pkg.lunch_price ?? '',
      dinner_price: pkg.dinner_price ?? '',
      price: pkg.price ?? '',
      discount: pkg.discount ?? '',
      balance: pkg.balance ?? '',
      start_date: '',
      end_date: '',
      disabled_days: [],
      disabled_meals: {},
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

    // RULE 1: Strict one-package-per-member - block if member has active OR deactivated package
    if (!editingPackage) {
      const existingPackage = packages.find(p =>
        p.member_id === formData.member_id &&
        p.member_type === formData.member_type &&
        (p.status === 'active' || p.status === 'deactivated')
      );

      if (existingPackage) {
        const existingTypeName = PACKAGE_TYPE_LABELS[existingPackage.package_type];
        const statusText = existingPackage.status === 'deactivated' ? 'deactivated' : 'active';
        const actionText = existingPackage.status === 'deactivated'
          ? 'delete it or reactivate it'
          : 'wait for it to expire or deactivate it';

        toast.error(
          `This member already has a ${statusText} ${existingTypeName} package. ` +
          `Please ${actionText} before creating a new package.`,
          { duration: 6000 }
        );
        return;
      }
    }

    // RULE 2: Date overlap prevention - for full_time and partial_full_time packages only
    if (!editingPackage && ['full_time', 'partial_full_time'].includes(formData.package_type)) {
      if (!formData.start_date || !formData.end_date) {
        toast.error('Start date and end date are required');
        return;
      }

      // Check for date overlap with ANY existing full_time/partial_full_time package (even expired ones)
      const overlappingPackage = packages.find(p => {
        // Only check against full_time and partial_full_time packages with dates
        if (!['full_time', 'partial_full_time'].includes(p.package_type)) return false;
        if (!p.start_date || !p.end_date) return false;

        // Only check packages for the same member
        if (p.member_id !== formData.member_id || p.member_type !== formData.member_type) return false;

        // Check if date ranges overlap: new_start <= existing_end AND new_end >= existing_start
        const newStart = formData.start_date;
        const newEnd = formData.end_date;
        const existingStart = p.start_date;
        const existingEnd = p.end_date;

        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (overlappingPackage) {
        const overlappingTypeName = PACKAGE_TYPE_LABELS[overlappingPackage.package_type];
        const overlappingStatus = PACKAGE_STATUS_LABELS[getRealTimeStatus(overlappingPackage)] || overlappingPackage.status;

        toast.error(
          `Date range conflicts with existing ${overlappingTypeName} package.\n\n` +
          `Existing Package:\n` +
          `• Dates: ${overlappingPackage.start_date} to ${overlappingPackage.end_date}\n` +
          `• Status: ${overlappingStatus}\n\n` +
          `Please choose non-overlapping dates.`,
          { duration: 8000 }
        );
        return;
      }
    }

    try {
      setSaving(true);

      // Prepare submit data
      const submitData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        price: parseFloat(formData.price) || 0,
        discount: parseFloat(formData.discount) || 0,
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
          response = method === 'PUT'
            ? await api.put(url, submitData)
            : await api.post(url, submitData);
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

      const response = await api.post(`/api/member-packages-v2/${pkg.id}/renew`, {
          carry_over: renewFormData.carry_over,
          package_type: renewFormData.package_type,
          start_date: renewFormData.start_date || null,
          end_date: renewFormData.end_date || null,
          breakfast_enabled: renewFormData.breakfast_enabled,
          lunch_enabled: renewFormData.lunch_enabled,
          dinner_enabled: renewFormData.dinner_enabled,
          total_breakfast: renewFormData.breakfast_enabled ? (calculatedRenewMealCounts.breakfast || parseInt(renewFormData.total_breakfast) || 0) : 0,
          total_lunch: renewFormData.lunch_enabled ? (calculatedRenewMealCounts.lunch || parseInt(renewFormData.total_lunch) || 0) : 0,
          total_dinner: renewFormData.dinner_enabled ? (calculatedRenewMealCounts.dinner || parseInt(renewFormData.total_dinner) || 0) : 0,
          breakfast_price: parseFloat(renewFormData.breakfast_price) || 0,
          lunch_price: parseFloat(renewFormData.lunch_price) || 0,
          dinner_price: parseFloat(renewFormData.dinner_price) || 0,
          price: parseFloat(renewFormData.price) || 0,
          discount: parseFloat(renewFormData.discount) || 0,
          balance: parseFloat(renewFormData.balance) || 0,
          disabled_days: renewFormData.disabled_days || [],
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

      const response = await api.post(`/api/member-packages-v2/${pkg.id}/deposit`, { amount });

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
      const response = await api.delete(`/api/member-packages-v2/${deleteModal.pkg.id}`);

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

  const handleDeactivate = async () => {
    if (!deactivateModal.pkg) return;

    try {
      setSaving(true);
      const response = await api.post(`/api/member-packages-v2/${deactivateModal.pkg.id}/deactivate`, {
        reason: deactivateReason || null,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate package');
      }

      toast.success('Package deactivated successfully');
      setPackages(prev => prev.map(p =>
        p.id === deactivateModal.pkg.id ? data.package : p
      ));
      setDeactivateModal({ open: false, pkg: null });
      setDeactivateReason('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateModal.pkg) return;

    try {
      setSaving(true);
      const response = await api.post(`/api/member-packages-v2/${reactivateModal.pkg.id}/reactivate`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate package');
      }

      toast.success('Package reactivated successfully');
      setPackages(prev => prev.map(p =>
        p.id === reactivateModal.pkg.id ? data.package : p
      ));
      setReactivateModal({ open: false, pkg: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
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

  // Get the real-time status of a package based on actual date
  const getRealTimeStatus = (pkg) => {
    if (pkg.status === 'renewed') return 'renewed';
    if (pkg.status === 'deactivated') return 'deactivated';
    if (pkg.status === 'expired' || !pkg.is_active) return 'expired';
    // For full_time and partial_full_time, check if end_date has passed
    if (['full_time', 'partial_full_time'].includes(pkg.package_type) && pkg.end_date) {
      const today = new Date().toISOString().split('T')[0];
      if (pkg.end_date < today) return 'expired';
    }
    return pkg.status;
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'renewed': return 'bg-blue-100 text-blue-700';
      case 'deactivated': return 'bg-gray-100 text-gray-700';
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

  // Filter packages - hide renewed packages (they only show in logs)
  const filteredPackages = packages.filter(pkg => {
    // Renewed packages are historical - only visible in Package Logs
    if (pkg.status === 'renewed') return false;

    if (typeFilter !== 'all' && pkg.member_type !== typeFilter) return false;
    if (packageTypeFilter !== 'all' && pkg.package_type !== packageTypeFilter) return false;
    if (statusFilter !== 'all') {
      const realStatus = getRealTimeStatus(pkg);
      if (statusFilter === 'active' && realStatus !== 'active') return false;
      if (statusFilter === 'inactive' && realStatus === 'active') return false;
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
                      {(() => {
                        const realStatus = getRealTimeStatus(pkg);
                        return (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(realStatus)}`}>
                            {PACKAGE_STATUS_LABELS[realStatus] || realStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => openViewModal(pkg)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {getRealTimeStatus(pkg) === 'active' && (
                          <>
                            <button onClick={() => openEditModal(pkg)} className="p-1 text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {pkg.package_type === 'daily_basis' && (
                              <button onClick={() => openDepositModal(pkg)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Add Deposit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              </button>
                            )}
                            <button onClick={() => { setDeactivateReason(''); setDeactivateModal({ open: true, pkg }); }} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Deactivate">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </button>
                          </>
                        )}
                        {getRealTimeStatus(pkg) === 'deactivated' && (
                          <button onClick={() => setReactivateModal({ open: true, pkg })} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Reactivate">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        )}
                        {['active', 'expired'].includes(getRealTimeStatus(pkg)) && pkg.package_type !== 'daily_basis' && (
                          <button onClick={() => openRenewModal(pkg)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Renew">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
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
                        onChange={(e) => setFormData(prev => ({ ...prev, total_breakfast: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
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
                        onChange={(e) => setFormData(prev => ({ ...prev, total_lunch: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
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
                        onChange={(e) => setFormData(prev => ({ ...prev, total_dinner: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
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

              {/* Discount */}
              {selectedMember && formData.package_type !== 'daily_basis' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Discount (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.price || 0}
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                    placeholder="e.g., 500"
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
                  {formData.price && (
                    <div className="mt-3 pt-3 border-t border-primary-200">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                          <span>Package Price:</span>
                          <strong>PKR {parseFloat(formData.price || 0).toFixed(2)}</strong>
                        </div>
                        {formData.discount && parseFloat(formData.discount) > 0 && (
                          <>
                            <div className="flex justify-between text-red-600">
                              <span>Discount:</span>
                              <strong>- PKR {parseFloat(formData.discount || 0).toFixed(2)}</strong>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-primary-700 pt-1 border-t border-primary-300">
                              <span>Final Price:</span>
                              <strong>PKR {(parseFloat(formData.price || 0) - parseFloat(formData.discount || 0)).toFixed(2)}</strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
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
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, pkg: null })}
        title="Package Details"
        size="lg"
        footer={viewModal.pkg && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setViewModal({ open: false, pkg: null })} className="flex-1">
              Close
            </Button>
            {['active', 'expired'].includes(getRealTimeStatus(viewModal.pkg)) && (
              <Button onClick={() => { setViewModal({ open: false, pkg: null }); openRenewModal(viewModal.pkg); }} className="flex-1">
                Renew Package
              </Button>
            )}
          </div>
        )}
      >
        {viewModal.pkg && (() => {
          const pkg = viewModal.pkg;
          const member = getMemberInfo(pkg.member_id, pkg.member_type);
          const progress = getPackageProgress(pkg);

          return (
            <div className="space-y-3">
              {/* Member + Package Info - compact row */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{member?.roll_number || member?.employee_id || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getPackageTypeBadgeColor(pkg.package_type)}`}>{PACKAGE_TYPE_LABELS[pkg.package_type]}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(getRealTimeStatus(pkg))}`}>{PACKAGE_STATUS_LABELS[getRealTimeStatus(pkg)]}</span>
                  </div>
                </div>
                {(pkg.start_date || pkg.price > 0) && (
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    {pkg.start_date && <span>Period: <strong className="text-gray-700">{pkg.start_date} to {pkg.end_date}</strong></span>}
                    {pkg.price > 0 && <span>Price: <strong className="text-gray-700">{formatCurrency(pkg.price)}</strong></span>}
                  </div>
                )}
              </div>

              {pkg.package_type === 'daily_basis' ? (
                <>
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Current Balance</h4>
                      <span className="text-xl font-bold text-indigo-600">{formatCurrency(pkg.balance || 0)}</span>
                    </div>
                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                      <span>Meals: </span>
                      {pkg.breakfast_enabled && <span className="text-amber-600 font-medium">Breakfast</span>}
                      {pkg.lunch_enabled && <span className="text-orange-600 font-medium">Lunch</span>}
                      {pkg.dinner_enabled && <span className="text-indigo-600 font-medium">Dinner</span>}
                    </div>
                  </div>

                  {/* Transaction History */}
                  {pkg.transactions && pkg.transactions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction History</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {pkg.transactions.map((txn, idx) => (
                          <div key={txn.id || idx} className="flex items-center justify-between bg-white rounded border border-gray-200 px-2.5 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${txn.transaction_type === 'deposit' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-700 font-medium capitalize">{txn.transaction_type}</span>
                              {txn.description && <span className="text-gray-400">- {txn.description}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-semibold ${txn.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                {txn.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </span>
                              <span className="text-gray-400">
                                {new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Meal Progress</h4>
                  <div className="space-y-2">
                    {pkg.breakfast_enabled && (
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-amber-700 font-medium">Breakfast</span>
                          <span>{pkg.consumed_breakfast} / {pkg.total_breakfast}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pkg.total_breakfast > 0 ? (pkg.consumed_breakfast / pkg.total_breakfast) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                    {pkg.lunch_enabled && (
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-orange-700 font-medium">Lunch</span>
                          <span>{pkg.consumed_lunch} / {pkg.total_lunch}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pkg.total_lunch > 0 ? (pkg.consumed_lunch / pkg.total_lunch) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                    {pkg.dinner_enabled && (
                      <div>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-indigo-700 font-medium">Dinner</span>
                          <span>{pkg.consumed_dinner} / {pkg.total_dinner}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pkg.total_dinner > 0 ? (pkg.consumed_dinner / pkg.total_dinner) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {progress && (
                    <div className="mt-2 pt-2 border-t border-primary-200 text-center">
                      <span className="text-lg font-bold text-primary-700">{progress.consumed} / {progress.total}</span>
                      <span className="text-xs text-gray-500 ml-1">meals consumed</span>
                    </div>
                  )}
                </div>
              )}

              {pkg.carried_over_from_package_id && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Carried over: {pkg.carried_over_breakfast} breakfast, {pkg.carried_over_lunch} lunch, {pkg.carried_over_dinner} dinner
                </div>
              )}

              {/* Package Logs */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Package Logs</h4>
                {(() => {
                  // For daily_basis, only show logs for this specific package
                  const filteredLogs = pkg.package_type === 'daily_basis'
                    ? packageHistory.filter(log => log.package_id === pkg.id)
                    : packageHistory;
                  return loadingHistory ? (
                  <div className="text-center text-sm text-gray-400 py-2">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-2">No logs found</div>
                ) : (
                  <div className="relative pl-6 space-y-2">
                    <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-300" />
                    {filteredLogs.map((log, idx) => {
                      const actionConfig = {
                        created: { color: 'bg-green-500', label: 'Package Created', textColor: 'text-green-700' },
                        expired: { color: 'bg-red-500', label: 'Package Expired', textColor: 'text-red-700' },
                        renewed: { color: 'bg-blue-500', label: 'Package Renewed', textColor: 'text-blue-700' },
                        deactivated: { color: 'bg-orange-500', label: 'Package Deactivated', textColor: 'text-orange-700' },
                        reactivated: { color: 'bg-green-500', label: 'Package Reactivated', textColor: 'text-green-700' },
                      };
                      const config = actionConfig[log.action] || { color: 'bg-gray-500', label: log.action, textColor: 'text-gray-700' };

                      return (
                        <div key={log.id || idx} className="relative">
                          <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white ${config.color}`} />
                          <div className="bg-white rounded border border-gray-200 p-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' '}
                                {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{PACKAGE_TYPE_LABELS[log.package_type]}</span>
                              {log.package_type === 'daily_basis' ? (
                                <span>| Balance: {formatCurrency(log.balance || 0)}</span>
                              ) : (
                                <>
                                  {log.action === 'created' && (log.total_breakfast > 0 || log.total_lunch > 0 || log.total_dinner > 0) && (
                                    <span>| Meals: B:{log.total_breakfast} L:{log.total_lunch} D:{log.total_dinner}</span>
                                  )}
                                  {(log.action === 'expired' || log.action === 'renewed') && (
                                    <span>| Used: B:{log.consumed_breakfast}/{log.total_breakfast} L:{log.consumed_lunch}/{log.total_lunch} D:{log.consumed_dinner}/{log.total_dinner}</span>
                                  )}
                                  {log.balance > 0 && <span>| Balance: {formatCurrency(log.balance)}</span>}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
                })()}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Renew Modal */}
      <Modal
        isOpen={renewModal.open}
        onClose={() => setRenewModal({ open: false, pkg: null })}
        title="Renew Package"
        size="2xl"
      >
        {renewModal.pkg && (
          <form onSubmit={handleRenew}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {/* Member (read-only) + Remaining meals inline */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium text-gray-700 whitespace-nowrap">{selectedMember ? getMemberDisplayName(selectedMember) : '-'}</div>
                  <div className="flex gap-2 ml-auto text-xs">
                    {renewModal.pkg.breakfast_enabled && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">B: {renewFormData.remaining?.breakfast || 0}</span>}
                    {renewModal.pkg.lunch_enabled && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">L: {renewFormData.remaining?.lunch || 0}</span>}
                    {renewModal.pkg.dinner_enabled && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">D: {renewFormData.remaining?.dinner || 0}</span>}
                  </div>
                </div>

                {/* Carry over - only for partial */}
                {renewFormData.package_type === 'partial' && (renewFormData.remaining?.breakfast > 0 || renewFormData.remaining?.lunch > 0 || renewFormData.remaining?.dinner > 0) && (
                  <label className="flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <input type="checkbox" checked={renewFormData.carry_over} onChange={(e) => setRenewFormData(prev => ({ ...prev, carry_over: e.target.checked }))} className="rounded border-gray-300 text-primary-600" />
                    <span className="font-medium">Carry over remaining meals</span>
                  </label>
                )}

                {/* Package Type + Meals row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Package Type</label>
                    <select
                      value={renewFormData.package_type}
                      onChange={(e) => setRenewFormData(prev => ({ ...prev, package_type: e.target.value, disabled_days: [], disabled_meals: {} }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {Object.entries(PACKAGE_TYPE).map(([key, value]) => (
                        <option key={value} value={value}>{PACKAGE_TYPE_LABELS[value]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Meals</label>
                    <div className="flex gap-1">
                      {['breakfast', 'lunch', 'dinner'].map(meal => (
                        <label key={meal} className={`flex-1 flex items-center justify-center px-1 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                          renewFormData[`${meal}_enabled`]
                            ? meal === 'breakfast' ? 'bg-amber-100 border-amber-400 text-amber-700'
                            : meal === 'lunch' ? 'bg-orange-100 border-orange-400 text-orange-700'
                            : 'bg-indigo-100 border-indigo-400 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-500'
                        }`}>
                          <input type="checkbox" checked={renewFormData[`${meal}_enabled`]} onChange={(e) => setRenewFormData(prev => ({ ...prev, [`${meal}_enabled`]: e.target.checked }))} className="sr-only" />
                          <span className="capitalize">{meal.slice(0, 1).toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date Range (for full_time and partial_full_time) */}
                {['full_time', 'partial_full_time'].includes(renewFormData.package_type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input type="date" value={renewFormData.start_date} onChange={(e) => setRenewFormData(prev => ({ ...prev, start_date: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input type="date" value={renewFormData.end_date} onChange={(e) => setRenewFormData(prev => ({ ...prev, end_date: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" required />
                    </div>
                  </div>
                )}

                {/* Meal Counts for partial */}
                {renewFormData.package_type === 'partial' && (
                  <div className="grid grid-cols-3 gap-2">
                    {renewFormData.breakfast_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Breakfast</label>
                        <input type="number" min="0" value={renewFormData.total_breakfast} onChange={(e) => setRenewFormData(prev => ({ ...prev, total_breakfast: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    )}
                    {renewFormData.lunch_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Lunch</label>
                        <input type="number" min="0" value={renewFormData.total_lunch} onChange={(e) => setRenewFormData(prev => ({ ...prev, total_lunch: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    )}
                    {renewFormData.dinner_enabled && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dinner</label>
                        <input type="number" min="0" value={renewFormData.total_dinner} onChange={(e) => setRenewFormData(prev => ({ ...prev, total_dinner: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Basis Configuration */}
                {renewFormData.package_type === 'daily_basis' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Initial Deposit (PKR)</label>
                      <input type="number" min="0" value={renewFormData.balance} onChange={(e) => setRenewFormData(prev => ({ ...prev, balance: e.target.value }))} placeholder="e.g., 10000" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" required />
                    </div>
                  </>
                )}

                {/* Package Price */}
                {renewFormData.package_type !== 'daily_basis' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Package Price (PKR)</label>
                    <input type="number" min="0" value={renewFormData.price} onChange={(e) => setRenewFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="e.g., 5000" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}

                {renewFormData.package_type !== 'daily_basis' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Discount (PKR)</label>
                    <input type="number" min="0" max={renewFormData.price || 0} value={renewFormData.discount} onChange={(e) => setRenewFormData(prev => ({ ...prev, discount: e.target.value }))} placeholder="e.g., 500" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}

                {/* Summary */}
                {renewFormData.package_type !== 'daily_basis' && (
                  <div className="p-2 bg-primary-50 rounded-lg border border-primary-200 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {renewFormData.breakfast_enabled && <span>B: <strong>{calculatedRenewMealCounts.breakfast}</strong></span>}
                      {renewFormData.lunch_enabled && <span>L: <strong>{calculatedRenewMealCounts.lunch}</strong></span>}
                      {renewFormData.dinner_enabled && <span>D: <strong>{calculatedRenewMealCounts.dinner}</strong></span>}
                      <span className="font-medium text-primary-700 ml-auto">Total: <strong>{calculatedRenewMealCounts.total}</strong></span>
                    </div>
                    {renewFormData.package_type === 'partial' && renewFormData.carry_over && (
                      <div className="flex flex-wrap gap-2 mt-1 pt-1 border-t border-primary-200 text-green-700 text-xs">
                        <span className="font-medium">With carry-over:</span>
                        {renewFormData.breakfast_enabled && <span>B: <strong>{(parseInt(renewFormData.total_breakfast) || 0) + (renewFormData.remaining?.breakfast || 0)}</strong></span>}
                        {renewFormData.lunch_enabled && <span>L: <strong>{(parseInt(renewFormData.total_lunch) || 0) + (renewFormData.remaining?.lunch || 0)}</strong></span>}
                        {renewFormData.dinner_enabled && <span>D: <strong>{(parseInt(renewFormData.total_dinner) || 0) + (renewFormData.remaining?.dinner || 0)}</strong></span>}
                      </div>
                    )}
                    {renewFormData.price && (
                      <div className="mt-2 pt-2 border-t border-primary-200">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between">
                            <span>Package Price:</span>
                            <strong>PKR {parseFloat(renewFormData.price || 0).toFixed(2)}</strong>
                          </div>
                          {renewFormData.discount && parseFloat(renewFormData.discount) > 0 && (
                            <>
                              <div className="flex justify-between text-red-600">
                                <span>Discount:</span>
                                <strong>- PKR {parseFloat(renewFormData.discount || 0).toFixed(2)}</strong>
                              </div>
                              <div className="flex justify-between text-sm font-bold text-primary-700 pt-1 border-t border-primary-300">
                                <span>Final Price:</span>
                                <strong>PKR {(parseFloat(renewFormData.price || 0) - parseFloat(renewFormData.discount || 0)).toFixed(2)}</strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Calendar */}
              <div className="lg:border-l lg:pl-4">
                {['full_time', 'partial_full_time'].includes(renewFormData.package_type) &&
                  renewFormData.start_date && renewFormData.end_date ? (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Select Days <span className="text-gray-400">(click to toggle)</span></label>
                      <PackageCalendar
                        startDate={renewFormData.start_date}
                        endDate={renewFormData.end_date}
                        disabledDays={renewFormData.disabled_days}
                        disabledMeals={renewFormData.disabled_meals}
                        onToggleDay={handleRenewToggleDay}
                        onToggleMeal={handleRenewToggleMeal}
                        breakfastEnabled={renewFormData.breakfast_enabled}
                        lunchEnabled={renewFormData.lunch_enabled}
                        dinnerEnabled={renewFormData.dinner_enabled}
                        readOnly={false}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {!['full_time', 'partial_full_time'].includes(renewFormData.package_type) ? (
                        <p>Calendar not available for this package type</p>
                      ) : (
                        <p>Select start and end dates to view calendar</p>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 mt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setRenewModal({ open: false, pkg: null })} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                Renew Package
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

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateModal.open}
        onClose={() => { setDeactivateModal({ open: false, pkg: null }); setDeactivateReason(''); }}
        title="Deactivate Package"
        size="sm"
      >
        {deactivateModal.pkg && (
          <form onSubmit={(e) => { e.preventDefault(); handleDeactivate(); }}>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Are you sure you want to deactivate this package? The package will be suspended temporarily and can be reactivated later.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <select
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Select a reason...</option>
                  <option value="Member requested suspension">Member requested suspension</option>
                  <option value="Payment pending">Payment pending</option>
                  <option value="Temporary leave">Temporary leave</option>
                  <option value="Under review">Under review</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {deactivateReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason..."
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-xs text-orange-800">
                    <strong>Note:</strong> Package data will be preserved. You can reactivate this package at any time.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDeactivateModal({ open: false, pkg: null }); setDeactivateReason(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
                Deactivate
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={reactivateModal.open}
        onClose={() => setReactivateModal({ open: false, pkg: null })}
        onConfirm={handleReactivate}
        title="Reactivate Package"
        message="Are you sure you want to reactivate this package? It will become active again and the member will be able to use their meals."
        confirmText="Reactivate"
        variant="success"
        loading={saving}
      />
    </div>
  );
}

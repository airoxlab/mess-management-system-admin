'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select, TextArea } from '@/components/ui/Input';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import {
  REGISTRATION_STATUS_LABELS,
  GENDER_LABELS,
  HOSTEL_STATUS_LABELS,
  MEMBERSHIP_TYPE_LABELS,
  FOOD_PREFERENCE_LABELS,
  MEAL_PLAN_LABELS,
  FACULTY_MEAL_PLAN_LABELS,
  FEE_CATEGORY_LABELS,
  DUTY_SHIFT_LABELS,
  MEMBER_PAYMENT_METHOD_LABELS,
} from '@/lib/constants';
import api from '@/lib/api-client';

const ITEMS_PER_PAGE = 15;

// Member type configuration
const MEMBER_TYPES = [
  { id: 'student', label: 'Student', apiEndpoint: '/api/student-members' },
  { id: 'faculty', label: 'Faculty', apiEndpoint: '/api/faculty-members' },
  { id: 'staff', label: 'Staff', apiEndpoint: '/api/staff-members' },
];

// Initial form data for each member type
const initialStudentFormData = {
  full_name: '',
  guardian_name: '',
  student_cnic: '',
  roll_number: '',
  department_program: '',
  date_of_birth: '',
  gender: 'male',
  contact_number: '',
  email_address: '',
  residential_address: '',
  hostel_day_scholar: 'day_scholar',
  membership_type: 'full_time',
  preferred_meal_plan: [],
  food_preference: 'both',
  has_food_allergies: false,
  food_allergies_details: '',
  medical_conditions: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  payment_method: 'cash',
  payment_other_details: '',
  complaint_policy_acknowledged: false,
  membership_id: '',
  fee_received: '',
  receipt_no: '',
  status: 'pending',
};

const initialFacultyFormData = {
  full_name: '',
  father_name: '',
  cnic_no: '',
  employee_id: '',
  department: '',
  designation: '',
  contact_number: '',
  email_address: '',
  residential_address: '',
  date_of_birth: '',
  membership_type: 'full_time',
  preferred_meal_plan: 'lunch',
  food_preference: 'both',
  has_food_allergies: false,
  food_allergies_details: '',
  communication_consent: false,
  complaint_policy_acknowledged: false,
  membership_id: '',
  fee_category: 'standard',
  receipt_no: '',
  status: 'pending',
};

const initialStaffFormData = {
  full_name: '',
  father_name: '',
  cnic_no: '',
  employee_id: '',
  department_section: '',
  designation: '',
  contact_number: '',
  email_address: '',
  residential_address: '',
  date_of_birth: '',
  duty_shift: 'morning',
  membership_type: 'full_time',
  meal_timing_preference: [],
  food_preference: 'both',
  food_allergies_medical_needs: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  fee_payment_method: 'cash',
  fee_payment_other_details: '',
  complaint_policy_acknowledged: false,
  membership_id: '',
  membership_start_date: '',
  fee_amount: '',
  additional_discount: '',
  receipt_no: '',
  status: 'pending',
};

export default function MembersPage() {
  // All members from all types
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Meal timings from organization settings
  const [mealTimings, setMealTimings] = useState({
    breakfast_start: '07:00',
    breakfast_end: '09:00',
    lunch_start: '12:00',
    lunch_end: '14:00',
    dinner_start: '19:00',
    dinner_end: '21:00',
  });

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, member: null });
  const [addEditModal, setAddEditModal] = useState({ open: false, member: null, mode: 'add', memberType: 'student' });
  const [deleteModal, setDeleteModal] = useState({ open: false, member: null });
  const [statusModal, setStatusModal] = useState({ open: false, member: null });

  // Form states
  const [formData, setFormData] = useState(initialStudentFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Sorting
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Format 24h time to 12h AM/PM format
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12.toString().padStart(2, '0')}:${minutes} ${period}`;
  };

  // Get meal time label
  const getMealTimeLabel = (meal) => {
    const start = mealTimings[`${meal}_start`];
    const end = mealTimings[`${meal}_end`];
    if (start && end) {
      return `${formatTime12h(start)} - ${formatTime12h(end)}`;
    }
    return '';
  };

  // Format meal plan display for view modal
  const formatMealPlanDisplay = (mealPlanArray) => {
    if (!mealPlanArray || !Array.isArray(mealPlanArray) || mealPlanArray.length === 0) {
      return '-';
    }

    // Filter valid meals only (breakfast, lunch, dinner)
    const validMeals = ['breakfast', 'lunch', 'dinner'];
    const selectedMeals = mealPlanArray.filter(m => validMeals.includes(m));

    if (selectedMeals.length === 0) {
      return '-';
    }

    // Check if Full Day (all 3 meals selected)
    const isFullDay = selectedMeals.length === 3 &&
      validMeals.every(m => selectedMeals.includes(m));

    if (isFullDay) {
      return (
        <div className="text-right">
          <div className="font-medium text-gray-900">Full Day</div>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            <div>Breakfast: {getMealTimeLabel('breakfast')}</div>
            <div>Lunch: {getMealTimeLabel('lunch')}</div>
            <div>Dinner: {getMealTimeLabel('dinner')}</div>
          </div>
        </div>
      );
    }

    // Show only selected meals in order
    const orderedMeals = validMeals.filter(m => selectedMeals.includes(m));
    return (
      <div className="text-right">
        {orderedMeals.map((meal, index) => (
          <div key={meal} className={index > 0 ? 'mt-1' : ''}>
            <span className="font-medium">{MEAL_PLAN_LABELS[meal]}</span>
            <span className="text-xs text-gray-500 ml-1">({getMealTimeLabel(meal)})</span>
          </div>
        ))}
      </div>
    );
  };

  // Load organization settings for meal timings
  const loadMealTimings = async () => {
    try {
      const response = await api.get(`/api/organization?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (data.organization?.settings) {
          setMealTimings({
            breakfast_start: data.organization.settings.breakfast_start || '07:00',
            breakfast_end: data.organization.settings.breakfast_end || '09:00',
            lunch_start: data.organization.settings.lunch_start || '12:00',
            lunch_end: data.organization.settings.lunch_end || '14:00',
            dinner_start: data.organization.settings.dinner_start || '19:00',
            dinner_end: data.organization.settings.dinner_end || '21:00',
          });
        }
      }
    } catch (error) {
      console.error('Error loading meal timings:', error);
    }
  };

  // Load all members from all types
  useEffect(() => {
    loadAllMembers();
    loadMealTimings();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const loadAllMembers = async () => {
    try {
      setLoading(true);

      // Fetch from all three APIs in parallel
      const [studentsRes, facultyRes, staffRes] = await Promise.all([
        api.get('/api/student-members'),
        api.get('/api/faculty-members'),
        api.get('/api/staff-members'),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : { members: [] };
      const facultyData = facultyRes.ok ? await facultyRes.json() : { members: [] };
      const staffData = staffRes.ok ? await staffRes.json() : { members: [] };

      // Add member_type to each record
      const students = (studentsData.members || []).map(m => ({ ...m, member_type: 'student' }));
      const faculty = (facultyData.members || []).map(m => ({ ...m, member_type: 'faculty' }));
      const staff = (staffData.members || []).map(m => ({ ...m, member_type: 'staff' }));

      // Combine all members
      const combined = [...students, ...faculty, ...staff];
      setAllMembers(combined);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get display name based on member type
  const getMemberName = (member) => member.full_name || '-';

  // Get ID based on member type
  const getMemberId = (member) => {
    if (member.member_type === 'student') return member.roll_number;
    return member.employee_id;
  };

  // Get department based on member type
  const getDepartment = (member) => {
    if (member.member_type === 'student') return member.department_program;
    if (member.member_type === 'faculty') return member.department;
    return member.department_section;
  };

  // Get contact based on member type
  const getContact = (member) => member.contact_number || '-';

  // Filter members
  const filteredMembers = allMembers.filter((member) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      getMemberName(member)?.toLowerCase().includes(query) ||
      getMemberId(member)?.toLowerCase().includes(query) ||
      getDepartment(member)?.toLowerCase().includes(query) ||
      member.membership_id?.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesType = typeFilter === 'all' || member.member_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort members
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aVal, bVal;

    if (sortColumn === 'full_name') {
      aVal = getMemberName(a);
      bVal = getMemberName(b);
    } else if (sortColumn === 'member_id') {
      aVal = getMemberId(a);
      bVal = getMemberId(b);
    } else {
      aVal = a[sortColumn];
      bVal = b[sortColumn];
    }

    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (sortColumn === 'created_at' || sortColumn === 'date_of_birth') {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Sort handler
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Get initial form data based on member type
  const getInitialFormData = (type) => {
    switch (type) {
      case 'faculty':
        return initialFacultyFormData;
      case 'staff':
        return initialStaffFormData;
      default:
        return initialStudentFormData;
    }
  };

  // Get API endpoint based on member type
  const getApiEndpoint = (type) => {
    return MEMBER_TYPES.find(t => t.id === type)?.apiEndpoint || '/api/student-members';
  };

  // Open add modal
  const openAddModal = (type = 'student') => {
    setFormData(getInitialFormData(type));
    setFormErrors({});
    setAddEditModal({ open: true, member: null, mode: 'add', memberType: type });
  };

  // Open edit modal
  const openEditModal = (member) => {
    // Get the initial form data for this member type to ensure all fields exist
    const initialData = getInitialFormData(member.member_type);
    let data = { ...initialData, ...member };

    // Handle date formatting
    if (data.date_of_birth) {
      data.date_of_birth = data.date_of_birth.split('T')[0];
    }
    if (data.membership_start_date) {
      data.membership_start_date = data.membership_start_date.split('T')[0];
    }

    // Ensure arrays are properly initialized (for meal plans)
    if (member.member_type === 'student') {
      if (!Array.isArray(data.preferred_meal_plan)) {
        data.preferred_meal_plan = data.preferred_meal_plan ? [data.preferred_meal_plan] : [];
      }
    }
    if (member.member_type === 'staff') {
      if (!Array.isArray(data.meal_timing_preference)) {
        data.meal_timing_preference = data.meal_timing_preference ? [data.meal_timing_preference] : [];
      }
    }

    // Ensure boolean fields are properly set
    data.has_food_allergies = data.has_food_allergies === true || data.has_food_allergies === 'true';
    data.communication_consent = data.communication_consent === true || data.communication_consent === 'true';
    data.complaint_policy_acknowledged = data.complaint_policy_acknowledged === true || data.complaint_policy_acknowledged === 'true';

    setFormData(data);
    setFormErrors({});
    setAddEditModal({ open: true, member, mode: 'edit', memberType: member.member_type });
  };

  // Close add/edit modal
  const closeAddEditModal = () => {
    setAddEditModal({ open: false, member: null, mode: 'add', memberType: 'student' });
    setFormData(initialStudentFormData);
    setFormErrors({});
  };

  // Format CNIC with dashes (XXXXX-XXXXXXX-X)
  const formatCNIC = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as XXXXX-XXXXXXX-X
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.substring(0, 5);
    }
    if (digits.length > 5) {
      formatted += '-' + digits.substring(5, 12);
    }
    if (digits.length > 12) {
      formatted += '-' + digits.substring(12, 13);
    }

    return formatted;
  };

  // Format phone number with dashes (XXXX-XXXXXXX)
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as XXXX-XXXXXXX
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.substring(0, 4);
    }
    if (digits.length > 4) {
      formatted += '-' + digits.substring(4, 11);
    }

    return formatted;
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Auto-format CNIC fields
    let processedValue = value;
    if (name === 'student_cnic' || name === 'cnic_no') {
      processedValue = formatCNIC(value);
    }

    // Auto-format phone number fields
    if (name === 'contact_number' || name === 'emergency_contact_number') {
      processedValue = formatPhoneNumber(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle multi-select change (for meal plans)
  const handleMultiSelectChange = (name, value) => {
    setFormData(prev => {
      const currentValues = prev[name] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [name]: newValues };
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const memberType = addEditModal.memberType;

    if (memberType === 'student') {
      if (!formData.full_name?.trim()) errors.full_name = 'Full name is required';
      if (!formData.guardian_name?.trim()) errors.guardian_name = 'Guardian name is required';
      if (!formData.student_cnic?.trim()) errors.student_cnic = 'CNIC is required';
      if (!formData.roll_number?.trim()) errors.roll_number = 'Roll number is required';
      if (!formData.department_program?.trim()) errors.department_program = 'Department/Program is required';
      if (!formData.gender) errors.gender = 'Gender is required';
      // Contact number is required only for Male students
      if (formData.gender === 'male' && !formData.contact_number?.trim()) {
        errors.contact_number = 'Contact number is required for male students';
      }
      if (!formData.email_address?.trim()) errors.email_address = 'Email address is required';
      if (!formData.residential_address?.trim()) errors.residential_address = 'Address is required';
      if (!formData.hostel_day_scholar) errors.hostel_day_scholar = 'Hostel/Day Scholar is required';
      if (!formData.membership_type) errors.membership_type = 'Membership type is required';
      if (!formData.preferred_meal_plan?.length) errors.preferred_meal_plan = 'Select at least one meal plan';
      if (!formData.food_preference) errors.food_preference = 'Food preference is required';
      if (!formData.emergency_contact_name?.trim()) errors.emergency_contact_name = 'Emergency contact name is required';
      if (!formData.emergency_contact_number?.trim()) errors.emergency_contact_number = 'Emergency contact number is required';
      if (!formData.payment_method) errors.payment_method = 'Payment method is required';
      if (!formData.complaint_policy_acknowledged) errors.complaint_policy_acknowledged = 'You must acknowledge the complaint policy';
    } else if (memberType === 'faculty') {
      if (!formData.full_name?.trim()) errors.full_name = 'Full name is required';
      if (!formData.department?.trim()) errors.department = 'Department is required';
      if (!formData.designation?.trim()) errors.designation = 'Designation is required';
      if (!formData.employee_id?.trim()) errors.employee_id = 'Employee ID is required';
      if (!formData.contact_number?.trim()) errors.contact_number = 'Contact number is required';
      if (!formData.email_address?.trim()) errors.email_address = 'Email address is required';
      if (!formData.membership_type) errors.membership_type = 'Membership type is required';
      if (!formData.preferred_meal_plan) errors.preferred_meal_plan = 'Preferred meal plan is required';
      if (!formData.food_preference) errors.food_preference = 'Food preference is required';
      if (!formData.complaint_policy_acknowledged) errors.complaint_policy_acknowledged = 'You must acknowledge the complaint policy';
    } else {
      if (!formData.full_name?.trim()) errors.full_name = 'Full name is required';
      if (!formData.father_name?.trim()) errors.father_name = 'Father name is required';
      if (!formData.cnic_no?.trim()) errors.cnic_no = 'CNIC is required';
      if (!formData.employee_id?.trim()) errors.employee_id = 'Employee ID is required';
      if (!formData.department_section?.trim()) errors.department_section = 'Department/Section is required';
      if (!formData.designation?.trim()) errors.designation = 'Designation is required';
      if (!formData.duty_shift) errors.duty_shift = 'Duty shift is required';
      if (!formData.contact_number?.trim()) errors.contact_number = 'Contact number is required';
      if (!formData.residential_address?.trim()) errors.residential_address = 'Address is required';
      if (!formData.email_address?.trim()) errors.email_address = 'Email address is required';
      if (!formData.membership_type) errors.membership_type = 'Membership type is required';
      if (!formData.meal_timing_preference?.length) errors.meal_timing_preference = 'Select at least one meal timing';
      if (!formData.food_preference) errors.food_preference = 'Food preference is required';
      if (!formData.fee_payment_method) errors.fee_payment_method = 'Fee payment method is required';
      if (!formData.complaint_policy_acknowledged) errors.complaint_policy_acknowledged = 'You must acknowledge the complaint policy';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const endpoint = getApiEndpoint(addEditModal.memberType);
      const isEdit = addEditModal.mode === 'edit';
      const url = isEdit ? `${endpoint}/${addEditModal.member.id}` : endpoint;

      // Remove member_type from form data before sending
      const { member_type, ...submitData } = formData;

      const response = isEdit
        ? await api.put(url, submitData)
        : await api.post(url, submitData);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save member');
      }

      toast.success(isEdit ? 'Member updated successfully!' : 'Member created successfully!');

      // Update state directly without reloading
      if (isEdit) {
        // Update existing member in state
        setAllMembers(prev => prev.map(m =>
          m.id === addEditModal.member.id && m.member_type === addEditModal.memberType
            ? { ...data.member, member_type: addEditModal.memberType }
            : m
        ));
      } else {
        // Add new member to state
        const newMember = { ...data.member, member_type: addEditModal.memberType };
        setAllMembers(prev => [newMember, ...prev]);
      }
      closeAddEditModal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteModal.member) return;

    try {
      setDeleting(true);
      const endpoint = getApiEndpoint(deleteModal.member.member_type);
      const response = await api.delete(`${endpoint}/${deleteModal.member.id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete member');
      }

      toast.success('Member deleted successfully');
      setAllMembers(prev => prev.filter(m => m.id !== deleteModal.member.id));
      setDeleteModal({ open: false, member: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!statusModal.member) return;

    try {
      setUpdatingStatus(true);
      const endpoint = getApiEndpoint(statusModal.member.member_type);
      const response = await api.put(`${endpoint}/${statusModal.member.id}`, { status: newStatus });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success(`Status updated to ${newStatus}`);
      setAllMembers(prev => prev.map(m =>
        m.id === statusModal.member.id && m.member_type === statusModal.member.member_type
          ? { ...m, status: newStatus }
          : m
      ));
      setStatusModal({ open: false, member: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'student':
        return 'bg-blue-100 text-blue-700';
      case 'faculty':
        return 'bg-purple-100 text-purple-700';
      case 'staff':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Render form fields based on member type
  const renderFormFields = () => {
    const memberType = addEditModal.memberType;

    if (memberType === 'student') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleFormChange} error={formErrors.full_name} required />
            <Input label="Guardian Name" name="guardian_name" value={formData.guardian_name} onChange={handleFormChange} error={formErrors.guardian_name} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Student CNIC" name="student_cnic" value={formData.student_cnic} onChange={handleFormChange} error={formErrors.student_cnic} placeholder="38101-9802589-1" maxLength={15} required />
            <Input label="Roll Number" name="roll_number" value={formData.roll_number} onChange={handleFormChange} error={formErrors.roll_number} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Department/Program" name="department_program" value={formData.department_program} onChange={handleFormChange} error={formErrors.department_program} required />
            <Input label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Gender" name="gender" value={formData.gender} onChange={handleFormChange} error={formErrors.gender} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} required />
            <Select label="Hostel/Day Scholar" name="hostel_day_scholar" value={formData.hostel_day_scholar} onChange={handleFormChange} error={formErrors.hostel_day_scholar} options={[{ value: 'hostel', label: 'Hostel' }, { value: 'day_scholar', label: 'Day Scholar' }]} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Contact Number" name="contact_number" type="tel" value={formData.contact_number} onChange={handleFormChange} error={formErrors.contact_number} placeholder="0300-1234567" maxLength={12} required={formData.gender === 'male'} />
            <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleFormChange} error={formErrors.email_address} required />
          </div>
          <TextArea label="Residential Address" name="residential_address" value={formData.residential_address} onChange={handleFormChange} error={formErrors.residential_address} rows={2} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Membership Type" name="membership_type" value={formData.membership_type} onChange={handleFormChange} error={formErrors.membership_type} options={[{ value: 'full_time', label: 'Full Time' }, { value: 'partial', label: 'Partial' }]} required />
            <Select label="Food Preference" name="food_preference" value={formData.food_preference} onChange={handleFormChange} error={formErrors.food_preference} options={[{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'both', label: 'Both' }]} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Meal Plan <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.preferred_meal_plan?.length === 3 && ['breakfast', 'lunch', 'dinner'].every(m => formData.preferred_meal_plan?.includes(m))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, preferred_meal_plan: ['breakfast', 'lunch', 'dinner'] }));
                    } else {
                      setFormData(prev => ({ ...prev, preferred_meal_plan: [] }));
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 font-medium">Full Day (All Meals)</span>
              </label>
              {['breakfast', 'lunch', 'dinner'].map((meal) => (
                <label key={meal} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.preferred_meal_plan?.includes(meal)} onChange={() => handleMultiSelectChange('preferred_meal_plan', meal)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-sm text-gray-700 font-medium">{MEAL_PLAN_LABELS[meal]}</span>
                    <span className="text-xs text-gray-500">({getMealTimeLabel(meal)})</span>
                  </div>
                </label>
              ))}
            </div>
            {formErrors.preferred_meal_plan && <p className="mt-1 text-sm text-red-600">{formErrors.preferred_meal_plan}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleFormChange} error={formErrors.emergency_contact_name} required />
            <Input label="Emergency Contact Number" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleFormChange} error={formErrors.emergency_contact_number} placeholder="0300-1234567" maxLength={12} required />
          </div>
          <Select label="Payment Method" name="payment_method" value={formData.payment_method} onChange={handleFormChange} error={formErrors.payment_method} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }, { value: 'other', label: 'Other' }]} required />
          <div>
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                name="complaint_policy_acknowledged"
                checked={formData.complaint_policy_acknowledged}
                onChange={handleFormChange}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  I acknowledge the Complaint Policy <span className="text-red-500">*</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  By checking this box, I confirm that I have read and agree to the cafeteria complaint policy.
                </p>
              </div>
            </label>
            {formErrors.complaint_policy_acknowledged && <p className="mt-1 text-sm text-red-600">{formErrors.complaint_policy_acknowledged}</p>}
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Section</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Membership ID" name="membership_id" value={formData.membership_id} onChange={handleFormChange} />
              <Input label="Fee Received" name="fee_received" type="number" value={formData.fee_received} onChange={handleFormChange} />
              <Input label="Receipt No" name="receipt_no" value={formData.receipt_no} onChange={handleFormChange} />
            </div>
            <div className="mt-3">
              <Select label="Status" name="status" value={formData.status} onChange={handleFormChange} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            </div>
          </div>
        </>
      );
    } else if (memberType === 'faculty') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleFormChange} error={formErrors.full_name} required />
            <Input label="Father Name" name="father_name" value={formData.father_name} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="CNIC No" name="cnic_no" value={formData.cnic_no} onChange={handleFormChange} placeholder="38101-9802589-1" maxLength={15} />
            <Input label="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleFormChange} error={formErrors.employee_id} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Department" name="department" value={formData.department} onChange={handleFormChange} error={formErrors.department} required />
            <Input label="Designation" name="designation" value={formData.designation} onChange={handleFormChange} error={formErrors.designation} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Contact Number" name="contact_number" type="tel" value={formData.contact_number} onChange={handleFormChange} error={formErrors.contact_number} placeholder="0300-1234567" maxLength={12} required />
            <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleFormChange} error={formErrors.email_address} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea label="Residential Address" name="residential_address" value={formData.residential_address} onChange={handleFormChange} rows={2} />
            <Input label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Membership Type" name="membership_type" value={formData.membership_type} onChange={handleFormChange} error={formErrors.membership_type} options={[{ value: 'full_time', label: 'Full Time' }, { value: 'partial', label: 'Partial' }, { value: 'day_to_day', label: 'Day to Day' }]} required />
            <Select label="Preferred Meal Plan" name="preferred_meal_plan" value={formData.preferred_meal_plan} onChange={handleFormChange} error={formErrors.preferred_meal_plan} options={[{ value: 'lunch', label: 'Lunch Only' }, { value: 'dinner', label: 'Dinner Only' }, { value: 'full_day', label: 'Full Day' }]} required />
          </div>
          <Select label="Food Preference" name="food_preference" value={formData.food_preference} onChange={handleFormChange} error={formErrors.food_preference} options={[{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'both', label: 'Both' }]} required />
          <div>
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                name="complaint_policy_acknowledged"
                checked={formData.complaint_policy_acknowledged}
                onChange={handleFormChange}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  I acknowledge the Complaint Policy <span className="text-red-500">*</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  By checking this box, I confirm that I have read and agree to the cafeteria complaint policy.
                </p>
              </div>
            </label>
            {formErrors.complaint_policy_acknowledged && <p className="mt-1 text-sm text-red-600">{formErrors.complaint_policy_acknowledged}</p>}
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Section</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Membership ID" name="membership_id" value={formData.membership_id} onChange={handleFormChange} />
              <Select label="Fee Category" name="fee_category" value={formData.fee_category} onChange={handleFormChange} options={[{ value: 'subsidized', label: 'Subsidized' }, { value: 'standard', label: 'Standard' }]} />
              <Input label="Receipt No" name="receipt_no" value={formData.receipt_no} onChange={handleFormChange} />
            </div>
            <div className="mt-3">
              <Select label="Status" name="status" value={formData.status} onChange={handleFormChange} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            </div>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleFormChange} error={formErrors.full_name} required />
            <Input label="Father Name" name="father_name" value={formData.father_name} onChange={handleFormChange} error={formErrors.father_name} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="CNIC No" name="cnic_no" value={formData.cnic_no} onChange={handleFormChange} error={formErrors.cnic_no} placeholder="38101-9802589-1" maxLength={15} required />
            <Input label="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleFormChange} error={formErrors.employee_id} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Department/Section" name="department_section" value={formData.department_section} onChange={handleFormChange} error={formErrors.department_section} required />
            <Input label="Designation" name="designation" value={formData.designation} onChange={handleFormChange} error={formErrors.designation} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Contact Number" name="contact_number" type="tel" value={formData.contact_number} onChange={handleFormChange} error={formErrors.contact_number} placeholder="0300-1234567" maxLength={12} required />
            <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleFormChange} error={formErrors.email_address} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea label="Residential Address" name="residential_address" value={formData.residential_address} onChange={handleFormChange} error={formErrors.residential_address} rows={2} required />
            <Input label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Duty Shift" name="duty_shift" value={formData.duty_shift} onChange={handleFormChange} error={formErrors.duty_shift} options={[{ value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }, { value: 'night', label: 'Night' }, { value: 'full_day', label: 'Full Day' }]} required />
            <Select label="Membership Type" name="membership_type" value={formData.membership_type} onChange={handleFormChange} error={formErrors.membership_type} options={[{ value: 'full_time', label: 'Full Time' }, { value: 'partial', label: 'Partial' }]} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meal Timing Preference <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.meal_timing_preference?.length === 3 && ['breakfast', 'lunch', 'dinner'].every(m => formData.meal_timing_preference?.includes(m))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, meal_timing_preference: ['breakfast', 'lunch', 'dinner'] }));
                    } else {
                      setFormData(prev => ({ ...prev, meal_timing_preference: [] }));
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 font-medium">Full Day (All Meals)</span>
              </label>
              {['breakfast', 'lunch', 'dinner'].map((meal) => (
                <label key={meal} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={formData.meal_timing_preference?.includes(meal)} onChange={() => handleMultiSelectChange('meal_timing_preference', meal)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-sm text-gray-700 font-medium">{MEAL_PLAN_LABELS[meal]}</span>
                    <span className="text-xs text-gray-500">({getMealTimeLabel(meal)})</span>
                  </div>
                </label>
              ))}
            </div>
            {formErrors.meal_timing_preference && <p className="mt-1 text-sm text-red-600">{formErrors.meal_timing_preference}</p>}
          </div>
          <Select label="Food Preference" name="food_preference" value={formData.food_preference} onChange={handleFormChange} error={formErrors.food_preference} options={[{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'both', label: 'Both' }]} required />
          <Select label="Fee Payment Method" name="fee_payment_method" value={formData.fee_payment_method} onChange={handleFormChange} error={formErrors.fee_payment_method} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }, { value: 'other', label: 'Other' }]} required />
          <div>
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                name="complaint_policy_acknowledged"
                checked={formData.complaint_policy_acknowledged}
                onChange={handleFormChange}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  I acknowledge the Complaint Policy <span className="text-red-500">*</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  By checking this box, I confirm that I have read and agree to the cafeteria complaint policy.
                </p>
              </div>
            </label>
            {formErrors.complaint_policy_acknowledged && <p className="mt-1 text-sm text-red-600">{formErrors.complaint_policy_acknowledged}</p>}
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Section</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Membership ID" name="membership_id" value={formData.membership_id} onChange={handleFormChange} />
              <Input label="Membership Start Date" name="membership_start_date" type="date" value={formData.membership_start_date} onChange={handleFormChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <Input label="Fee Amount" name="fee_amount" type="number" value={formData.fee_amount} onChange={handleFormChange} />
              <Input label="Additional Discount" name="additional_discount" type="number" value={formData.additional_discount} onChange={handleFormChange} />
              <Input label="Receipt No" name="receipt_no" value={formData.receipt_no} onChange={handleFormChange} />
            </div>
            <div className="mt-3">
              <Select label="Status" name="status" value={formData.status} onChange={handleFormChange} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            </div>
          </div>
        </>
      );
    }
  };

  // Render view modal content
  const renderViewModalContent = () => {
    const member = viewModal.member;
    if (!member) return null;

    const DetailRow = ({ label, value, badge = false, badgeColor = '' }) => (
      <div className="flex justify-between items-center py-2 border-b border-gray-200">
        <span className="text-sm text-gray-500">{label}</span>
        {badge ? (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>{value || '-'}</span>
        ) : (
          <span className="font-medium text-gray-900 text-right max-w-[60%]">{value || '-'}</span>
        )}
      </div>
    );

    if (member.member_type === 'student') {
      return (
        <div className="space-y-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
            <DetailRow label="Full Name" value={member.full_name} />
            <DetailRow label="Guardian Name" value={member.guardian_name} />
            <DetailRow label="CNIC" value={member.student_cnic} />
            <DetailRow label="Roll Number" value={member.roll_number} />
            <DetailRow label="Date of Birth" value={formatDate(member.date_of_birth)} />
            <DetailRow label="Gender" value={GENDER_LABELS[member.gender]} />
            <DetailRow label="Contact" value={member.contact_number} />
            <DetailRow label="Email" value={member.email_address} />
            <DetailRow label="Address" value={member.residential_address} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Membership Details</h4>
            <DetailRow label="Department/Program" value={member.department_program} />
            <DetailRow label="Hostel/Day Scholar" value={HOSTEL_STATUS_LABELS[member.hostel_day_scholar]} />
            <DetailRow label="Membership Type" value={MEMBERSHIP_TYPE_LABELS[member.membership_type]} badge badgeColor="bg-blue-100 text-blue-700" />
            <div className="flex justify-between items-start py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Meal Plan</span>
              {formatMealPlanDisplay(member.preferred_meal_plan)}
            </div>
            <DetailRow label="Food Preference" value={FOOD_PREFERENCE_LABELS[member.food_preference]} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Details</h4>
            <DetailRow label="Membership ID" value={member.membership_id} />
            <DetailRow label="Fee Received" value={member.fee_received ? `Rs. ${member.fee_received}` : '-'} />
            <DetailRow label="Receipt No" value={member.receipt_no} />
            <DetailRow label="Status" value={REGISTRATION_STATUS_LABELS[member.status]} badge badgeColor={getStatusBadgeColor(member.status)} />
          </div>
        </div>
      );
    } else if (member.member_type === 'faculty') {
      return (
        <div className="space-y-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
            <DetailRow label="Full Name" value={member.full_name} />
            <DetailRow label="Father Name" value={member.father_name} />
            <DetailRow label="CNIC" value={member.cnic_no} />
            <DetailRow label="Employee ID" value={member.employee_id} />
            <DetailRow label="Date of Birth" value={formatDate(member.date_of_birth)} />
            <DetailRow label="Contact" value={member.contact_number} />
            <DetailRow label="Email" value={member.email_address} />
            <DetailRow label="Address" value={member.residential_address} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Work & Membership</h4>
            <DetailRow label="Department" value={member.department} />
            <DetailRow label="Designation" value={member.designation} />
            <DetailRow label="Membership Type" value={MEMBERSHIP_TYPE_LABELS[member.membership_type]} badge badgeColor="bg-blue-100 text-blue-700" />
            <DetailRow label="Meal Plan" value={FACULTY_MEAL_PLAN_LABELS[member.preferred_meal_plan]} />
            <DetailRow label="Food Preference" value={FOOD_PREFERENCE_LABELS[member.food_preference]} />
            <DetailRow label="Fee Category" value={FEE_CATEGORY_LABELS[member.fee_category]} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Details</h4>
            <DetailRow label="Membership ID" value={member.membership_id} />
            <DetailRow label="Receipt No" value={member.receipt_no} />
            <DetailRow label="Status" value={REGISTRATION_STATUS_LABELS[member.status]} badge badgeColor={getStatusBadgeColor(member.status)} />
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
            <DetailRow label="Full Name" value={member.full_name} />
            <DetailRow label="Father Name" value={member.father_name} />
            <DetailRow label="CNIC" value={member.cnic_no} />
            <DetailRow label="Employee ID" value={member.employee_id} />
            <DetailRow label="Date of Birth" value={formatDate(member.date_of_birth)} />
            <DetailRow label="Contact" value={member.contact_number} />
            <DetailRow label="Email" value={member.email_address} />
            <DetailRow label="Address" value={member.residential_address} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Work & Membership</h4>
            <DetailRow label="Department/Section" value={member.department_section} />
            <DetailRow label="Designation" value={member.designation} />
            <DetailRow label="Duty Shift" value={DUTY_SHIFT_LABELS[member.duty_shift]} badge badgeColor="bg-purple-100 text-purple-700" />
            <DetailRow label="Membership Type" value={MEMBERSHIP_TYPE_LABELS[member.membership_type]} badge badgeColor="bg-blue-100 text-blue-700" />
            <div className="flex justify-between items-start py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Meal Timing</span>
              {formatMealPlanDisplay(member.meal_timing_preference)}
            </div>
            <DetailRow label="Food Preference" value={FOOD_PREFERENCE_LABELS[member.food_preference]} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Admin Details</h4>
            <DetailRow label="Membership ID" value={member.membership_id} />
            <DetailRow label="Fee Amount" value={member.fee_amount ? `Rs. ${member.fee_amount}` : '-'} />
            <DetailRow label="Receipt No" value={member.receipt_no} />
            <DetailRow label="Status" value={REGISTRATION_STATUS_LABELS[member.status]} badge badgeColor={getStatusBadgeColor(member.status)} />
          </div>
        </div>
      );
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Members</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage student, faculty, and staff members</p>
        </div>
        <Button onClick={() => openAddModal('student')}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 mb-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadAllMembers}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('full_name')}>
                <div className="flex items-center">Name<SortIcon column="full_name" /></div>
              </th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={8} className="px-2 py-6 text-center text-gray-500">Loading...</td></tr>
            ) : paginatedMembers.length === 0 ? (
              <tr><td colSpan={8} className="px-2 py-6 text-center text-gray-500">{hasActiveFilters ? 'No members found matching your filters' : 'No members yet. Add your first member!'}</td></tr>
            ) : (
              paginatedMembers.map((member, index) => (
                <tr key={`${member.member_type}-${member.id}`} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-sm text-gray-500">{startIndex + index + 1}</td>
                  <td className="px-2 py-1.5 text-sm font-medium text-gray-900">{getMemberName(member)}</td>
                  <td className="px-2 py-1.5 text-sm">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded capitalize ${getTypeBadgeColor(member.member_type)}`}>
                      {member.member_type}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-sm">
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{getMemberId(member)}</code>
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-600">{getDepartment(member)}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-600">{getContact(member)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(member.status)}`}>
                      {REGISTRATION_STATUS_LABELS[member.status] || member.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => setViewModal({ open: true, member })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => openEditModal(member)} className="p-1 text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setStatusModal({ open: true, member })} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Change Status">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      </button>
                      <button onClick={() => setDeleteModal({ open: true, member })} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
          Showing {filteredMembers.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-1 order-1 sm:order-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 sm:p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm text-gray-600 px-2">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 sm:p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, member: null })} title={`${viewModal.member?.member_type?.charAt(0).toUpperCase()}${viewModal.member?.member_type?.slice(1) || ''} Details`} size="lg">
        <div className="max-h-[70vh] overflow-y-auto">{renderViewModalContent()}</div>
        <div className="flex gap-3 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={() => setViewModal({ open: false, member: null })} className="flex-1">Close</Button>
          <Button onClick={() => { const member = viewModal.member; setViewModal({ open: false, member: null }); openEditModal(member); }} className="flex-1">Edit</Button>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={addEditModal.open} onClose={closeAddEditModal} title={addEditModal.mode === 'edit' ? `Edit ${addEditModal.memberType?.charAt(0).toUpperCase()}${addEditModal.memberType?.slice(1) || ''}` : 'Add Member'} size="xl">
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto space-y-4 scrollbar-hide">
            {/* Member Type Selection - Only show in add mode */}
            {addEditModal.mode === 'add' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Member Type *</label>
                <div className="flex space-x-2">
                  {MEMBER_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setFormData(getInitialFormData(type.id));
                        setFormErrors({});
                        setAddEditModal(prev => ({ ...prev, memberType: type.id }));
                      }}
                      className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        addEditModal.memberType === type.id
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
              </div>
            )}

            {/* Form Fields */}
            {renderFormFields()}
          </div>
          <div className="flex gap-4 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={closeAddEditModal} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">{addEditModal.mode === 'edit' ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, member: null })} onConfirm={handleDelete} title="Delete Member" message={`Are you sure you want to delete "${deleteModal.member?.full_name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" loading={deleting} />

      {/* Status Change Modal */}
      <Modal isOpen={statusModal.open} onClose={() => setStatusModal({ open: false, member: null })} title="Change Status" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Change status for <span className="font-medium">{statusModal.member?.full_name}</span>
          </p>
          <p className="text-xs text-gray-500">
            Current status: <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(statusModal.member?.status)}`}>{REGISTRATION_STATUS_LABELS[statusModal.member?.status]}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('pending')}
              disabled={updatingStatus || statusModal.member?.status === 'pending'}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${statusModal.member?.status === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-6 h-6 text-yellow-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-yellow-700">Pending</span>
            </button>
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={updatingStatus || statusModal.member?.status === 'approved'}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${statusModal.member?.status === 'approved' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-6 h-6 text-green-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-green-700">Approved</span>
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={updatingStatus || statusModal.member?.status === 'rejected'}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${statusModal.member?.status === 'rejected' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-6 h-6 text-red-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-red-700">Rejected</span>
            </button>
          </div>
          {updatingStatus && (
            <div className="flex items-center justify-center py-2">
              <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-sm text-gray-600">Updating...</span>
            </div>
          )}
          <div className="pt-3 border-t">
            <Button variant="outline" onClick={() => setStatusModal({ open: false, member: null })} className="w-full" disabled={updatingStatus}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

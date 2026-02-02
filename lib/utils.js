import { format, parseISO, isToday, isValid } from 'date-fns';

// Format date for display
export function formatDate(date, formatStr = 'MMM dd, yyyy') {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatStr) : '';
}

// Format time for display
export function formatTime(time, formatStr = 'hh:mm a') {
  if (!time) return '';

  // Handle time string (HH:mm:ss)
  if (typeof time === 'string' && time.includes(':')) {
    const today = new Date();
    const [hours, minutes, seconds] = time.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    return format(today, formatStr);
  }

  const dateObj = typeof time === 'string' ? parseISO(time) : time;
  return isValid(dateObj) ? format(dateObj, formatStr) : '';
}

// Format date and time together
export function formatDateTime(date, formatStr = 'MMM dd, yyyy hh:mm a') {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatStr) : '';
}

// Generate member ID (e.g., LIMHS-0001)
export function generateMemberId(prefix = 'LIMHS', sequence) {
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// Format currency
export function formatCurrency(amount, currency = 'PKR') {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format number with commas
export function formatNumber(num) {
  if (num === null || num === undefined) return '';
  return new Intl.NumberFormat('en-PK').format(num);
}

// Check if member card is expired
export function isCardExpired(validUntil) {
  if (!validUntil) return true;
  const expiry = typeof validUntil === 'string' ? parseISO(validUntil) : validUntil;
  return expiry < new Date();
}

// Get status color class
export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    COLLECTED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Truncate text
export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Generate random string
export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Play sound effect
export function playSound(soundPath) {
  if (typeof window !== 'undefined') {
    const audio = new Audio(soundPath);
    audio.play().catch(err => console.log('Audio play failed:', err));
  }
}

// Validate phone number (Pakistani format)
export function isValidPhone(phone) {
  const phoneRegex = /^(\+92|0)?[0-9]{10}$/;
  return phoneRegex.test(phone?.replace(/[\s-]/g, ''));
}

// Format phone number
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Class name utility (similar to clsx/cn)
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Check if date is today
export function checkIsToday(date) {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
}

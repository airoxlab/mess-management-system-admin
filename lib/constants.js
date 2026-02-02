export const MEAL_TYPES = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
};

export const MEAL_TYPE_LABELS = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
};

export const TOKEN_STATUS = {
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

export const TOKEN_STATUS_LABELS = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// New member registration status (for approval workflow)
export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const REGISTRATION_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const MEMBER_TYPES = {
  STUDENT: 'student',
  STAFF: 'staff',
  FACULTY: 'faculty',
  GUEST: 'guest',
};

export const MEMBER_TYPE_LABELS = {
  student: 'Student',
  staff: 'Staff',
  faculty: 'Faculty',
  guest: 'Guest',
};

// Gender options
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
};

export const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
};

// Hostel/Day Scholar options
export const HOSTEL_STATUS = {
  HOSTEL: 'hostel',
  DAY_SCHOLAR: 'day_scholar',
};

export const HOSTEL_STATUS_LABELS = {
  hostel: 'Hostel',
  day_scholar: 'Day Scholar',
};

// Membership types
export const MEMBERSHIP_TYPE = {
  FULL_TIME: 'full_time',
  PARTIAL: 'partial',
  DAY_TO_DAY: 'day_to_day',
};

export const MEMBERSHIP_TYPE_LABELS = {
  full_time: 'Full Time',
  partial: 'Partial',
  day_to_day: 'Day to Day',
};

// Food preferences
export const FOOD_PREFERENCE = {
  VEGETARIAN: 'vegetarian',
  NON_VEGETARIAN: 'non_vegetarian',
  BOTH: 'both',
};

export const FOOD_PREFERENCE_LABELS = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-Vegetarian',
  both: 'Both',
};

// Preferred meal plans (for students - array)
export const MEAL_PLAN = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
};

export const MEAL_PLAN_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

// Faculty preferred meal plan (single value)
export const FACULTY_MEAL_PLAN = {
  LUNCH: 'lunch',
  DINNER: 'dinner',
  FULL_DAY: 'full_day',
};

export const FACULTY_MEAL_PLAN_LABELS = {
  lunch: 'Lunch Only',
  dinner: 'Dinner Only',
  full_day: 'Full Day',
};

// Fee category (faculty)
export const FEE_CATEGORY = {
  SUBSIDIZED: 'subsidized',
  STANDARD: 'standard',
};

export const FEE_CATEGORY_LABELS = {
  subsidized: 'Subsidized',
  standard: 'Standard',
};

// Duty shifts (staff)
export const DUTY_SHIFT = {
  MORNING: 'morning',
  EVENING: 'evening',
  NIGHT: 'night',
  FULL_DAY: 'full_day',
};

export const DUTY_SHIFT_LABELS = {
  morning: 'Morning',
  evening: 'Evening',
  night: 'Night',
  full_day: 'Full Day',
};

export const TRANSACTION_TYPES = {
  TOPUP: 'TOPUP',
  DEDUCTION: 'DEDUCTION',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
};

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  OTHER: 'OTHER',
};

export const PAYMENT_METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
  OTHER: 'Other',
};

// Payment methods for member registration
export const MEMBER_PAYMENT_METHOD = {
  CASH: 'cash',
  ONLINE: 'online',
  OTHER: 'other',
};

export const MEMBER_PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  online: 'Online',
  other: 'Other',
};

// Time ranges for meal types
export const MEAL_TIME_RANGES = {
  BREAKFAST: { start: 6, end: 10 },
  LUNCH: { start: 11, end: 15 },
  DINNER: { start: 17, end: 21 },
};

// Get current meal type based on time
export function getCurrentMealType() {
  const hour = new Date().getHours();

  if (hour >= MEAL_TIME_RANGES.BREAKFAST.start && hour < MEAL_TIME_RANGES.BREAKFAST.end) {
    return MEAL_TYPES.BREAKFAST;
  }
  if (hour >= MEAL_TIME_RANGES.LUNCH.start && hour < MEAL_TIME_RANGES.LUNCH.end) {
    return MEAL_TYPES.LUNCH;
  }
  if (hour >= MEAL_TIME_RANGES.DINNER.start && hour < MEAL_TIME_RANGES.DINNER.end) {
    return MEAL_TYPES.DINNER;
  }

  // Default to lunch if outside meal times
  return MEAL_TYPES.LUNCH;
}

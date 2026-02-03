'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function FacultyForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    designation: '',
    employee_id: '',
    contact_number: '',
    email_address: '',
    date_of_birth: '',
    membership_type: '',
    preferred_meal_plan: '',
    food_preference: '',
    has_food_allergies: false,
    food_allergies_details: '',
    communication_consent: false,
    complaint_policy_acknowledged: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Check for duplicate entry by Employee ID or Email
      const { data: existingRecord } = await supabase
        .from('faculty_members')
        .select('id')
        .or(`employee_id.eq.${formData.employee_id},email_address.eq.${formData.email_address}`)
        .limit(1);

      if (existingRecord && existingRecord.length > 0) {
        throw new Error('A faculty member with this Employee ID or Email already exists');
      }

      // Remove has_food_allergies from data (it's UI-only, not in database)
      const { has_food_allergies, ...dataToSubmit } = formData;

      const { error: supabaseError } = await supabase
        .from('faculty_members')
        .insert([
          {
            ...dataToSubmit,
            date_of_birth: formData.date_of_birth || null,
          },
        ]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setToast({ show: true, message: 'Application submitted successfully!', type: 'success' });
      setFormData({
        full_name: '',
        department: '',
        designation: '',
        employee_id: '',
        contact_number: '',
        email_address: '',
        date_of_birth: '',
        membership_type: '',
        preferred_meal_plan: '',
        food_preference: '',
        has_food_allergies: false,
        food_allergies_details: '',
        communication_consent: false,
        complaint_policy_acknowledged: false,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setToast({ show: true, message: err.message || 'Something went wrong', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-2.5 py-1.5 bg-white/50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-gray-700 placeholder-gray-400 text-sm";
  const labelClasses = "block text-xs font-medium text-gray-700 mb-0.5";
  const radioLabelClasses = "flex items-center gap-1.5 py-1.5 px-2 bg-white/50 border border-gray-200 rounded-md cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group";
  const checkboxLabelClasses = "flex items-center gap-1.5 py-1.5 px-2 bg-white/50 border border-gray-200 rounded-md cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-indigo-50 py-3 sm:py-4 px-3">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-4 py-4 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
            <Link href="/" className="inline-block mb-2 group relative">
              <div className="absolute -inset-1 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all duration-300"></div>
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-3 border-white/50 shadow-xl ring-2 ring-white/20">
                <Image
                  src="/logo.png"
                  alt="Central Canteen Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Central Canteen</h1>
            <h2 className="text-sm sm:text-base font-medium text-white/90">Faculty Membership Proforma</h2>
            <p className="text-xs text-white/70 mt-0.5">For Teaching Faculty Only</p>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-5">
            {success && (
              <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">Application Submitted!</p>
                  <p className="text-xs text-emerald-600">Your membership is under review.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-red-800 text-sm">Submission Failed</p>
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section: Personal Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Personal Information</h3>
                </div>

                <div>
                  <label className={labelClasses}>
                    1. Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className={inputClasses}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClasses}>
                      2. Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className={inputClasses}
                      placeholder="Department"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      3. Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                      className={inputClasses}
                      placeholder="Designation"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClasses}>
                      4. Employee / Faculty ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleChange}
                      required
                      className={inputClasses}
                      placeholder="Employee ID"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>
                      5. Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleChange}
                      required
                      className={inputClasses}
                      placeholder="Contact number"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    6. Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleChange}
                    required
                    className={inputClasses}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Section: Membership Details */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Membership Details</h3>
                </div>

                <div>
                  <label className={labelClasses}>
                    7. Membership Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['full_time', 'partial', 'day_to_day'].map((type) => (
                      <label key={type} className={radioLabelClasses}>
                        <input
                          type="radio"
                          name="membership_type"
                          value={type}
                          checked={formData.membership_type === type}
                          onChange={handleChange}
                          required
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-gray-700 capitalize group-hover:text-blue-700">{type.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    8. Preferred Meal Plan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['lunch', 'dinner', 'full_day'].map((plan) => (
                      <label key={plan} className={radioLabelClasses}>
                        <input
                          type="radio"
                          name="preferred_meal_plan"
                          value={plan}
                          checked={formData.preferred_meal_plan === plan}
                          onChange={handleChange}
                          required
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-gray-700 capitalize group-hover:text-blue-700">{plan.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    9. Food Preference <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['vegetarian', 'non_vegetarian', 'both'].map((pref) => (
                      <label key={pref} className={radioLabelClasses}>
                        <input
                          type="radio"
                          name="food_preference"
                          value={pref}
                          checked={formData.food_preference === pref}
                          onChange={handleChange}
                          required
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-gray-700 capitalize group-hover:text-blue-700">{pref.replace(/_/g, '-')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>
                    10. Food Allergies / Dietary Restrictions
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <label className={radioLabelClasses}>
                      <input
                        type="radio"
                        name="has_food_allergies"
                        value="false"
                        checked={formData.has_food_allergies === false}
                        onChange={() => setFormData(prev => ({ ...prev, has_food_allergies: false, food_allergies_details: '' }))}
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-gray-700">None</span>
                    </label>
                    <label className={radioLabelClasses}>
                      <input
                        type="radio"
                        name="has_food_allergies"
                        value="true"
                        checked={formData.has_food_allergies === true}
                        onChange={() => setFormData(prev => ({ ...prev, has_food_allergies: true }))}
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-gray-700">Yes</span>
                    </label>
                  </div>
                  {formData.has_food_allergies && (
                    <input
                      type="text"
                      name="food_allergies_details"
                      value={formData.food_allergies_details}
                      onChange={handleChange}
                      required
                      className={inputClasses}
                      placeholder="Please specify allergies/restrictions"
                    />
                  )}
                </div>

                <div>
                  <label className={labelClasses}>
                    11. Date of Birth <span className="text-blue-500 text-xs">(Birthday Benefit)</span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Section: Consent & Policy */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Consent & Policy</h3>
                </div>

                <div>
                  <label className={labelClasses}>
                    12. Communication Consent
                  </label>
                  <label className={checkboxLabelClasses}>
                    <input
                      type="checkbox"
                      name="communication_consent"
                      checked={formData.communication_consent}
                      onChange={handleChange}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-xs font-medium text-gray-700">I agree to receive updates via WhatsApp/SMS</span>
                  </label>
                </div>

                <div>
                  <label className={labelClasses}>
                    13. Complaint Policy <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200">
                    <input
                      type="checkbox"
                      name="complaint_policy_acknowledged"
                      checked={formData.complaint_policy_acknowledged}
                      onChange={handleChange}
                      required
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-xs text-gray-700">I agree to submit complaints only through official QR code system</span>
                  </label>
                </div>
              </div>

              {/* Declaration & Submit */}
              <div className="pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-2.5 mb-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">Declaration:</span> I confirm all information is true and accurate.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-3">
          &copy; {new Date().getFullYear()} Central Canteen
        </p>
      </div>
    </div>
  );
}

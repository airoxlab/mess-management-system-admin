'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { MEMBER_STATUS, MEMBER_TYPES, MEMBER_TYPE_LABELS } from '@/lib/constants';
import api from '@/lib/api-client';

export default function AddMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    member_id: '',
    name: '',
    contact: '',
    valid_until: '',
    balance_meals: 0,
    status: 'active',
    member_type: 'student',
    photo_url: null,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoChange = (url) => {
    setFormData((prev) => ({ ...prev, photo_url: url }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.member_id.trim()) {
      newErrors.member_id = 'Member ID is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const response = await api.post('/api/members', formData);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create member');
      }

      toast.success(`Member ${data.member.member_id} created successfully!`);
      router.push('/admin/members');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Members
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Member</h1>
        <p className="text-gray-500">Create a new cafeteria member</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Photo Upload */}
          <PhotoUpload
            value={formData.photo_url}
            onChange={handlePhotoChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Member ID"
              name="member_id"
              value={formData.member_id}
              onChange={handleChange}
              error={errors.member_id}
              placeholder="e.g., 123456"
              required
            />

            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Enter member's full name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Contact Number"
              name="contact"
              type="tel"
              value={formData.contact}
              onChange={handleChange}
              error={errors.contact}
              placeholder="e.g., 0300-1234567"
            />

            <Input
              label="Valid Until"
              name="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={handleChange}
              error={errors.valid_until}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Initial Meal Balance"
              name="balance_meals"
              type="number"
              min="0"
              value={formData.balance_meals}
              onChange={handleChange}
              helperText="Number of meals to add initially"
            />

            <Select
              label="Member Type"
              name="member_type"
              value={formData.member_type}
              onChange={handleChange}
              options={Object.entries(MEMBER_TYPES).map(([key, value]) => ({
                value: value,
                label: MEMBER_TYPE_LABELS[value],
              }))}
            />
          </div>

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={[
              { value: MEMBER_STATUS.ACTIVE, label: 'Active' },
              { value: MEMBER_STATUS.INACTIVE, label: 'Inactive' },
              { value: MEMBER_STATUS.SUSPENDED, label: 'Suspended' },
            ]}
          />

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              Create Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

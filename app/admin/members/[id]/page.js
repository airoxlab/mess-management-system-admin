'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { MEMBER_STATUS, MEMBER_TYPES, MEMBER_TYPE_LABELS } from '@/lib/constants';
import api from '@/lib/api-client';

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    valid_until: '',
    balance_meals: 0,
    status: 'active',
    member_type: 'student',
    photo_url: null,
  });
  const [memberId, setMemberId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadMember();
  }, [params.id]);

  const loadMember = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/members/${params.id}`);

      if (!response.ok) {
        throw new Error('Member not found');
      }

      const data = await response.json();
      const member = data.member;

      setMemberId(member.member_id);
      setFormData({
        name: member.name || '',
        contact: member.contact || '',
        valid_until: member.valid_until ? member.valid_until.split('T')[0] : '',
        balance_meals: member.balance_meals || 0,
        status: member.status || 'active',
        member_type: member.member_type || 'student',
        photo_url: member.photo_url || null,
      });
    } catch (error) {
      toast.error(error.message);
      router.push('/admin/members');
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);

      const response = await api.put(`/api/members/${params.id}`, formData);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member');
      }

      toast.success('Member updated successfully!');
      router.push('/admin/members');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Edit Member</h1>
        <p className="text-gray-500">Update member information - ID: {memberId}</p>
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
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Enter member's full name"
              required
            />

            <Input
              label="Contact Number"
              name="contact"
              type="tel"
              value={formData.contact}
              onChange={handleChange}
              error={errors.contact}
              placeholder="e.g., 0300-1234567"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Valid Until"
              name="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={handleChange}
              error={errors.valid_until}
              required
            />

            <Input
              label="Meal Balance"
              name="balance_meals"
              type="number"
              min="0"
              value={formData.balance_meals}
              onChange={handleChange}
              helperText="Use Top-up page for adding meals with transaction record"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

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
              loading={saving}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

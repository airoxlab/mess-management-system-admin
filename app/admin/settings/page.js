'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api, { apiClient } from '@/lib/api-client';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const logoInputRef = useRef(null);

  const [settings, setSettings] = useState({
    name: 'LIMHS CAFETERIA',
    logo_url: null,
    address: '',
    contact_phone: '',
    contact_email: '',
    support_phone: '',
    support_whatsapp: '',
    lost_card_fee: 500,
    // Meal Timings
    breakfast_start: '07:00',
    breakfast_end: '09:00',
    lunch_start: '12:00',
    lunch_end: '14:00',
    dinner_start: '19:00',
    dinner_end: '21:00',
    // Meal Skip Deadline (minutes before meal start)
    meal_skip_deadline: 30,
    // Daily Basis Pricing
    breakfast_price: 50,
    lunch_price: 80,
    dinner_price: 70,
    // POS Settings
    pos_menu_selection_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Fetch organization settings
      const orgResponse = await api.get(`/api/organization?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization settings');
      }

      const orgText = await orgResponse.text();
      const orgData = orgText ? JSON.parse(orgText) : {};

      // Daily basis pricing is stored in organizations.settings.daily_basis_pricing
      const dailyBasisPricing = orgData.organization?.settings?.daily_basis_pricing || {
        breakfast: 50,
        lunch: 80,
        dinner: 70
      };

      if (orgData.organization) {
        const orgSettings = orgData.organization.settings || {};
        setSettings({
          name: orgData.organization.name || 'LIMHS CAFETERIA',
          logo_url: orgData.organization.logo_url || null,
          address: orgData.organization.address || '',
          contact_phone: orgData.organization.contact_phone || '',
          contact_email: orgData.organization.contact_email || '',
          support_phone: orgData.organization.support_phone || '',
          support_whatsapp: orgData.organization.support_whatsapp || '',
          lost_card_fee: orgData.organization.lost_card_fee ?? 500,
          // Meal Timings from settings jsonb
          breakfast_start: orgSettings.breakfast_start || '07:00',
          breakfast_end: orgSettings.breakfast_end || '09:00',
          lunch_start: orgSettings.lunch_start || '12:00',
          lunch_end: orgSettings.lunch_end || '14:00',
          dinner_start: orgSettings.dinner_start || '19:00',
          dinner_end: orgSettings.dinner_end || '21:00',
          meal_skip_deadline: orgData.organization.meal_skip_deadline ?? 30,
          // Daily Basis Pricing
          breakfast_price: dailyBasisPricing.breakfast ?? 50,
          lunch_price: dailyBasisPricing.lunch ?? 80,
          dinner_price: dailyBasisPricing.dinner ?? 70,
          // POS Settings
          pos_menu_selection_enabled: orgSettings.pos_menu_selection_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  // Generate time options in 30-minute intervals with AM/PM format
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const label = `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      timeOptions.push({ value: hour24, label });
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum size is 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');
      // Pass old URL so it can be deleted
      if (settings.logo_url) {
        formData.append('oldUrl', settings.logo_url);
      }

      const response = await api.upload('/api/upload', formData);

      // Handle empty or invalid JSON responses
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      const newLogoUrl = data.url;

      // Update local state
      setSettings((prev) => ({ ...prev, logo_url: newLogoUrl }));

      // Auto-save only logo_url to database
      const saveResponse = await api.put('/api/organization', { logo_url: newLogoUrl });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch {
          errorData = {};
        }
        throw new Error(errorData.error || 'Failed to save logo to database');
      }

      toast.success('Logo uploaded and saved successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      // Delete from storage if URL exists
      if (settings.logo_url) {
        const deleteResponse = await api.post('/api/upload/delete', { url: settings.logo_url });
        // Ignore delete errors - logo might already be gone
        if (!deleteResponse.ok) {
          console.warn('Failed to delete logo from storage');
        }
      }

      // Update local state
      setSettings((prev) => ({ ...prev, logo_url: null }));

      // Auto-save only logo_url to database
      const saveResponse = await api.put('/api/organization', { logo_url: null });

      if (!saveResponse.ok) {
        throw new Error('Failed to save changes');
      }

      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }

      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Remove logo error:', error);
      toast.error('Failed to remove logo');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Combine meal timings, daily basis pricing, and POS settings into the settings jsonb field
      const combinedSettings = {
        breakfast_start: settings.breakfast_start,
        breakfast_end: settings.breakfast_end,
        lunch_start: settings.lunch_start,
        lunch_end: settings.lunch_end,
        dinner_start: settings.dinner_start,
        dinner_end: settings.dinner_end,
        daily_basis_pricing: {
          breakfast: parseFloat(settings.breakfast_price) || 50,
          lunch: parseFloat(settings.lunch_price) || 80,
          dinner: parseFloat(settings.dinner_price) || 70,
        },
        pos_menu_selection_enabled: settings.pos_menu_selection_enabled ?? true,
      };

      // DEBUG: Log what we're about to save
      console.log('=== SAVING SETTINGS TO DATABASE ===');
      console.log('Current settings state:', settings);
      console.log('Combined settings:', combinedSettings);

      console.log('Making PUT request to /api/organization...');
      const response = await api.put('/api/organization', {
        ...settings,
        meal_skip_deadline: parseInt(settings.meal_skip_deadline) || 30,
        settings: combinedSettings,
      });

      console.log('Response received:', response.status, response.statusText);

      // Handle organization response
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      // Update local state with saved data to ensure sync
      if (data.organization) {
        const orgSettings = data.organization.settings || {};
        const savedPricing = orgSettings.daily_basis_pricing || { breakfast: 50, lunch: 80, dinner: 70 };

        setSettings({
          name: data.organization.name || 'LIMHS CAFETERIA',
          logo_url: data.organization.logo_url || null,
          address: data.organization.address || '',
          contact_phone: data.organization.contact_phone || '',
          contact_email: data.organization.contact_email || '',
          support_phone: data.organization.support_phone || '',
          support_whatsapp: data.organization.support_whatsapp || '',
          lost_card_fee: data.organization.lost_card_fee ?? 500,
          // Meal Timings from settings jsonb
          breakfast_start: orgSettings.breakfast_start || '07:00',
          breakfast_end: orgSettings.breakfast_end || '09:00',
          lunch_start: orgSettings.lunch_start || '12:00',
          lunch_end: orgSettings.lunch_end || '14:00',
          dinner_start: orgSettings.dinner_start || '19:00',
          dinner_end: orgSettings.dinner_end || '21:00',
          meal_skip_deadline: data.organization.meal_skip_deadline ?? 30,
          // Daily Basis Pricing
          breakfast_price: savedPricing.breakfast ?? 50,
          lunch_price: savedPricing.lunch ?? 80,
          dinner_price: savedPricing.dinner ?? 70,
          // POS Settings
          pos_menu_selection_enabled: orgSettings.pos_menu_selection_enabled ?? true,
        });
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('=== SAVE ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('FETCH FAILED - Possible causes:');
        console.error('1. Admin server not running');
        console.error('2. Wrong port or URL');
        console.error('3. Server crashed during request');
        toast.error('Cannot connect to server. Is the admin app running?');
      } else {
        toast.error(error.message || 'Failed to save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )},
    { id: 'organization', label: 'Organization', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )},
    { id: 'contact', label: 'Support', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )},
    { id: 'fees', label: 'Fees', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'pricing', label: 'Meal Pricing', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'meal_timings', label: 'Meal Timings', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'pos_settings', label: 'POS Settings', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Settings</h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage your organization preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" onClick={loadSettings} disabled={saving} size="sm" className="flex-1 sm:flex-none">
                <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Reset</span>
              </Button>
              <Button onClick={handleSave} loading={saving} size="sm" className="flex-1 sm:flex-none">
                <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Tabs */}
          <div className="lg:hidden mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Tabs - Desktop Only */}
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-2 sticky top-6">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Preview Card */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Preview</p>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      {settings.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt="Logo"
                          className="h-8 w-8 rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {settings.name?.charAt(0) || 'L'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-xs truncate">{settings.name || 'LIMHS'}</p>
                        <p className="text-[10px] text-gray-500">Meal Card</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 space-y-0.5 border-t border-gray-200 pt-2 mt-2">
                      {settings.contact_phone && (
                        <p className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {settings.contact_phone}
                        </p>
                      )}
                      <p className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        {settings.support_whatsapp || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                      <p>Lost card: Rs. {settings.lost_card_fee ?? 500}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {/* Branding Tab */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  {/* Logo Section */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Organization Logo</h3>
                          <p className="text-sm text-gray-500">Upload your logo for cards and receipts</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        <div className="relative group">
                          {settings.logo_url ? (
                            <div className="relative">
                              <img
                                src={settings.logo_url}
                                alt="Logo"
                                className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
                              />
                              {uploadingLogo && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span className="text-xs text-gray-500 mt-1">Upload</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <div className="flex flex-wrap gap-2 mb-3">
                            <label
                              htmlFor="logo-upload"
                              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-all ${
                                uploadingLogo
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                              }`}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {uploadingLogo ? 'Uploading...' : settings.logo_url ? 'Change Logo' : 'Upload Logo'}
                            </label>

                            {settings.logo_url && !uploadingLogo && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="flex items-start gap-2 text-xs text-gray-500">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Recommended: 200x200px, Max 2MB. Formats: JPEG, PNG, WebP</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organization Name */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Organization Name</h3>
                          <p className="text-sm text-gray-500">Your organization's display name</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <Input
                        name="name"
                        value={settings.name}
                        onChange={handleChange}
                        placeholder="e.g., LIMHS CAFETERIA"
                        helperText="This name appears on cards, receipts, and throughout the system"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Organization Tab */}
              {activeTab === 'organization' && (
                <div className="space-y-6">
                  {/* Address Section */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Address</h3>
                          <p className="text-sm text-gray-500">Organization's physical location</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        name="address"
                        value={settings.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Enter full address..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      />
                      <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        This address will appear on receipts and cards
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                          <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Contact Details</h3>
                          <p className="text-sm text-gray-500">Organization contact information</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Contact Phone
                          </label>
                          <Input
                            name="contact_phone"
                            type="tel"
                            value={settings.contact_phone}
                            onChange={handleChange}
                            placeholder="e.g., 042-35761234"
                            helperText="Main office phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Contact Email
                          </label>
                          <Input
                            name="contact_email"
                            type="email"
                            value={settings.contact_email}
                            onChange={handleChange}
                            placeholder="e.g., info@limhs.edu.pk"
                            helperText="Official email address"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Support Tab */}
              {activeTab === 'contact' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Support Information</h3>
                        <p className="text-sm text-gray-500">Help desk details displayed on member cards</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Support Phone
                        </label>
                        <Input
                          name="support_phone"
                          type="tel"
                          value={settings.support_phone}
                          onChange={handleChange}
                          placeholder="e.g., 0300-1234567"
                          helperText="General support contact number"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                          WhatsApp Support
                        </label>
                        <Input
                          name="support_whatsapp"
                          type="tel"
                          value={settings.support_whatsapp}
                          onChange={handleChange}
                          placeholder="e.g., 0311-2345678"
                          helperText="WhatsApp number for quick assistance"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fees Tab */}
              {activeTab === 'fees' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Fee Settings</h3>
                        <p className="text-sm text-gray-500">Configure charges and fees</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="max-w-sm">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Lost Card Fee
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center px-4 text-sm font-medium text-gray-700 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                            Rs.
                          </span>
                          <input
                            type="number"
                            name="lost_card_fee"
                            min="0"
                            value={settings.lost_card_fee}
                            onChange={handleChange}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 flex items-start gap-1.5">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Fee charged for replacing a lost member card
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Daily Basis Meal Pricing</h3>
                        <p className="text-sm text-gray-500">Set prices for daily basis package meals</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Breakfast Price */}
                      <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="p-1.5 bg-orange-100 rounded">
                            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Breakfast</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg">
                            Rs.
                          </span>
                          <input
                            type="number"
                            name="breakfast_price"
                            min="0"
                            step="1"
                            value={settings.breakfast_price}
                            onChange={handleChange}
                            className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {/* Lunch Price */}
                      <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="p-1.5 bg-yellow-100 rounded">
                            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Lunch</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg">
                            Rs.
                          </span>
                          <input
                            type="number"
                            name="lunch_price"
                            min="0"
                            step="1"
                            value={settings.lunch_price}
                            onChange={handleChange}
                            className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {/* Dinner Price */}
                      <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="p-1.5 bg-indigo-100 rounded">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Dinner</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg">
                            Rs.
                          </span>
                          <input
                            type="number"
                            name="dinner_price"
                            min="0"
                            step="1"
                            value={settings.dinner_price}
                            onChange={handleChange}
                            className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        About Daily Basis Pricing
                      </p>
                      <p className="text-xs text-blue-700">
                        These prices apply to members with <strong>Daily Basis</strong> packages. When they scan their card during meal hours, the corresponding amount will be deducted from their package balance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meal Timings Tab */}
              {activeTab === 'meal_timings' && (<>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Meal Service Hours</h3>
                        <p className="text-sm text-gray-500">Configure timing for each meal</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Breakfast Row */}
                      <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="p-1.5 bg-orange-100 rounded">
                            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Breakfast</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <select
                            value={settings.breakfast_start}
                            onChange={(e) => setSettings((prev) => ({ ...prev, breakfast_start: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            value={settings.breakfast_end}
                            onChange={(e) => setSettings((prev) => ({ ...prev, breakfast_end: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Lunch Row */}
                      <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="p-1.5 bg-yellow-100 rounded">
                            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Lunch</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <select
                            value={settings.lunch_start}
                            onChange={(e) => setSettings((prev) => ({ ...prev, lunch_start: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            value={settings.lunch_end}
                            onChange={(e) => setSettings((prev) => ({ ...prev, lunch_end: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dinner Row */}
                      <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="p-1.5 bg-indigo-100 rounded">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">Dinner</span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <select
                            value={settings.dinner_start}
                            onChange={(e) => setSettings((prev) => ({ ...prev, dinner_start: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            value={settings.dinner_end}
                            onChange={(e) => setSettings((prev) => ({ ...prev, dinner_end: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Compact Info */}
                    <p className="mt-4 text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Members can only check in during these time slots
                    </p>
                  </div>
                </div>

                {/* Meal Skip Deadline */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Meal Skip Deadline</h3>
                        <p className="text-sm text-gray-500">Set how early members must confirm or skip a meal</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="max-w-md">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Minutes before meal starts
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex">
                          <input
                            type="number"
                            name="meal_skip_deadline"
                            min="5"
                            max="120"
                            step="5"
                            value={settings.meal_skip_deadline}
                            onChange={handleChange}
                            className="w-24 px-4 py-2.5 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <span className="inline-flex items-center px-4 text-sm font-medium text-gray-700 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                            min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Example Preview */}
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Example with current settings
                      </p>
                      <div className="space-y-1 text-xs text-amber-700">
                        {[
                          { name: 'Breakfast', start: settings.breakfast_start },
                          { name: 'Lunch', start: settings.lunch_start },
                          { name: 'Dinner', start: settings.dinner_start },
                        ].map((meal) => {
                          const [h, m] = meal.start.split(':').map(Number);
                          const totalMin = h * 60 + m - (parseInt(settings.meal_skip_deadline) || 30);
                          const deadlineH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
                          const deadlineM = ((totalMin % 60) + 60) % 60;
                          const hour12 = deadlineH === 0 ? 12 : deadlineH > 12 ? deadlineH - 12 : deadlineH;
                          const period = deadlineH >= 12 ? 'PM' : 'AM';
                          const deadlineLabel = `${hour12.toString().padStart(2, '0')}:${deadlineM.toString().padStart(2, '0')} ${period}`;
                          return (
                            <p key={meal.name}>
                              <span className="font-medium">{meal.name}:</span> Skip allowed until {deadlineLabel}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Members can confirm or skip their meal up to this many minutes before the meal starts. After the deadline, skipping is no longer allowed.
                    </p>
                  </div>
                </div>
              </>)}

              {/* POS Settings Tab */}
              {activeTab === 'pos_settings' && (
                <div className="space-y-6">
                  {/* POS Menu Selection Toggle */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">POS Menu Selection</h3>
                          <p className="text-sm text-gray-500">Control whether users can select items at POS</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">Enable Menu Selection at POS</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              settings.pos_menu_selection_enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {settings.pos_menu_selection_enabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {settings.pos_menu_selection_enabled
                              ? 'Users can select menu items when they scan at POS'
                              : 'Users cannot select items at POS - they must pre-select from app'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            pos_menu_selection_enabled: !prev.pos_menu_selection_enabled
                          }))}
                          className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                            settings.pos_menu_selection_enabled ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.pos_menu_selection_enabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Info Box */}
                      <div className={`mt-4 p-4 rounded-lg border ${
                        settings.pos_menu_selection_enabled
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex gap-3">
                          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            settings.pos_menu_selection_enabled ? 'text-green-600' : 'text-amber-600'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <h5 className={`text-sm font-semibold mb-1 ${
                              settings.pos_menu_selection_enabled ? 'text-green-800' : 'text-amber-800'
                            }`}>
                              {settings.pos_menu_selection_enabled ? 'When Enabled:' : 'When Disabled:'}
                            </h5>
                            <ul className={`text-sm space-y-1 ${
                              settings.pos_menu_selection_enabled ? 'text-green-700' : 'text-amber-700'
                            }`}>
                              {settings.pos_menu_selection_enabled ? (
                                <>
                                  <li>✓ All users can select items at POS counter</li>
                                  <li>✓ Works for all package types (Daily Basis, Full Time, etc.)</li>
                                  <li>✓ Users see "Select Your Items" screen when scanning card</li>
                                </>
                              ) : (
                                <>
                                  <li>✗ Users cannot select items at POS</li>
                                  <li>✗ Selection screen will not appear</li>
                                  <li>✓ Users must pre-select meals from user portal/app</li>
                                  <li>✓ Error message shown if no pre-selection found</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <p className="mt-4 text-xs text-gray-500 flex items-start gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          This is a master switch that applies to all users regardless of their package type.
                          Use this to enforce pre-selection from the user portal and prevent on-the-spot ordering at POS.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

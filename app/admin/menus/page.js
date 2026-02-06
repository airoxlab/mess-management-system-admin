'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api-client';

const getInitialCategoryForm = () => ({
  name: '',
  description: '',
  sort_order: 0,
  is_active: true,
});

const getInitialItemForm = () => ({
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  is_available: true,
  sort_order: 0,
});

export default function MenusPage() {
  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(getInitialCategoryForm());
  const [deleteCategoryModal, setDeleteCategoryModal] = useState({ open: false, category: null });

  // Menu items state
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(getInitialItemForm());
  const [deleteItemModal, setDeleteItemModal] = useState({ open: false, item: null });

  // Filters & View
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('menus_view_mode') || 'card';
    }
    return 'card';
  });

  // Image upload
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // General
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
    loadItems();
  }, []);

  // ─── Category Functions ───

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/api/menu-categories');
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        sort_order: category.sort_order || 0,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm(getInitialCategoryForm());
    }
    setCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setSaving(true);
      let response;
      if (editingCategory) {
        response = await api.put(`/api/menu-categories/${editingCategory.id}`, categoryForm);
      } else {
        response = await api.post('/api/menu-categories', categoryForm);
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save category');
      }

      const data = await response.json();
      if (editingCategory) {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? data.category : c));
      } else {
        setCategories(prev => [...prev, data.category]);
      }
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      setCategoryModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    const category = deleteCategoryModal.category;
    if (!category) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/api/menu-categories/${category.id}`);
      if (!response.ok) throw new Error('Failed to delete category');

      toast.success('Category deleted');
      setCategories(prev => prev.filter(c => c.id !== category.id));
      setItems(prev => prev.filter(i => i.category_id !== category.id));
      setDeleteCategoryModal({ open: false, category: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Menu Item Functions ───

  const loadItems = async () => {
    try {
      setLoadingItems(true);
      const response = await api.get('/api/menu-items');
      if (!response.ok) throw new Error('Failed to load menu items');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const openItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category_id: item.category_id,
        image_url: item.image_url || '',
        is_available: item.is_available,
        sort_order: item.sort_order || 0,
      });
      setImagePreview(item.image_url || null);
    } else {
      setEditingItem(null);
      setItemForm(getInitialItemForm());
      setImagePreview(null);
    }
    setItemModalOpen(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setImagePreview(URL.createObjectURL(file));

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'menu-items');
      if (editingItem?.image_url) {
        formData.append('oldUrl', editingItem.image_url);
      }

      const response = await api.upload('/api/upload', formData);
      if (!response.ok) throw new Error('Failed to upload image');

      const data = await response.json();
      setItemForm((prev) => ({ ...prev, image_url: data.url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.message);
      setImagePreview(editingItem?.image_url || null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setItemForm((prev) => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!itemForm.category_id) {
      toast.error('Please select a category');
      return;
    }
    if (!itemForm.price && itemForm.price !== 0) {
      toast.error('Price is required');
      return;
    }

    try {
      setSaving(true);
      let response;
      if (editingItem) {
        response = await api.put(`/api/menu-items/${editingItem.id}`, itemForm);
      } else {
        response = await api.post('/api/menu-items', itemForm);
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save menu item');
      }

      const data = await response.json();
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? data.item : i));
      } else {
        setItems(prev => [data.item, ...prev]);
      }
      toast.success(editingItem ? 'Menu item updated' : 'Menu item created');
      setItemModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    const newStatus = !item.is_available;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i));

    try {
      const response = await api.put(`/api/menu-items/${item.id}`, {
        is_available: newStatus,
      });
      if (!response.ok) {
        // Revert on failure
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i));
        throw new Error('Failed to update availability');
      }
      toast.success(newStatus ? 'Item marked available' : 'Item marked unavailable');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteItem = async () => {
    const item = deleteItemModal.item;
    if (!item) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/api/menu-items/${item.id}`);
      if (!response.ok) throw new Error('Failed to delete menu item');

      toast.success('Menu item deleted');
      setItems(prev => prev.filter(i => i.id !== item.id));
      setDeleteItemModal({ open: false, item: null });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Filtered Items ───

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false;
    if (availabilityFilter === 'available' && !item.is_available) return false;
    if (availabilityFilter === 'unavailable' && item.is_available) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // ─── Render ───

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage your cafeteria menu categories and items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCategoryModal()} className="w-full sm:w-auto">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Category
          </Button>
          <Button onClick={() => openItemModal()} disabled={categories.length === 0} className="w-full sm:w-auto">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Categories</span>
          {loadingCategories && (
            <svg className="animate-spin h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </div>
        {!loadingCategories && categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet. Click "Create Category" to add your first one.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* All Tab */}
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {items.length}
              </span>
            </button>

            {/* Category Tabs */}
            {categories.map((cat) => {
              const count = items.filter(i => i.category_id === cat.id).length;
              const isActive = categoryFilter === cat.id;
              return (
                <div key={cat.id} className="group relative flex items-center">
                  <button
                    onClick={() => setCategoryFilter(isActive ? 'all' : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : cat.is_active
                          ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
                          : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                    {!cat.is_active && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">OFF</span>
                    )}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                  {/* Edit/Delete on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                      className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCategoryModal({ open: true, category: cat }); }}
                      className="p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>

          {(categoryFilter !== 'all' || availabilityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setAvailabilityFilter('all');
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

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => { setViewMode('table'); localStorage.setItem('menus_view_mode', 'table'); }}
              className={`p-1.5 ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Table View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => { setViewMode('card'); localStorage.setItem('menus_view_mode', 'card'); }}
              className={`p-1.5 border-l border-gray-300 ${viewMode === 'card' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Card View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => { loadCategories(); loadItems(); }} className="w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Showing {filteredItems.length} of {items.length} items
        </div>
      </div>

      {/* Menu Items - Loading / Empty */}
      {loadingItems ? (
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-8 text-center text-gray-500">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-8 text-center text-gray-500">
          {items.length === 0 ? 'No menu items yet. Add your first item!' : 'No items match your filters.'}
        </div>
      ) : viewMode === 'table' ? (
        /* ═══ Table View ═══ */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-3 py-2">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    {item.description && <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">{item.menu_categories?.name || 'N/A'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(item.price)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${item.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleToggleAvailability(item)} className={`p-1 rounded ${item.is_available ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {item.is_available ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                      <button onClick={() => openItemModal(item)} className="p-1 text-primary-600 hover:bg-primary-50 rounded" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteItemModal({ open: true, item })} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ═══ Card View ═══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className={`bg-white rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${!item.is_available ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
              {/* Card Image */}
              <div className="relative aspect-[4/3] bg-gray-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                {/* Category badge on image */}
                <span className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm">
                  {item.menu_categories?.name || 'N/A'}
                </span>
                {/* Availability badge */}
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-medium shadow-sm backdrop-blur-sm transition-colors cursor-pointer ${
                    item.is_available
                      ? 'bg-green-500/90 text-white hover:bg-green-600'
                      : 'bg-red-500/90 text-white hover:bg-red-600'
                  }`}
                >
                  {item.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary-600 whitespace-nowrap">{formatCurrency(item.price)}</span>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-100">
                  <button onClick={() => handleToggleAvailability(item)} className={`p-1.5 rounded-lg ${item.is_available ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`} title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.is_available ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </button>
                  <button onClick={() => openItemModal(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteItemModal({ open: true, item })} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Category Modal ═══ */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="sm"
      >
        <form onSubmit={handleCategorySubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Breakfast, Lunch, Dinner"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-sm w-full">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Menu Item Modal ═══ */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        size="lg"
      >
        <form onSubmit={handleItemSubmit}>
          <div className="space-y-4">
            {/* Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chicken Biryani"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                  required
                >
                  <option value="">Select category</option>
                  {categories.filter((c) => c.is_active).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the item"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Price, Sort, Available */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={itemForm.sort_order}
                  onChange={(e) => setItemForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-sm w-full">
                  <input
                    type="checkbox"
                    checked={itemForm.is_available}
                    onChange={(e) => setItemForm((f) => ({ ...f, is_available: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">Available</span>
                </label>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="flex-shrink-0">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? 'Uploading...' : imagePreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG or WebP. Max 2MB.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setItemModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={uploading} className="flex-1">
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Delete Category Confirm ═══ */}
      <ConfirmModal
        isOpen={deleteCategoryModal.open}
        onClose={() => setDeleteCategoryModal({ open: false, category: null })}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteCategoryModal.category?.name}"? This will also delete all menu items in this category.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* ═══ Delete Item Confirm ═══ */}
      <ConfirmModal
        isOpen={deleteItemModal.open}
        onClose={() => setDeleteItemModal({ open: false, item: null })}
        onConfirm={handleDeleteItem}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteItemModal.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

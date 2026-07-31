import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Filter, Layers, Check, X } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Loader from '@/components/common/Loader';
import ImageUpload from '@/components/common/ImageUpload';
import useAuthStore from '@/features/auth/store/auth.store';
import * as categoryApi from '@/features/category/api/category.api';

export default function CategoryListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null); // null means Add mode
  const [modalForm, setModalForm] = useState({
    name: '',
    description: '',
    image: '',
    displayOrder: 0,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1); // Reset to page 1 on search change
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load categories list
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: searchDebounced,
      };
      if (statusFilter === 'active') params.isActive = true;
      if (statusFilter === 'inactive') params.isActive = false;

      const result = await categoryApi.listCategories(restaurantId, params);
      setCategories(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, statusFilter]);

  useEffect(() => {
    if (restaurantId) loadCategories();
  }, [restaurantId, loadCategories]);

  // Open Modal (Add or Edit)
  const openModal = (category = null) => {
    setModalError('');
    if (category) {
      setCurrentCategory(category);
      setModalForm({
        name: category.name || '',
        description: category.description || '',
        image: category.image || '',
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive !== undefined ? category.isActive : true,
      });
    } else {
      setCurrentCategory(null);
      setModalForm({
        name: '',
        description: '',
        image: '',
        displayOrder: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  // Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCategory(null);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalForm((prev) => ({
      ...prev,
      [name]: name === 'displayOrder' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleStatusChangeInModal = (checked) => {
    setModalForm((prev) => ({ ...prev, isActive: checked }));
  };

  const handleImageChangeInModal = (imageUrl) => {
    setModalForm((prev) => ({ ...prev, image: imageUrl }));
  };

  // Create or Update submit handler
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSaving(true);

    // Front-end Validation
    if (modalForm.name.trim().length < 2) {
      setModalError('Category name must be at least 2 characters.');
      setIsSaving(false);
      return;
    }

    try {
      if (currentCategory) {
        // Edit Mode
        await categoryApi.updateCategory(restaurantId, currentCategory._id, modalForm);
        setSuccess('Category updated successfully.');
      } else {
        // Add Mode
        await categoryApi.createCategory(restaurantId, modalForm);
        setSuccess('Category created successfully.');
      }
      closeModal();
      loadCategories();
      // Clear success notification after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setModalError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete category handler
  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) return;

    setDeletingId(category._id);
    setError('');
    setSuccess('');
    try {
      await categoryApi.deleteCategory(restaurantId, category._id);
      setSuccess('Category deleted successfully.');
      loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Create and organize your restaurant's digital menu categories."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Menu Categories</CardTitle>
            <CardDescription>Group your menu items into structured, logical categories.</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => openModal()}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Category
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Notifications */}
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Search and Filters Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="flex gap-2 min-w-[200px]">
              <div className="relative flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Categories List */}
          {isLoading ? (
            <Loader label="Loading categories..." />
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <Layers className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchDebounced || statusFilter !== 'all'
                  ? 'No categories match your search filters.'
                  : 'No menu categories created yet.'}
              </p>
              {canManage && !searchDebounced && statusFilter === 'all' && (
                <Button size="sm" onClick={() => openModal()}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Category
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium w-16">Image</th>
                      <th className="pb-3 pr-4 font-medium">Category Details</th>
                      <th className="pb-3 pr-4 font-medium text-center">Display Order</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      {canManage && <th className="pb-3 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category._id} className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="h-10 w-10 overflow-hidden rounded bg-muted/40 border border-border flex items-center justify-center">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <Layers className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-foreground">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">
                              {category.description}
                            </p>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-center text-muted-foreground font-mono">
                          {category.displayOrder}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              category.isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openModal(category)}
                                title="Edit category"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                isLoading={deletingId === category._id}
                                onClick={() => handleDelete(category)}
                                title="Delete category"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} categories)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide-in / Modal Dialog Backdrop & Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl animate-scale-up">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {currentCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {currentCategory
                ? 'Update category settings. These changes apply immediately.'
                : 'Create a new catalog section to group menu items.'}
            </p>

            {modalError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={modalForm.name}
                  onChange={handleModalChange}
                  placeholder="e.g. Starters, Main Course, Drinks"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={modalForm.description}
                  onChange={handleModalChange}
                  placeholder="Short explanation for customers..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    min="0"
                    value={modalForm.displayOrder}
                    onChange={handleModalChange}
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <Label htmlFor="isActive" className="mb-2">Active Status</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {modalForm.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      id="isActive"
                      checked={modalForm.isActive}
                      onCheckedChange={handleStatusChangeInModal}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <ImageUpload
                  label="Category Cover Image"
                  description="Upload a photo representing this category."
                  value={modalForm.image}
                  onChange={handleImageChangeInModal}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  {currentCategory ? 'Save changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}

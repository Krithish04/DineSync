import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Flame,
  Sparkles,
  ThumbsUp,
  Clock,
  PlusCircle,
  X,
  Layers,
  Utensils,
  Maximize2
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Loader from '@/components/common/Loader';
import ImageUpload from '@/components/common/ImageUpload';
import useAuthStore from '@/features/auth/store/auth.store';
import * as menuItemApi from '@/features/menu/api/menuItem.api';
import * as restaurantApi from '@/features/restaurant/api/restaurant.api';
import * as categoryApi from '@/features/category/api/category.api';


// Dietary Option configuration
const DIETARY_TYPES = [
  { value: 'veg', label: 'Veg', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'non-veg', label: 'Non Veg', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'vegan', label: 'Vegan', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'jain', label: 'Jain', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

// Spice Level configuration
const SPICE_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
];

export default function MenuListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [dietaryTypeFilter, setDietaryTypeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // all, available, unavailable
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, details, availability, modifiers
  const [currentMenuItem, setCurrentMenuItem] = useState(null); // null means Add mode
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [kitchenStations, setKitchenStations] = useState(['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage']);

  // Form State
  const [form, setForm] = useState({
    category: '',
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    costPrice: '',
    gst: '',
    preparationTime: 15,
    kitchenStation: 'Main Kitchen',
    image: '',
    dietaryType: 'veg',
    spiceLevel: 'none',
    isAvailable: true,
    availableBranches: [],
    isFeatured: false,
    isRecommended: false,
    modifierGroups: [],
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Load configuration dependencies
  const loadDependencies = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [categoriesData, settingsData] = await Promise.all([
        categoryApi.listCategories(restaurantId, { limit: 100 }).catch(() => ({ items: [] })),
        restaurantApi.getSettings(restaurantId).catch(() => null),
      ]);
      setCategories(categoriesData.items || []);
      if (settingsData?.kitchenStations && settingsData.kitchenStations.length > 0) {
        setKitchenStations(settingsData.kitchenStations);
      }
    } catch {
      // Fail silently for setup lists, fallback is empty array
    }
  }, [restaurantId]);

  // Load menu items list
  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: searchDebounced,
        sortBy,
        sortOrder,
      };

      if (selectedCategoryFilter !== 'all') params.category = selectedCategoryFilter;
      if (dietaryTypeFilter !== 'all') params.dietaryType = dietaryTypeFilter;
      if (availabilityFilter === 'available') params.isAvailable = true;
      if (availabilityFilter === 'unavailable') params.isAvailable = false;
      if (branchFilter !== 'all') params.branchId = branchFilter;

      const result = await menuItemApi.listMenuItems(restaurantId, params);
      setMenuItems(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu items.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, selectedCategoryFilter, dietaryTypeFilter, availabilityFilter, branchFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (restaurantId) {
      loadDependencies();
      loadMenuItems();
    }
  }, [restaurantId, loadDependencies, loadMenuItems]);

  // Open Modal (Add or Edit)
  const openModal = (menuItem = null) => {
    setModalError('');
    setActiveTab('info');

    if (menuItem) {
      setCurrentMenuItem(menuItem);
      setForm({
        category: menuItem.category?._id || menuItem.category || '',
        name: menuItem.name || '',
        description: menuItem.description || '',
        shortDescription: menuItem.shortDescription || '',
        price: menuItem.price !== undefined ? menuItem.price : '',
        costPrice: menuItem.costPrice !== undefined ? menuItem.costPrice : '',
        gst: menuItem.gst !== undefined ? menuItem.gst : '',
        preparationTime: menuItem.preparationTime || 15,
        kitchenStation: menuItem.kitchenStation || (kitchenStations[0] || 'Main Kitchen'),
        image: menuItem.image || '',
        dietaryType: menuItem.dietaryType || 'veg',
        spiceLevel: menuItem.spiceLevel || 'none',
        isAvailable: menuItem.isAvailable !== undefined ? menuItem.isAvailable : true,
        availableBranches: menuItem.availableBranches || [],
        isFeatured: menuItem.isFeatured !== undefined ? menuItem.isFeatured : false,
        isRecommended: menuItem.isRecommended !== undefined ? menuItem.isRecommended : false,
        modifierGroups: JSON.parse(JSON.stringify(menuItem.modifierGroups || [])), // deep copy
      });
    } else {
      setCurrentMenuItem(null);
      setForm({
        category: categories.length > 0 ? categories[0]._id : '',
        name: '',
        description: '',
        shortDescription: '',
        price: '',
        costPrice: 0,
        gst: 0,
        preparationTime: 15,
        kitchenStation: kitchenStations[0] || 'Main Kitchen',
        image: '',
        dietaryType: 'veg',
        spiceLevel: 'none',
        isAvailable: true,
        availableBranches: [],
        isFeatured: false,
        isRecommended: false,
        modifierGroups: [],
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMenuItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : ['price', 'costPrice', 'gst', 'preparationTime'].includes(name)
          ? value === ''
            ? ''
            : parseFloat(value)
          : value,
    }));
  };

  const handleImageChangeInModal = (imageUrl) => {
    setForm((prev) => ({ ...prev, image: imageUrl }));
  };

  const handleSwitchChange = (field, checked) => {
    setForm((prev) => ({ ...prev, [field]: checked }));
  };

  // Branch Checkbox handlers
  const handleBranchCheckboxChange = (branchId, checked) => {
    setForm((prev) => {
      const branches = [...prev.availableBranches];
      if (checked) {
        if (!branches.includes(branchId)) branches.push(branchId);
      } else {
        const idx = branches.indexOf(branchId);
        if (idx > -1) branches.splice(idx, 1);
      }
      return { ...prev, availableBranches: branches };
    });
  };

  // Modifier Interactive Helpers
  const addModifierGroup = () => {
    setForm((prev) => ({
      ...prev,
      modifierGroups: [
        ...prev.modifierGroups,
        {
          name: '',
          required: false,
          multiSelect: false,
          minSelection: 0,
          maxSelection: 1,
          options: [{ name: '', price: 0 }],
        },
      ],
    }));
  };

  const removeModifierGroup = (gIdx) => {
    setForm((prev) => {
      const groups = [...prev.modifierGroups];
      groups.splice(gIdx, 1);
      return { ...prev, modifierGroups: groups };
    });
  };

  const updateModifierGroup = (gIdx, field, value) => {
    setForm((prev) => {
      const groups = [...prev.modifierGroups];
      groups[gIdx] = {
        ...groups[gIdx],
        [field]: value,
      };
      return { ...prev, modifierGroups: groups };
    });
  };

  const addModifierOption = (gIdx) => {
    setForm((prev) => {
      const groups = [...prev.modifierGroups];
      groups[gIdx].options = [...groups[gIdx].options, { name: '', price: 0 }];
      return { ...prev, modifierGroups: groups };
    });
  };

  const removeModifierOption = (gIdx, oIdx) => {
    setForm((prev) => {
      const groups = [...prev.modifierGroups];
      const options = [...groups[gIdx].options];
      options.splice(oIdx, 1);
      groups[gIdx].options = options;
      return { ...prev, modifierGroups: groups };
    });
  };

  const updateModifierOption = (gIdx, oIdx, field, value) => {
    setForm((prev) => {
      const groups = [...prev.modifierGroups];
      const options = [...groups[gIdx].options];
      options[oIdx] = {
        ...options[oIdx],
        [field]: field === 'price' ? parseFloat(value) || 0 : value,
      };
      groups[gIdx].options = options;
      return { ...prev, modifierGroups: groups };
    });
  };

  // Form Submit Action
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSaving(true);

    // Front-end Validations
    if (!form.category) {
      setModalError('Category selection is required.');
      setIsSaving(false);
      return;
    }
    if (form.name.trim().length < 2) {
      setModalError('Item name must be at least 2 characters.');
      setIsSaving(false);
      return;
    }
    if (form.price === '' || form.price < 0) {
      setModalError('Price is required and cannot be negative.');
      setIsSaving(false);
      return;
    }

    // Filter out incomplete modifier options/groups
    const cleanedModifierGroups = form.modifierGroups
      .map((group) => ({
        ...group,
        name: group.name.trim(),
        options: group.options
          .map((opt) => ({ ...opt, name: opt.name.trim() }))
          .filter((opt) => opt.name.length > 0),
      }))
      .filter((group) => group.name.length > 0 && group.options.length > 0);

    const payload = {
      ...form,
      modifierGroups: cleanedModifierGroups,
    };

    try {
      if (currentMenuItem) {
        await menuItemApi.updateMenuItem(restaurantId, currentMenuItem._id, payload);
        setSuccess('Menu item updated successfully.');
      } else {
        await menuItemApi.createMenuItem(restaurantId, payload);
        setSuccess('Menu item created successfully.');
      }
      closeModal();
      loadMenuItems();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setModalError(apiErrors?.[0]?.message || err.response?.data?.message || 'Failed to save menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action
  const handleDelete = async (menuItem) => {
    if (!window.confirm(`Are you sure you want to delete "${menuItem.name}"?`)) return;

    setDeletingId(menuItem._id);
    setError('');
    setSuccess('');
    try {
      await menuItemApi.deleteMenuItem(restaurantId, menuItem._id);
      setSuccess('Menu item deleted successfully.');
      loadMenuItems();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete menu item.');
    } finally {
      setDeletingId(null);
    }
  };

  // Selected Category options for dropdown
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c._id] = c;
    });
    return map;
  }, [categories]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Create, edit, and organize individual food and beverage items."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>Manage your entire catalog, branch-specific availability, and modifiers.</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => openModal()} disabled={categories.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Menu Item
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

          {categories.length === 0 && !isLoading && (
            <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <span className="font-semibold">Note:</span> You must create at least one Active Category before you can add menu items.
            </div>
          )}

          {/* Search, Filter, Sort Controls */}
          <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={dietaryTypeFilter}
                onChange={(e) => {
                  setDietaryTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Dietary Types</option>
                {DIETARY_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Availabilities</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable Only</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="name-asc">Sort by: Name (A-Z)</option>
                <option value="name-desc">Sort by: Name (Z-A)</option>
                <option value="price-asc">Sort by: Price (Low-High)</option>
                <option value="price-desc">Sort by: Price (High-Low)</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Catalog Listing Grid / Table */}
          {isLoading ? (
            <Loader label="Loading menu items..." />
          ) : menuItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <Utensils className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchDebounced || selectedCategoryFilter !== 'all' || dietaryTypeFilter !== 'all' || availabilityFilter !== 'all' || branchFilter !== 'all'
                  ? 'No menu items match your search filters.'
                  : 'No menu items added to your restaurant catalogue.'}
              </p>
              {canManage && categories.length > 0 && !searchDebounced && (
                <Button size="sm" onClick={() => openModal()}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Menu Item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium w-16">Item</th>
                      <th className="pb-3 pr-4 font-medium">Name &amp; Category</th>
                      <th className="pb-3 pr-4 font-medium">Pricing &amp; Prep</th>
                      <th className="pb-3 pr-4 font-medium text-center">Tags</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      {canManage && <th className="pb-3 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((item) => (
                      <tr key={item._id} className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="h-10 w-10 overflow-hidden rounded bg-muted/40 border border-border flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <Utensils className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            {/* Dietary badge */}
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium border capitalize ${
                                DIETARY_TYPES.find((d) => d.value === item.dietaryType)?.color || 'bg-muted'
                              }`}
                            >
                              {item.dietaryType}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Category: {item.category?.name || categoryMap[item.category]?.name || 'Unknown'}
                          </p>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-foreground">₹{item.price.toFixed(2)}</p>
                          <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{item.preparationTime} mins</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center justify-center gap-1">
                            {item.isFeatured && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800"
                                title="Featured Item"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {item.isRecommended && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                                title="Recommended Item"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {item.spiceLevel && item.spiceLevel !== 'none' && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-800"
                                title={`Spice Level: ${item.spiceLevel}`}
                              >
                                <Flame className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.isAvailable
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openModal(item)} title="Edit menu item">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                isLoading={deletingId === item._id}
                                onClick={() => handleDelete(item)}
                                title="Delete menu item"
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

              {/* Pagination controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
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

      {/* Tabbed Menu Form Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-lg border border-border bg-card shadow-xl animate-scale-up">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border">
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-display text-xl font-semibold text-foreground">
                {currentMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure item specifications, pricing, modifiers, and store visibility.
              </p>

              {/* Tab Navigation */}
              <div className="flex border-b border-border mt-4 gap-4 overflow-x-auto">
                {['info', 'details', 'availability', 'modifiers'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-sm font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'info' ? '1. Info' : tab === 'details' ? '2. Details & Pricing' : tab === 'availability' ? '3. Availability' : '4. Modifiers'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {modalError}
                </div>
              )}

              {/* TAB 1: BASIC INFO */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={handleInputChange}
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        required
                      >
                        <option value="" disabled>Select category</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Item name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Margherita Pizza, Cafe Latte"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short description</Label>
                    <Input
                      id="shortDescription"
                      name="shortDescription"
                      value={form.shortDescription}
                      onChange={handleInputChange}
                      placeholder="Brief customer-facing copy (max 150 chars)..."
                      maxLength={150}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description</Label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      placeholder="Detail allergens, key ingredients, preparation styles..."
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                      maxLength={1000}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <ImageUpload
                      label="Item Photo"
                      description="Upload a photo displaying the prepared menu item."
                      value={form.image}
                      onChange={handleImageChangeInModal}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILS & PRICING */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Sale Price (INR) *</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price (INR)</Label>
                      <Input
                        id="costPrice"
                        name="costPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.costPrice}
                        onChange={handleInputChange}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gst">GST Tax (%)</Label>
                      <Input
                        id="gst"
                        name="gst"
                        type="number"
                        min="0"
                        max="100"
                        value={form.gst}
                        onChange={handleInputChange}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="preparationTime">Prep Time (mins)</Label>
                      <Input
                        id="preparationTime"
                        name="preparationTime"
                        type="number"
                        min="1"
                        value={form.preparationTime}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kitchenStation">Kitchen Station</Label>
                      <select
                        id="kitchenStation"
                        name="kitchenStation"
                        value={form.kitchenStation || (kitchenStations[0] || 'Main Kitchen')}
                        onChange={handleInputChange}
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2"
                      >
                        {kitchenStations.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="spiceLevel">Spice Level</Label>
                      <select
                        id="spiceLevel"
                        name="spiceLevel"
                        value={form.spiceLevel}
                        onChange={handleInputChange}
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2"
                      >
                        {SPICE_LEVELS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Dietary Type *</Label>
                    <div className="flex gap-2">
                      {DIETARY_TYPES.map((dt) => (
                        <button
                          key={dt.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, dietaryType: dt.value }))}
                          className={`flex-1 py-3 px-4 border rounded-md text-sm font-semibold capitalize text-center transition-all ${
                            form.dietaryType === dt.value
                              ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 scale-[0.98]'
                              : 'border-border bg-card hover:bg-muted/5'
                          }`}
                        >
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AVAILABILITY */}
              {activeTab === 'availability' && (
                <div className="space-y-6">
                  {/* Status switches */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-border rounded-lg p-4 bg-muted/10">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="isAvailable-toggle">Item Available</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isAvailable-toggle"
                          checked={form.isAvailable}
                          onCheckedChange={(checked) => handleSwitchChange('isAvailable', checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {form.isAvailable ? 'Instock' : 'Out of stock'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="isFeatured-toggle">Featured Banner</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isFeatured-toggle"
                          checked={form.isFeatured}
                          onCheckedChange={(checked) => handleSwitchChange('isFeatured', checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {form.isFeatured ? 'Yes, featured' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="isRecommended-toggle">Chef Recommended</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isRecommended-toggle"
                          checked={form.isRecommended}
                          onCheckedChange={(checked) => handleSwitchChange('isRecommended', checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {form.isRecommended ? 'Yes, tag chef' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Branch Specific Checkbox List */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">Branch-Specific Availability</Label>
                    <p className="text-xs text-muted-foreground">
                      Select specific branch locations allowed to sell this item. If no locations are checked, the item remains available at all restaurant branches.
                    </p>

                    {branches.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic border border-dashed rounded p-3 text-center">
                        No branches configured. Available globally by default.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border rounded-lg p-4 max-h-[180px] overflow-y-auto">
                        {branches.map((branch) => {
                          const isChecked = form.availableBranches.includes(branch._id);
                          return (
                            <label
                              key={branch._id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleBranchCheckboxChange(branch._id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <div>
                                <p className="font-semibold text-foreground">{branch.name}</p>
                                <p className="text-[10px] text-muted-foreground">{branch.code} - {branch.address?.city}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: MODIFIERS */}
              {activeTab === 'modifiers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-foreground">Modifiers &amp; Custom Options</Label>
                      <p className="text-xs text-muted-foreground">
                        Configure customized groups like "Size Variants" or "Add-ons" (e.g. Extra Cheese).
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addModifierGroup}>
                      <PlusCircle className="h-4 w-4 mr-1" /> Add Group
                    </Button>
                  </div>

                  {form.modifierGroups.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/5">
                      <Maximize2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No custom modifier groups active yet.</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary mt-2"
                        onClick={addModifierGroup}
                      >
                        Configure modifiers group
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {form.modifierGroups.map((group, gIdx) => (
                        <div key={gIdx} className="border border-border rounded-lg p-4 bg-muted/5 space-y-4 relative">
                          <button
                            type="button"
                            onClick={() => removeModifierGroup(gIdx)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete modifier group"
                          >
                            <X className="h-4 w-4" />
                          </button>

                          {/* Group fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                            <div className="space-y-1">
                              <Label className="text-xs">Group Name (e.g. Size, Toppings) *</Label>
                              <Input
                                value={group.name}
                                onChange={(e) => updateModifierGroup(gIdx, 'name', e.target.value)}
                                placeholder="e.g. Extra Add-ons"
                                className="h-9 text-xs"
                                required
                              />
                            </div>

                            {/* Options configuration */}
                            <div className="flex items-end gap-4 h-full pb-1">
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={group.required}
                                  onChange={(e) => updateModifierGroup(gIdx, 'required', e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary"
                                />
                                <span>Required selection</span>
                              </label>

                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={group.multiSelect}
                                  onChange={(e) => updateModifierGroup(gIdx, 'multiSelect', e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary"
                                />
                                <span>Multi-select</span>
                              </label>
                            </div>
                          </div>

                          {/* Options editor */}
                          <div className="space-y-2 border-t border-border/60 pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">Options List *</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-primary hover:text-primary/80"
                                onClick={() => addModifierOption(gIdx)}
                              >
                                <PlusCircle className="h-3 w-3 mr-1" /> Add Option
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {group.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex gap-3 items-center">
                                  <Input
                                    placeholder="Option Name (e.g. Extra Cheese)"
                                    value={opt.name}
                                    onChange={(e) => updateModifierOption(gIdx, oIdx, 'name', e.target.value)}
                                    className="h-8 text-xs flex-1"
                                    required
                                  />
                                  <div className="w-28 flex items-center gap-1.5 border border-input rounded bg-background px-2.5 h-8">
                                    <span className="text-xs text-muted-foreground">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0"
                                      value={opt.price}
                                      onChange={(e) => updateModifierOption(gIdx, oIdx, 'price', e.target.value)}
                                      className="w-full bg-transparent focus:outline-none text-xs text-foreground font-mono"
                                    />
                                  </div>
                                  {group.options.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeModifierOption(gIdx, oIdx)}
                                      className="text-muted-foreground hover:text-destructive"
                                      title="Delete option"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end gap-2 bg-card rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} isLoading={isSaving}>
                {currentMenuItem ? 'Save changes' : 'Create Item'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}

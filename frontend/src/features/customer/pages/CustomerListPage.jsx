import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, User, Phone, Sparkles } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import CustomerForm from '../components/CustomerForm';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function CustomerListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog configurations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditData, setActiveEditData] = useState(null);

  // Load configuration base
  const loadConfiguration = useCallback(async () => {
    try {
      const bList = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(bList.items || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load customer lists
  const loadCustomerList = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await customerApi.listCustomers(restaurantId);
      setCustomers(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers list.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadConfiguration();
      loadCustomerList();
    }
  }, [restaurantId, loadConfiguration, loadCustomerList]);

  // Submit form payload
  const handleFormSubmit = async (payload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      if (activeEditData) {
        await customerApi.updateCustomer(restaurantId, activeEditData._id, payload);
        setSuccess('Customer profile updated successfully.');
      } else {
        await customerApi.createCustomer(restaurantId, payload);
        setSuccess('Customer registered successfully.');
      }
      setIsModalOpen(false);
      setActiveEditData(null);
      loadCustomerList();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register customer profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customerApi.deleteCustomer(restaurantId, customerId);
      setSuccess('Customer deleted successfully.');
      loadCustomerList();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.phoneNumber.includes(search);
      return matchesSearch;
    });
  }, [customers, search]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Patron registrations database, phone records, and marketing consent trackers."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Customer Registry</CardTitle>
            <CardDescription>Directory of all registered restaurant guests.</CardDescription>
          </div>
          <Button size="xs" onClick={() => {
            setActiveEditData(null);
            setIsModalOpen(true);
          }} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Register Customer
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notifications */}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Filtering row */}
          <div className="relative w-full sm:max-w-xs border-b border-border/40 pb-4">
            <Search className="absolute left-3 top-1/3 h-4 w-4 -translate-y-1/3 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Customer list table */}
          {isLoading ? (
            <Loader label="Opening directories ledger..." />
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No registered customers found.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Customer ID</th>
                    <th className="p-3 font-medium">Full Name</th>
                    <th className="p-3 font-medium"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Phone</span></th>
                    <th className="p-3 font-medium text-center">Diet</th>
                    <th className="p-3 font-medium text-center">Visits</th>
                    <th className="p-3 font-medium text-center">Points Balance</th>
                    <th className="p-3 font-medium text-center">Tier</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                          {c.customerId}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{c.fullName}</td>
                      <td className="p-3 text-muted-foreground font-mono">{c.phoneNumber}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.2 text-[8px] font-bold border uppercase ${
                          c.dietaryPreference === 'Veg' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          c.dietaryPreference === 'Jain' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                          c.dietaryPreference === 'Vegan' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {c.dietaryPreference}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-foreground font-semibold">{c.visitCount || 0}</td>
                      <td className="p-3 text-center font-mono font-bold text-primary">{c.loyaltyPoints || 0} pts</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase ${
                          c.membershipTier === 'Platinum' ? 'bg-violet-100 text-violet-800 border-violet-200' :
                          c.membershipTier === 'Gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          c.membershipTier === 'Silver' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {c.membershipTier}
                        </span>
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => navigate(`/restaurant/customers/${c._id}/profile`)}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => {
                            setActiveEditData(c);
                            setIsModalOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(c._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Modal wrapper */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-lg overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-bold text-sm text-foreground mb-4">
              {activeEditData ? `Edit Customer Details: ${activeEditData.fullName}` : 'Register New Customer'}
            </h4>
            <CustomerForm
              branches={branches}
              initialData={activeEditData}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setActiveEditData(null);
              }}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}

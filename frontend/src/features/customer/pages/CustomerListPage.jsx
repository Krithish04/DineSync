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

export default function CustomerListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog configurations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditData, setActiveEditData] = useState(null);

  // Load customer lists
  const loadCustomerList = useCallback(async () => {
    if (!restaurantId) return;
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
      loadCustomerList();
    }
  }, [restaurantId, loadCustomerList]);

  // Customer Mutations
  const handleFormSubmit = async (payload) => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      if (activeEditData) {
        await customerApi.updateCustomer(restaurantId, activeEditData._id, payload);
        setSuccess('Customer updated successfully.');
      } else {
        await customerApi.createCustomer(restaurantId, payload);
        setSuccess('Customer registered successfully.');
      }
      setIsModalOpen(false);
      setActiveEditData(null);
      loadCustomerList();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit customer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to delete profile for ${cust.fullName}?`)) return;
    try {
      await customerApi.deleteCustomer(restaurantId, cust._id);
      setSuccess('Customer profile deleted.');
      loadCustomerList();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.phoneNumber.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Database of guest contacts, tier tags, and lifetime orders."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Customer Directory</CardTitle>
            <CardDescription>Directory of all registered guests, tiers, and loyalty points.</CardDescription>
          </div>
          <Button size="xs" onClick={() => {
            setActiveEditData(null);
            setIsModalOpen(true);
          }} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Add Customer
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

          {/* Filtering bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Table display */}
          {isLoading ? (
            <Loader label="Opening CRM database..." />
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded bg-muted/5">
              No customer records found.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase">
                    <th className="p-3 font-medium">Customer Name</th>
                    <th className="p-3 font-medium">Phone Number</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium text-center">Loyalty Tier</th>
                    <th className="p-3 font-medium text-center">Points</th>
                    <th className="p-3 font-medium text-center">Total Visits</th>
                    <th className="p-3 font-medium text-right">Lifetime Spend (₹)</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust) => (
                    <tr key={cust._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3 font-bold text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.fullName[0]}
                        </div>
                        <div>
                          <p>{cust.fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{cust.referralCode}</p>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{cust.phoneNumber}</td>
                      <td className="p-3 text-muted-foreground">{cust.email || '-'}</td>
                      <td className="p-3 text-center">
                        {(() => {
                          const tier = cust.membershipTier || cust.loyaltyTier || 'Bronze';
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                              tier === 'Platinum' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              tier === 'Gold' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              tier === 'Silver' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              <Sparkles className="h-2.5 w-2.5" /> {tier}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-primary">{cust.loyaltyPoints || 0} pts</td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{cust.visitCount ?? cust.totalVisits ?? 0}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ₹{Number(cust.totalSpent ?? cust.totalSpend ?? 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 text-[10px] px-2.5"
                          onClick={() => navigate(`/restaurant/customers/${cust._id}/profile`)}
                        >
                          Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => {
                            setActiveEditData(cust);
                            setIsModalOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteCustomer(cust)}
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

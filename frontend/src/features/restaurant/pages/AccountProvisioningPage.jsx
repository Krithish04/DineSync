import { useState, useEffect } from 'react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import useAuthStore from '@/features/auth/store/auth.store';
import useBranchStore from '@/store/branch.store';
import { listBranches } from '@/features/restaurant/api/branch.api';
import OwnerManagerSection from '@/features/restaurant/components/OwnerManagerSection';
import ManagerAccountSection from '@/features/restaurant/components/ManagerAccountSection';
import { KeyRound, Shield, Users, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AccountProvisioningPage() {
  const { user, restaurant } = useAuthStore();
  const role = user?.role || 'manager';
  const isOwner = ['owner', 'super_admin'].includes(role);
  const restaurantId = restaurant?._id;

  const { branches: storeBranches, setBranches } = useBranchStore();
  const [branches, setLocalBranches] = useState(storeBranches || []);
  const [activeTab, setActiveTab] = useState(isOwner ? 'managers' : 'staff_kitchen');

  useEffect(() => {
    if (restaurantId) {
      listBranches(restaurantId)
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.branches || res?.items || [];
          setLocalBranches(list);
          setBranches(list);
        })
        .catch(() => {
          setLocalBranches([]);
        });
    }
  }, [restaurantId, setBranches]);

  // Extract manager's assigned branch(es)
  const userAssignedBranches = isOwner
    ? branches
    : user?.assignedBranches && user.assignedBranches.length > 0
    ? user.assignedBranches
    : user?.branch
    ? [user.branch]
    : branches;

  return (
    <RestaurantLayout
      title="Account Provisioning & Credentials"
      description="Assign email and password login credentials for Managers, Staff, and Kitchen roles across your restaurant branches."
    >
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-background p-6 rounded-2xl border border-primary/20 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Login Credentials Assignment Portal</h2>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-mono">
                {isOwner ? 'Owner & Admin Access' : 'Manager Scoped Access'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Create and manage authentication credentials (email & password) for team members.
              {isOwner
                ? ' As an Owner, assign multi-branch responsibility to Managers or delegate Staff/Kitchen account creation.'
                : ' As a Manager, create Staff and Kitchen accounts restricted strictly to your assigned branch(es).'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/80 px-3 py-2 rounded-xl border border-border">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Active Branch Context: <strong>{userAssignedBranches.length} Branch(es)</strong></span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        {isOwner && (
          <div className="flex border-b border-border text-sm font-bold bg-card rounded-t-xl px-2">
            <button
              type="button"
              onClick={() => setActiveTab('managers')}
              className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'managers'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield size={16} /> Manager Accounts & Multi-Branch Assignment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('staff_kitchen')}
              className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'staff_kitchen'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={16} /> Branch Staff & Kitchen Logins
            </button>
          </div>
        )}

        {/* Content Section */}
        {isOwner ? (
          activeTab === 'managers' ? (
            <OwnerManagerSection restaurantId={restaurantId} branches={branches} />
          ) : (
            <ManagerAccountSection restaurantId={restaurantId} assignedBranches={userAssignedBranches} />
          )
        ) : (
          <ManagerAccountSection restaurantId={restaurantId} assignedBranches={userAssignedBranches} />
        )}
      </div>
    </RestaurantLayout>
  );
}

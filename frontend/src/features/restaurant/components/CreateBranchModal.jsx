import { useState } from 'react';
import { Building2, UserCheck, CreditCard, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as branchApi from '../api/branch.api';

export default function CreateBranchModal({ isOpen, onClose, onSuccess }) {
  const { user, restaurant } = useAuthStore();
  const restaurantId = restaurant?._id || user?.restaurant?._id || (typeof user?.restaurant === 'string' ? user.restaurant : null);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    state: 'Maharashtra',
    gstin: '',
    phone: '',
    email: '',
    managerName: '',
    managerEmail: '',
    managerPhone: '',
    managerPassword: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      setError('Branch Name and Address are required.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!formData.managerName.trim() || !formData.managerEmail.trim() || !formData.managerPassword.trim()) {
      setError('Mandatory Manager assignment requires Name, Email, and Password.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await branchApi.createBranch(restaurantId, {
        name: formData.name.trim(),
        code: formData.code.trim() || `BR-${Date.now().toString().slice(-4)}`,
        address: formData.address.trim(),
        state: formData.state,
        gstin: formData.gstin.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        managerName: formData.managerName.trim(),
        managerEmail: formData.managerEmail.trim(),
        managerPhone: formData.managerPhone.trim(),
        managerPassword: formData.managerPassword,
      });

      setSuccessData(res.branch);
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create branch. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="text-purple-600" size={20} />
            <h3 className="text-base font-bold text-foreground">Add New Restaurant Branch</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
              Step {step} of 4
            </span>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>


        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Branch Info */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Enter physical branch location and identification details.</p>

            <div>
              <label className="text-xs font-semibold block mb-1">Branch Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. DineSync Bandra West Branch"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold block mb-1">Branch Code (Optional)</label>
                <input
                  type="text"
                  name="code"
                  placeholder="e.g. BR-BANDRA"
                  value={formData.code}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">State Code</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Physical Address *</label>
              <textarea
                rows={2}
                name="address"
                placeholder="Full street address, city, pincode"
                value={formData.address}
                onChange={handleChange}
                className="w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold block mb-1">Branch GSTIN (Optional)</label>
                <input
                  type="text"
                  name="gstin"
                  placeholder="27AAACD1234E1Z5"
                  value={formData.gstin}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Contact Phone</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Mandatory Manager Assignment */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-800 font-semibold">
              <UserCheck size={16} />
              <span>Mandatory Manager Assignment: Each branch requires exactly 1 dedicated Manager account.</span>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Manager Full Name *</label>
              <input
                type="text"
                name="managerName"
                placeholder="e.g. Ramesh Kumar"
                value={formData.managerName}
                onChange={handleChange}
                className="w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Manager Email Address *</label>
              <input
                type="email"
                name="managerEmail"
                placeholder="manager.bandra@dinesync.ai"
                value={formData.managerEmail}
                onChange={handleChange}
                className="w-full border border-border rounded-xl p-2.5 text-xs bg-background"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  name="managerPhone"
                  placeholder="+919876543210"
                  value={formData.managerPhone}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Initial Password *</label>
                <input
                  type="password"
                  name="managerPassword"
                  placeholder="••••••••"
                  value={formData.managerPassword}
                  onChange={handleChange}
                  className="w-full border border-border rounded-xl p-2 text-xs bg-background"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Billing Consequence Preview */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CreditCard size={18} />
                <span>Subscription Billing Impact Preview</span>
              </div>
              <p>Adding this branch will update your chain-level subscription auto-debit mandate immediately.</p>
            </div>

            <div className="border border-border rounded-xl p-3 bg-muted/20 text-xs space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Base Subscription Plan</span>
                <span>Pro Plan (₹4,999/mo)</span>
              </div>
              <div className="flex justify-between text-purple-700 font-bold">
                <span>New Branch Add-on License</span>
                <span>+ ₹1,999/mo</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-extrabold text-sm text-foreground">
                <span>Updated Monthly Charge</span>
                <span>₹6,998 / month</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              By clicking "Confirm & Add Branch", you authorize updating your Razorpay mandate by +₹1,999/mo.
            </p>
          </div>
        )}

        {/* STEP 4: Success & Setup Walkthrough */}
        {step === 4 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-bold text-foreground">Branch Created Successfully!</h4>
            <p className="text-xs text-muted-foreground">
              Branch <span className="font-bold text-foreground">{successData?.name}</span> is live.
              Manager account created for <span className="font-mono text-purple-600">{formData.managerEmail}</span>.
            </p>

            <div className="bg-muted/40 border border-border p-3 rounded-xl text-xs text-left space-y-1 font-medium">
              <p className="font-bold text-foreground mb-1">Recommended Setup Steps:</p>
              <p>1. Open floor plan canvas builder to add tables for this branch.</p>
              <p>2. Have Manager log in to set up branch staff & KDS screens.</p>
            </div>

            <Button onClick={onClose} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              Done & Close
            </Button>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between items-center border-t border-border pt-3">
            {step > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : <div />}

            {step < 3 ? (
              <Button type="button" size="sm" onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white">
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmitting ? 'Updating Subscription...' : 'Confirm & Add Branch (₹1,999/mo)'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, RefreshCcw, Landmark, Users, Clipboard, AlertCircle } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import InvoicePreview from '../components/InvoicePreview';
import GSTSummary from '../components/GSTSummary';
import PaymentModal from '../components/PaymentModal';
import SplitPaymentDialog from '../components/SplitPaymentDialog';
import useAuthStore from '@/features/auth/store/auth.store';
import * as billingApi from '../api/billing.api';

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment triggers modals
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);

  const loadInvoiceDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await billingApi.getInvoice(restaurantId, invoiceId);
      setInvoice(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, invoiceId]);

  useEffect(() => {
    if (restaurantId && invoiceId) {
      loadInvoiceDetails();
    }
  }, [restaurantId, invoiceId, loadInvoiceDetails]);

  // Submit standard payment
  const handlePaymentSubmit = async (paymentPayload) => {
    setError('');
    setSuccess('');
    setIsProcessing(true);
    try {
      await billingApi.processPayment(restaurantId, paymentPayload);
      setSuccess('Invoice payment recorded successfully. Order completed.');
      setIsPayOpen(false);
      loadInvoiceDetails();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit split payment
  const handleSplitSubmit = async (splitPayload) => {
    setError('');
    setSuccess('');
    setIsProcessing(true);
    try {
      await billingApi.processPayment(restaurantId, splitPayload);
      setSuccess('Split payments recorded successfully. Order completed.');
      setIsSplitOpen(false);
      loadInvoiceDetails();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete split payments.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Refund
  const handleRefund = async () => {
    if (!window.confirm('Are you sure you want to refund this invoice? Points accrued will be reversed.')) return;
    setError('');
    setSuccess('');
    setIsProcessing(true);
    try {
      await billingApi.refundInvoice(restaurantId, invoiceId);
      setSuccess('Invoice status updated to Refunded. Accrued loyalty points reversed.');
      loadInvoiceDetails();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <RestaurantLayout title="Invoice Details">
        <Loader label="Opening tax receipt..." />
      </RestaurantLayout>
    );
  }

  if (error && !invoice) {
    return (
      <RestaurantLayout title="Invoice Details">
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Record customer payments, print invoices, and execute refunds."
    >
      <div className="space-y-6">
        {/* Navigation back */}
        <button
          onClick={() => navigate('/restaurant/billing/invoices')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold no-print"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Invoices List
        </button>

        {/* Notifications */}
        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive no-print">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary no-print">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Invoice Receipt View */}
          <div className="lg:col-span-2 space-y-6">
            <InvoicePreview invoice={invoice} />
            <div className="no-print">
              <GSTSummary invoice={invoice} />
            </div>
          </div>

          {/* Right: Actions and Status summary */}
          <div className="lg:col-span-1 space-y-6 no-print">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clipboard className="h-4 w-4" /> Bill Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Current state:</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase ${
                    invoice.invoiceStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    invoice.invoiceStatus === 'Refunded' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {invoice.invoiceStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">Total Bill Due:</span>
                  <span className="font-extrabold text-foreground text-sm">₹{invoice.grandTotal}</span>
                </div>

                {invoice.customer && (
                  <div className="border-b border-border/40 pb-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">CRM Patron Profile</span>
                    <span className="font-bold text-foreground block">{invoice.customer.fullName}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">{invoice.customer.phoneNumber}</span>
                  </div>
                )}

                {/* Operations tools */}
                <div className="pt-2 space-y-2">
                  {invoice.invoiceStatus === 'Generated' && (
                    <Button
                      size="sm"
                      className="w-full text-xs h-9 gap-1.5"
                      onClick={() => setIsPayOpen(true)}
                    >
                      <CreditCard className="h-4 w-4" /> Collect Payment
                    </Button>
                  )}

                  {invoice.invoiceStatus === 'Paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-9 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={handleRefund}
                      isLoading={isProcessing}
                    >
                      <RefreshCcw className="h-4 w-4" /> Process Refund / Recall
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pay Modal wrapper */}
      {isPayOpen && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setIsPayOpen(false)}
          onSubmit={handlePaymentSubmit}
          onToggleSplit={() => {
            setIsPayOpen(false);
            setIsSplitOpen(true);
          }}
          isSaving={isProcessing}
        />
      )}

      {/* Split Payment wrapper */}
      {isSplitOpen && (
        <SplitPaymentDialog
          invoice={invoice}
          onClose={() => setIsSplitOpen(false)}
          onSubmit={handleSplitSubmit}
          isSaving={isProcessing}
        />
      )}
    </RestaurantLayout>
  );
}

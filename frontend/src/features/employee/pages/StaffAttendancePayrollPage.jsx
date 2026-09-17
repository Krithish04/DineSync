import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  PlusCircle,
  Eye,
  CreditCard,
  Building2,
  FileText,
  X,
  Lock,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/features/auth/store/auth.store';
import useBranchStore from '@/store/branch.store';
import BranchContextBadge from '@/features/restaurant/components/BranchContextBadge';
import { useNavigate } from 'react-router-dom';
import * as employeeApi from '../api/employee.api';

export default function StaffAttendancePayrollPage() {
  const navigate = useNavigate();
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);
  const restaurantName = useAuthStore((s) => s.restaurant?.name) || 'DineSync Gourmet';
  const userRole = useAuthStore((s) => s.user?.role) || 'manager';

  // Permission Check
  const canManagePayroll = ['super_admin', 'owner', 'manager'].includes(userRole?.toLowerCase());

  // Date States
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Data States
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, onLeave: 0 });
  const [payrollList, setPayrollList] = useState([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals State
  const [selectedBreakdownPayroll, setSelectedBreakdownPayroll] = useState(null);
  const [payslipModalData, setPayslipModalData] = useState(null);
  const [markPaidModalData, setMarkPaidModalData] = useState(null);
  const [markAttendanceModalData, setMarkAttendanceModalData] = useState(null);

  // Form inputs for Mark Paid
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Form inputs for Attendance Correction
  const [manualStatus, setManualStatus] = useState('Present');
  const [manualReason, setManualReason] = useState('Manager daily log correction');
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Fetch Summary Stats & Employees & Payroll
  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorBanner('');

    try {
      const [empData, statsData, payrollData] = await Promise.allSettled([
        employeeApi.listEmployees(restaurantId),
        employeeApi.getEmployeeStats(restaurantId),
        employeeApi.listPayroll(restaurantId, selectedMonth),
      ]);

      if (empData.status === 'fulfilled') {
        setEmployees(empData.value || []);
      } else {
        throw new Error('Failed to load employee list.');
      }

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value || {});
      }

      if (payrollData.status === 'fulfilled') {
        setPayrollList(payrollData.value || []);
      } else {
        setPayrollList([]);
      }
    } catch (err) {
      setErrorBanner(err.message || 'Error fetching staff attendance & payroll data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedMonth, selectedBranchId]);

  useEffect(() => {
    if (restaurantId) {
      loadData();
    }
  }, [restaurantId, loadData]);

  // Generate / Refresh Monthly Payroll
  const handleGeneratePayroll = async () => {
    if (!restaurantId) return;
    setIsGeneratingPayroll(true);
    setErrorBanner('');
    setSuccessBanner('');

    try {
      const generated = await employeeApi.generatePayroll(restaurantId, selectedMonth);
      setPayrollList(generated || []);
      setSuccessBanner(`Successfully computed payroll for ${selectedMonth}!`);
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Payroll calculation failed.';
      setErrorBanner(`Payroll Engine Alert: ${msg}`);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  // Mark Payroll as Paid
  const handleConfirmPaySalary = async (e) => {
    e.preventDefault();
    if (!markPaidModalData || !restaurantId) return;
    setIsSubmittingPay(true);
    setErrorBanner('');

    try {
      const updated = await employeeApi.paySalary(restaurantId, markPaidModalData._id, {
        paymentReference,
        paymentNote,
      });
      setPayrollList((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      setSuccessBanner(`Payment recorded for ${updated.employee?.firstName || 'Staff'}.`);
      setMarkPaidModalData(null);
      setPaymentReference('');
      setPaymentNote('');
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Failed to record payout.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Quick Attendance Mark/Edit
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!markAttendanceModalData || !restaurantId) return;
    setIsSubmittingAttendance(true);
    setErrorBanner('');

    try {
      await employeeApi.markBatchAttendance(restaurantId, {
        date: selectedDate,
        entries: [
          {
            employeeId: markAttendanceModalData._id,
            status: manualStatus,
            note: manualReason,
          },
        ],
      });
      setSuccessBanner(`Attendance updated to ${manualStatus} for ${markAttendanceModalData.firstName}.`);
      setMarkAttendanceModalData(null);
      loadData();
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Failed to update attendance record.');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Banking CSV Payout Manifest Export
  const handleExportCSV = () => {
    if (!payrollList || payrollList.length === 0) {
      setErrorBanner('No payroll records available to export for this period.');
      return;
    }

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Employment Type',
      'Month',
      'Working Days',
      'Basic Pay (INR)',
      'Tip Share (INR)',
      'Overtime Pay (INR)',
      'Advance Deducted (INR)',
      'Net Salary (INR)',
      'Payment Status',
      'Payment Ref',
      'Paid Date',
    ];

    const rows = payrollList.map((p) => [
      p.employee?.employeeCode || 'N/A',
      `"${(p.employee?.firstName || '')} ${(p.employee?.lastName || '')}"`,
      p.employee?.department || 'N/A',
      p.employee?.designation || 'N/A',
      p.employmentType || 'Full Time',
      p.month,
      p.workingDays || 0,
      p.basicSalary || 0,
      p.tipShare || 0,
      p.overtimePay || 0,
      p.advanceDeduction || 0,
      p.netSalary || 0,
      p.paymentStatus || 'Unpaid',
      p.paymentReference || '',
      p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DineSync_Payout_Export_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, departmentFilter]);

  const filteredPayroll = useMemo(() => {
    return payrollList.filter((p) => {
      const empName = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`;
      const matchesSearch =
        empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.employee?.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'ALL' || p.employee?.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [payrollList, searchQuery, departmentFilter]);

  // Total Payroll Cost & Unpaid Payouts count
  const totalPayrollCost = useMemo(() => {
    return payrollList.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  }, [payrollList]);

  const pendingPayoutsCount = useMemo(() => {
    return payrollList.filter((p) => p.paymentStatus !== 'Paid').length;
  }, [payrollList]);

  // Date Navigation Helpers
  const changeDateByDays = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <RestaurantLayout
      title="Staff Attendance & Payroll"
      description="Daily attendance logging, automated tip distribution, and monthly payroll calculation for managers."
    >
      <div className="space-y-6">
        <BranchContextBadge />
        {/* Restrict Non-Managers */}
        {!canManagePayroll && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-800 dark:text-amber-300 flex items-center gap-3">
            <Lock className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Restricted Access Notice</p>
              <p className="text-xs">
                Only managers, owners, and administrators have permission to view salary details or manage payroll payouts.
              </p>
            </div>
          </div>
        )}

        {/* Global Alert Banners */}
        {errorBanner && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner('')} className="hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successBanner && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner('')} className="hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* PHASE 1 (1): SUMMARY ROW AT TOP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Present Today</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {stats.presentToday || 0} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalEmployees || employees.length}</span>
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Staff On Leave</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.onLeave || 0}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <CalendarDays className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Payroll Cost ({selectedMonth})</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  ₹{canManagePayroll ? totalPayrollCost.toLocaleString('en-IN') : '••••••'}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pending Payouts</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {pendingPayoutsCount} <span className="text-xs font-normal text-muted-foreground">unpaid</span>
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Toolbar: Search & Department Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Departments</option>
              <option value="Service">Service</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Cashier">Cashier</option>
              <option value="Management">Management</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" disabled={!canManagePayroll}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export Payout CSV
            </Button>
          </div>
        </div>

        {/* PHASE 1 (2): DAILY ATTENDANCE LOG SECTION */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Daily Attendance Log
              </h2>
              <p className="text-xs text-muted-foreground">Manage daily staff clock-in/out timestamps and manual corrections.</p>
            </div>

            {/* Date-Scoped Controls */}
            <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50">
              <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => changeDateByDays(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 w-[130px]"
              />
              <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => changeDateByDays(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="xs"
                variant="secondary"
                className="h-7 text-[10px] px-2"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Attendance Table */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="p-3 font-semibold">Staff Member</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Status ({selectedDate})</th>
                    <th className="p-3 font-semibold">Clock In / Out</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {/* PHASE 3 (2): LOADING SKELETON STATE */}
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3"><div className="h-4 bg-muted rounded w-32" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-20" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-24" /></td>
                        <td className="p-3 text-right"><div className="h-6 bg-muted rounded w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredEmployees.length === 0 ? (
                    /* PHASE 3 (1): EMPTY STATE */
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <Users className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                          <h4 className="font-semibold text-sm text-foreground">No staff records found</h4>
                          <p className="text-xs text-muted-foreground">Add employee profiles to begin logging attendance and automated payroll.</p>
                          <Button size="xs" onClick={() => navigate('/restaurant/employees/list')} className="gap-1.5 text-xs">
                            <PlusCircle className="h-3.5 w-3.5" /> Add Staff Member
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{emp.firstName} {emp.lastName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode} · {emp.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{emp.department || 'Service'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-medium border-primary/30 bg-primary/5 text-primary">
                            {emp.status === 'Active' ? 'Scheduled / Active' : emp.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          09:00 AM - 05:00 PM
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => {
                              setMarkAttendanceModalData(emp);
                              setManualStatus('Present');
                            }}
                          >
                            Edit Log
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* PHASE 1 (3 & 4): PAYROLL FOR CURRENT PAY PERIOD SECTION */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" /> Payroll Register ({selectedMonth})
              </h2>
              <p className="text-xs text-muted-foreground">Itemized wage calculations, tip pooling, advances, and payouts.</p>
            </div>

            {/* Independent Pay Period Picker */}
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 text-xs w-[150px]"
              />
              <Button
                size="sm"
                className="h-9 px-4 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0"
                onClick={handleGeneratePayroll}
                isLoading={isGeneratingPayroll}
                disabled={!canManagePayroll || isGeneratingPayroll}
              >
                {!isGeneratingPayroll && <RefreshCw className="h-3.5 w-3.5" />}
                {isGeneratingPayroll ? 'Computing...' : 'Compute Payroll'}
              </Button>
            </div>
          </div>

          {/* Payroll Table */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="p-3 font-semibold">Staff Member</th>
                    <th className="p-3 font-semibold">Days Worked</th>
                    <th className="p-3 font-semibold">Base Pay</th>
                    <th className="p-3 font-semibold">Tip Share</th>
                    <th className="p-3 font-semibold">Net Pay</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3"><div className="h-4 bg-muted rounded w-32" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-12" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-20" /></td>
                        <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                        <td className="p-3 text-right"><div className="h-6 bg-muted rounded w-24 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="max-w-sm mx-auto space-y-2">
                          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                          <p className="font-semibold text-sm text-foreground">No payroll generated for {selectedMonth}</p>
                          <p className="text-xs text-muted-foreground">Click "Compute Payroll" to aggregate attendance logs and calculate monthly net salaries.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayroll.map((p) => (
                      <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {(p.employee?.firstName || 'S')[0]}{(p.employee?.lastName || '')[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{p.employee?.firstName} {p.employee?.lastName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{p.employee?.employeeCode} · {p.employmentType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono">{p.workingDays || 0} days</td>
                        <td className="p-3 font-mono">₹{canManagePayroll ? (p.basicSalary || 0).toLocaleString('en-IN') : '••••'}</td>
                        <td className="p-3 font-mono text-emerald-600 font-medium">₹{canManagePayroll ? (p.tipShare || 0).toLocaleString('en-IN') : '••••'}</td>
                        <td className="p-3 font-mono font-bold text-foreground">₹{canManagePayroll ? (p.netSalary || 0).toLocaleString('en-IN') : '••••'}</td>
                        <td className="p-3">
                          <Badge
                            variant={p.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              p.paymentStatus === 'Paid'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-500/10 text-rose-700 border-rose-200'
                            }`}
                          >
                            {p.paymentStatus || 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={() => setSelectedBreakdownPayroll(p)}
                            >
                              <Eye className="h-3 w-3" /> Breakdown
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={() => setPayslipModalData(p)}
                            >
                              <Printer className="h-3 w-3" /> Payslip
                            </Button>
                            {p.paymentStatus !== 'Paid' && (
                              <Button
                                size="xs"
                                className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setMarkPaidModalData(p)}
                                disabled={!canManagePayroll}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL 1: PAYROLL ITEMIZED BREAKDOWN MODAL */}
      {selectedBreakdownPayroll && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-border/80 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Salary Breakdown — {selectedBreakdownPayroll.employee?.firstName} {selectedBreakdownPayroll.employee?.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedBreakdownPayroll.employee?.employeeCode} · {selectedBreakdownPayroll.month}
                  </p>
                </div>
                <Button size="xs" variant="ghost" onClick={() => setSelectedBreakdownPayroll(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-xs divide-y divide-border/40">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Basic Pay</span>
                  <span className="font-mono font-medium">₹{selectedBreakdownPayroll.basicSalary || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">HRA</span>
                  <span className="font-mono font-medium">₹{selectedBreakdownPayroll.hra || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Allowances</span>
                  <span className="font-mono font-medium">₹{selectedBreakdownPayroll.allowances || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Overtime Pay ({selectedBreakdownPayroll.overtimeHours || 0} hrs)</span>
                  <span className="font-mono font-medium text-emerald-600">+₹{selectedBreakdownPayroll.overtimePay || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Tip / Service Charge Share</span>
                  <span className="font-mono font-medium text-emerald-600">+₹{selectedBreakdownPayroll.tipShare || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Pro-rata Unpaid Leave Deduction</span>
                  <span className="font-mono font-medium text-rose-600">-₹{selectedBreakdownPayroll.proDataDeduction || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Salary Advance Installment</span>
                  <span className="font-mono font-medium text-rose-600">-₹{selectedBreakdownPayroll.advanceDeduction || 0}</span>
                </div>

                <div className="flex justify-between pt-3 font-bold text-sm text-foreground">
                  <span>Net Take-Home Salary</span>
                  <span className="font-mono text-emerald-600">₹{selectedBreakdownPayroll.netSalary || 0}</span>
                </div>
              </div>

              <div className="pt-2 text-right">
                <Button size="xs" variant="outline" onClick={() => setSelectedBreakdownPayroll(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: MARK PAID MODAL */}
      {markPaidModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/80 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Record Salary Payout
                </h3>
                <Button size="xs" variant="ghost" onClick={() => setMarkPaidModalData(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  {markPaidModalData.employee?.firstName} {markPaidModalData.employee?.lastName}
                </p>
                <p className="text-muted-foreground">Period: {markPaidModalData.month}</p>
                <p className="text-emerald-600 font-mono font-bold text-sm">
                  Amount: ₹{(markPaidModalData.netSalary || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <form onSubmit={handleConfirmPaySalary} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Bank Transaction / Ref No.</label>
                  <Input
                    placeholder="e.g. UTR-98213812938"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Payment Note (Optional)</label>
                  <Input
                    placeholder="e.g. Disbursed via ICICI NetBanking"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="xs" variant="outline" type="button" onClick={() => setMarkPaidModalData(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    isLoading={isSubmittingPay}
                  >
                    Confirm Paid
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 3: ATTENDANCE LOG EDIT MODAL */}
      {markAttendanceModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/80 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Mark Attendance Log
                </h3>
                <Button size="xs" variant="ghost" onClick={() => setMarkAttendanceModalData(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  {markAttendanceModalData.firstName} {markAttendanceModalData.lastName}
                </p>
                <p className="text-muted-foreground">Date: {selectedDate}</p>
              </div>

              <form onSubmit={handleSaveAttendance} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded border border-input bg-background mt-1"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Half-day">Half-day</option>
                    <option value="Leave">Leave</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Correction Reason (Logged to Audit Trail)</label>
                  <Input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="h-8 text-xs mt-1"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="xs" variant="outline" type="button" onClick={() => setMarkAttendanceModalData(null)}>
                    Cancel
                  </Button>
                  <Button size="xs" type="submit" isLoading={isSubmittingAttendance}>
                    Save Record
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 4: PAYSLIP PREVIEW & PRINT MODAL */}
      {payslipModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl border-border/80 shadow-xl bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="font-bold text-lg text-foreground">{restaurantName}</h2>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Salary Voucher / Payslip</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="xs" onClick={() => window.print()} className="gap-1 text-xs">
                    <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setPayslipModalData(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                <div>
                  <p className="text-muted-foreground text-[10px]">EMPLOYEE</p>
                  <p className="font-bold text-foreground">{payslipModalData.employee?.firstName} {payslipModalData.employee?.lastName}</p>
                  <p className="font-mono text-muted-foreground text-[10px]">{payslipModalData.employee?.employeeCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[10px]">PAY PERIOD</p>
                  <p className="font-bold text-foreground">{payslipModalData.month}</p>
                  <p className="font-mono text-emerald-600 text-[10px]">Status: {payslipModalData.paymentStatus}</p>
                </div>
              </div>

              {/* Table details */}
              <div className="space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px]">
                      <th className="py-2">Earnings</th>
                      <th className="py-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    <tr>
                      <td className="py-1.5">Basic Salary</td>
                      <td className="py-1.5 text-right font-mono">{payslipModalData.basicSalary || 0}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">House Rent Allowance (HRA)</td>
                      <td className="py-1.5 text-right font-mono">{payslipModalData.hra || 0}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Special Allowances</td>
                      <td className="py-1.5 text-right font-mono">{payslipModalData.allowances || 0}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Overtime Pay</td>
                      <td className="py-1.5 text-right font-mono text-emerald-600">+{payslipModalData.overtimePay || 0}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Tip & Service Charge Share</td>
                      <td className="py-1.5 text-right font-mono text-emerald-600">+{payslipModalData.tipShare || 0}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-sm">
                  <span>Net Amount Payable</span>
                  <span className="font-mono text-emerald-600">₹{(payslipModalData.netSalary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </RestaurantLayout>
  );
}

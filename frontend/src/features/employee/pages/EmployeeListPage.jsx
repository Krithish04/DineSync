import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import RoleBadge from '../components/RoleBadge';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';
import * as branchApi from '@/features/branch/api/branch.api';

const DEPARTMENTS = ['Management', 'Kitchen', 'Service', 'Cashier', 'Reception', 'Inventory', 'Delivery'];

function EmployeeFormModal({ branches, initialData, onSubmit, onCancel, isSaving }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    employeeCode: initialData?.employeeCode || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().slice(0, 10) : '',
    gender: initialData?.gender || '',
    address: initialData?.address || '',
    emergencyContact: initialData?.emergencyContact || '',
    joiningDate: initialData?.joiningDate ? new Date(initialData.joiningDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    employmentType: initialData?.employmentType || 'Full Time',
    designation: initialData?.designation || '',
    department: initialData?.department || 'Service',
    branch: initialData?.branch?._id || initialData?.branch || (branches[0]?._id || ''),
    salaryType: initialData?.salaryType || 'Monthly',
    basicSalary: initialData?.basicSalary || 0,
    status: initialData?.status || 'Active',
  });
  const [err, setErr] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === 'basicSalary' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    if (!form.firstName.trim()) return setErr('First name is required.');
    if (!form.lastName.trim()) return setErr('Last name is required.');
    if (!form.employeeCode.trim()) return setErr('Employee code is required.');
    if (!form.email.trim()) return setErr('Email is required.');
    if (!form.phone.trim()) return setErr('Phone is required.');
    if (!form.designation.trim()) return setErr('Designation is required.');
    if (!form.branch) return setErr('Branch is required.');
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b bg-muted/20 font-bold text-sm">{isEdit ? 'Edit Employee Profile' : 'Register New Employee'}</div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {err && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

          <div className="grid grid-cols-2 gap-4">
            {[['firstName', 'First Name *'], ['lastName', 'Last Name *'], ['employeeCode', 'Employee Code *'], ['email', 'Email *'], ['phone', 'Phone *'], ['designation', 'Designation *']].map(([name, label]) => (
              <div key={name} className="space-y-1.5">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} name={name} value={form[name]} onChange={handleChange} className="text-xs h-9" required />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ['department', 'Department', DEPARTMENTS],
              ['employmentType', 'Employment', ['Full Time', 'Part Time', 'Contract', 'Temporary']],
              ['salaryType', 'Salary Type', ['Monthly', 'Hourly']],
            ].map(([name, label, options]) => (
              <div key={name} className="space-y-1.5">
                <Label htmlFor={name}>{label}</Label>
                <select id={name} name={name} value={form[name]} onChange={handleChange}
                  className="flex h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none">
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="basicSalary">Basic Salary (₹)</Label>
              <Input id="basicSalary" name="basicSalary" type="number" min="0" value={form.basicSalary} onChange={handleChange} className="font-mono text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input id="joiningDate" name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} className="text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch">Branch *</Label>
              <select id="branch" name="branch" value={form.branch} onChange={handleChange}
                className="flex h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none">
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" name="gender" value={form.gender} onChange={handleChange}
                className="flex h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className="text-xs h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" value={form.address} onChange={handleChange} className="text-xs h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input id="emergencyContact" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className="text-xs h-9" placeholder="Name / Phone" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs">Cancel</Button>
            <Button type="submit" size="sm" isLoading={isSaving} className="text-xs">{isEdit ? 'Save Changes' : 'Register Employee'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeeListPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await employeeApi.listEmployees(restaurantId);
      setEmployees(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) { loadBranches(); loadEmployees(); } }, [restaurantId, loadBranches, loadEmployees]);

  const handleSubmit = async (payload) => {
    setIsSaving(true);
    setError('');
    try {
      if (editData) {
        await employeeApi.updateEmployee(restaurantId, editData._id, payload);
        setSuccess('Employee profile updated.');
      } else {
        await employeeApi.createEmployee(restaurantId, payload);
        setSuccess('Employee registered successfully.');
      }
      setIsModalOpen(false);
      setEditData(null);
      loadEmployees();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (empId) => {
    if (!window.confirm('Mark this employee as Resigned?')) return;
    try {
      await employeeApi.deleteEmployee(restaurantId, empId);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee.');
    }
  };

  const filtered = useMemo(() => employees.filter((e) => {
    const matchSearch = `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || e.department === deptFilter;
    return matchSearch && matchDept;
  }), [employees, search, deptFilter]);

  return (
    <RestaurantLayout title="Restaurant Management" description="All registered staff profiles, departments, and designations.">
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>Manage all staff profiles across branches.</CardDescription>
          </div>
          <Button size="xs" onClick={() => { setEditData(null); setIsModalOpen(true); }} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Register Employee
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div>}

          <div className="flex flex-wrap gap-4 border-b border-border/40 pb-4">
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded border border-input bg-background px-3 text-xs font-semibold focus:outline-none">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            </div>
          </div>

          {isLoading ? <Loader label="Loading staff directory..." /> : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded">No employees found.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground uppercase text-[10px]">
                    {['Employee ID', 'Name', 'Department', 'Designation', 'Type', 'Salary (₹)', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="p-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr key={emp._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                      <td className="p-3"><span className="font-mono bg-muted px-2 py-0.5 rounded text-[10px]">{emp.employeeId}</span></td>
                      <td className="p-3 font-bold text-foreground">{emp.firstName} {emp.lastName}</td>
                      <td className="p-3"><RoleBadge type="department" value={emp.department} /></td>
                      <td className="p-3 text-muted-foreground">{emp.designation}</td>
                      <td className="p-3"><RoleBadge type="employment" value={emp.employmentType} /></td>
                      <td className="p-3 font-mono font-bold">₹{emp.basicSalary?.toLocaleString()}</td>
                      <td className="p-3"><RoleBadge type="status" value={emp.status} /></td>
                      <td className="p-3 flex items-center gap-1">
                        <Button size="xs" variant="outline" className="h-7 text-[10px]" onClick={() => navigate(`/restaurant/employees/${emp._id}/profile`)}>Profile</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditData(emp); setIsModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(emp._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <EmployeeFormModal
          branches={branches}
          initialData={editData}
          onSubmit={handleSubmit}
          onCancel={() => { setIsModalOpen(false); setEditData(null); }}
          isSaving={isSaving}
        />
      )}
    </RestaurantLayout>
  );
}

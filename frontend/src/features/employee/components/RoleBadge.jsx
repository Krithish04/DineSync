const DEPARTMENT_STYLES = {
  Management: 'bg-purple-100 text-purple-800 border-purple-200',
  Kitchen: 'bg-orange-100 text-orange-800 border-orange-200',
  Service: 'bg-blue-100 text-blue-800 border-blue-200',
  Cashier: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Reception: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Inventory: 'bg-amber-100 text-amber-800 border-amber-200',
  Delivery: 'bg-slate-100 text-slate-800 border-slate-200',
};

const STATUS_STYLES = {
  Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'On Leave': 'bg-blue-100 text-blue-800 border-blue-200',
  Suspended: 'bg-rose-100 text-rose-800 border-rose-200',
  Resigned: 'bg-gray-100 text-gray-600 border-gray-200',
};

const EMPLOYMENT_STYLES = {
  'Full Time': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Part Time': 'bg-violet-100 text-violet-800 border-violet-200',
  Contract: 'bg-teal-100 text-teal-800 border-teal-200',
  Temporary: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export default function RoleBadge({ type = 'department', value }) {
  if (!value) return null;

  let styleClass = 'bg-muted text-muted-foreground border-border';

  if (type === 'department') {
    styleClass = DEPARTMENT_STYLES[value] || styleClass;
  } else if (type === 'status') {
    styleClass = STATUS_STYLES[value] || styleClass;
  } else if (type === 'employment') {
    styleClass = EMPLOYMENT_STYLES[value] || styleClass;
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold border uppercase tracking-wider ${styleClass}`}>
      {value}
    </span>
  );
}

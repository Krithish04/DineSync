import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports a flat array of objects to CSV, XLSX, or PDF.
 * Called from the toolbar buttons.
 */
function toFlatRows(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  return data;
}

function exportCSV(data, fileName) {
  const rows = toFlatRows(data);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(data, fileName) {
  const ws = XLSX.utils.json_to_sheet(toFlatRows(data));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

function exportPDF(data, fileName, title) {
  const rows = toFlatRows(data);
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title || fileName, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);
  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 28,
    head: [headers.map((h) => h.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()))],
    body: rows.map((r) => headers.map((h) => r[h] ?? '')),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [194, 68, 15] },
  });
  doc.save(`${fileName}.pdf`);
}

/**
 * ExportToolbar — renders CSV, Excel, PDF, and Print buttons.
 *
 * Props:
 *   data       – flat array of objects to export
 *   fileName   – base file name (no extension)
 *   title      – used as PDF document title
 *   onRefresh  – optional refresh callback
 */
export default function ExportToolbar({ data = [], fileName = 'report', title = 'Report' }) {
  const handlePrint = () => window.print();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={() => exportCSV(data, fileName)}
        className="gap-1.5 text-xs"
        title="Export as CSV"
      >
        <Download size={14} />
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => exportExcel(data, fileName)}
        className="gap-1.5 text-xs"
        title="Export as Excel"
      >
        <FileSpreadsheet size={14} />
        Excel
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => exportPDF(data, fileName, title)}
        className="gap-1.5 text-xs"
        title="Export as PDF"
      >
        <FileText size={14} />
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrint}
        className="gap-1.5 text-xs"
        title="Print"
      >
        <Printer size={14} />
        Print
      </Button>
    </div>
  );
}

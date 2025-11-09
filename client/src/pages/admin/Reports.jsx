import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReports() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select date range');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        status: 'all',
      });

      window.open(`/api/admin/reports/sales.xlsx?${params.toString()}`, '_blank');
      toast.success('Export started');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Export and analyze sales data</p>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Export Sales Report</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export as Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

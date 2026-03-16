import FileUpload from '../../apps/insighthunter-lite/components/FileUpload';
import MetricCard from '../../apps/insighthunter-lite/components/MetricCard';
import FinancialChart from '../../apps/insighthunter-lite/components/FinancialChart';

const icon = (
    <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
        ></path>
    </svg>
);

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>
      <div className="space-y-8">
        <FileUpload />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard title="Total Revenue" value="$125,432" icon={icon} />
            <MetricCard title="Net Profit" value="$45,876" icon={icon} />
            <MetricCard title="Total Expenses" value="$79,556" icon={icon} />
        </div>
        <FinancialChart />
      </div>
    </div>
  );
}

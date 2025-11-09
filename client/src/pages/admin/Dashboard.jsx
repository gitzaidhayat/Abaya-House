import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { formatPrice } from '../../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/dashboard');
      return data;
    },
  });

  const metrics = [
    {
      title: 'Total Revenue',
      value: stats ? formatPrice(stats.revenue) : '...',
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
    },
    {
      title: 'Total Orders',
      value: stats?.orders || '...',
      change: stats?.ordersGrowth || 0,
      icon: ShoppingBag,
    },
    {
      title: 'Avg Order Value',
      value: stats ? formatPrice(stats.avgOrderValue) : '...',
      change: 0,
      icon: Activity,
    },
    {
      title: 'Sessions',
      value: stats?.sessions || '...',
      change: 0,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change >= 0;

          return (
            <div key={index} className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{metric.title}</span>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.change !== 0 && (
                  <div className="flex items-center space-x-1">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs last month</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion Rate */}
      {stats && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Conversion Rate</h2>
          <div className="text-3xl font-bold text-primary">{stats.conversionRate.toFixed(2)}%</div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.orders} orders from {stats.sessions} sessions
          </p>
        </div>
      )}

      <div className="bg-muted/40 border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Additional charts and analytics will be displayed here
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber, formatCurrency } from '@/lib/utils';
import api from '@/lib/api-client';

const COLORS = {
  student: '#3B82F6',
  faculty: '#8B5CF6',
  staff: '#F97316',
  breakfast: '#F59E0B',
  lunch: '#F97316',
  dinner: '#6366F1',
  active: '#10B981',
  inactive: '#EF4444',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

const GRADIENTS = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  purple: 'from-violet-500 to-violet-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data states
  const [members, setMembers] = useState({ students: [], faculty: [], staff: [] });
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingMembers: 0,
    totalPackages: 0,
    activePackages: 0,
    totalMealsPerMonth: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [studentsRes, facultyRes, staffRes, packagesRes] = await Promise.all([
        api.get('/api/student-members'),
        api.get('/api/faculty-members'),
        api.get('/api/staff-members'),
        api.get('/api/member-packages'),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : { members: [] };
      const facultyData = facultyRes.ok ? await facultyRes.json() : { members: [] };
      const staffData = staffRes.ok ? await staffRes.json() : { members: [] };
      const packagesData = packagesRes.ok ? await packagesRes.json() : { packages: [] };

      const students = studentsData.members || [];
      const faculty = facultyData.members || [];
      const staff = staffData.members || [];
      const pkgs = packagesData.packages || [];

      setMembers({ students, faculty, staff });
      setPackages(pkgs);

      const allMembers = [...students, ...faculty, ...staff];
      const activeMembers = allMembers.filter(m => m.status === 'approved').length;
      const pendingMembers = allMembers.filter(m => m.status === 'pending').length;
      const activePackages = pkgs.filter(p => p.is_active).length;

      let totalMeals = 0;
      let totalRevenue = 0;
      pkgs.forEach(pkg => {
        if (pkg.is_active) {
          if (pkg.breakfast_enabled) totalMeals += parseInt(pkg.breakfast_meals_per_month) || 0;
          if (pkg.lunch_enabled) totalMeals += parseInt(pkg.lunch_meals_per_month) || 0;
          if (pkg.dinner_enabled) totalMeals += parseInt(pkg.dinner_meals_per_month) || 0;
          totalRevenue += parseFloat(pkg.price) || 0;
        }
      });

      setStats({
        totalMembers: allMembers.length,
        activeMembers,
        pendingMembers,
        totalPackages: pkgs.length,
        activePackages,
        totalMealsPerMonth: totalMeals,
        totalRevenue,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const memberDistributionData = [
    { name: 'Students', value: members.students.length, color: COLORS.student },
    { name: 'Faculty', value: members.faculty.length, color: COLORS.faculty },
    { name: 'Staff', value: members.staff.length, color: COLORS.staff },
  ];

  const memberStatusData = [
    { name: 'Approved', value: stats.activeMembers, color: COLORS.approved },
    { name: 'Pending', value: stats.pendingMembers, color: COLORS.pending },
    { name: 'Rejected', value: stats.totalMembers - stats.activeMembers - stats.pendingMembers, color: COLORS.rejected },
  ].filter(d => d.value > 0);

  const mealTypeData = [
    {
      name: 'Breakfast',
      packages: packages.filter(p => p.breakfast_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.breakfast_enabled && p.is_active ? (parseInt(p.breakfast_meals_per_month) || 0) : 0), 0)
    },
    {
      name: 'Lunch',
      packages: packages.filter(p => p.lunch_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.lunch_enabled && p.is_active ? (parseInt(p.lunch_meals_per_month) || 0) : 0), 0)
    },
    {
      name: 'Dinner',
      packages: packages.filter(p => p.dinner_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.dinner_enabled && p.is_active ? (parseInt(p.dinner_meals_per_month) || 0) : 0), 0)
    },
  ];

  const packagesByTypeData = [
    { name: 'Student', value: packages.filter(p => p.member_type === 'student').length, color: COLORS.student },
    { name: 'Faculty', value: packages.filter(p => p.member_type === 'faculty').length, color: COLORS.faculty },
    { name: 'Staff', value: packages.filter(p => p.member_type === 'staff').length, color: COLORS.staff },
  ];

  // Recent members (last 5)
  const recentMembers = [...members.students, ...members.faculty, ...members.staff]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Pakistan Time (UTC+5)
  const getPakistanTime = () => {
    const pakistanOffset = 5 * 60; // UTC+5 in minutes
    const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
    return new Date(utc + (pakistanOffset * 60000));
  };

  const pakistanTime = getPakistanTime();

  const greeting = () => {
    const hour = pakistanTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatPakistanTime = () => {
    return pakistanTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatPakistanDate = () => {
    return pakistanTime.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Compact Header Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200 shadow-sm">
        <div className="relative px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-emerald-600 text-xs">{greeting()}</p>
              </div>
            </div>

            {/* Center: Pakistan Time */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl px-4 py-2 border border-slate-200">
              <div className="text-center">
                <p className="text-sm font-mono font-bold tracking-wider text-slate-900">{formatPakistanTime()}</p>
                <p className="text-[10px] text-slate-500">{formatPakistanDate()}</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              <button
                onClick={loadDashboardData}
                className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all active:scale-95 text-slate-600"
                title="Refresh"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Total Members"
              value={stats.totalMembers}
              subtitle={`${stats.activeMembers} approved`}
              icon={<UsersIcon />}
              gradient={GRADIENTS.blue}
              trend={stats.pendingMembers > 0 ? { value: stats.pendingMembers, label: 'pending', type: 'warning' } : null}
            />
            <StatCard
              title="Active Packages"
              value={stats.activePackages}
              subtitle={`of ${stats.totalPackages} total`}
              icon={<PackageIcon />}
              gradient={GRADIENTS.green}
            />
            <StatCard
              title="Monthly Meals"
              value={formatNumber(stats.totalMealsPerMonth)}
              subtitle="Meals per month"
              icon={<MealIcon />}
              gradient={GRADIENTS.purple}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="From active packages"
              icon={<RevenueIcon />}
              gradient={GRADIENTS.amber}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ChartCard title="Member Distribution" subtitle="By member type" badge={`${stats.totalMembers} Total`}>
              <div className="h-56 relative">
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">{stats.totalMembers}</p>
                    <p className="text-xs text-slate-500 font-medium">Members</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
                      </filter>
                    </defs>
                    <Pie
                      data={memberDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      filter="url(#shadow)"
                    >
                      {memberDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const percentage = stats.totalMembers > 0 ? ((payload[0].value / stats.totalMembers) * 100).toFixed(1) : 0;
                          return (
                            <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-slate-100">
                              <p className="font-bold text-slate-900">{payload[0].name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold" style={{ color: payload[0].payload.color }}>{payload[0].value}</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-slate-600">{percentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Detailed Legend */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {memberDistributionData.map((item, i) => {
                  const percentage = stats.totalMembers > 0 ? ((item.value / stats.totalMembers) * 100).toFixed(0) : 0;
                  return (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-medium text-slate-600">{item.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-slate-900">{item.value}</span>
                        <span className="text-xs text-slate-400">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Member Status" subtitle="Approval overview" badge={stats.activeMembers > 0 ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% Approved` : '0%'}>
              <div className="h-56 relative">
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <p className="text-3xl font-black text-emerald-600">{stats.activeMembers}</p>
                    <p className="text-xs text-slate-500 font-medium">Approved</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memberStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {memberStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const percentage = stats.totalMembers > 0 ? ((payload[0].value / stats.totalMembers) * 100).toFixed(1) : 0;
                          return (
                            <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-slate-100">
                              <p className="font-bold text-slate-900">{payload[0].name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold" style={{ color: payload[0].payload.color }}>{payload[0].value}</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-slate-600">{percentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Detailed Legend */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { name: 'Approved', value: stats.activeMembers, color: COLORS.approved },
                  { name: 'Pending', value: stats.pendingMembers, color: COLORS.pending },
                  { name: 'Rejected', value: stats.totalMembers - stats.activeMembers - stats.pendingMembers, color: COLORS.rejected },
                ].map((item, i) => {
                  const percentage = stats.totalMembers > 0 ? ((item.value / stats.totalMembers) * 100).toFixed(0) : 0;
                  return (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-medium text-slate-600">{item.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-slate-900">{item.value}</span>
                        <span className="text-xs text-slate-400">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className={`grid grid-cols-1 ${stats.totalPackages > 0 ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
            <ChartCard title="Meal Distribution" subtitle="Packages and meals by type" badge={`${stats.totalMealsPerMonth} Meals/Day`}>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {mealTypeData.map((item, i) => {
                  const icons = ['🌅', '☀️', '🌙'];
                  const colors = ['from-amber-400 to-orange-500', 'from-orange-400 to-red-500', 'from-indigo-400 to-purple-500'];
                  return (
                    <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${colors[i]} rounded-xl p-3 text-white`}>
                      <span className="absolute -right-2 -top-2 text-3xl opacity-30">{icons[i]}</span>
                      <p className="text-xs opacity-90">{item.name}</p>
                      <p className="text-xl font-bold">{item.meals}</p>
                      <p className="text-[10px] opacity-75">{item.packages} packages</p>
                    </div>
                  );
                })}
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mealTypeData} barSize={32}>
                    <defs>
                      <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                      <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#2563EB" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-slate-100">
                              <p className="font-bold text-slate-900 mb-2">{label}</p>
                              {payload.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full" style={{ background: item.fill }}></div>
                                  <span className="text-slate-600">{item.name}:</span>
                                  <span className="font-bold text-slate-900">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      formatter={(value) => <span className="text-slate-600 text-xs">{value}</span>}
                    />
                    <Bar dataKey="packages" name="Packages" fill="url(#barGradient1)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="meals" name="Meals/Day" fill="url(#barGradient2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {stats.totalPackages > 0 && (
              <ChartCard title="Packages by Type" subtitle="Distribution across member types" badge={`${stats.totalPackages} Total`}>
                <div className="h-48 relative">
                  {/* Center Label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900">{stats.activePackages}</p>
                      <p className="text-xs text-slate-500 font-medium">Active</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={packagesByTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {packagesByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const percentage = stats.totalPackages > 0 ? ((payload[0].value / stats.totalPackages) * 100).toFixed(1) : 0;
                            return (
                              <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-slate-100">
                                <p className="font-bold text-slate-900">{payload[0].name} Packages</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-lg font-bold" style={{ color: payload[0].payload.color }}>{payload[0].value}</span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-600">{percentage}%</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Detailed Legend */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {packagesByTypeData.map((item, i) => {
                    const percentage = stats.totalPackages > 0 ? ((item.value / stats.totalPackages) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs font-medium text-slate-600">{item.name}</span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-lg font-bold text-slate-900">{item.value}</span>
                          <span className="text-xs text-slate-400">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            )}
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Shortcuts</span>
              </div>
              <div className="space-y-3">
                <QuickActionButton href="/admin/members" icon={<UsersIcon />} title="Manage Members" subtitle="View all members" gradient="from-blue-500 to-blue-600" />
                <QuickActionButton href="/admin/packages" icon={<PackageIcon />} title="Manage Packages" subtitle="Edit meal packages" gradient="from-emerald-500 to-emerald-600" />
                <QuickActionButton href="/admin/reports" icon={<ReportIcon />} title="View Reports" subtitle="Analytics & reports" gradient="from-violet-500 to-violet-600" />
                <QuickActionButton href="/admin/settings" icon={<SettingsIcon />} title="Settings" subtitle="System preferences" gradient="from-slate-500 to-slate-600" />
              </div>
            </div>

            {/* Recent Members */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Recent Members</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Latest registrations</p>
                </div>
                <Link href="/admin/members" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                  View All
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {recentMembers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UsersIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No members yet</p>
                  <p className="text-sm text-slate-400 mt-1">Members will appear here once registered</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Department</th>
                        <th className="pb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentMembers.map((member, idx) => {
                        const type = member.roll_number ? 'student' : member.cnic_no ? 'staff' : 'faculty';
                        return (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-semibold ${
                                  type === 'student' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                  type === 'faculty' ? 'bg-gradient-to-br from-violet-500 to-violet-600' :
                                  'bg-gradient-to-br from-orange-500 to-orange-600'
                                }`}>
                                  {member.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-900">{member.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${
                                type === 'student' ? 'bg-blue-50 text-blue-700' :
                                type === 'faculty' ? 'bg-violet-50 text-violet-700' :
                                'bg-orange-50 text-orange-700'
                              }`}>
                                {type}
                              </span>
                            </td>
                            <td className="py-4 text-slate-600 text-sm hidden sm:table-cell">{member.department_program || member.department || member.department_section || '-'}</td>
                            <td className="py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                member.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                member.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  member.status === 'approved' ? 'bg-emerald-500' :
                                  member.status === 'pending' ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}></span>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Fancy Stat Card Component
function StatCard({ title, value, subtitle, icon, gradient, trend }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 p-4 sm:p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 hover:border-slate-300/60">
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}></div>

      {/* Floating particles effect */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${gradient} opacity-20 animate-pulse`}></div>
        <div className={`absolute top-4 right-6 w-3 h-3 rounded-full bg-gradient-to-br ${gradient} opacity-30`}></div>
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1 flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:scale-[1.02] transition-transform origin-left">{value}</p>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400">{subtitle}</p>
          {trend && (
            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
              trend.type === 'warning' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${trend.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              {trend.value} {trend.label}
            </div>
          )}
        </div>
        <div className={`relative p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>
          <div className="relative">{icon}</div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

      {/* Corner decoration */}
      <div className={`absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-150 transition-all duration-500`}></div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 p-4 sm:p-5 select-none outline-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, count, approved, icon, gradient, label = 'Approved' }) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 p-5 overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white`}>
          {icon}
        </div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <p className="text-3xl font-bold text-slate-900">{count}</p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
            style={{ width: count > 0 ? `${(approved / count) * 100}%` : '0%' }}
          ></div>
        </div>
        <span className="text-xs font-medium text-slate-500">{approved} {label}</span>
      </div>
    </div>
  );
}

// Quick Action Button
function QuickActionButton({ href, icon, title, subtitle, gradient }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all hover:shadow-sm group bg-slate-50/50 hover:bg-white"
    >
      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Icons
function UsersIcon({ className = "w-5 h-5 sm:w-6 sm:h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function PackageIcon({ className = "w-5 h-5 sm:w-6 sm:h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function MealIcon({ className = "w-5 h-5 sm:w-6 sm:h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-4.5a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RevenueIcon({ className = "w-5 h-5 sm:w-6 sm:h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function ReportIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SettingsIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function RefreshIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function ClockIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StudentIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function FacultyIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function StaffIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  );
}

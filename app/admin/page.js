'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatNumber, formatCurrency } from '@/lib/utils';

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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [memberTypeFilter, setMemberTypeFilter] = useState('all');

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
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [studentsRes, facultyRes, staffRes, packagesRes] = await Promise.all([
        fetch('/api/student-members'),
        fetch('/api/faculty-members'),
        fetch('/api/staff-members'),
        fetch('/api/member-packages'),
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

      // Calculate stats
      const allMembers = [...students, ...faculty, ...staff];
      const activeMembers = allMembers.filter(m => m.status === 'approved').length;
      const pendingMembers = allMembers.filter(m => m.status === 'pending').length;
      const activePackages = pkgs.filter(p => p.is_active).length;

      let totalMeals = 0;
      let totalRevenue = 0;
      pkgs.forEach(pkg => {
        if (pkg.is_active) {
          if (pkg.breakfast_enabled) totalMeals += parseInt(pkg.breakfast_meals_per_day) || 0;
          if (pkg.lunch_enabled) totalMeals += parseInt(pkg.lunch_meals_per_day) || 0;
          if (pkg.dinner_enabled) totalMeals += parseInt(pkg.dinner_meals_per_day) || 0;
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
      meals: packages.reduce((sum, p) => sum + (p.breakfast_enabled && p.is_active ? (parseInt(p.breakfast_meals_per_day) || 0) : 0), 0)
    },
    {
      name: 'Lunch',
      packages: packages.filter(p => p.lunch_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.lunch_enabled && p.is_active ? (parseInt(p.lunch_meals_per_day) || 0) : 0), 0)
    },
    {
      name: 'Dinner',
      packages: packages.filter(p => p.dinner_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.dinner_enabled && p.is_active ? (parseInt(p.dinner_meals_per_day) || 0) : 0), 0)
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

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's your cafeteria overview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              title="Total Members"
              value={stats.totalMembers}
              subtitle={`${stats.activeMembers} approved`}
              icon={<UsersIcon />}
              color="blue"
              trend={stats.pendingMembers > 0 ? `${stats.pendingMembers} pending` : null}
            />
            <StatCard
              title="Active Packages"
              value={stats.activePackages}
              subtitle={`of ${stats.totalPackages} total`}
              icon={<PackageIcon />}
              color="green"
            />
            <StatCard
              title="Monthly Meals"
              value={formatNumber(stats.totalMealsPerMonth)}
              subtitle="Meals per month"
              icon={<MealIcon />}
              color="purple"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="From active packages"
              icon={<RevenueIcon />}
              color="amber"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Member Distribution Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Member Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memberDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {memberDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{members.students.length}</p>
                  <p className="text-xs text-gray-600">Students</p>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">{members.faculty.length}</p>
                  <p className="text-xs text-gray-600">Faculty</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <p className="text-lg font-bold text-orange-600">{members.staff.length}</p>
                  <p className="text-xs text-gray-600">Staff</p>
                </div>
              </div>
            </div>

            {/* Member Status Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Member Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memberStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {memberStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{stats.activeMembers}</p>
                  <p className="text-xs text-gray-600">Approved</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <p className="text-lg font-bold text-yellow-600">{stats.pendingMembers}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{stats.totalMembers - stats.activeMembers - stats.pendingMembers}</p>
                  <p className="text-xs text-gray-600">Rejected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Meal Types Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Meal Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mealTypeData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="packages" name="Packages" fill={COLORS.faculty} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meals" name="Meals/Month" fill={COLORS.student} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Packages by Type */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Packages by Member Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={packagesByTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {packagesByTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <QuickActionButton href="/admin/members" icon={<UsersIcon />} title="Manage Members" color="blue" />
                <QuickActionButton href="/admin/packages" icon={<PackageIcon />} title="Manage Packages" color="green" />
                <QuickActionButton href="/admin/reports" icon={<ReportIcon />} title="View Reports" color="purple" />
                <QuickActionButton href="/admin/settings" icon={<SettingsIcon />} title="Settings" color="gray" />
              </div>
            </div>

            {/* Recent Members */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Recent Members</h3>
                <Link href="/admin/members" className="text-xs text-primary-600 hover:text-primary-700">View All</Link>
              </div>
              {recentMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm">No members yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="pb-2 text-left font-medium">Name</th>
                        <th className="pb-2 text-left font-medium">Type</th>
                        <th className="pb-2 text-left font-medium">Department</th>
                        <th className="pb-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentMembers.map((member, idx) => {
                        const type = member.roll_number ? 'student' : member.cnic_no ? 'staff' : 'faculty';
                        return (
                          <tr key={idx} className="text-sm">
                            <td className="py-2 font-medium text-gray-900">{member.full_name}</td>
                            <td className="py-2">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded capitalize ${
                                type === 'student' ? 'bg-blue-100 text-blue-700' :
                                type === 'faculty' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {type}
                              </span>
                            </td>
                            <td className="py-2 text-gray-600">{member.department_program || member.department || member.department_section || '-'}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                member.status === 'approved' ? 'bg-green-100 text-green-700' :
                                member.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <SummaryCard
              title="Students"
              count={members.students.length}
              approved={members.students.filter(m => m.status === 'approved').length}
              color="blue"
            />
            <SummaryCard
              title="Faculty"
              count={members.faculty.length}
              approved={members.faculty.filter(m => m.status === 'approved').length}
              color="purple"
            />
            <SummaryCard
              title="Staff"
              count={members.staff.length}
              approved={members.staff.filter(m => m.status === 'approved').length}
              color="orange"
            />
            <SummaryCard
              title="Packages"
              count={packages.length}
              approved={packages.filter(p => p.is_active).length}
              color="green"
              label="Active"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          {trend && <p className="text-xs text-amber-600 mt-1">{trend}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, count, approved, color, label = 'Approved' }) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50/50',
    purple: 'border-l-purple-500 bg-purple-50/50',
    orange: 'border-l-orange-500 bg-orange-50/50',
    green: 'border-l-green-500 bg-green-50/50',
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${colorClasses[color]} p-4`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
      <p className="text-xs text-gray-500 mt-1">{approved} {label}</p>
    </div>
  );
}

// Quick Action Button
function QuickActionButton({ href, icon, title, color }) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 text-blue-600',
    green: 'hover:bg-green-50 text-green-600',
    purple: 'hover:bg-purple-50 text-purple-600',
    gray: 'hover:bg-gray-50 text-gray-600',
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 transition-colors ${colorClasses[color]}`}
    >
      <span className="p-2 rounded-lg bg-gray-100">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{title}</span>
      <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Icons
function UsersIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

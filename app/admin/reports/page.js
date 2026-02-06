'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';

const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  tertiary: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  student: '#3B82F6',
  faculty: '#8B5CF6',
  staff: '#F97316',
  breakfast: '#F59E0B',
  lunch: '#F97316',
  dinner: '#6366F1',
};

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export default function ReportsPage() {
  const { user, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports_date_preset') || 'today';
    }
    return 'today';
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const saved = typeof window !== 'undefined' ? localStorage.getItem('reports_date_preset') : null;
    const preset = saved || 'today';

    let start, end;
    switch (preset) {
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        start = end = y.toISOString().split('T')[0];
        break;
      }
      case 'week': {
        const ws = new Date(today);
        ws.setDate(today.getDate() - today.getDay());
        start = ws.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'quarter': {
        const qm = Math.floor(today.getMonth() / 3) * 3;
        start = new Date(today.getFullYear(), qm, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'custom': {
        const savedStart = typeof window !== 'undefined' ? localStorage.getItem('reports_custom_start') : null;
        const savedEnd = typeof window !== 'undefined' ? localStorage.getItem('reports_custom_end') : null;
        start = savedStart || today.toISOString().split('T')[0];
        end = savedEnd || today.toISOString().split('T')[0];
        break;
      }
      default: // 'today'
        start = end = today.toISOString().split('T')[0];
    }
    return { start, end };
  });

  // Data states
  const [members, setMembers] = useState({ students: [], faculty: [], staff: [] });
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    newMembers: 0,
    activePackages: 0,
    totalPackages: 0,
    totalMeals: 0,
    totalRevenue: 0,
    collectionRate: 0,
  });

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  // Handle date preset change
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    localStorage.setItem('reports_date_preset', preset);
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = yesterday.toISOString().split('T')[0];
        break;
      }
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'quarter': {
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        start = new Date(today.getFullYear(), quarterMonth, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      }
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    if (preset !== 'custom') {
      setDateRange({ start, end });
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel (both old and v2 packages)
      const [studentsRes, facultyRes, staffRes, packagesOldRes, packagesV2Res] = await Promise.all([
        api.get('/api/student-members'),
        api.get('/api/faculty-members'),
        api.get('/api/staff-members'),
        api.get('/api/member-packages'),
        api.get('/api/member-packages-v2'),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : { members: [] };
      const facultyData = facultyRes.ok ? await facultyRes.json() : { members: [] };
      const staffData = staffRes.ok ? await staffRes.json() : { members: [] };
      const packagesOldData = packagesOldRes.ok ? await packagesOldRes.json() : { packages: [] };
      const packagesV2Data = packagesV2Res.ok ? await packagesV2Res.json() : { packages: [] };

      const students = studentsData.members || [];
      const faculty = facultyData.members || [];
      const staff = staffData.members || [];
      const oldPkgs = packagesOldData.packages || [];
      const v2Pkgs = packagesV2Data.packages || [];
      // Normalize v2 packages to have the same meal fields as old packages
      const normalizedV2 = v2Pkgs.map(p => ({
        ...p,
        breakfast_meals_per_month: p.total_breakfast || 0,
        lunch_meals_per_month: p.total_lunch || 0,
        dinner_meals_per_month: p.total_dinner || 0,
      }));
      const pkgs = [...oldPkgs, ...normalizedV2];

      // Filter by date range
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);

      const filterByDate = (items) => items.filter(item => {
        const createdAt = new Date(item.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });

      const filteredStudents = filterByDate(students);
      const filteredFaculty = filterByDate(faculty);
      const filteredStaff = filterByDate(staff);
      const filteredPkgs = filterByDate(pkgs);

      // Set filtered data to state so charts use filtered data
      setMembers({ students: filteredStudents, faculty: filteredFaculty, staff: filteredStaff });
      setPackages(filteredPkgs);

      // Calculate stats from filtered data
      const allFilteredMembers = [...filteredStudents, ...filteredFaculty, ...filteredStaff];
      const activePackages = filteredPkgs.filter(p => p.is_active);

      let totalMeals = 0;
      let totalRevenue = 0;
      activePackages.forEach(pkg => {
        if (pkg.breakfast_enabled) totalMeals += parseInt(pkg.breakfast_meals_per_month) || 0;
        if (pkg.lunch_enabled) totalMeals += parseInt(pkg.lunch_meals_per_month) || 0;
        if (pkg.dinner_enabled) totalMeals += parseInt(pkg.dinner_meals_per_month) || 0;
        totalRevenue += parseFloat(pkg.price) || 0;
      });

      setStats({
        totalMembers: allFilteredMembers.length,
        newMembers: allFilteredMembers.length,
        activePackages: activePackages.length,
        totalPackages: filteredPkgs.length,
        totalMeals,
        totalRevenue,
        collectionRate: filteredPkgs.length > 0 && activePackages.length > 0
          ? Math.round((activePackages.length / filteredPkgs.length) * 100)
          : 0,
      });
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const memberTypeData = [
    { name: 'Students', value: members.students.length, color: COLORS.student },
    { name: 'Faculty', value: members.faculty.length, color: COLORS.faculty },
    { name: 'Staff', value: members.staff.length, color: COLORS.staff },
  ];

  const mealDistributionData = [
    {
      name: 'Breakfast',
      count: packages.filter(p => p.breakfast_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.breakfast_enabled && p.is_active ? (parseInt(p.breakfast_meals_per_month) || 0) : 0), 0),
      color: COLORS.breakfast,
    },
    {
      name: 'Lunch',
      count: packages.filter(p => p.lunch_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.lunch_enabled && p.is_active ? (parseInt(p.lunch_meals_per_month) || 0) : 0), 0),
      color: COLORS.lunch,
    },
    {
      name: 'Dinner',
      count: packages.filter(p => p.dinner_enabled && p.is_active).length,
      meals: packages.reduce((sum, p) => sum + (p.dinner_enabled && p.is_active ? (parseInt(p.dinner_meals_per_month) || 0) : 0), 0),
      color: COLORS.dinner,
    },
  ];

  const packageStatusData = [
    { name: 'Active', value: packages.filter(p => p.is_active).length, color: COLORS.primary },
    { name: 'Inactive', value: packages.filter(p => !p.is_active).length, color: COLORS.danger },
  ].filter(d => d.value > 0);

  // Weekly trend data (mock)
  const weeklyTrendData = [
    { day: 'Mon', meals: 45, revenue: 4500 },
    { day: 'Tue', meals: 52, revenue: 5200 },
    { day: 'Wed', meals: 48, revenue: 4800 },
    { day: 'Thu', meals: 61, revenue: 6100 },
    { day: 'Fri', meals: 55, revenue: 5500 },
    { day: 'Sat', meals: 38, revenue: 3800 },
    { day: 'Sun', meals: 42, revenue: 4200 },
  ];

  // Recent activities
  const recentMembers = [...members.students, ...members.faculty, ...members.staff]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  // Generate CSV content from data
  const generateCSV = () => {
    const allMembers = [...members.students, ...members.faculty, ...members.staff]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // BOM for Excel UTF-8 support
    let csv = '\uFEFF';

    const orgName = organization?.name || 'Organization';

    // Header Section
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += `                    ${orgName.toUpperCase()}\n`;
    csv += '                 REPORTS & ANALYTICS\n';
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '\n';
    if (organization?.address) csv += `Address:,"${organization.address}"\n`;
    if (organization?.contact_phone) csv += `Phone:,${organization.contact_phone}\n`;
    if (organization?.contact_email) csv += `Email:,${organization.contact_email}\n`;
    csv += `Report Period:,"${dateRange.start} to ${dateRange.end}"\n`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    csv += `Generated On:,"${dateStr} at ${timeStr}"\n`;
    if (user?.full_name) csv += `Generated By:,"${user.full_name}"\n`;
    csv += '\n';

    // Executive Summary
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '                      EXECUTIVE SUMMARY\n';
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '\n';
    csv += 'Key Metrics,Current Value,Description\n';
    csv += `Total Members,${stats.totalMembers},All registered members in the system\n`;
    csv += `New Members (Period),${stats.newMembers},Members added during selected period\n`;
    csv += `Active Packages,${stats.activePackages},Currently active meal packages\n`;
    csv += `Total Packages,${packages.length},All packages in the system\n`;
    csv += `Monthly Meals Capacity,${formatNumber(stats.totalMeals)},Total meals available per month\n`;
    csv += `Total Revenue,Rs. ${stats.totalRevenue.toLocaleString()},Revenue from active packages\n`;
    csv += '\n';

    // Member Distribution
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '                    MEMBER DISTRIBUTION\n';
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '\n';
    csv += 'Member Type,Count,Percentage\n';
    const totalMembers = stats.totalMembers || 1;
    csv += `Students,${members.students.length},${((members.students.length / totalMembers) * 100).toFixed(1)}%\n`;
    csv += `Faculty,${members.faculty.length},${((members.faculty.length / totalMembers) * 100).toFixed(1)}%\n`;
    csv += `Staff,${members.staff.length},${((members.staff.length / totalMembers) * 100).toFixed(1)}%\n`;
    csv += `TOTAL,${stats.totalMembers},100%\n`;
    csv += '\n';

    // Meal Distribution
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '                     MEAL DISTRIBUTION\n';
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '\n';
    csv += 'Meal Type,Active Packages,Meals Per Month,Status\n';
    mealDistributionData.forEach(meal => {
      const status = meal.count > 0 ? 'Available' : 'No Active Packages';
      csv += `${meal.name},${meal.count},${meal.meals},${status}\n`;
    });
    const totalMealsCalc = mealDistributionData.reduce((sum, m) => sum + m.meals, 0);
    csv += `TOTAL,-,${totalMealsCalc},-\n`;
    csv += '\n';

    // Package Status Summary
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '                      PACKAGE STATUS\n';
    csv += '───────────────────────────────────────────────────────────────────\n';
    csv += '\n';
    const activeCount = packages.filter(p => p.is_active).length;
    const inactiveCount = packages.filter(p => !p.is_active).length;
    csv += 'Status,Count,Percentage\n';
    csv += `Active,${activeCount},${packages.length ? ((activeCount / packages.length) * 100).toFixed(1) : 0}%\n`;
    csv += `Inactive,${inactiveCount},${packages.length ? ((inactiveCount / packages.length) * 100).toFixed(1) : 0}%\n`;
    csv += `TOTAL,${packages.length},100%\n`;
    csv += '\n';

    // Detailed Members List
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '                    DETAILED MEMBERS LIST\n';
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '\n';
    csv += 'S.No,Full Name,Member Type,Department/Program,Status,Contact,Registration Date\n';
    allMembers.forEach((member, index) => {
      const type = member.roll_number ? 'Student' : member.cnic_no ? 'Staff' : 'Faculty';
      const dept = member.department_program || member.department || member.department_section || '-';
      const name = (member.full_name || '-').replace(/,/g, ' ');
      const contact = member.contact_number || member.email_address || '-';
      csv += `${index + 1},"${name}",${type},"${dept}",${member.status || 'N/A'},"${contact}",${formatDate(member.created_at)}\n`;
    });
    csv += '\n';

    // Detailed Packages List
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '                   DETAILED PACKAGES LIST\n';
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '\n';
    csv += 'S.No,Package ID,Member Name,Price (Rs.),Status,Breakfast,Lunch,Dinner,Start Date,End Date\n';
    packages.forEach((pkg, index) => {
      const memberName = (pkg.member_name || pkg.student_members?.full_name || pkg.faculty_members?.full_name || pkg.staff_members?.full_name || '-').replace(/,/g, ' ');
      csv += `${index + 1},${pkg.id},"${memberName}",${pkg.price?.toLocaleString() || 0},${pkg.is_active ? 'Active' : 'Inactive'},${pkg.breakfast_enabled ? 'Yes' : 'No'},${pkg.lunch_enabled ? 'Yes' : 'No'},${pkg.dinner_enabled ? 'Yes' : 'No'},${formatDate(pkg.start_date)},${formatDate(pkg.end_date)}\n`;
    });
    csv += '\n';

    // Footer
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '                         END OF REPORT\n';
    csv += '═══════════════════════════════════════════════════════════════════\n';
    csv += '\n';
    csv += `This report was automatically generated by ${orgName} - Cafeteria Meal Token System.\n`;
    if (organization?.support_phone) csv += `For any queries please contact: ${organization.support_phone}\n`;
    else csv += 'For any queries please contact the system administrator.\n';

    return csv;
  };

  // Download file helper
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Export as CSV
  const exportCSV = () => {
    const csv = generateCSV();
    const today = new Date().toISOString().split('T')[0];
    const orgSlug = (organization?.name || 'Report').replace(/\s+/g, '_');
    const filename = `${orgSlug}_Report_${today}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    toast.success('Report exported successfully');
  };

  // Export as PDF using jsPDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const orgName = organization?.name || 'Organization';
    const allMembers = [...members.students, ...members.faculty, ...members.staff]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    // Header
    doc.setFillColor(16, 185, 129); // Primary green
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(orgName.toUpperCase(), pageWidth / 2, 13, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Reports & Analytics', pageWidth / 2, 21, { align: 'center' });
    doc.setFontSize(8);
    const orgDetails = [organization?.address, organization?.contact_phone, organization?.contact_email].filter(Boolean).join(' | ');
    if (orgDetails) {
      doc.text(orgDetails, pageWidth / 2, 28, { align: 'center' });
    }
    doc.setFontSize(9);
    doc.text(`Period: ${dateRange.start} to ${dateRange.end} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });
    if (user?.full_name) {
      doc.setFontSize(8);
      doc.text(`Generated by: ${user.full_name}`, pageWidth / 2, 40, { align: 'center' });
    }

    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 50;

    // Summary Statistics Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, yPos);
    yPos += 8;

    // Stats boxes
    const statsData = [
      { label: 'Total Members', value: stats.totalMembers.toString() },
      { label: 'Active Packages', value: stats.activePackages.toString() },
      { label: 'Monthly Meals', value: stats.totalMeals.toString() },
      { label: 'Revenue', value: `Rs. ${stats.totalRevenue.toLocaleString()}` },
    ];

    const boxWidth = (pageWidth - 28 - 15) / 4;
    statsData.forEach((stat, index) => {
      const x = 14 + (index * (boxWidth + 5));
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(x, yPos, boxWidth, 20, 2, 2, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, yPos, boxWidth, 20, 2, 2, 'S');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(stat.value, x + boxWidth / 2, yPos + 9, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(stat.label, x + boxWidth / 2, yPos + 16, { align: 'center' });
    });
    yPos += 30;

    // Member Distribution Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Member Distribution', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Count']],
      body: [
        ['Students', members.students.length.toString()],
        ['Faculty', members.faculty.length.toString()],
        ['Staff', members.staff.length.toString()],
        ['Total', stats.totalMembers.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    yPos = doc.lastAutoTable.finalY + 10;

    // Meal Distribution Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Meal Distribution', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Meal Type', 'Packages', 'Meals/Month']],
      body: mealDistributionData.map(meal => [meal.name, meal.count.toString(), meal.meals.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    yPos = doc.lastAutoTable.finalY + 10;

    // Package Status Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Package Status', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Count']],
      body: [
        ['Active', packages.filter(p => p.is_active).length.toString()],
        ['Inactive', packages.filter(p => !p.is_active).length.toString()],
        ['Total', packages.length.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    yPos = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page for Recent Members
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Recent Members Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Members', 14, yPos);
    yPos += 5;

    const membersTableData = allMembers.map(member => {
      const type = member.roll_number ? 'Student' : member.cnic_no ? 'Staff' : 'Faculty';
      const dept = member.department_program || member.department || member.department_section || '-';
      return [member.full_name || '-', type, dept, member.status || '-', formatDate(member.created_at)];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Name', 'Type', 'Department', 'Status', 'Joined']],
      body: membersTableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `${orgName} - Cafeteria Meal Token System`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    // Save PDF
    const orgSlug = (orgName).replace(/\s+/g, '_');
    const filename = `${orgSlug}_Report_${dateRange.start}_to_${dateRange.end}.pdf`;
    doc.save(filename);
    toast.success('Report exported as PDF');
  };

  const handleExport = (format) => {
    setShowExportMenu(false);

    switch (format) {
      case 'csv':
        exportCSV();
        break;
      case 'pdf':
        exportPDF();
        break;
      default:
        toast.error('Unknown export format');
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen overflow-auto scrollbar-hide">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive insights into your cafeteria operations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadReportData}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export as PDF
                </button>
                <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  datePreset === preset.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range - only shown when Custom is selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    localStorage.setItem('reports_custom_start', newStart);
                    setDateRange(prev => ({ ...prev, start: newStart }));
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    localStorage.setItem('reports_custom_end', newEnd);
                    setDateRange(prev => ({ ...prev, end: newEnd }));
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading report data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Members"
              value={stats.totalMembers}
              change="In selected period"
              changeType="neutral"
              icon={<UsersIcon />}
              color="blue"
            />
            <StatCard
              title="Active Packages"
              value={stats.activePackages}
              change={`${stats.totalPackages} total`}
              changeType="neutral"
              icon={<PackageIcon />}
              color="green"
            />
            <StatCard
              title="Monthly Meals"
              value={formatNumber(stats.totalMeals)}
              change="Per month"
              changeType="neutral"
              icon={<MealIcon />}
              color="purple"
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.totalRevenue)}
              change={`${stats.collectionRate}% active`}
              changeType={stats.collectionRate > 50 ? "positive" : "neutral"}
              icon={<RevenueIcon />}
              color="amber"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Member Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Member Distribution</h3>
                <span className="text-xs text-gray-500">{stats.totalMembers} total</span>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <PieChart>
                    <Pie
                      data={memberTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {memberTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {memberTypeData.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-500">{item.name}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meal Distribution Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Meal Distribution</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.faculty }}></div>
                    Packages
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.student }}></div>
                    Meals/Month
                  </span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart data={mealDistributionData} barSize={30}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="count" name="Packages" fill={COLORS.faculty} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meals" name="Meals/Month" fill={COLORS.student} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Weekly Trend Line Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Weekly Trend</h3>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">+12% vs last week</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <AreaChart data={weeklyTrendData}>
                    <defs>
                      <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Area type="monotone" dataKey="meals" stroke={COLORS.primary} strokeWidth={2} fill="url(#colorMeals)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Package Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Package Status</h3>
                <span className="text-xs text-gray-500">{stats.totalPackages} packages</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <PieChart>
                    <Pie
                      data={packageStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {packageStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-xl font-bold text-green-600">{packages.filter(p => p.is_active).length}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Inactive</p>
                    <p className="text-xl font-bold text-red-600">{packages.filter(p => !p.is_active).length}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Members</h3>
                  <p className="text-xs text-gray-500 mt-1">Latest member registrations</p>
                </div>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-gray-500">No members found in this period</p>
                      </td>
                    </tr>
                  ) : (
                    recentMembers.map((member, idx) => {
                      const type = member.roll_number ? 'student' : member.cnic_no ? 'staff' : 'faculty';
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                                type === 'student' ? 'bg-blue-500' : type === 'faculty' ? 'bg-purple-500' : 'bg-orange-500'
                              }`}>
                                {member.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{member.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                              type === 'student' ? 'bg-blue-100 text-blue-700' :
                              type === 'faculty' ? 'bg-purple-100 text-purple-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {member.department_program || member.department || member.department_section || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              member.status === 'approved' ? 'bg-green-100 text-green-700' :
                              member.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {formatDate(member.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Member Summary */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Member Summary</h3>
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-100">Students</span>
                  <span className="font-bold">{members.students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Faculty</span>
                  <span className="font-bold">{members.faculty.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Staff</span>
                  <span className="font-bold">{members.staff.length}</span>
                </div>
                <hr className="border-blue-400" />
                <div className="flex justify-between text-lg">
                  <span>Total</span>
                  <span className="font-bold">{stats.totalMembers}</span>
                </div>
              </div>
            </div>

            {/* Package Summary */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Package Summary</h3>
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-green-100">Active Packages</span>
                  <span className="font-bold">{packages.filter(p => p.is_active).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Inactive Packages</span>
                  <span className="font-bold">{packages.filter(p => !p.is_active).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Monthly Meals</span>
                  <span className="font-bold">{formatNumber(stats.totalMeals)}</span>
                </div>
                <hr className="border-green-400" />
                <div className="flex justify-between text-lg">
                  <span>Total Revenue</span>
                  <span className="font-bold">{formatCurrency(stats.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Meal Summary */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Meal Summary</h3>
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-100">Breakfast</span>
                  <span className="font-bold">{mealDistributionData[0].meals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Lunch</span>
                  <span className="font-bold">{mealDistributionData[1].meals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Dinner</span>
                  <span className="font-bold">{mealDistributionData[2].meals}</span>
                </div>
                <hr className="border-purple-400" />
                <div className="flex justify-between text-lg">
                  <span>Total/Month</span>
                  <span className="font-bold">{formatNumber(stats.totalMeals)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, change, changeType, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
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

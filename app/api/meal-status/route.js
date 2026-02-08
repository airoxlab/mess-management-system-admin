import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// Disable ALL caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const { orgId, error } = requireOrgId(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || today;
    const endDate = searchParams.get('endDate') || today;

    // Fetch all data in parallel
    const [studentsRes, facultyRes, staffRes, selectionsRes, tokensRes, packagesRes, menuSelectionsRes, menuOptionsRes] = await Promise.all([
      supabase
        .from('student_members')
        .select('id, full_name, roll_number, department_program, email_address, contact_number, gender')
        .eq('organization_id', orgId)
        .eq('status', 'approved'),
      supabase
        .from('faculty_members')
        .select('id, full_name, employee_id, department, email_address, contact_number')
        .eq('organization_id', orgId)
        .eq('status', 'approved'),
      supabase
        .from('staff_members')
        .select('id, full_name, employee_id, department_section, email_address, contact_number')
        .eq('organization_id', orgId)
        .eq('status', 'approved'),
      supabase
        .from('meal_selections')
        .select('member_id, member_type, date, breakfast_needed, lunch_needed, dinner_needed')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false }),
      supabase
        .from('meal_tokens')
        .select('member_id, meal_type, token_date, token_time, status, collected_at')
        .eq('organization_id', orgId)
        .gte('token_date', startDate)
        .lte('token_date', endDate),
      supabase
        .from('member_packages')
        .select('member_id, member_type, is_active, status, end_date, breakfast_enabled, lunch_enabled, dinner_enabled')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('status', 'active'),
      supabase
        .from('member_menu_selections')
        .select('member_id, member_type, date, meal_type, menu_option_id')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false }),
      supabase
        .from('menu_options')
        .select('id, date, meal_type, option_name')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (facultyRes.error) throw facultyRes.error;
    if (staffRes.error) throw staffRes.error;

    // Build active member IDs and package map
    const activeMemberIds = new Set();
    const memberPackageMap = {};
    if (!packagesRes.error && packagesRes.data) {
      packagesRes.data.forEach((pkg) => {
        if (!pkg.end_date || pkg.end_date >= endDate) {
          activeMemberIds.add(pkg.member_id);
          memberPackageMap[pkg.member_id] = pkg;
        }
      });
    }

    // Selections lookup: { member_id: { date_str: selection } }
    // With descending order, first record is newest, so keep it and skip duplicates
    const selectionsMap = {};
    if (!selectionsRes.error && selectionsRes.data) {
      selectionsRes.data.forEach((sel) => {
        if (!selectionsMap[sel.member_id]) selectionsMap[sel.member_id] = {};
        // Only assign if not already set (keeps the newest record from descending order)
        if (!selectionsMap[sel.member_id][sel.date]) {
          selectionsMap[sel.member_id][sel.date] = sel;
        }
      });
    }

    // Tokens lookup: { member_id: { date_str: { MEAL_TYPE: token } } }
    const tokensMap = {};
    if (!tokensRes.error && tokensRes.data) {
      tokensRes.data.forEach((tok) => {
        if (!tokensMap[tok.member_id]) tokensMap[tok.member_id] = {};
        if (!tokensMap[tok.member_id][tok.token_date]) tokensMap[tok.member_id][tok.token_date] = {};
        const existing = tokensMap[tok.member_id][tok.token_date][tok.meal_type];
        // Keep the most relevant token (prefer COLLECTED, then PENDING)
        if (!existing || tok.status === 'COLLECTED' || (existing.status !== 'COLLECTED' && tok.status === 'PENDING')) {
          tokensMap[tok.member_id][tok.token_date][tok.meal_type] = tok;
        }
      });
    }

    // Menu options lookup: { option_id: option_name }
    const menuOptionsMap = {};
    if (!menuOptionsRes.error && menuOptionsRes.data) {
      menuOptionsRes.data.forEach((opt) => {
        menuOptionsMap[opt.id] = opt.option_name;
      });
    }

    // Menu selections lookup: { member_id: { date_str: { meal_type: option_name } } }
    // With descending order, first record is newest, so keep it and skip duplicates
    const menuSelectionsMap = {};
    if (!menuSelectionsRes.error && menuSelectionsRes.data) {
      menuSelectionsRes.data.forEach((sel) => {
        if (!menuSelectionsMap[sel.member_id]) menuSelectionsMap[sel.member_id] = {};
        if (!menuSelectionsMap[sel.member_id][sel.date]) menuSelectionsMap[sel.member_id][sel.date] = {};
        // Only assign if not already set (keeps the newest record from descending order)
        if (!menuSelectionsMap[sel.member_id][sel.date][sel.meal_type]) {
          const optionName = menuOptionsMap[sel.menu_option_id];
          menuSelectionsMap[sel.member_id][sel.date][sel.meal_type] = optionName;
        }
      });
    }

    // Generate date list (newest first)
    const dates = [];
    let current = new Date(endDate + 'T12:00:00');
    const startD = new Date(startDate + 'T12:00:00');
    while (current >= startD) {
      const y = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, '0');
      const da = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${mo}-${da}`);
      current.setDate(current.getDate() - 1);
    }

    // Determine meal status for a member on a given date
    function getMealStatus(memberId, date, mealType) {
      const mealUpper = mealType.toUpperCase();
      const enabledKey = `${mealType}_enabled`;
      const pkg = memberPackageMap[memberId];

      // Check if meal is enabled in package
      if (pkg && pkg[enabledKey] === false) {
        return { status: 'not_in_package' };
      }

      // Check user opt-out (skipped from their app)
      const sel = selectionsMap[memberId]?.[date];
      const neededKey = `${mealType}_needed`;

      // Get menu option if selected
      const menuOption = menuSelectionsMap[memberId]?.[date]?.[mealType];

      // If no selection record exists, check if they've at least selected a menu option
      if (!sel) {
        // If they haven't made any selection or menu choice, return not_selected
        if (!menuOption) {
          return { status: 'not_selected' };
        }
        // If they selected a menu option but no toggle record, treat as opted in
        const token = tokensMap[memberId]?.[date]?.[mealUpper];
        if (token) {
          switch (token.status) {
            case 'COLLECTED':
              return { status: 'collected', time: token.token_time, collected_at: token.collected_at, menuOption };
            case 'PENDING':
              return { status: 'pending', time: token.token_time, menuOption };
            case 'EXPIRED':
              return { status: 'missed', menuOption };
            case 'CANCELLED':
              return { status: 'cancelled', menuOption };
          }
        }
        return date < today ? { status: 'missed', menuOption } : { status: 'pending', menuOption };
      }

      const needed = sel[neededKey];

      if (needed === false) {
        return { status: 'skipped', menuOption };
      }

      // Check token for actual collection
      const token = tokensMap[memberId]?.[date]?.[mealUpper];
      if (token) {
        switch (token.status) {
          case 'COLLECTED':
            return { status: 'collected', time: token.token_time, collected_at: token.collected_at, menuOption };
          case 'PENDING':
            return { status: 'pending', time: token.token_time, menuOption };
          case 'EXPIRED':
            return { status: 'missed', menuOption };
          case 'CANCELLED':
            return { status: 'cancelled', menuOption };
        }
      }

      // No token: past date = missed, today/future = pending
      return date < today ? { status: 'missed', menuOption } : { status: 'pending', menuOption };
    }

    const allMembers = [];

    function processMember(m, identifier, department, memberType) {
      if (!activeMemberIds.has(m.id)) return;

      const days = dates.map((date) => ({
        date,
        breakfast: getMealStatus(m.id, date, 'breakfast'),
        lunch: getMealStatus(m.id, date, 'lunch'),
        dinner: getMealStatus(m.id, date, 'dinner'),
      }));

      allMembers.push({
        id: m.id,
        name: m.full_name,
        identifier,
        department,
        email: m.email_address,
        contact: m.contact_number,
        gender: m.gender || 'not_specified',
        member_type: memberType,
        days,
      });
    }

    (studentsRes.data || []).forEach((m) => processMember(m, m.roll_number, m.department_program, 'student'));
    (facultyRes.data || []).forEach((m) => processMember(m, m.employee_id, m.department, 'faculty'));
    (staffRes.data || []).forEach((m) => processMember(m, m.employee_id, m.department_section, 'staff'));

    // Stats based on the latest (most recent) day
    const stats = {
      total: allMembers.length,
      taking_meal: 0,
      not_taking_meal: 0,
      breakfast_taking: 0,
      lunch_taking: 0,
      dinner_taking: 0,
    };

    const isTaking = (s) => s.status === 'collected' || s.status === 'pending';

    allMembers.forEach((m) => {
      if (m.days.length === 0) return;
      const latest = m.days[0];
      const b = isTaking(latest.breakfast);
      const l = isTaking(latest.lunch);
      const d = isTaking(latest.dinner);
      if (b || l || d) stats.taking_meal++;
      else stats.not_taking_meal++;
      if (b) stats.breakfast_taking++;
      if (l) stats.lunch_taking++;
      if (d) stats.dinner_taking++;
    });

    const response = NextResponse.json({
      members: allMembers,
      stats,
      startDate,
      endDate,
      dates,
    });

    // Prevent ALL caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (err) {
    console.error('Meal status error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch meal status' },
      { status: 500 }
    );
  }
}

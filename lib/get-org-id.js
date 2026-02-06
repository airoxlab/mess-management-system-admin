import { NextResponse } from 'next/server';

/**
 * Extract organization_id from request.
 * Checks: x-organization-id header > organization_id query param > organization_id in body
 * Returns the organization_id string or null.
 */
export function getOrgId(request) {
  // 1. Check header
  const headerOrgId = request.headers.get('x-organization-id');
  if (headerOrgId) return headerOrgId;

  // 2. Check query param
  try {
    const { searchParams } = new URL(request.url);
    const paramOrgId = searchParams.get('organization_id');
    if (paramOrgId) return paramOrgId;
  } catch {}

  return null;
}

/**
 * Extract and validate organization_id from request.
 * Returns { orgId } or { error: NextResponse } if missing.
 */
export function requireOrgId(request) {
  const orgId = getOrgId(request);
  if (!orgId) {
    return {
      orgId: null,
      error: NextResponse.json(
        { error: 'Organization ID is required. Please log in again.' },
        { status: 401 }
      ),
    };
  }
  return { orgId, error: null };
}

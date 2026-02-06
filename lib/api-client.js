/**
 * API client wrapper that automatically includes organization_id header.
 * Use this instead of raw fetch() for all API calls.
 */

const STORAGE_KEY = 'limhs_user';

function getOrganizationId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      return user?.organization?.id || null;
    }
  } catch {}
  return null;
}

export async function apiClient(url, options = {}) {
  const orgId = getOrganizationId();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (orgId) {
    headers['x-organization-id'] = orgId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

// Convenience methods
export const api = {
  get: (url, options = {}) => apiClient(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) =>
    apiClient(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options = {}) =>
    apiClient(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, options = {}) =>
    apiClient(url, { ...options, method: 'DELETE' }),
  upload: (url, formData, options = {}) =>
    apiClient(url, { ...options, method: 'POST', body: formData }),
};

export default api;

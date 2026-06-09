const API_URL = 'https://actoos-jobs-api.onrender.com';
//const API_URL = 'http://localhost:8001';
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
    throw new Error(error.detail || 'Une erreur est survenue');
  }
  return response.json();
}
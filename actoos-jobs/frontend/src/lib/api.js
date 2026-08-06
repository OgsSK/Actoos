const getBaseUrl = () => {
  // En développement (localhost), on utilise le backend local
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  // En production, on appelle l'API sur son domaine dédié
  return 'https://actoos-jobs-api.onrender.com';
};

export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8 secondes max

  try {
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
      const err = new Error(error.detail || 'Une erreur est survenue');
      err.status = response.status;
      throw err;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
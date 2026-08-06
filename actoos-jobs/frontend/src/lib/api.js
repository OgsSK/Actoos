const getBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  return 'https://actoos-jobs-api.onrender.com';
};

export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // 12 secondes – un peu plus de marge

  try {
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // La réponse n'est pas du JSON
      }
      const err = new Error(errorData.detail || 'Une erreur est survenue');
      err.status = response.status;
      throw err;
    }

    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps, veuillez réessayer.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
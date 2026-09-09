const getBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  return 'https://actoos-jobs-api.onrender.com';
};

export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    // ✅ Si la réponse est 204 No Content, retourner null (succès)
    if (response.status === 204) {
      return null;
    }

    // ✅ Pour les autres statuts, vérifier si la réponse a du contenu
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        if (isJson) {
          const errorBody = await response.json();
          errorMessage = errorBody.detail || errorBody.message || errorBody.error || errorMessage;
        } else {
          const text = await response.text();
          if (text) errorMessage = text;
        }
      } catch (e) {
        // Si on ne peut pas lire le corps, on utilise le statut
        errorMessage = `Erreur ${response.status}`;
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }

    // ✅ Si la réponse est OK et contient du JSON, le parser
    if (isJson && response.status !== 204) {
      return await response.json();
    }

    // ✅ Si la réponse est OK mais pas JSON (ex: texte), retourner le texte
    const text = await response.text();
    return text || null;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La requête a expiré (8 secondes)');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
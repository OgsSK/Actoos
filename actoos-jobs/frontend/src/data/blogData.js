import i18n from './i18n'; // ou le chemin vers votre instance i18next

export const getBlogArticles = () => {
  const articles = i18n.t('blogArticles.items', { returnObjects: true }) || [];
  return articles;
};

export const getArticleById = (id) => {
  const articles = getBlogArticles();
  return articles.find(article => article.id === id) || null;
};

// Pour la compatibilité avec les imports existants (si nécessaire)
export const blogArticles = getBlogArticles();
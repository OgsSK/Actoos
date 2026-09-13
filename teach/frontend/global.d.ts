// Déclarations pour les imports CSS dans TypeScript
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
/// <reference types="vite/client" />
// Déclarations utiles hors de l'outillage Vite (vérification de types autonome)
declare module '*?url' {
  const url: string
  export default url
}
declare module '*.css'

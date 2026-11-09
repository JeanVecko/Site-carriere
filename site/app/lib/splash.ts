// Partagé entre la mise en page (serveur) et l'écran de chargement (client).
export const SPLASH_SEEN_KEY = "carrieres-splash-vu";

// Exécuté dans <head> (layout.tsx) avant l'affichage, à chaque chargement complet d'une page :
// l'écran n'est montré que si la visite commence par l'accueil et qu'il n'a pas déjà été vu dans cet onglet.
// Dans tous les autres cas (autre page d'arrivée, retour à l'accueil par un lien), il est masqué d'emblée.
export const SPLASH_PRE_PAINT_SCRIPT = `try{var d=document.documentElement;if(location.pathname==="/"&&!sessionStorage.getItem("${SPLASH_SEEN_KEY}")){d.classList.add("is-splashing")}else{d.classList.add("splash-seen")}}catch(e){document.documentElement.classList.add("splash-seen")}`;

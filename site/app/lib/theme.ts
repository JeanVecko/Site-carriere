// Thème clair / sombre du site public. Le choix du visiteur est gardé dans ce navigateur.
export const THEME_KEY = "carrieres-theme";
export const THEME_EVENT = "carrieres-theme-change";

// Exécuté dans <head> avant l'affichage : applique le thème choisi sans clignotement au chargement.
export const THEME_PRE_PAINT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`;

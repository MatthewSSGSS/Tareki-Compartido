// =============================================================================
// config.js — Constantes editables de Tareki.
// =============================================================================

export const APP_VERSION = '0.1.0';

/** Proyecto de Supabase "Tareki". Ambos datos son públicos (van en la app); la clave
 *  secreta NUNCA va aquí. Vacíos = modo demostración. */
export const NUBE = {
  url: 'https://qnvovuqubmgbkwycjzrr.supabase.co',
  clave: 'sb_publishable_XBNDXSaL4Ff3Al5uGA62cg_UJqREpd1',
};

/** Llave pública de las notificaciones (la privada vive solo en los secretos de Supabase). */
export const VAPID_PUBLICA = 'BEVjTKOA50KtLVVyL-onOguIxrEGvRt7rrRxRIlZ3IfZ8aJgNMk9dAC26vaNjI6zeVC7W-ttgr7Jxn-FFnB-Gtc';

/** Sin Supabase (o abriendo la app con ?demo) todo vive en este navegador con datos de prueba. */
export const MODO_DEMO = !(NUBE.url && NUBE.clave) || new URLSearchParams(location.search).has('demo');

export const AVATARES = ['🦊', '🐯', '🐼', '🐸', '🦁', '🐨', '🐙', '🦄', '🐧', '🐶', '🐱', '🐵', '🦖', '🐬', '🦋', '🐢'];

export const COLORES = ['#59c3ff', '#ff6b9a', '#35b862', '#ffcf3f', '#a77bff', '#ff9a4d'];

export const GRADOS = ['1', '2', '3', '4', '5', '6'];

export const MATERIAS = [
  { id: 'mate', nombre: 'Matemáticas', emoji: '🔢', color: '#ffcf3f', pistas: /matem|fracci|suma|resta|multipl|divis|n[uú]mero|geometr|[aá]ngulo|romano|ecuaci/i },
  { id: 'espanol', nombre: 'Español', emoji: '📖', color: '#ff9dbd', pistas: /espa[nñ]ol|lengua|lectura|sustantiv|verbo|adjetiv|ortograf|cuento|gram[aá]tica/i },
  { id: 'ciencias', nombre: 'Ciencias', emoji: '🔬', color: '#8ee0a8', pistas: /biolog|ciencia|cuerpo|c[eé]lula|planta|animal|ecosistema|energ[ií]a|materia|qu[ií]mica|f[ií]sica/i },
  { id: 'sociales', nombre: 'Sociales', emoji: '🌎', color: '#9fd8ff', pistas: /social|historia|geograf|colombia|regi[oó]n|mapa|continente|c[ií]vica/i },
  { id: 'ingles', nombre: 'Inglés', emoji: '🗣️', color: '#d6b8ff', pistas: /ingl[eé]s|english|present|past|perfect|vocabulary/i },
  { id: 'otra', nombre: 'Otra', emoji: '⭐', color: '#ffd9a8', pistas: /$^/ },
];

export const RACHA = {
  /** Minutos mínimos de estudio para que un día cuente (además de cualquier logro). */
  minutosDia: 5,
};

/** Días que dura un código de invitación sin usar. */
export const INVITACION_DIAS = 7;

/** Notas de 1 a 100 (como en las lecciones). */
export const ESCALA = 'Superior 90–100 · Alto 80–89 · Básico 60–79 · Bajo 1–59';

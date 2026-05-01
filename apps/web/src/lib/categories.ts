import { CATEGORY_SLUGS, RANDOM_CATEGORY } from '@ahorcado/shared';

export interface CategoryOption {
  slug: string;
  label: string;
  icon: string;
}

const META: Record<string, { label: string; icon: string }> = {
  animales: { label: 'Animales', icon: '🐾' },
  paises: { label: 'Países', icon: '🌎' },
  'frutas-verduras': { label: 'Frutas y verduras', icon: '🥑' },
  'comida-latam': { label: 'Comida latina', icon: '🌮' },
  peliculas: { label: 'Películas', icon: '🎬' },
  deportes: { label: 'Deportes', icon: '⚽' },
  profesiones: { label: 'Profesiones', icon: '👩‍🔧' },
  'objetos-hogar': { label: 'Objetos del hogar', icon: '🛋️' },
  naturaleza: { label: 'Naturaleza', icon: '🌳' },
  musica: { label: 'Música', icon: '🎵' },
  ciudades: { label: 'Ciudades', icon: '🏙️' },
  'cultura-general': { label: 'Cultura general', icon: '🧠' },
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { slug: RANDOM_CATEGORY, label: 'Aleatoria', icon: '🎲' },
  ...CATEGORY_SLUGS.map((slug) => ({
    slug,
    label: META[slug]?.label ?? slug,
    icon: META[slug]?.icon ?? '📚',
  })),
];

export function categoryLabel(slug: string): string {
  if (slug === RANDOM_CATEGORY) return 'Aleatoria';
  return META[slug]?.label ?? slug;
}

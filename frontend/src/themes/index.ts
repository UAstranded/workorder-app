export interface ThemeDef {
  name: string;
  label: string;
  description: string;
  accent: string;
}

export const themes: ThemeDef[] = [
  {
    name: 'default',
    label: 'Classic Teal',
    description: 'Clean and professional teal',
    accent: '#0d9488',
  },
  {
    name: 'ocean-depths',
    label: 'Ocean Depths',
    description: 'Calming maritime tones',
    accent: '#2d8b8b',
  },
  {
    name: 'sunset-boulevard',
    label: 'Sunset Boulevard',
    description: 'Warm sunset vibes',
    accent: '#e76f51',
  },
  {
    name: 'forest-canopy',
    label: 'Forest Canopy',
    description: 'Natural earth tones',
    accent: '#7d8471',
  },
  {
    name: 'modern-minimalist',
    label: 'Modern Minimalist',
    description: 'Clean grayscale palette',
    accent: '#708090',
  },
  {
    name: 'golden-hour',
    label: 'Golden Hour',
    description: 'Rich autumnal warmth',
    accent: '#f4a900',
  },
  {
    name: 'arctic-frost',
    label: 'Arctic Frost',
    description: 'Cool winter crispness',
    accent: '#4a6fa5',
  },
  {
    name: 'desert-rose',
    label: 'Desert Rose',
    description: 'Soft dusty elegance',
    accent: '#d4a5a5',
  },
  {
    name: 'tech-innovation',
    label: 'Tech Innovation',
    description: 'Bold modern tech',
    accent: '#0066ff',
  },
  {
    name: 'botanical-garden',
    label: 'Botanical Garden',
    description: 'Fresh garden greens',
    accent: '#4a7c59',
  },
  {
    name: 'midnight-galaxy',
    label: 'Midnight Galaxy',
    description: 'Cosmic deep tones',
    accent: '#4a4e8f',
  },
];

export function getTheme(name: string): ThemeDef {
  return themes.find((t) => t.name === name) || themes[0];
}

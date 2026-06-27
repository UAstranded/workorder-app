import client from './client';

export interface LogoFavicon {
  logo_svg: string | null;
  favicon_svg: string | null;
}

export async function getLogoFavicon(): Promise<LogoFavicon> {
  const { data } = await client.get('/settings/logo-favicon');
  return data;
}

export async function updateLogoFavicon(logo_svg?: string, favicon_svg?: string): Promise<LogoFavicon> {
  const body: Record<string, string> = {};
  if (logo_svg !== undefined) body.logo_svg = logo_svg;
  if (favicon_svg !== undefined) body.favicon_svg = favicon_svg;
  const { data } = await client.put('/settings/logo-favicon', body);
  return data;
}

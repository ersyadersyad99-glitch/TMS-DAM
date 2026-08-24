export interface TenantModules {
  finance: boolean;
  fleet: boolean;
  maintenance: boolean;
}

export interface TenantBranding {
  id: string;
  name: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  browserTitle: string;
  logoText: string;
  logoSub: string;
  logoBg: string;
  logoImage?: string;   // Optional: path to actual logo image file (in /public)
  modules: TenantModules;
  colors: {
    primary: string;
    primaryHover: string;
    primaryDim: string;
    primaryGlow: string;
    sidebarBg: string;
    bgBase: string;
    textPrimary: string;
  };
}

export const gercepinBranding: TenantBranding = {
  id: 'gercepin',
  name: 'PT Gerak Cepat Indonesia',
  sidebarTitle: 'GERCEPIN AJA',
  sidebarSubtitle: 'PT Gerak Cepat Indonesia',
  browserTitle: 'Gercepin Aja — PT Gerak Cepat Indonesia',
  logoText: 'G',
  logoSub: 'GERCEPIN AJA',
  logoBg: 'linear-gradient(135deg, #3d7a7a 0%, #2d5f5f 100%)',
  logoImage: '/logo-gercepin.png',   // Actual Gercepin logo (bird + text)

  modules: {
    finance: true,
    fleet: true,
    maintenance: false,
  },
  colors: {
    primary: '#3d7a7a',
    primaryHover: '#2d6363',
    primaryDim: 'rgba(61, 122, 122, 0.10)',
    primaryGlow: 'rgba(61, 122, 122, 0.25)',
    sidebarBg: '#2d5f5f',
    bgBase: '#f0f4f4',
    textPrimary: '#1a3333',
  },
};

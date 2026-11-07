export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  debt: string; // دين (عليه)
  debtSoft: string;
  payment: string; // دفعة
  paymentSoft: string;
  whatsapp: string;
  danger: string;
}

// ألوان هادية: بيج دافي مع أخضر زيتي
export const light: Palette = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  surfaceAlt: '#ECE7DC',
  border: '#DDD6C8',
  text: '#23282B',
  textMuted: '#6B6F72',
  primary: '#3E6B5A',
  primaryText: '#FFFFFF',
  debt: '#B5543C',
  debtSoft: '#F6E3DC',
  payment: '#3E7A57',
  paymentSoft: '#DDEFE3',
  whatsapp: '#25A35A',
  danger: '#B03A2E',
};

export const dark: Palette = {
  background: '#14181A',
  surface: '#1E2427',
  surfaceAlt: '#283034',
  border: '#343D42',
  text: '#ECE9E2',
  textMuted: '#A3A8AA',
  primary: '#7FB59E',
  primaryText: '#10201A',
  debt: '#E59A82',
  debtSoft: '#3A2620',
  payment: '#8FCCA5',
  paymentSoft: '#1F3428',
  whatsapp: '#3FC077',
  danger: '#E57368',
};

export const FONT = {
  small: 15,
  body: 18,
  large: 22,
  title: 26,
  huge: 32,
};

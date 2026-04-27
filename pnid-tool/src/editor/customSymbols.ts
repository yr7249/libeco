import type { CustomSymbolTemplate } from './types';

const LS_KEY = 'pnid-tool:custom-symbols';

export function loadCustomSymbols(): CustomSymbolTemplate[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveCustomSymbols(list: CustomSymbolTemplate[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

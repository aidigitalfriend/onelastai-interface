import { Theme } from '../types';

/**
 * Check if a theme is a dark theme
 * All themes except 'light' and 'high-contrast-light' are considered dark
 */
export function isDarkTheme(theme: Theme | string): boolean {
  return !['light', 'high-contrast-light'].includes(theme);
}

/**
 * Get theme-aware CSS classes
 */
export function getThemeClasses(theme: Theme | string) {
  const isDark = isDarkTheme(theme);
  
  return {
    // Backgrounds
    bgPrimary: isDark ? 'bg-vscode-bg' : 'bg-white',
    bgSecondary: isDark ? 'bg-vscode-sidebar' : 'bg-gray-50',
    bgPanel: isDark ? 'bg-vscode-panel' : 'bg-gray-100',
    bgHover: isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-200',
    bgCard: isDark ? 'bg-vscode-sidebar border border-vscode-border' : 'bg-white border border-gray-200',
    bgInput: isDark ? 'bg-vscode-input border-vscode-border' : 'bg-white border-gray-300',
    
    // Text
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-vscode-text' : 'text-gray-700',
    textMuted: isDark ? 'text-vscode-textMuted' : 'text-gray-500',
    textAccent: isDark ? 'text-vscode-accent' : 'text-blue-600',
    
    // Borders
    borderColor: isDark ? 'border-vscode-border' : 'border-gray-200',
    borderAccent: isDark ? 'border-vscode-accent' : 'border-blue-500',
    
    // Interactive
    hoverBg: isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200',
    activeBg: isDark ? 'bg-vscode-selection' : 'bg-blue-100',
    
    // Misc
    isDark,
  };
}

/**
 * Shared color mapping for school categories (Departments, Facility Types, etc.)
 */

export const CATEGORY_COLORS: Record<string, string> = {
  // Departments / Subjects
  'English': '#f43f5e',      // Rose
  'Mathematics': '#3b82f6',  // Blue
  'Science': '#10b981',      // Emerald
  'Moderns': '#8b5cf6',      // Violet
  'Social Sciences': '#f59e0b', // Amber
  'The Arts': '#ec4899',     // Pink
  'Physical Education': '#14b8a6', // Teal
  'Religion': '#6366f1',     // Indigo
  'Business': '#0ea5e9',     // Sky
  'Technological Education': '#f97316', // Orange
  'Canadian & World Studies': '#84cc16', // Lime
  'Guidance': '#64748b',     // Slate
  
  // Facility Types
  'REGULAR': 'var(--primary-500)',
  'LAB': '#8b5cf6',
  'GYM': '#f59e0b',
  'ART': '#ec4899',
  'SHOP': '#10b981',
  'MUSIC': '#3b82f6',
  'DRAMA': '#f43f5e',
  
  // Default fallback
  'Default': 'var(--primary-500)'
};

export function getCategoryColor(category: string): string {
  if (!category) return CATEGORY_COLORS['Default'];
  
  // Exact match
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  
  // Case-insensitive / Partial match
  const key = Object.keys(CATEGORY_COLORS).find(k => 
    category.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(category.toLowerCase())
  );
  
  return key ? CATEGORY_COLORS[key] : CATEGORY_COLORS['Default'];
}

export function getBadgeStyle(category: string) {
  const color = getCategoryColor(category);
  return {
    background: `${color}15`,
    color: color,
    border: `1px solid ${color}30`,
    fontSize: '10px',
    padding: '2px 8px',
    fontWeight: '700' as const,
    whiteSpace: 'nowrap' as const,
    borderRadius: '12px'
  };
}

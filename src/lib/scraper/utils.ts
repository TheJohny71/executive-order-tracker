import type { CategoryKeywords } from './types';

export function determineCategories(content: string): string[] {
  const categories = new Set<string>();
  
  const categoryKeywords: CategoryKeywords = {
    'Education': ['education', 'school', 'student', 'learning'],
    'Military': ['military', 'defense', 'veteran', 'armed forces'],
    'Economy': ['economy', 'economic', 'financial', 'treasury'],
    'Healthcare': ['health', 'medical', 'healthcare', 'hospital'],
    'Environment': ['environment', 'climate', 'energy', 'pollution'],
    'Immigration': ['immigration', 'border', 'visa', 'asylum'],
    'Technology': ['technology', 'cyber', 'digital', 'internet'],
    'Foreign Policy': ['foreign', 'international', 'diplomatic', 'embassy']
  };

  const contentLower = content.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      categories.add(category);
    }
  }

  return Array.from(categories);
}

export function determineAgencies(content: string): string[] {
  const agencies = new Set<string>();
  
  const agencyKeywords: CategoryKeywords = {
    'Department of Education': ['department of education', 'education department'],
    'Department of Defense': ['department of defense', 'defense department', 'pentagon'],
    'Department of State': ['department of state', 'state department'],
    'Department of Treasury': ['department of treasury', 'treasury department'],
    'Department of Homeland Security': ['department of homeland security', 'dhs'],
    'Department of Justice': ['department of justice', 'justice department', 'doj']
  };

  const contentLower = content.toLowerCase();
  for (const [agency, keywords] of Object.entries(agencyKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      agencies.add(agency);
    }
  }

  return Array.from(agencies);
}
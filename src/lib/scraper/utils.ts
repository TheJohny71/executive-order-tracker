import type { CategoryKeywords } from './types';

export function determineCategories(content: string): string[] {
  const categories = new Set<string>();
  
  const categoryKeywords: CategoryKeywords = {
    'Education': ['education', 'school', 'student', 'learning', 'academic', 'curriculum', 'classroom'],
    'Military': ['military', 'defense', 'veteran', 'armed forces', 'national security', 'servicemember', 'combat'],
    'Economy': ['economy', 'economic', 'financial', 'treasury', 'fiscal', 'trade', 'commerce', 'market'],
    'Healthcare': ['health', 'medical', 'healthcare', 'hospital', 'patient', 'medicare', 'medicaid', 'treatment'],
    'Environment': ['environment', 'climate', 'energy', 'pollution', 'environmental', 'conservation', 'renewable'],
    'Immigration': ['immigration', 'border', 'visa', 'asylum', 'migrant', 'customs', 'refugee'],
    'Technology': ['technology', 'cyber', 'digital', 'internet', 'cybersecurity', 'innovation', 'tech'],
    'Foreign Policy': ['foreign', 'international', 'diplomatic', 'embassy', 'bilateral', 'multilateral', 'treaty'],
    'Civil Rights': ['civil rights', 'discrimination', 'equality', 'justice', 'constitutional', 'voting rights'],
    'Infrastructure': ['infrastructure', 'transportation', 'construction', 'public works', 'development'],
    'National Security': ['security', 'intelligence', 'homeland', 'counterterrorism', 'defense'],
    'Labor': ['labor', 'employment', 'workforce', 'worker', 'union', 'workplace']
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
    'Department of Education': ['department of education', 'education department', 'ed.gov'],
    'Department of Defense': ['department of defense', 'defense department', 'pentagon', 'dod'],
    'Department of State': ['department of state', 'state department', 'diplomatic', 'state.gov'],
    'Department of Treasury': ['department of treasury', 'treasury department', 'treasury.gov'],
    'Department of Homeland Security': ['department of homeland security', 'dhs', 'homeland security'],
    'Department of Justice': ['department of justice', 'justice department', 'doj', 'justice.gov'],
    'Department of Labor': ['department of labor', 'labor department', 'dol', 'labor.gov'],
    'Department of Energy': ['department of energy', 'energy department', 'doe', 'energy.gov'],
    'Department of Health and Human Services': ['department of health and human services', 'hhs', 'health and human services'],
    'Environmental Protection Agency': ['environmental protection agency', 'epa', 'epa.gov'],
    'Department of Transportation': ['department of transportation', 'transportation department', 'dot', 'transportation.gov'],
    'Department of Veterans Affairs': ['department of veterans affairs', 'va', 'veterans affairs', 'va.gov']
  };

  const contentLower = content.toLowerCase();
  for (const [agency, keywords] of Object.entries(agencyKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      agencies.add(agency);
    }
  }

  return Array.from(agencies);
}
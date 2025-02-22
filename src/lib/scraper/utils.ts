import type { CategoryKeywords } from './types';

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 5000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

export function determineCategories(content: string): string[] {
  const categories = new Set<string>();
  
  const categoryKeywords: CategoryKeywords = {
    'Education': ['education', 'school', 'student', 'learning', 'academic', 'curriculum', 'classroom', 'college', 'university'],
    'Military': ['military', 'defense', 'veteran', 'armed forces', 'national security', 'servicemember', 'combat', 'pentagon'],
    'Economy': ['economy', 'economic', 'financial', 'treasury', 'fiscal', 'trade', 'commerce', 'market', 'banking', 'finance'],
    'Healthcare': ['health', 'medical', 'healthcare', 'hospital', 'patient', 'medicare', 'medicaid', 'treatment', 'insurance'],
    'Environment': ['environment', 'climate', 'energy', 'pollution', 'environmental', 'conservation', 'renewable', 'sustainability'],
    'Immigration': ['immigration', 'border', 'visa', 'asylum', 'migrant', 'customs', 'refugee', 'migration'],
    'Technology': ['technology', 'cyber', 'digital', 'internet', 'cybersecurity', 'innovation', 'tech', 'data', 'privacy'],
    'Foreign Policy': ['foreign', 'international', 'diplomatic', 'embassy', 'bilateral', 'multilateral', 'treaty', 'global'],
    'Civil Rights': ['civil rights', 'discrimination', 'equality', 'justice', 'constitutional', 'voting rights', 'civil liberties'],
    'Infrastructure': ['infrastructure', 'transportation', 'construction', 'public works', 'development', 'roads', 'bridges'],
    'National Security': ['security', 'intelligence', 'homeland', 'counterterrorism', 'defense', 'threat', 'protection'],
    'Labor': ['labor', 'employment', 'workforce', 'worker', 'union', 'workplace', 'job', 'wage', 'compensation']
  };

  const contentLower = content.toLowerCase();
  // Use regex word boundaries to avoid partial matches
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(contentLower))) {
      categories.add(category);
    }
  }

  return Array.from(categories);
}

export function determineAgencies(content: string): string[] {
  const agencies = new Set<string>();
  
  const agencyKeywords: CategoryKeywords = {
    'Department of Education': ['department of education', 'education department', 'ed.gov', 'secretary of education'],
    'Department of Defense': ['department of defense', 'defense department', 'pentagon', 'dod', 'secretary of defense'],
    'Department of State': ['department of state', 'state department', 'diplomatic', 'state.gov', 'secretary of state'],
    'Department of Treasury': ['department of treasury', 'treasury department', 'treasury.gov', 'secretary of treasury'],
    'Department of Homeland Security': ['department of homeland security', 'dhs', 'homeland security', 'secretary of homeland'],
    'Department of Justice': ['department of justice', 'justice department', 'doj', 'justice.gov', 'attorney general'],
    'Department of Labor': ['department of labor', 'labor department', 'dol', 'labor.gov', 'secretary of labor'],
    'Department of Energy': ['department of energy', 'energy department', 'doe', 'energy.gov', 'secretary of energy'],
    'Department of Health and Human Services': ['department of health and human services', 'hhs', 'health and human services'],
    'Environmental Protection Agency': ['environmental protection agency', 'epa', 'epa.gov', 'administrator of the epa'],
    'Department of Transportation': ['department of transportation', 'transportation department', 'dot', 'transportation.gov'],
    'Department of Veterans Affairs': ['department of veterans affairs', 'va', 'veterans affairs', 'va.gov', 'secretary of veterans']
  };

  const contentLower = content.toLowerCase();
  // Use regex word boundaries for more accurate agency detection
  for (const [agency, keywords] of Object.entries(agencyKeywords)) {
    if (keywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(contentLower))) {
      agencies.add(agency);
    }
  }

  return Array.from(agencies);
}
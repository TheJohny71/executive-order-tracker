import { DocumentType, PrismaClient } from '@prisma/client';
import type { ScrapedOrder } from '@/types';
import { logger } from '@/utils/logger';
import axios from 'axios';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

interface AWSApiItem {
  identifier: string;
  id?: string;
  type: DocumentType;
  title: string;
  date: string;
  url: string;
  summary: string;
  notes?: string | null;
  content?: string | null;
  statusId: string;
  orderNumber?: string | null;
  categories: Array<{ name: string }>;
  agencies: Array<{ name: string }>;
}

interface ScraperResult {
  success: boolean;
  ordersScraped: number;
  errors: string[];
  newOrders: ScrapedOrder[];
  updatedOrders: ScrapedOrder[];
}

interface CategoryKeywords {
  [key: string]: string[];
}

async function retryWithDelay<T>(
  fn: () => Promise<T>, 
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Retrying operation in ${delay}ms. Retries left: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay);
    }
    throw error;
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
  for (const [agency, keywords] of Object.entries(agencyKeywords)) {
    if (keywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(contentLower))) {
      agencies.add(agency);
    }
  }

  return Array.from(agencies);
}

async function fetchFromAWS(): Promise<ScrapedOrder[]> {
  const endpoint = process.env.AWS_API_ENDPOINT;
  if (!endpoint) {
    throw new Error('AWS_API_ENDPOINT environment variable is not set');
  }

  try {
    const response = await axios.get<AWSApiItem[]>(endpoint);
    
    if (!response.data) {
      throw new Error('No data received from AWS API');
    }

    return response.data.map((item: AWSApiItem): ScrapedOrder => {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for item: ${item.identifier}`);
      }

      // Extract categories and agencies from content if available
      const detectedCategories = item.content ? determineCategories(item.content) : [];
      const detectedAgencies = item.content ? determineAgencies(item.content) : [];

      // Combine existing and detected categories/agencies
      const combinedCategories = [
        ...new Set([
          ...(item.categories || []).map(c => c.name),
          ...detectedCategories
        ])
      ].map(name => ({ name }));

      const combinedAgencies = [
        ...new Set([
          ...(item.agencies || []).map(a => a.name),
          ...detectedAgencies
        ])
      ].map(name => ({ name }));

      return {
        identifier: item.identifier || item.id || '',
        type: item.type,
        title: item.title || 'Untitled',
        date,
        url: item.url,
        summary: item.summary || '',
        notes: item.notes || null,
        content: item.content || null,
        statusId: item.statusId || '1',
        isNew: true,
        categories: combinedCategories,
        agencies: combinedAgencies,
        metadata: {
          orderNumber: item.orderNumber || item.identifier,
          categories: combinedCategories,
          agencies: combinedAgencies
        }
      };
    });
  } catch (error) {
    logger.error('Error fetching from AWS:', error);
    throw error;
  }
}

export async function scrapeDocuments(): Promise<ScraperResult> {
  try {
    const documents = await retryWithDelay(() => fetchFromAWS());

    if (documents.length === 0) {
      return {
        success: true,
        ordersScraped: 0,
        errors: [],
        newOrders: [],
        updatedOrders: []
      };
    }

    logger.info(`Found ${documents.length} documents`);

    const existingOrders = await prisma.order.findMany({
      select: { 
        link: true,
        number: true 
      }
    });
    
    const existingLinks = new Set(existingOrders.map(o => o.link).filter(Boolean));
    const existingNumbers = new Set(existingOrders.map(o => o.number).filter(Boolean));

    const newOrders: ScrapedOrder[] = [];
    const updatedOrders: ScrapedOrder[] = [];

    documents.forEach(doc => {
      if (!existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier)) {
        newOrders.push(doc);
      } else {
        updatedOrders.push(doc);
      }
    });

    return {
      success: true,
      ordersScraped: documents.length,
      errors: [],
      newOrders,
      updatedOrders
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error scraping documents:', error);
    return {
      success: false,
      ordersScraped: 0,
      errors: [errorMessage],
      newOrders: [],
      updatedOrders: []
    };
  }
}

export async function checkForNewDocuments(): Promise<ScrapedOrder[]> {
  try {
    const latestDocuments = await retryWithDelay(() => fetchFromAWS());
    
    const existingOrders = await prisma.order.findMany({
      select: { 
        link: true,
        number: true 
      }
    });
    
    const existingLinks = new Set(existingOrders.map(o => o.link).filter(Boolean));
    const existingNumbers = new Set(existingOrders.map(o => o.number).filter(Boolean));
    
    return latestDocuments.filter(doc => 
      !existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier)
    );
  } catch (error) {
    logger.error('Error checking for new documents:', error);
    throw error;
  }
}

export const utils = {
  retryWithDelay,
  fetchFromAWS,
  determineCategories,
  determineAgencies
};
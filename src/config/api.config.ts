export const apiConfig = {
  aws: {
    apiUrl: process.env.NEXT_PUBLIC_AWS_API_URL as string,
    region: process.env.AWS_REGION as string
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug'
  }
} as const;

export type ApiConfig = typeof apiConfig;

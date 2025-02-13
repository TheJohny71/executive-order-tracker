// src/lib/api/constants.ts
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MINIMUM_SEARCH_LENGTH: 3,
  DEFAULT_SORT: "desc",
  TIMEOUT: 30000,
  STAGES: {
    DEV: "dev",
    PROD: "prod",
    STAGING: "staging",
  },
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM: "application/x-www-form-urlencoded",
  MULTIPART: "multipart/form-data",
} as const;

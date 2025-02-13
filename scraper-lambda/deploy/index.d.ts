import { LambdaEvent } from "./types.js";
export declare const handler: (_event: LambdaEvent) => Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}>;

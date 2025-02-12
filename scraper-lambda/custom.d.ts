declare module '@sparticuz/chromium' {
    const args: string[];
    const defaultViewport: {
        width: number;
        height: number;
    };
    const executablePath: () => Promise<string>;
    const headless: boolean;
    export { args, defaultViewport, executablePath, headless };
}

declare module '@aws-sdk/client-dynamodb' {
    export class DynamoDBClient {
        constructor(config: any);
    }
}

declare module '@aws-sdk/lib-dynamodb' {
    export class DynamoDBDocumentClient {
        static from(client: any): DynamoDBDocumentClient;
    }
    export class BatchWriteCommand {
        constructor(input: any);
    }
}

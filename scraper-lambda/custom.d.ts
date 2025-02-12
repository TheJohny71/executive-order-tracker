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
        send(command: any): Promise<any>;
    }
}

declare module '@aws-sdk/lib-dynamodb' {
    export class DynamoDBDocumentClient {
        static from(client: any): DynamoDBDocumentClient;
        send(command: any): Promise<any>;
    }
    export class BatchWriteCommand {
        constructor(input: any);
    }
    export interface DynamoDBDocumentClient {
        send(command: any): Promise<any>;
    }
}

declare module 'aws-lambda' {
    export interface APIGatewayProxyEvent {
        body: string | null;
        headers: { [name: string]: string };
        multiValueHeaders: { [name: string]: string[] };
        httpMethod: string;
        isBase64Encoded: boolean;
        path: string;
        pathParameters: { [name: string]: string } | null;
        queryStringParameters: { [name: string]: string } | null;
        multiValueQueryStringParameters: { [name: string]: string[] } | null;
        stageVariables: { [name: string]: string } | null;
        requestContext: {
            accountId: string;
            apiId: string;
            authorizer?: any;
            protocol: string;
            httpMethod: string;
            identity: {
                accessKey: string | null;
                accountId: string | null;
                apiKey: string | null;
                caller: string | null;
                cognitoAuthenticationProvider: string | null;
                cognitoAuthenticationType: string | null;
                cognitoIdentityId: string | null;
                cognitoIdentityPoolId: string | null;
                sourceIp: string;
                user: string | null;
                userAgent: string | null;
                userArn: string | null;
            };
            path: string;
            stage: string;
            requestId: string;
            requestTimeEpoch: number;
            resourceId: string;
            resourcePath: string;
        };
        resource: string;
    }

    export type APIGatewayProxyHandler = (
        event: APIGatewayProxyEvent,
        context: any
    ) => Promise<{
        statusCode: number;
        headers?: { [header: string]: string };
        body: string;
    }>;
}
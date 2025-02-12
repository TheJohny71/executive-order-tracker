cat > index.mjs << 'EOF'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "executive-orders";

export const handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event));
        
        const path = event.path;
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        };
        
        switch (path) {
            case '/':
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Executive Orders API is working!',
                        time: new Date().toISOString()
                    })
                };
                
            case '/orders':
                const scanCommand = new ScanCommand({
                    TableName: TABLE_NAME,
                });
                
                const response = await docClient.send(scanCommand);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        orders: response.Items || []
                    })
                };
                
            case '/orders/by-type':
                const { type } = event.queryStringParameters || {};
                if (!type) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            message: 'Type parameter is required'
                        })
                    };
                }
                
                const queryCommand = new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'type-date-index',
                    KeyConditionExpression: '#type = :type',
                    ExpressionAttributeNames: {
                        '#type': 'type'
                    },
                    ExpressionAttributeValues: {
                        ':type': type
                    }
                });
                
                const typeResponse = await docClient.send(queryCommand);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        orders: typeResponse.Items || []
                    })
                };
                
            default:
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        message: 'Route not found'
                    })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
EOF
// dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ScrapedOrder } from "./types.js";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "executive-orders";

export const saveOrdersToDynamoDB = async (
  orders: ScrapedOrder[],
): Promise<void> => {
  // Break orders into chunks of 25 (DynamoDB batch write limit)
  const chunks = Array.from({ length: Math.ceil(orders.length / 25) }, (_, i) =>
    orders.slice(i * 25, (i + 1) * 25),
  );

  for (const chunk of chunks) {
    const writeRequests = chunk.map((order) => ({
      PutRequest: {
        Item: {
          pk: order.sourceId, // Primary key
          sk: order.type, // Sort key for querying by type
          id: order.sourceId,
          title: order.title,
          date: order.date,
          url: order.url,
          number: order.number,
          type: order.type,
          description: order.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    try {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: writeRequests,
          },
        }),
      );
      console.log(`Successfully wrote ${chunk.length} orders to DynamoDB`);
    } catch (error) {
      console.error("Error writing to DynamoDB:", error);
      throw error;
    }
  }
};

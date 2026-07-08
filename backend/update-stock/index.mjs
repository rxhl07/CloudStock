import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log("Processing UpdateStock request...", JSON.stringify(event));

    try {
        const body = JSON.parse(event.body || "{}");
        const { sku, quantityChange } = body;

        // Validation
        if (!sku || quantityChange === undefined || isNaN(Number(quantityChange))) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Bad Request: 'sku' and numeric 'quantityChange' are required." })
            };
        }

        // Atomic Counter Update Expression
        const command = new UpdateCommand({
            TableName: "cloudstock-inventory",
            Key: { sku: sku },
            UpdateExpression: "SET quantity = quantity + :val",
            ExpressionAttributeValues: { ":val": Number(quantityChange) },
            ReturnValues: "ALL_NEW"
        });

        const response = await docClient.send(command);
        const updatedItem = response.Attributes;

        // Interviewer Highlight: Threshold calculation rule
        const triggerLowStockAlert = updatedItem.quantity < 5;

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            body: JSON.stringify({
                message: "Stock updated successfully.",
                item: updatedItem,
                lowStockAlert: triggerLowStockAlert
            }),
        };
    } catch (error) {
        console.error("Error updating stock:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message || "Failed to update stock." }),
        };
    }
};
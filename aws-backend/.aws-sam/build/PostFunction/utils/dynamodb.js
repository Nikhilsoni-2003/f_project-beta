const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

class DynamoDBService {
  async get(tableName, key) {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key
      });
      const result = await docClient.send(command);
      return result.Item;
    } catch (error) {
      console.error('DynamoDB Get Error:', error);
      throw error;
    }
  }

  async put(tableName, item) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item
      });
      await docClient.send(command);
      return item;
    } catch (error) {
      console.error('DynamoDB Put Error:', error);
      throw error;
    }
  }

  async update(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ReturnValues: 'ALL_NEW'
      });
      const result = await docClient.send(command);
      return result.Attributes;
    } catch (error) {
      console.error('DynamoDB Update Error:', error);
      throw error;
    }
  }

  async delete(tableName, key) {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key
      });
      await docClient.send(command);
      return true;
    } catch (error) {
      console.error('DynamoDB Delete Error:', error);
      throw error;
    }
  }

  async query(tableName, keyConditionExpression, expressionAttributeValues, indexName = null, scanIndexForward = false) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: scanIndexForward
      });
      const result = await docClient.send(command);
      return result.Items;
    } catch (error) {
      console.error('DynamoDB Query Error:', error);
      throw error;
    }
  }

  async scan(tableName, filterExpression = null, expressionAttributeValues = {}) {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
      });
      const result = await docClient.send(command);
      return result.Items;
    } catch (error) {
      console.error('DynamoDB Scan Error:', error);
      throw error;
    }
  }
}

module.exports = new DynamoDBService();
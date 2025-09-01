const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const dynamodb = require('../../utils/dynamodb');

const apiGatewayClient = new ApiGatewayManagementApiClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  endpoint: `https://${process.env.WEBSOCKET_API_ID}.execute-api.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/prod`
});

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;
  const { action, data } = JSON.parse(event.body);

  try {
    switch (action) {
      case 'getOnlineUsers':
        await sendOnlineUsers(connectionId);
        break;
      case 'likedPost':
        await broadcastLike('post', data);
        break;
      case 'likedLoop':
        await broadcastLike('loop', data);
        break;
      case 'commentedPost':
        await broadcastComment('post', data);
        break;
      case 'commentedLoop':
        await broadcastComment('loop', data);
        break;
      case 'newMessage':
        await broadcastMessage(data);
        break;
      case 'newNotification':
        await broadcastNotification(data);
        break;
      default:
        console.log('Unknown action:', action);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message processed' })
    };
  } catch (error) {
    console.error('WebSocket Message Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to process message' })
    };
  }
};

const sendOnlineUsers = async (connectionId) => {
  try {
    const connections = await dynamodb.scan(process.env.CONNECTIONS_TABLE);
    const onlineUserIds = [...new Set(connections.map(conn => conn.userId))];

    await sendToConnection(connectionId, {
      type: 'getOnlineUsers',
      data: onlineUserIds
    });
  } catch (error) {
    console.error('Send Online Users Error:', error);
  }
};

const broadcastLike = async (type, data) => {
  try {
    const connections = await dynamodb.scan(process.env.CONNECTIONS_TABLE);
    
    await Promise.all(
      connections.map(async (connection) => {
        await sendToConnection(connection.connectionId, {
          type: `liked${type.charAt(0).toUpperCase() + type.slice(1)}`,
          data
        });
      })
    );
  } catch (error) {
    console.error('Broadcast Like Error:', error);
  }
};

const broadcastComment = async (type, data) => {
  try {
    const connections = await dynamodb.scan(process.env.CONNECTIONS_TABLE);
    
    await Promise.all(
      connections.map(async (connection) => {
        await sendToConnection(connection.connectionId, {
          type: `commented${type.charAt(0).toUpperCase() + type.slice(1)}`,
          data
        });
      })
    );
  } catch (error) {
    console.error('Broadcast Comment Error:', error);
  }
};

const broadcastMessage = async (data) => {
  try {
    const connections = await dynamodb.scan(process.env.CONNECTIONS_TABLE);
    const receiverConnections = connections.filter(conn => conn.userId === data.receiver);
    
    await Promise.all(
      receiverConnections.map(async (connection) => {
        await sendToConnection(connection.connectionId, {
          type: 'newMessage',
          data
        });
      })
    );
  } catch (error) {
    console.error('Broadcast Message Error:', error);
  }
};

const broadcastNotification = async (data) => {
  try {
    const connections = await dynamodb.scan(process.env.CONNECTIONS_TABLE);
    const receiverConnections = connections.filter(conn => conn.userId === data.receiverId);
    
    await Promise.all(
      receiverConnections.map(async (connection) => {
        await sendToConnection(connection.connectionId, {
          type: 'newNotification',
          data
        });
      })
    );
  } catch (error) {
    console.error('Broadcast Notification Error:', error);
  }
};

const sendToConnection = async (connectionId, message) => {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    });

    await apiGatewayClient.send(command);
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is stale, remove it
      await dynamodb.delete(process.env.CONNECTIONS_TABLE, { connectionId });
    }
    console.error('Send to connection error:', error);
  }
};
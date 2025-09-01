const dynamodb = require('../../utils/dynamodb');

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;
  const { userId } = event.queryStringParameters || {};

  try {
    if (userId) {
      await dynamodb.put('Connections', {
        connectionId,
        userId,
        connectedAt: Date.now()
      });

      // Broadcast online status
      await broadcastOnlineUsers();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected' })
    };
  } catch (error) {
    console.error('WebSocket Connect Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to connect' })
    };
  }
};

const broadcastOnlineUsers = async () => {
  try {
    const connections = await dynamodb.scan('Connections');
    const onlineUserIds = [...new Set(connections.map(conn => conn.userId))];
    
    // This would typically broadcast to all connections
    // Implementation depends on your WebSocket message handler
  } catch (error) {
    console.error('Broadcast Error:', error);
  }
};
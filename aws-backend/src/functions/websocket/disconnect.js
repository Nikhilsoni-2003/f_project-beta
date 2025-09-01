const dynamodb = require('../../utils/dynamodb');

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;

  try {
    await dynamodb.delete('Connections', { connectionId });

    // Broadcast updated online users
    await broadcastOnlineUsers();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  } catch (error) {
    console.error('WebSocket Disconnect Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to disconnect' })
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
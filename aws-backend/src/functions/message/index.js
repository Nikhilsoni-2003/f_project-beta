const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

const allowedOrigins = [
  'http://localhost:5173',
  'https://dsvtq5o5a0ykh.cloudfront.net'
];

const getCorsHeaders = (origin) => {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
};

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body, headers } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = headers?.origin || headers?.Origin || '*';

  // Handle OPTIONS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  try {
    const currentUser = await extractUserFromToken(event);
    let response;

    switch (true) {
      case httpMethod === 'POST' && path.includes('/api/message/send/'):
        response = await sendMessage(currentUser, pathParameters.userId, parsedBody);
        break;
      case httpMethod === 'GET' && path.includes('/api/message/getAll/'):
        response = await getAllMessages(currentUser, pathParameters.userId);
        break;
      case httpMethod === 'GET' && path === '/api/message/prevChats':
        response = await getPrevChats(currentUser);
        break;
      default:
        response = createErrorResponse(404, 'Route not found');
    }

    // Attach CORS headers
    response.headers = {
      ...(response.headers || {}),
      ...getCorsHeaders(origin)
    };

    return response;
  } catch (error) {
    console.error('Message Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

// -------------------- Functions --------------------

const sendMessage = async (currentUser, receiverId, { message, imageKey }) => {
  try {
    const conversationId = [currentUser.userId, receiverId].sort().join('_');

    let imageUrl = '';
    if (imageKey) {
      imageUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${imageKey}`;
    }

    const messageData = {
      messageId: uuidv4(),
      conversationId,
      sender: currentUser.userId,
      receiver: receiverId,
      message: message || '',
      image: imageUrl,
      timestamp: Date.now()
    };

    await dynamodb.put(process.env.MESSAGES_TABLE, messageData);

    // Update conversation metadata
    const existingConversation = await dynamodb.get(process.env.CONVERSATIONS_TABLE, { conversationId });

    if (!existingConversation) {
      const conversation = {
        conversationId,
        participant1: currentUser.userId,
        participant2: receiverId,
        lastMessage: message || 'Image',
        lastMessageTime: Date.now(),
        createdAt: Date.now()
      };
      await dynamodb.put(process.env.CONVERSATIONS_TABLE, conversation);
    } else {
      await dynamodb.update(
        process.env.CONVERSATIONS_TABLE,
        { conversationId },
        'SET lastMessage = :lastMessage, lastMessageTime = :lastMessageTime',
        {
          ':lastMessage': message || 'Image',
          ':lastMessageTime': Date.now()
        }
      );
    }

    return createSuccessResponse(messageData);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getAllMessages = async (currentUser, otherUserId) => {
  try {
    const conversationId = [currentUser.userId, otherUserId].sort().join('_');

    const messages = await dynamodb.query(
      process.env.MESSAGES_TABLE,
      'conversationId = :conversationId',
      { ':conversationId': conversationId }
    );

    // Sort by timestamp ascending
    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);

    return createSuccessResponse(sortedMessages);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getPrevChats = async (currentUser) => {
  try {
    const conversations1 = await dynamodb.query(
      process.env.CONVERSATIONS_TABLE,
      'participant1 = :participant1',
      { ':participant1': currentUser.userId },
      'participant1-index'
    );

    const conversations2 = await dynamodb.query(
      process.env.CONVERSATIONS_TABLE,
      'participant2 = :participant2',
      { ':participant2': currentUser.userId },
      'participant2-index'
    );

    const allConversations = [...conversations1, ...conversations2];

    // Sort by last message time (latest first)
    const sortedConversations = allConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    const chatUsers = await Promise.all(
      sortedConversations.map(async (conversation) => {
        const otherUserId =
          conversation.participant1 === currentUser.userId
            ? conversation.participant2
            : conversation.participant1;

        return dynamodb.get(process.env.USERS_TABLE, { userId: otherUserId });
      })
    );

    return createSuccessResponse(chatUsers.filter(Boolean));
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const dynamodb = require('../../utils/dynamodb');
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
  const { httpMethod, path, body, headers } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = event.headers?.origin || event.headers?.Origin || '*';

  // Handle CORS preflight
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
      case httpMethod === 'GET' && path === '/api/user/getAllNotifications':
        response = await getAllNotifications(currentUser);
        break;
      case httpMethod === 'POST' && path === '/api/user/markAsRead':
        response = await markAsRead(parsedBody);
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
    console.error('Notification Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

// -------------------- Functions --------------------

const getAllNotifications = async (currentUser) => {
  try {
    const notifications = await dynamodb.query(
      process.env.NOTIFICATIONS_TABLE,
      'receiverId = :receiverId',
      { ':receiverId': currentUser.userId },
      'receiver-index',
      false // descending by createdAt
    );

    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        const sender = await dynamodb.get(process.env.USERS_TABLE, { userId: notification.senderId });

        let relatedContent = null;
        if (notification.postId) {
          relatedContent = await dynamodb.get(process.env.POSTS_TABLE, { postId: notification.postId });
        } else if (notification.loopId) {
          relatedContent = await dynamodb.get(process.env.LOOPS_TABLE, { loopId: notification.loopId });
        }

        return {
          ...notification,
          _id: notification.notificationId,
          sender: {
            _id: sender.userId,
            userName: sender.userName,
            profileImage: sender.profileImage
          },
          post: notification.postId ? relatedContent : null,
          loop: notification.loopId ? relatedContent : null
        };
      })
    );

    return createSuccessResponse(notificationsWithDetails);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const markAsRead = async ({ notificationId }) => {
  try {
    if (Array.isArray(notificationId)) {
      await Promise.all(
        notificationId.map(async (id) => {
          await dynamodb.update(
            process.env.NOTIFICATIONS_TABLE,
            { notificationId: id },
            'SET isRead = :isRead',
            { ':isRead': true }
          );
        })
      );
    } else {
      await dynamodb.update(
        process.env.NOTIFICATIONS_TABLE,
        { notificationId },
        'SET isRead = :isRead',
        { ':isRead': true }
      );
    }

    return createSuccessResponse({ message: 'Notifications marked as read' });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

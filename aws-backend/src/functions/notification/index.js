const dynamodb = require('../../utils/dynamodb');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

exports.handler = async (event) => {
  const { httpMethod, path, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  try {
    const currentUser = await extractUserFromToken(event);

    switch (true) {
      case httpMethod === 'GET' && path === '/api/user/getAllNotifications':
        return await getAllNotifications(currentUser);
      case httpMethod === 'POST' && path === '/api/user/markAsRead':
        return await markAsRead(parsedBody);
      default:
        return createErrorResponse(404, 'Route not found');
    }
  } catch (error) {
    console.error('Notification Handler Error:', error);
    return createErrorResponse(500, error.message);
  }
};

const getAllNotifications = async (currentUser) => {
  try {
    const notifications = await dynamodb.query(
      process.env.NOTIFICATIONS_TABLE,
      'receiverId = :receiverId',
      { ':receiverId': currentUser.userId },
      'receiver-index',
      false // Sort descending by createdAt
    );

    // Populate sender details and related content
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
      // Mark multiple notifications as read
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
      // Mark single notification as read
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
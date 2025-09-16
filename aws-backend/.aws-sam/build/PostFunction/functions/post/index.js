const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

// -------------------- CORS Setup --------------------
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
// -----------------------------------------------------

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body, headers } = event;
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
      case httpMethod === 'POST' && path === '/api/post/upload':
        response = await uploadPost(currentUser, parsedBody);
        break;
      case httpMethod === 'GET' && path === '/api/post/getAll':
        response = await getAllPosts(currentUser);
        break;
      case httpMethod === 'GET' && path.includes('/api/post/like/'):
        response = await likePost(currentUser, pathParameters.postId);
        break;
      case httpMethod === 'POST' && path.includes('/api/post/comment/'):
        response = await commentPost(currentUser, pathParameters.postId, parsedBody);
        break;
      case httpMethod === 'GET' && path.includes('/api/post/saved/'):
        response = await savePost(currentUser, pathParameters.postId);
        break;
      default:
        response = createErrorResponse(404, 'Route not found');
    }

    // Attach CORS headers to all responses
    response.headers = {
      ...(response.headers || {}),
      ...getCorsHeaders(origin)
    };

    return response;
  } catch (error) {
    console.error('Post Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

// -------------------- Functions --------------------

const uploadPost = async (currentUser, { caption, mediaType, mediaKey }) => {
  try {
    const postId = uuidv4();
    const mediaUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${mediaKey}`;

    const post = {
      postId,
      authorId: currentUser.userId,
      caption,
      mediaType,
      media: mediaUrl,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };

    await dynamodb.put(process.env.POSTS_TABLE, post);

    // Update user's posts array
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    await dynamodb.update(
      process.env.USERS_TABLE,
      { userId: currentUser.userId },
      'SET posts = :posts',
      { ':posts': [...user.posts, postId] }
    );

    // Get author details for response
    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    return createSuccessResponse({
      ...post,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getAllPosts = async (currentUser) => {
  try {
    const allPosts = await dynamodb.scan(process.env.POSTS_TABLE);
    const sortedPosts = allPosts.sort((a, b) => b.createdAt - a.createdAt);

    const postsWithAuthors = await Promise.all(
      sortedPosts.map(async (post) => {
        const author = await dynamodb.get(process.env.USERS_TABLE, { userId: post.authorId });
        return {
          ...post,
          _id: post.postId,
          author: {
            _id: author.userId,
            userName: author.userName,
            profileImage: author.profileImage
          }
        };
      })
    );

    return createSuccessResponse(postsWithAuthors);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const likePost = async (currentUser, postId) => {
  try {
    const post = await dynamodb.get(process.env.POSTS_TABLE, { postId });
    if (!post) return createErrorResponse(404, 'Post not found');

    const isLiked = post.likes.includes(currentUser.userId);
    const updatedLikes = isLiked 
      ? post.likes.filter(id => id !== currentUser.userId)
      : [...post.likes, currentUser.userId];

    const updatedPost = await dynamodb.update(
      process.env.POSTS_TABLE,
      { postId },
      'SET likes = :likes',
      { ':likes': updatedLikes }
    );

    // Notification if liked by another user
    if (!isLiked && post.authorId !== currentUser.userId) {
      const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
      const notification = {
        notificationId: uuidv4(),
        receiverId: post.authorId,
        senderId: currentUser.userId,
        type: 'like',
        postId,
        message: `${currentUserData.userName} liked your post`,
        isRead: false,
        createdAt: Date.now()
      };

      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: post.authorId });
    
    return createSuccessResponse({
      ...updatedPost,
      _id: updatedPost.postId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const commentPost = async (currentUser, postId, { message }) => {
  try {
    const post = await dynamodb.get(process.env.POSTS_TABLE, { postId });
    if (!post) return createErrorResponse(404, 'Post not found');

    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    const comment = {
      commentId: uuidv4(),
      authorId: currentUser.userId,
      message,
      createdAt: Date.now(),
      author: {
        userId: currentUser.userId,
        userName: currentUserData.userName,
        profileImage: currentUserData.profileImage
      }
    };

    const updatedComments = [...post.comments, comment];

    const updatedPost = await dynamodb.update(
      process.env.POSTS_TABLE,
      { postId },
      'SET comments = :comments',
      { ':comments': updatedComments }
    );

    // Notification if commented by another user
    if (post.authorId !== currentUser.userId) {
      const notification = {
        notificationId: uuidv4(),
        receiverId: post.authorId,
        senderId: currentUser.userId,
        type: 'comment',
        postId,
        message: `${currentUserData.userName} commented on your post`,
        isRead: false,
        createdAt: Date.now()
      };
      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: post.authorId });
    
    return createSuccessResponse({
      ...updatedPost,
      _id: updatedPost.postId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const savePost = async (currentUser, postId) => {
  try {
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const isSaved = user.saved.includes(postId);
    
    const updatedSaved = isSaved 
      ? user.saved.filter(id => id !== postId)
      : [...user.saved, postId];

    const updatedUser = await dynamodb.update(
      process.env.USERS_TABLE,
      { userId: currentUser.userId },
      'SET saved = :saved',
      { ':saved': updatedSaved }
    );

    return createSuccessResponse(updatedUser);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

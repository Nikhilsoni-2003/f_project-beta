# Serverless Social Media Backend

This is a serverless social media application backend built with AWS Lambda, DynamoDB, Cognito, and S3.

## Architecture

- **AWS Lambda**: Serverless compute for API endpoints
- **Amazon DynamoDB**: NoSQL database for storing application data
- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: Media storage with CloudFront CDN
- **API Gateway**: REST API and WebSocket API for real-time features

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js 18.x or later

## Deployment

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
sam build
```

3. Deploy to AWS:
```bash
sam deploy --guided
```

4. After deployment, update your frontend environment variables with the generated API Gateway URLs.

## Environment Variables

The following environment variables are automatically configured:

- `COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `COGNITO_CLIENT_ID`: Cognito App Client ID
- `S3_BUCKET_NAME`: S3 bucket for media storage
- `CLOUDFRONT_DOMAIN`: CloudFront distribution domain
- `USERS_TABLE`: DynamoDB Users table name
- `POSTS_TABLE`: DynamoDB Posts table name
- `LOOPS_TABLE`: DynamoDB Loops table name
- `STORIES_TABLE`: DynamoDB Stories table name
- `MESSAGES_TABLE`: DynamoDB Messages table name
- `CONVERSATIONS_TABLE`: DynamoDB Conversations table name
- `NOTIFICATIONS_TABLE`: DynamoDB Notifications table name

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/signout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with code

### User Management
- `GET /api/user/current` - Get current user
- `GET /api/user/getProfile/{userName}` - Get user profile
- `POST /api/user/editProfile` - Update user profile
- `GET /api/user/follow/{userId}` - Follow/unfollow user
- `GET /api/user/suggested` - Get suggested users
- `GET /api/user/search` - Search users
- `GET /api/user/followingList` - Get following list

### Posts
- `POST /api/post/upload` - Upload new post
- `GET /api/post/getAll` - Get all posts
- `GET /api/post/like/{postId}` - Like/unlike post
- `POST /api/post/comment/{postId}` - Comment on post
- `GET /api/post/saved/{postId}` - Save/unsave post

### Loops
- `POST /api/loop/upload` - Upload new loop
- `GET /api/loop/getAll` - Get all loops
- `GET /api/loop/like/{loopId}` - Like/unlike loop
- `POST /api/loop/comment/{loopId}` - Comment on loop

### Stories
- `POST /api/story/upload` - Upload new story
- `GET /api/story/getAll` - Get all stories
- `GET /api/story/getByUserName/{userName}` - Get stories by username
- `GET /api/story/view/{storyId}` - View story

### Messages
- `POST /api/message/send/{userId}` - Send message
- `GET /api/message/getAll/{userId}` - Get conversation messages
- `GET /api/message/prevChats` - Get previous chat users

### Notifications
- `GET /api/user/getAllNotifications` - Get all notifications
- `POST /api/user/markAsRead` - Mark notifications as read

### Media
- `POST /api/media/presigned-url` - Get S3 presigned URL for upload

## WebSocket Events

- `$connect` - User connects to WebSocket
- `$disconnect` - User disconnects from WebSocket
- `message` - Handle real-time messages

## Local Development

To run the API locally:

```bash
sam local start-api
```

## Monitoring

Use AWS CloudWatch to monitor Lambda function logs and metrics.
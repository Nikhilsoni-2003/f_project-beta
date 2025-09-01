# Serverless Social Media App - Complete Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **SAM CLI** installed
4. **Node.js 18.x** or later

## Step-by-Step Deployment Guide

### 1. Install Required Tools

#### Install AWS CLI
```bash
# macOS
brew install awscli

# Windows
# Download from: https://aws.amazon.com/cli/

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### Install SAM CLI
```bash
# macOS
brew install aws-sam-cli

# Windows
# Download from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Linux
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

### 2. Configure AWS CLI

```bash
aws configure
```

Enter your:
- **AWS Access Key ID**: Your access key
- **AWS Secret Access Key**: Your secret key
- **Default region**: `eu-north-1` (or your preferred region)
- **Default output format**: `json`

### 3. Verify Your AWS Resources

Make sure these resources exist in your AWS account:

#### Cognito User Pool
- **User Pool ID**: `eu-north-1_RFZvLrDd9`
- **App Client ID**: `7p0e3uioc8mtq69m4qq12540mn`

#### S3 Bucket
- **Bucket Name**: `serverless-social-media-storage-123`
- **CloudFront Distribution**: `dsvtq5o5a0ykh.cloudfront.net`

### 4. Deploy Backend

Navigate to the backend directory:
```bash
cd aws-backend
```

Run the deployment script:
```bash
./deploy.sh
```

**Or deploy manually:**
```bash
# Install dependencies
npm install

# Build the application
sam build

# Deploy with guided setup
sam deploy --guided
```

### 5. Guided Deployment Parameters

During `sam deploy --guided`, you'll be prompted for:

- **Stack name**: `social-media-app` (or your preferred name)
- **AWS Region**: `eu-north-1`
- **Parameter CognitoUserPoolId**: `eu-north-1_RFZvLrDd9`
- **Parameter CognitoClientId**: `7p0e3uioc8mtq69m4qq12540mn`
- **Parameter S3BucketName**: `serverless-social-media-storage-123`
- **Parameter CloudFrontDomain**: `dsvtq5o5a0ykh.cloudfront.net`
- **Parameter Environment**: `prod`
- **Confirm changes before deploy**: `Y`
- **Allow SAM to create IAM roles**: `Y`
- **Save parameters to samconfig.toml**: `Y`

### 6. Update Frontend Configuration

After successful deployment, you'll see outputs like:
```
Outputs:
ApiGatewayUrl: https://abc123def.execute-api.eu-north-1.amazonaws.com/prod
WebSocketUrl: wss://xyz789ghi.execute-api.eu-north-1.amazonaws.com/prod
```

Update `frontend/.env` with the actual URLs:
```env
VITE_API_GATEWAY_URL=https://your-actual-api-gateway-url
VITE_WEBSOCKET_URL=wss://your-actual-websocket-url
```

### 7. Test Your Backend

Test key endpoints:
```bash
# Test signup
curl -X POST https://your-api-gateway-url/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","userName":"testuser","email":"test@example.com","password":"Test123!"}'

# Test signin
curl -X POST https://your-api-gateway-url/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser","password":"Test123!"}'
```

### 8. Deploy Frontend

#### Option A: Vercel (Recommended)
```bash
cd frontend
npm install -g vercel
vercel --prod
```

#### Option B: Netlify
```bash
cd frontend
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

#### Option C: AWS S3 + CloudFront
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

## Environment Variables Reference

### Backend (Automatically configured)
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DOMAIN`
- `USERS_TABLE`
- `POSTS_TABLE`
- `LOOPS_TABLE`
- `STORIES_TABLE`
- `MESSAGES_TABLE`
- `CONVERSATIONS_TABLE`
- `NOTIFICATIONS_TABLE`
- `CONNECTIONS_TABLE`

### Frontend (Update after deployment)
- `VITE_API_GATEWAY_URL`
- `VITE_WEBSOCKET_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_S3_BUCKET_NAME`
- `VITE_CLOUDFRONT_DOMAIN`

## Common Issues & Solutions

### Issue: "User Pool not found"
**Solution**: 
1. Verify your Cognito User Pool exists
2. Check the User Pool ID in parameters
3. Ensure you're deploying to the correct region

### Issue: "S3 bucket access denied"
**Solution**: 
1. Verify S3 bucket exists
2. Check bucket permissions
3. Ensure your AWS credentials have S3 access

### Issue: "DynamoDB table already exists"
**Solution**: 
1. Delete existing tables if they're empty
2. Or modify table names in template.yaml
3. Update environment variables accordingly

### Issue: "CORS errors in frontend"
**Solution**: 
1. Verify API Gateway CORS configuration
2. Check frontend API calls use correct URLs
3. Ensure proper headers in requests

### Issue: "Lambda timeout"
**Solution**: 
1. Increase timeout in template.yaml
2. Optimize database queries
3. Add proper error handling

## Monitoring & Debugging

### CloudWatch Logs
```bash
# View logs for specific function
sam logs -n AuthFunction --stack-name social-media-app --tail

# View all logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/social-media-app
```

### API Gateway Testing
```bash
# Test API Gateway directly
curl -X GET https://your-api-gateway-url/api/user/suggested \
  -H "Authorization: Bearer your-jwt-token"
```

## Security Best Practices

1. **Never commit sensitive data**:
   - AWS credentials
   - API keys
   - Database passwords

2. **Use IAM roles with least privilege**
3. **Enable CloudTrail for auditing**
4. **Set up CloudWatch alarms for monitoring**
5. **Use HTTPS only**

## Cost Optimization

1. **DynamoDB**: Use On-Demand billing for variable workloads
2. **Lambda**: Monitor execution time and memory usage
3. **S3**: Set up lifecycle policies for old media
4. **CloudWatch**: Set up cost alarms

## Cleanup

To remove all resources:
```bash
sam delete --stack-name social-media-app
```

## Troubleshooting Commands

```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate SAM template
sam validate

# Build without cache
sam build --use-container

# Deploy with debug
sam deploy --debug

# Check stack status
aws cloudformation describe-stacks --stack-name social-media-app
```

## Support

If you encounter issues:
1. Check CloudWatch logs for detailed error messages
2. Verify all AWS resources exist and have correct permissions
3. Ensure environment variables match your AWS resources
4. Test individual Lambda functions using SAM local
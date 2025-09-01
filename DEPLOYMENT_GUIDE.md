# Serverless Social Media App - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **SAM CLI** installed
4. **Node.js 18.x** or later

## Step-by-Step Deployment Guide

### 1. Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `eu-north-1`)
- Default output format (`json`)

### 2. Verify Your AWS Resources

Ensure these resources exist in your AWS account:
- **Cognito User Pool**: `eu-north-1_RFZvLrDd9`
- **Cognito App Client**: `7p0e3uioc8mtq69m4qq12540mn`
- **S3 Bucket**: `serverless-social-media-storage-123`
- **CloudFront Distribution**: `dsvtq5o5a0ykh.cloudfront.net`

### 3. Deploy Backend

Navigate to the backend directory:
```bash
cd aws-backend
```

Install dependencies:
```bash
npm install
```

Run the deployment script:
```bash
./deploy.sh
```

Or manually:
```bash
sam build
sam deploy --guided
```

During guided deployment, you'll be prompted for:
- Stack name (e.g., `social-media-app`)
- AWS Region (e.g., `eu-north-1`)
- Parameter values (use your existing resource IDs)
- Confirm changes before deploy: `Y`
- Allow SAM to create IAM roles: `Y`
- Save parameters to samconfig.toml: `Y`

### 4. Update Frontend Configuration

After successful backend deployment, you'll see outputs like:
```
ApiGatewayUrl: https://abc123.execute-api.eu-north-1.amazonaws.com/prod
WebSocketUrl: wss://xyz789.execute-api.eu-north-1.amazonaws.com/prod
```

Update `frontend/.env`:
```env
VITE_API_GATEWAY_URL=https://your-actual-api-gateway-url
VITE_WEBSOCKET_URL=wss://your-actual-websocket-url
```

### 5. Test Your Deployment

Test key endpoints:
```bash
# Test auth endpoint
curl -X POST https://your-api-gateway-url/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","userName":"test","email":"test@example.com","password":"Test123!"}'
```

### 6. Deploy Frontend

You can deploy the frontend to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **AWS S3 + CloudFront**: Use AWS Amplify or manual S3 deployment

## Common Issues & Solutions

### Issue: "User Pool not found"
**Solution**: Verify your Cognito User Pool ID in the parameters

### Issue: "S3 bucket access denied"
**Solution**: Ensure your AWS credentials have S3 permissions

### Issue: "DynamoDB table already exists"
**Solution**: Either delete existing tables or use different table names

### Issue: "CORS errors in frontend"
**Solution**: Verify API Gateway CORS configuration and frontend API calls

## Monitoring & Logs

- **CloudWatch Logs**: Monitor Lambda function logs
- **API Gateway**: Check request/response logs
- **DynamoDB**: Monitor read/write capacity

## Security Considerations

1. **Environment Variables**: Never commit real AWS credentials
2. **IAM Roles**: Use least privilege principle
3. **API Rate Limiting**: Consider adding rate limiting
4. **Input Validation**: Ensure all inputs are validated

## Cost Optimization

- Use **DynamoDB On-Demand** for variable workloads
- Set up **CloudWatch Alarms** for cost monitoring
- Consider **Lambda Provisioned Concurrency** for high-traffic functions

## Cleanup

To remove all resources:
```bash
sam delete --stack-name your-stack-name
```

## Support

If you encounter issues:
1. Check CloudWatch logs for detailed error messages
2. Verify all AWS resources exist and have correct permissions
3. Ensure environment variables match your AWS resources
#!/bin/bash

echo "🚀 Starting deployment of Serverless Social Media App..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI not found. Please install AWS SAM CLI first."
    echo "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Build the application
echo "📦 Building SAM application..."
sam build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy the application
echo "🚀 Deploying to AWS..."
sam deploy --guided

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the API Gateway URL from the outputs above"
    echo "2. Copy the WebSocket URL from the outputs above"
    echo "3. Update your frontend/.env file with these URLs"
    echo "4. Deploy your frontend to your preferred hosting service"
    echo ""
    echo "🔗 Your API endpoints are now live!"
else
    echo "❌ Deployment failed!"
    exit 1
fi
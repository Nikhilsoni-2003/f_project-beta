exports.handler = async (event) => {
    console.log('Mock authorizer triggered', event);
    
    // Only allow in local environment
    const environment = process.env.Environment || 'prod';
    if (environment !== 'local') {
      throw new Error('Mock authorizer only works in local environment');
    }
  
    // Optional: Simulate token validation
    const token = event.headers.Authorization || '';
    if (!token.startsWith('Bearer ')) {
      throw new Error('Unauthorized - No Bearer token'); // Reject if not a Bearer token
    }
  
    // Return simulated authorization response
    return {
      principalId: 'mockUser',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: 'test-user-id',
        userName: 'test-user',
        email: 'test@example.com',
        // Add any other mock context your functions expect
      },
    };
  };
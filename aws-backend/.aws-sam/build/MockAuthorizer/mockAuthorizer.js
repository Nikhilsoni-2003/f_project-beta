exports.handler = async (event) => {
    console.log('Mock authorizer triggered', event);
  
    // Optional: Simulate token validation
    const token = event.headers.Authorization || '';
    if (!token.startsWith('Bearer mockToken')) {
      throw 'Unauthorized'; // Reject if not the mock token
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
        // Add any other mock context your functions expect
      },
    };
  };
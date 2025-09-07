const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, InitiateAuthCommand, AdminGetUserCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

class CognitoService {
  constructor() {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
  }

  async signUp(email, password, userName, name) {
    try {
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:userName', Value: userName },
          { Name: 'name', Value: name }
        ],
        MessageAction: 'SUPPRESS',
        TemporaryPassword: password
      });

      await cognitoClient.send(createUserCommand);

      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true
      });

      await cognitoClient.send(setPasswordCommand);

      return { success: true, message: 'User created successfully' };
    } catch (error) {
      console.error('Cognito SignUp Error:', error);
      throw error;
    }
  }

  async signIn(userName, password) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: userName,
          PASSWORD: password
        }
      });

      const result = await cognitoClient.send(command);
      return {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        refreshToken: result.AuthenticationResult.RefreshToken
      };
    } catch (error) {
      console.error('Cognito SignIn Error:', error);
      throw error;
    }
  }

  async getUser(accessToken) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: accessToken
      });

      const result = await cognitoClient.send(command);
      return result;
    } catch (error) {
      console.error('Cognito GetUser Error:', error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email
      });

      await cognitoClient.send(command);
      return { success: true, message: 'Password reset code sent' };
    } catch (error) {
      console.error('Cognito ForgotPassword Error:', error);
      throw error;
    }
  }

  async resetPassword(email, confirmationCode, newPassword) {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword
      });

      await cognitoClient.send(command);
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Cognito ResetPassword Error:', error);
      throw error;
    }
  }
}

module.exports = new CognitoService();
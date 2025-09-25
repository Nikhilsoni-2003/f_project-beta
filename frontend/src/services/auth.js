import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: import.meta.env.VITE_AWS_REGION || 'eu-north-1' 
});

class AuthService {
  constructor() {
    this.userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
    this.clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  }

  async signUp(email, password, userName, name) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, userName, name })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Sign up failed');
      }

      // Store tokens if returned
      if (data.tokens) {
        this.setTokens(data.tokens.accessToken, data.tokens.idToken, data.tokens.refreshToken);
      }

      return data;
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  }

  async signIn(userName, password) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userName, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      // Store tokens if returned
      if (data.tokens) {
        this.setTokens(data.tokens.accessToken, data.tokens.idToken, data.tokens.refreshToken);
      }

      return data;
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/auth/signout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      return { success: true };
    } catch (error) {
      return { success: true }; // Always succeed for signout
    }
  }

  async forgotPassword(email) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(email, confirmationCode, password) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, confirmationCode, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  getToken() {
    return localStorage.getItem('accessToken');
  }

  setTokens(accessToken, idToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
}

export default new AuthService();
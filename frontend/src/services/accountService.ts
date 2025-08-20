import api from './api';

export interface SecurityInfo {
  email: string;
  accountCreated: string;
  lastLogin: string;
  passwordLastChanged: string;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  requirePasswordChange: boolean;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDeletionData {
  password: string;
  confirmDelete: string;
}

class AccountService {
  // Change password
  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    const response = await api.post('/api/users/change-password', data);
    return response.data;
  }

  // Delete account
  async deleteAccount(data: AccountDeletionData): Promise<{ message: string }> {
    const response = await api.delete('/api/users/delete-account', { data });
    return response.data;
  }

  // Get account security information
  async getSecurityInfo(): Promise<SecurityInfo> {
    const response = await api.get('/api/users/security-info');
    return response.data;
  }
}

export default new AccountService();

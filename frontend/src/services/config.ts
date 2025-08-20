const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export interface ConfigurationData {
  key: string;
  value: any;
  description?: string;
}

export class ConfigService {
  // Fetch departments from MongoDB
  static async getDepartments(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to default departments if API fails
      return [
        'Civil Engineering',
        'Mechanical Engineering',
        'Mechatronics Engineering',
        'Automobile Engineering',
        'Electrical and Electronics Engineering (EEE)',
        'Electronics and Communication Engineering (ECE)',
        'Electronics and Instrumentation Engineering (EIE)',
        'Computer Science and Engineering (CSE)',
        'Information Technology (IT)',
        'Artificial Intelligence and Machine Learning (AIML)',
        'Food Technology'
      ];
    }
  }

  // Fetch designations from MongoDB
  static async getDesignations(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/designations`);
      if (!response.ok) {
        throw new Error('Failed to fetch designations');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching designations:', error);
      // Fallback to default designations if API fails
      return [
        'Professor',
        'Associate Professor',
        'Assistant Professor',
        'Lecturer',
        'Senior Lecturer',
        'Head of Department',
        'Dean',
        'Principal',
        'Director'
      ];
    }
  }

  // Fetch placement statuses from MongoDB
  static async getPlacementStatuses(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/placement-statuses`);
      if (!response.ok) {
        throw new Error('Failed to fetch placement statuses');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching placement statuses:', error);
      // Fallback to default statuses if API fails
      return [
        'seeking',
        'placed',
        'not_interested',
        'higher_studies',
        'entrepreneur'
      ];
    }
  }

  // Fetch configurations by category
  static async getConfigurationsByCategory(category: string): Promise<ConfigurationData[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/category/${category}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch configurations for category: ${category}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching configurations for category ${category}:`, error);
      return [];
    }
  }

  // Admin functions (require authentication)
  static async createConfiguration(data: {
    key: string;
    value: any;
    category: string;
    description?: string;
  }, token: string): Promise<ConfigurationData> {
    try {
      const response = await fetch(`${API_BASE_URL}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating configuration:', error);
      throw error;
    }
  }

  static async updateConfiguration(
    id: string,
    data: {
      value?: any;
      description?: string;
      isActive?: boolean;
    },
    token: string
  ): Promise<ConfigurationData> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  static async deleteConfiguration(id: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      throw error;
    }
  }
}

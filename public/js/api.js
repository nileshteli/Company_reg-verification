const API_BASE = '/api';

class API {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  static async verifyOTP(otpData) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(otpData)
    });
  }

  static async getJobs() {
    return this.request('/jobs');
  }

  static async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }

  static async applyJob(jobId) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST'
    });
  }
}

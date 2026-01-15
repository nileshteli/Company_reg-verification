class Auth {
  static isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  static getUserType() {
    return localStorage.getItem('userType');
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    window.location.href = '/';
  }

  static redirectIfNotLoggedIn() {
    if (!this.isLoggedIn()) {
      window.location.href = '/';
    }
  }
}

class FormHandler {
  static async handleRegister(form, userType) {
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData);
    userData.userType = userType;

    try {
      const response = await API.register(userData);
      localStorage.setItem('tempEmail', userData.email);
      localStorage.setItem('tempToken', response.token);
      localStorage.setItem('userType', response.userType);
      window.location.href = `/${userType}/otp.html`;
    } catch (error) {
      this.showError(error.message);
    }
  }

  static async handleLogin(form) {
    const formData = new FormData(form);
    const credentials = Object.fromEntries(formData);

    try {
      const response = await API.login(credentials);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userType', response.userType);
      window.location.href = `/${response.userType}/dashboard.html`;
    } catch (error) {
      this.showError(error.message);
    }
  }

  static async handleOTP(form) {
    const formData = new FormData(form);
    const otpData = Object.fromEntries(formData);

    try {
      const token = localStorage.getItem('tempToken');
      const userType = localStorage.getItem('userType');
      
      if (userType === 'company') {
        localStorage.setItem('token', token);
        localStorage.removeItem('tempToken');
        localStorage.removeItem('tempEmail');
        window.location.href = '/company/company_info.html';
      } else {
        localStorage.setItem('token', token);
        localStorage.removeItem('tempToken');
        localStorage.removeItem('tempEmail');
        window.location.href = '/user/dashboard.html';
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  static saveCompanyInfo(form, nextPage) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const existingData = JSON.parse(localStorage.getItem('companyData') || '{}');
    localStorage.setItem('companyData', JSON.stringify({...existingData, ...data}));
    window.location.href = nextPage;
  }

  static async submitCompanyProfile() {
    try {
      const companyData = JSON.parse(localStorage.getItem('companyData') || '{}');
      await API.request('/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(companyData)
      });
      localStorage.removeItem('companyData');
      window.location.href = '/company/dashboard.html';
    } catch (error) {
      alert('Failed to save profile: ' + error.message);
    }
  }
      localStorage.setItem('userType', response.userType);
      localStorage.removeItem('tempEmail');
      window.location.href = `/${response.userType}/dashboard.html`;
    } catch (error) {
      this.showError(error.message);
    }
  }

  static showError(message) {
    const errorDiv = document.getElementById('error') || this.createErrorDiv();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  static createErrorDiv() {
    const div = document.createElement('div');
    div.id = 'error';
    div.style.cssText = 'color: red; margin: 10px 0; padding: 10px; border: 1px solid red; border-radius: 4px; background: #ffe6e6;';
    document.querySelector('form').prepend(div);
    return div;
  }
}

class Dashboard {
  static async loadUserDashboard() {
    try {
      const jobs = await API.getJobs();
      this.renderJobs(jobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }

  static async loadCompanyDashboard() {
    try {
      const jobs = await API.getJobs();
      this.renderCompanyJobs(jobs);
      this.updateCompanyStats(jobs);
      this.loadApplications();
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }

  static updateCompanyStats(jobs) {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);
    const pendingReviews = jobs.reduce((sum, j) => 
      sum + (j.applications?.filter(a => a.status === 'pending').length || 0), 0);

    document.getElementById('total-jobs').textContent = totalJobs;
    document.getElementById('active-jobs').textContent = activeJobs;
    document.getElementById('total-applications').textContent = totalApplications;
    document.getElementById('pending-reviews').textContent = pendingReviews;
  }

  static async loadApplications() {
    try {
      const jobs = await API.getJobs();
      const container = document.getElementById('applications-container');
      if (!container) return;

      const applications = jobs.flatMap(job => 
        (job.applications || []).map(app => ({...app, jobTitle: job.title, jobId: job._id}))
      );

      if (applications.length === 0) {
        container.innerHTML = '<p>No applications yet</p>';
        return;
      }

      container.innerHTML = applications.map(app => `
        <div class="job-card">
          <h4>${app.jobTitle}</h4>
          <p><strong>Applicant:</strong> ${app.user?.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${app.user?.email || 'N/A'}</p>
          <p><strong>Status:</strong> <span class="status-${app.status}">${app.status}</span></p>
          <p><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleDateString()}</p>
          <div>
            <button onclick="Dashboard.updateApplicationStatus('${app.jobId}', '${app.user?._id}', 'shortlisted')">Shortlist</button>
            <button onclick="Dashboard.updateApplicationStatus('${app.jobId}', '${app.user?._id}', 'rejected')" style="background: #dc3545;">Reject</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  }

  static async updateApplicationStatus(jobId, userId, status) {
    try {
      await API.request(`/jobs/${jobId}/applications/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      alert('Application status updated!');
      this.loadApplications();
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  }

  static renderJobs(jobs) {
    const container = document.getElementById('jobs-container');
    if (!container) return;

    container.innerHTML = jobs.map(job => `
      <div class="job-card">
        <h3>${job.title}</h3>
        <p><strong>Company:</strong> ${job.company?.companyName || job.company?.name || 'N/A'}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>Salary:</strong> ${job.salary || 'Not specified'}</p>
        <p><strong>Type:</strong> ${job.type}</p>
        <p>${job.description}</p>
        <p><strong>Requirements:</strong> ${job.requirements}</p>
        <button onclick="Dashboard.applyJob('${job._id}')">Apply</button>
      </div>
    `).join('');
  }

  static renderCompanyJobs(jobs) {
    const container = document.getElementById('company-jobs-container');
    if (!container) return;

    container.innerHTML = jobs.map(job => `
      <div class="job-card">
        <h3>${job.title}</h3>
        <p><strong>Applications:</strong> ${job.applications?.length || 0}</p>
        <p><strong>Posted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
        <p>${job.description}</p>
      </div>
    `).join('');
  }

  static async applyJob(jobId) {
    try {
      await API.applyJob(jobId);
      alert('Application submitted successfully!');
    } catch (error) {
      alert('Failed to apply: ' + error.message);
    }
  }

  static async createJob(form) {
    const formData = new FormData(form);
    const jobData = Object.fromEntries(formData);

    try {
      await API.createJob(jobData);
      alert('Job posted successfully!');
      form.reset();
      this.loadCompanyDashboard();
    } catch (error) {
      alert('Failed to create job: ' + error.message);
    }
  }
}

// Auto-initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  if (path.includes('dashboard.html')) {
    Auth.redirectIfNotLoggedIn();
    if (path.includes('user')) {
      Dashboard.loadUserDashboard();
    } else if (path.includes('company')) {
      Dashboard.loadCompanyDashboard();
    }
  }
});

/**
 * ============================================
 * OlimpX - API Service Module
 * Handles all communication with the Backend
 * ============================================
 */

const API_BASE_URL = '/api';

/**
 * Base request helper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('olimpx_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // If sending FormData, let the browser set the Content-Type with boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }


  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized globally
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('olimpx_token');
      localStorage.removeItem('olimpx_current_user');
      
      if (!window.location.pathname.includes('login.html')) {
        const currentPath = window.location.pathname;
        window.location.href = currentPath.includes('/admin/') ? '../pages/login.html' : 'login.html';
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server xatosi: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network Error:', error);
      throw new Error('Internetga ulanishda xatolik yuz berdi');
    }
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * API Endpoints
 */
export const api = {
  // Authentication
  auth: {
    login: (credentials) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    requestPasswordReset: (data) => request('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getMe: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // Olympiads
  olympiads: {
    getAll: (status) => request(`/olympiads${status ? '?status=' + status : ''}`),
    getById: (id) => request(`/olympiads/${id}`),
    create: (data) => request('/olympiads', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/olympiads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/olympiads/${id}`, {
      method: 'DELETE'
    }),
    import: (formData) => request('/olympiads/import', {
      method: 'POST',
      body: formData // request helper needs to NOT set Content-Type for FormData
    })
  },

  // Questions
  questions: {
    getAll: (olympiadId) => request(`/questions${olympiadId ? '?olympiadId=' + olympiadId : ''}`),
    getByOlympiad: (olympiadId) => request(`/questions/olympiad/${olympiadId}`),
    create: (data) => request('/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    bulkCreate: (data) => request('/questions/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    verify: (data) => request('/questions/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/questions/${id}`, {
      method: 'DELETE'
    })
  },


  // Results
  results: {
    submit: (data) => request('/results/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getMyResults: () => request('/results/my'),
    getAllResults: () => request('/results/all'),
    getById: (id) => request('/results/' + id),
    delete: (id) => request(`/results/${id}`, {
      method: 'DELETE'
    })
  },


  // Users
  users: {
    getAll: () => request('/users'),
    updateProfile: (data) => request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/users/${id}`, {
      method: 'DELETE'
    })
  },

  // Reports
  reports: {
    getStats: () => request('/reports/stats')
  },

  // Quiz Attempts (Resume Feature)
  attempts: {
    get: (olympiadId) => request(`/attempts/${olympiadId}`),
    save: (data) => request('/attempts/save', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    clear: (olympiadId) => request(`/attempts/${olympiadId}`, {
      method: 'DELETE'
    })
  }
};

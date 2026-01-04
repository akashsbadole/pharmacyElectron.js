// Authentication Module for PharmaMine Web Application

// Authentication state
const authState = {
    user: null,
    token: null,
    isAuthenticated: false
};

// Authentication API endpoints
const authAPI = {
    login: async (credentials) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Login API error:', error);
            throw error;
        }
    },

    register: async (userData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Register API error:', error);
            throw error;
        }
    },

    me: async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await fetch(`${apiConfig.baseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Auth me API error:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return { success: true }; // Already logged out
            }

            const response = await fetch(`${apiConfig.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Logout API error:', error);
            throw error;
        }
    }
};

// Authentication utilities
const authUtils = {
    // Store authentication data
    storeAuth: (token, user) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(user));
        authState.token = token;
        authState.user = user;
        authState.isAuthenticated = true;
    },

    // Clear authentication data
    clearAuth: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        authState.token = null;
        authState.user = null;
        authState.isAuthenticated = false;
    },

    // Get stored authentication data
    getStoredAuth: () => {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        
        if (token && user) {
            try {
                return {
                    token,
                    user: JSON.parse(user)
                };
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                return null;
            }
        }
        return null;
    },

    // Validate token format (basic validation)
    isValidToken: (token) => {
        return token && typeof token === 'string' && token.length > 10;
    },

    // Check if token is expired (basic check)
    isTokenExpired: (token) => {
        if (!token) return true;
        
        try {
            // For JWT tokens, we could decode and check exp
            // For now, just return false (assume not expired)
            return false;
        } catch (error) {
            return true;
        }
    }
};

// Authentication handlers
const authHandlers = {
    // Handle login form submission
    handleLogin: async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!username || !password) {
            utils.showToast('Please enter both username and password', 'warning');
            return;
        }

        try {
            utils.showLoading();
            
            const response = await authAPI.login({ username, password });
            
            if (response.success) {
                authUtils.storeAuth(response.data.token, response.data.user);
                
                // Update UI
                document.getElementById('auth-buttons').style.display = 'none';
                document.getElementById('username-display').textContent = response.data.user.fullname;
                
                // Close modal
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                loginModal.hide();
                
                utils.showToast('Login successful!', 'success');
                
                // Redirect to POS section
                navigation.switchSection('pos');
            } else {
                utils.showToast(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            utils.showToast('Network error. Please try again.', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Handle register form submission
    handleRegister: async (e) => {
        e.preventDefault();
        
        const fullname = document.getElementById('registerFullname').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        // Validation
        if (!fullname || !username || !password) {
            utils.showToast('Please fill in all required fields', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            utils.showToast('Passwords do not match', 'warning');
            return;
        }

        if (password.length < 6) {
            utils.showToast('Password must be at least 6 characters long', 'warning');
            return;
        }

        const userData = {
            fullname,
            username,
            email: email || null,
            phone: phone || null,
            password
        };

        try {
            utils.showLoading();
            
            const response = await authAPI.register(userData);
            
            if (response.success) {
                // Close register modal
                const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                registerModal.hide();
                
                utils.showToast('Registration successful! Please login.', 'success');
                
                // Open login modal
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } else {
                utils.showToast(response.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            utils.showToast('Network error. Please try again.', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Handle logout
    handleLogout: async () => {
        try {
            utils.showLoading();
            
            const response = await authAPI.logout();
            
            // Always clear local auth data, even if API call fails
            authUtils.clearAuth();
            
            // Update UI
            document.getElementById('auth-buttons').style.display = 'flex';
            document.getElementById('username-display').textContent = 'Guest';
            
            utils.showToast('Logged out successfully', 'success');
            
            // Redirect to login
            navigation.switchSection('pos');
            
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear local auth data on error
            authUtils.clearAuth();
            document.getElementById('auth-buttons').style.display = 'flex';
            document.getElementById('username-display').textContent = 'Guest';
            utils.showToast('Logged out', 'info');
        } finally {
            utils.hideLoading();
        }
    },

    // Check authentication status on page load
    checkAuthStatus: async () => {
        const storedAuth = authUtils.getStoredAuth();
        
        if (!storedAuth || !authUtils.isValidToken(storedAuth.token)) {
            // No valid auth found
            authUtils.clearAuth();
            document.getElementById('auth-buttons').style.display = 'flex';
            document.getElementById('username-display').textContent = 'Guest';
            return false;
        }

        // Try to validate the token with the server
        try {
            const response = await authAPI.me();
            
            if (response.success) {
                authUtils.storeAuth(storedAuth.token, response.data);
                
                // Update UI
                document.getElementById('auth-buttons').style.display = 'none';
                document.getElementById('username-display').textContent = response.data.fullname;
                return true;
            } else {
                // Token invalid
                authUtils.clearAuth();
                document.getElementById('auth-buttons').style.display = 'flex';
                document.getElementById('username-display').textContent = 'Guest';
                return false;
            }
        } catch (error) {
            console.error('Auth validation failed:', error);
            // Clear invalid auth
            authUtils.clearAuth();
            document.getElementById('auth-buttons').style.display = 'flex';
            document.getElementById('username-display').textContent = 'Guest';
            return false;
        }
    }
};

// Password strength checker
const passwordUtils = {
    checkStrength: (password) => {
        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');

        if (/[a-z]/.test(password)) strength++;
        else feedback.push('Lowercase letter');

        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('Uppercase letter');

        if (/[0-9]/.test(password)) strength++;
        else feedback.push('Number');

        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        else feedback.push('Special character');

        return {
            strength,
            feedback,
            isValid: strength >= 4
        };
    },

    updatePasswordStrength: (password, confirmPassword) => {
        const strength = passwordUtils.checkStrength(password);
        const strengthBar = document.getElementById('password-strength');
        const strengthText = document.getElementById('password-strength-text');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');

        if (!strengthBar || !strengthText) return;

        // Update strength bar
        const percentage = (strength.strength / 5) * 100;
        strengthBar.style.width = `${percentage}%`;
        
        // Update strength text and color
        if (strength.strength <= 2) {
            strengthText.textContent = 'Weak';
            strengthText.className = 'text-danger';
            strengthBar.className = 'progress-bar bg-danger';
        } else if (strength.strength === 3) {
            strengthText.textContent = 'Medium';
            strengthText.className = 'text-warning';
            strengthBar.className = 'progress-bar bg-warning';
        } else {
            strengthText.textContent = 'Strong';
            strengthText.className = 'text-success';
            strengthBar.className = 'progress-bar bg-success';
        }

        // Check password confirmation
        if (confirmPassword && password !== confirmPassword) {
            if (confirmPasswordGroup) {
                confirmPasswordGroup.className = 'mb-3 text-danger';
            }
        } else {
            if (confirmPasswordGroup) {
                confirmPasswordGroup.className = 'mb-3';
            }
        }
    }
};

// Form validation
const formValidation = {
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validatePhone: (phone) => {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    },

    validateUsername: (username) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }
};

// Initialize authentication
const initAuth = () => {
    // Set up form event listeners
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', authHandlers.handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', authHandlers.handleRegister);
        
        // Password strength checking
        const passwordInput = document.getElementById('registerPassword');
        const confirmPasswordInput = document.getElementById('registerConfirmPassword');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                passwordUtils.updatePasswordStrength(
                    passwordInput.value,
                    confirmPasswordInput ? confirmPasswordInput.value : ''
                );
            });
        }
        
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                passwordUtils.updatePasswordStrength(
                    passwordInput.value,
                    confirmPasswordInput.value
                );
            });
        }
    }

    // Set up logout button
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', authHandlers.handleLogout);
    }

    // Check auth status
    authHandlers.checkAuthStatus();
};

// Export for global access
window.authState = authState;
window.authAPI = authAPI;
window.authUtils = authUtils;
window.authHandlers = authHandlers;
window.passwordUtils = passwordUtils;
window.formValidation = formValidation;
window.initAuth = initAuth;

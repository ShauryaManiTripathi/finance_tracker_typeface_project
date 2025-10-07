import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors = {
      email: '',
      password: '',
    };

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      // Store token and user data
      login(response.token, response.user);
      
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        toast.error('Invalid email or password');
        setErrors({
          email: '',
          password: 'Invalid credentials',
        });
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back
        </h2>
        <p className="text-gray-600">
          Sign in to continue to your dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              className={`
                block w-full pl-10 pr-3 py-2.5 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:cursor-not-allowed
                ${errors.email ? 'border-red-500' : 'border-gray-300'}
              `}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange('password')}
              disabled={isLoading}
              autoComplete="current-password"
              className={`
                block w-full pl-10 pr-3 py-2.5 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:cursor-not-allowed
                ${errors.password ? 'border-red-500' : 'border-gray-300'}
              `}
            />
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full flex items-center justify-center space-x-2"
          size="lg"
          isLoading={isLoading}
        >
          {!isLoading && (
            <>
              <span>Sign in</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
          {isLoading && <span>Signing in...</span>}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">New to FinanceTracker?</span>
        </div>
      </div>

      {/* Register Link */}
      <div className="text-center">
        <Link
          to="/register"
          className="inline-flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <span>Create an account</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      {/* Demo Credentials */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">💡</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-900 mb-1">Try Demo Account</p>
            <p className="text-xs text-blue-700">Email: demo@example.com</p>
            <p className="text-xs text-blue-700">Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

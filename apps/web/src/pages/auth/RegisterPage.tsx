import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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
      confirmPassword: '',
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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
      });

      // Auto-login after successful registration
      login(response.token, response.user);
      
      toast.success('Account created successfully! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 409) {
        toast.error('An account with this email already exists');
        setErrors({
          ...errors,
          email: 'Email already registered',
        });
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password' | 'confirmPassword') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Password strength indicator
  const passwordRequirements = [
    { label: 'At least 6 characters', met: formData.password.length >= 6 },
    { label: 'Passwords match', met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Create an account
        </h2>
        <p className="text-gray-600">
          Start managing your finances smarter
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
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleInputChange('password')}
              disabled={isLoading}
              autoComplete="new-password"
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

        {/* Confirm Password Input */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              disabled={isLoading}
              autoComplete="new-password"
              className={`
                block w-full pl-10 pr-3 py-2.5 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:cursor-not-allowed
                ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}
              `}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Password Requirements */}
        {formData.password && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2">
                {req.met ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-xs ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full flex items-center justify-center space-x-2"
          size="lg"
          isLoading={isLoading}
        >
          {!isLoading && (
            <>
              <span>Create account</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
          {isLoading && <span>Creating account...</span>}
        </Button>
      </form>

      {/* Terms */}
      <p className="text-xs text-center text-gray-500">
        By creating an account, you agree to our{' '}
        <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Already have an account?</span>
        </div>
      </div>

      {/* Login Link */}
      <div className="text-center">
        <Link
          to="/login"
          className="inline-flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <span>Sign in instead</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;

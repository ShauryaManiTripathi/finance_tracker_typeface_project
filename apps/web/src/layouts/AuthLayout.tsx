import { type ReactNode } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">FinanceTracker</h1>
            </div>
            <p className="text-gray-600 text-sm">
              Smart financial management powered by AI
            </p>
          </div>

          {/* Auth Form */}
          {children}

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2025 FinanceTracker. Built for Typeface.ai</p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 items-center justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="text-4xl font-bold mb-6">
            Take Control of Your Financial Future
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Track expenses, manage budgets, and gain insights with AI-powered receipt scanning and intelligent analytics.
          </p>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Receipt Scanning</h3>
                <p className="text-sm text-blue-100">
                  Automatically extract transaction details from photos
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Analytics</h3>
                <p className="text-sm text-blue-100">
                  Visualize spending patterns with interactive charts
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">PDF Statement Import</h3>
                <p className="text-sm text-blue-100">
                  Import bank statements with AI-powered extraction
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Category Management</h3>
                <p className="text-sm text-blue-100">
                  Organize transactions with custom categories
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">100%</div>
                <div className="text-sm text-blue-100">Free</div>
              </div>
              <div>
                <div className="text-3xl font-bold">AI</div>
                <div className="text-sm text-blue-100">Powered</div>
              </div>
              <div>
                <div className="text-3xl font-bold">∞</div>
                <div className="text-sm text-blue-100">Transactions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

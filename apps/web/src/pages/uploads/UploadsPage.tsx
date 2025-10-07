import { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  ReceiptPercentIcon 
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '../../components/ui/Card';
import ReceiptUploadTab from './ReceiptUploadTab';
import StatementUploadTab from './StatementUploadTab';

type TabType = 'receipt' | 'statement';

const UploadsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('receipt');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload & Extract</h1>
        <p className="text-gray-600 mt-1">
          Upload receipts or bank statements to automatically extract transactions using AI
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CloudArrowUpIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">AI-Powered Extraction</h3>
              <p className="text-sm text-blue-800">
                Our AI automatically extracts transaction details from your receipts and bank statements. 
                You can review and edit the data before saving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'receipt'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ReceiptPercentIcon className="w-5 h-5" />
              Receipt Upload
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'statement'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
              Statement Import
            </button>
          </nav>
        </div>

        <CardContent className="p-6">
          {activeTab === 'receipt' && <ReceiptUploadTab />}
          {activeTab === 'statement' && <StatementUploadTab />}
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadsPage;

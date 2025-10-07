import { 
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '../../components/ui/Card';
import ImportTransactionsPage from './ImportTransactionsPage';

const UploadsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>
        <p className="text-gray-600 mt-1">
          Upload receipts, bank statements, or any transaction document to automatically extract transactions using AI
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CloudArrowUpIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">One Tool for All Your Documents</h3>
              <p className="text-sm text-blue-800">
                Upload any document containing transactions — single receipts, multiple invoices, or full bank statements. 
                Our AI extracts everything automatically, whether it's 1 transaction or 100. You review and import with confidence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <ImportTransactionsPage />
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadsPage;

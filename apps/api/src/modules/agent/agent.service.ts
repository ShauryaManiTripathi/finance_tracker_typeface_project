import { GoogleGenerativeAI, FunctionCall, Tool } from '@google/generative-ai';
import { config } from '../../config';
import { statsService } from '../stats/stats.service';
import { transactionRepository, TransactionFilters, PaginationParams } from '../transactions/transaction.repo';

// Define tool/function declarations for Gemini
// @ts-ignore - Gemini SDK has strict type requirements but these work at runtime
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'getSummary',
        description: 'Get financial summary including total income, total expenses, and net balance for a date range. Use this when user asks about overall financial status, totals, or balance.',
        parameters: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional). If not provided, returns all-time data.'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (optional). If not provided, uses current date.'
            }
          }
        }
      },
      {
        name: 'getExpensesByCategory',
        description: 'Get expenses grouped by category, sorted by amount. Use this when user asks about spending by category, top categories, or category breakdown.',
        parameters: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (optional)'
            }
          }
        }
      },
      {
        name: 'getExpensesOverTime',
        description: 'Get income and expenses over time with specified interval (daily/weekly/monthly). Use this for trend analysis, time-series data, or comparing periods.',
        parameters: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'Time grouping interval. Use daily for short periods (<30 days), weekly for medium (30-90 days), monthly for long periods (>90 days)'
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (optional)'
            }
          },
          required: ['interval']
        }
      },
      {
        name: 'getTransactions',
        description: 'Get list of transactions with optional filtering. Use this when user asks for specific transactions, recent activity, or wants to see transaction details.',
        parameters: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)'
            },
            pageSize: {
              type: 'number',
              description: 'Items per page (default: 20, max: 100)'
            },
            type: {
              type: 'string',
              enum: ['INCOME', 'EXPENSE'],
              description: 'Filter by transaction type'
            },
            categoryId: {
              type: 'string',
              description: 'Filter by category ID'
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format'
            },
            minAmount: {
              type: 'number',
              description: 'Minimum transaction amount'
            },
            maxAmount: {
              type: 'number',
              description: 'Maximum transaction amount'
            },
            search: {
              type: 'string',
              description: 'Search in merchant, description'
            }
          }
        }
      }
    ]
  }
];

// Execute function based on function call from Gemini
async function executeFunctionCall(functionCall: FunctionCall, userId: string): Promise<any> {
  const { name, args } = functionCall;
  const functionArgs = args as any; // Type cast to access dynamic properties
  
  console.log(`Executing function: ${name} with args:`, args);
  console.log(`UserId being passed to function:`, userId);
  
  try {
    switch (name) {
      case 'getSummary': {
        // Convert date strings to Date objects
        const startDate = functionArgs.startDate ? new Date(functionArgs.startDate + 'T00:00:00.000Z') : undefined;
        const endDate = functionArgs.endDate ? new Date(functionArgs.endDate + 'T23:59:59.999Z') : undefined;
        
        console.log(`Calling getSummary with userId: ${userId}, startDate: ${startDate}, endDate: ${endDate}`);
        const result = await statsService.getSummary(userId, startDate, endDate);
        console.log(`getSummary result:`, result);
        return {
          success: true,
          data: result,
          message: `Retrieved financial summary. Income: ₹${result.income}, Expenses: ₹${result.expenses}, Net: ₹${result.net}`
        };
      }
      
      case 'getExpensesByCategory': {
        // Convert date strings to Date objects
        const startDate = functionArgs.startDate ? new Date(functionArgs.startDate + 'T00:00:00.000Z') : undefined;
        const endDate = functionArgs.endDate ? new Date(functionArgs.endDate + 'T23:59:59.999Z') : undefined;
        
        console.log(`Calling getExpensesByCategory with userId: ${userId}, startDate: ${startDate}, endDate: ${endDate}`);
        const result = await statsService.getExpensesByCategory(userId, startDate, endDate);
        console.log(`getExpensesByCategory result (first 3):`, result.slice(0, 3));
        return {
          success: true,
          data: result,
          message: `Retrieved ${result.length} expense categories`
        };
      }
      
      case 'getExpensesOverTime': {
        // Convert date strings to Date objects
        const startDate = functionArgs.startDate ? new Date(functionArgs.startDate + 'T00:00:00.000Z') : undefined;
        const endDate = functionArgs.endDate ? new Date(functionArgs.endDate + 'T23:59:59.999Z') : undefined;
        
        const result = await statsService.getExpensesOverTime(
          userId,
          functionArgs.interval,
          startDate,
          endDate
        );
        return {
          success: true,
          data: result,
          message: `Retrieved ${result.length} data points for ${functionArgs.interval} interval`
        };
      }
      
      case 'getTransactions': {
        // Convert args to proper format
        const filters: TransactionFilters = {
          userId, // Add userId from auth
          type: functionArgs.type,
          categoryId: functionArgs.categoryId,
          minAmount: functionArgs.minAmount,
          maxAmount: functionArgs.maxAmount,
          search: functionArgs.search
        };
        
        // Handle dates - convert to Date objects
        if (functionArgs.startDate) {
          const start = new Date(functionArgs.startDate);
          start.setHours(0, 0, 0, 0);
          filters.startDate = start;
        }
        if (functionArgs.endDate) {
          const end = new Date(functionArgs.endDate);
          end.setHours(23, 59, 59, 999);
          filters.endDate = end;
        }
        
        const pagination: PaginationParams = {
          page: functionArgs.page || 1,
          pageSize: Math.min(functionArgs.pageSize || 20, 100)
        };
        
        const result = await transactionRepository.findMany(filters, pagination);
        return {
          success: true,
          data: result.items,
          pagination: result,
          message: `Retrieved ${result.items.length} transactions (Page ${result.page} of ${result.totalPages})`
        };
      }
      
      default:
        return {
          success: false,
          error: `Unknown function: ${name}`
        };
    }
  } catch (error: any) {
    console.error(`Error executing ${name}:`, error);
    return {
      success: false,
      error: error.message || 'Function execution failed'
    };
  }
}

// Main agent chat service
export async function chat(userId: string, message: string, history: any[] = []) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    tools: tools,
    systemInstruction: `You are a helpful financial assistant analyzing user's personal finance data.
    
You have access to these tools:
- getSummary: Get total income, expenses, and net balance
- getExpensesByCategory: See spending breakdown by categories
- getExpensesOverTime: Analyze trends over time (daily/weekly/monthly)
- getTransactions: View detailed transaction list with filters

CRITICAL RULES:
1. Call each function ONLY ONCE per user query - do not repeat the same function call
2. After receiving function results, IMMEDIATELY provide your response to the user
3. DO NOT call the same function multiple times with the same parameters
4. Use the data you receive from the first function call to answer the user

Date Formatting:
- Always provide dates in YYYY-MM-DD format (e.g., "2025-10-01", "2025-10-07")
- When users mention relative dates like "last month", "this week", "this year", convert them to actual YYYY-MM-DD dates
- Current date is ${new Date().toISOString().split('T')[0]}. Use this as reference for relative dates
- For "this month": use startDate as first day of current month, endDate as today
- For "last month": use startDate and endDate as first and last day of previous month

Response Guidelines:
1. Provide insights, trends, and actionable advice based on the data
2. Format currency amounts in Indian Rupees (₹)
3. Be concise but informative
4. If data shows concerning patterns (high spending, low savings), politely point it out
5. Suggest practical tips for better financial management

Examples:
- "this month" → startDate: "2025-10-01", endDate: "2025-10-08"
- "last 7 days" → startDate: "2025-10-01", endDate: "2025-10-08"
- "September" → startDate: "2025-09-01", endDate: "2025-09-30"`
  });

  // Start chat with history
  const chat = model.startChat({
    history: history,
  });

  let result = await chat.sendMessage(message);
  let response = result.response;
  
  // Handle function calls iteratively with safety limits
  const MAX_ITERATIONS = 5; // Prevent infinite loops
  let iterationCount = 0;
  let functionCalls = response.functionCalls();
  
  while (functionCalls && functionCalls.length > 0 && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    console.log(`Function calls requested: ${functionCalls.length} (iteration ${iterationCount}/${MAX_ITERATIONS})`);
    
    // Execute all function calls
    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall: any) => {
        const functionResult = await executeFunctionCall(functionCall, userId);
        return {
          functionResponse: {
            name: functionCall.name,
            response: functionResult
          }
        };
      })
    );
    
    // Send function results back to model
    result = await chat.sendMessage(functionResponses);
    response = result.response;
    
    // Get next function calls (if any)
    functionCalls = response.functionCalls();
  }
  
  // Check if we hit the iteration limit
  if (iterationCount >= MAX_ITERATIONS) {
    console.warn(`WARNING: Reached maximum function call iterations (${MAX_ITERATIONS})`);
  }
  
  // Return final response
  const finalText = response.text();
  const fullHistory = await chat.getHistory();
  
  return {
    response: finalText,
    history: fullHistory,
    functionCalls: response.functionCalls()?.length || 0
  };
}

export const agentService = {
  chat
};

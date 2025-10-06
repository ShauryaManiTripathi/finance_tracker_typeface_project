import { PrismaClient, TransactionType, CategoryType, TransactionSource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log(`✅ Created user: ${user.email}`);

  // Create default categories
  const incomeCategories = [
    'Salary',
    'Freelancing',
    'Investments',
    'Business',
    'Other Income',
  ];

  const expenseCategories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Insurance',
    'Other Expenses',
  ];

  // Create income categories
  for (const name of incomeCategories) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
      update: {},
      create: {
        name,
        type: CategoryType.INCOME,
        userId: user.id,
      },
    });
  }

  // Create expense categories
  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
      update: {},
      create: {
        name,
        type: CategoryType.EXPENSE,
        userId: user.id,
      },
    });
  }

  console.log(`✅ Created ${incomeCategories.length + expenseCategories.length} categories`);

  // Get categories for sample transactions
  const salaryCategory = await prisma.category.findFirst({
    where: { userId: user.id, name: 'Salary', type: CategoryType.INCOME },
  });

  const foodCategory = await prisma.category.findFirst({
    where: { userId: user.id, name: 'Food & Dining', type: CategoryType.EXPENSE },
  });

  const transportCategory = await prisma.category.findFirst({
    where: { userId: user.id, name: 'Transportation', type: CategoryType.EXPENSE },
  });

  // Create sample transactions
  const sampleTransactions = [
    {
      type: TransactionType.INCOME,
      amount: 50000,
      currency: 'INR',
      occurredAt: new Date('2024-10-01'),
      description: 'Monthly salary',
      merchant: 'TechCorp Inc.',
      source: TransactionSource.MANUAL,
      userId: user.id,
      categoryId: salaryCategory?.id,
    },
    {
      type: TransactionType.EXPENSE,
      amount: 1200,
      currency: 'INR',
      occurredAt: new Date('2024-10-02'),
      description: 'Lunch at restaurant',
      merchant: 'Spice Garden',
      source: TransactionSource.MANUAL,
      userId: user.id,
      categoryId: foodCategory?.id,
    },
    {
      type: TransactionType.EXPENSE,
      amount: 500,
      currency: 'INR',
      occurredAt: new Date('2024-10-03'),
      description: 'Metro travel',
      merchant: 'Delhi Metro',
      source: TransactionSource.MANUAL,
      userId: user.id,
      categoryId: transportCategory?.id,
    },
    {
      type: TransactionType.EXPENSE,
      amount: 2500,
      currency: 'INR',
      occurredAt: new Date('2024-10-04'),
      description: 'Grocery shopping',
      merchant: 'Big Bazaar',
      source: TransactionSource.RECEIPT,
      userId: user.id,
      categoryId: foodCategory?.id,
    },
    {
      type: TransactionType.EXPENSE,
      amount: 800,
      currency: 'INR',
      occurredAt: new Date('2024-10-05'),
      description: 'Coffee and snacks',
      merchant: 'Cafe Coffee Day',
      source: TransactionSource.MANUAL,
      userId: user.id,
      categoryId: foodCategory?.id,
    },
  ];

  for (const transaction of sampleTransactions) {
    await prisma.transaction.create({
      data: transaction,
    });
  }

  console.log(`✅ Created ${sampleTransactions.length} sample transactions`);
  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
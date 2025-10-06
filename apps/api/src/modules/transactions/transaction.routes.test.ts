import request from "supertest";
import app from "../../app";
import { prismaTest as prisma } from "../../__tests__/setup";
import { createAuthenticatedUser } from "../../__tests__/helpers";

describe("Transaction Routes", () => {
  describe("POST /api/transactions", () => {
    it("should create a transaction without category", async () => {
      const { user, token } = await createAuthenticatedUser("txn-create-1@example.com");

      const response = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: "2025-01-01T00:00:00.000Z",
          description: "Test expense",
          merchant: "Test Store",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: "EXPENSE",
        currency: "INR",
        description: "Test expense",
        merchant: "Test Store",
        userId: user.id,
      });
      // Prisma Decimal is returned as string in JSON
      expect(parseFloat(response.body.data.amount)).toBe(100);
      expect(response.body.data.id).toBeDefined();
    });

    it("should create a transaction with category", async () => {
      const { user, token } = await createAuthenticatedUser("txn-create-2@example.com");

      const category = await prisma.category.create({
        data: {
          name: "Test Category",
          type: "EXPENSE",
          userId: user.id,
        },
      });

      const response = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "EXPENSE",
          amount: 50,
          currency: "INR",
          occurredAt: "2025-01-02T00:00:00.000Z",
          categoryId: category.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryId).toBe(category.id);
      expect(response.body.data.category).toMatchObject({
        id: category.id,
        name: "Test Category",
      });
      expect(parseFloat(response.body.data.amount)).toBe(50);
    });

    it("should reject invalid transaction data", async () => {
      const { token } = await createAuthenticatedUser("txn-create-3@example.com");

      const response = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "INVALID_TYPE",
          amount: -50,
        });

      expect(response.status).toBe(400);
    });

    it("should reject transaction with non-existent category", async () => {
      const { token } = await createAuthenticatedUser("txn-create-4@example.com");

      const response = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: "2025-01-01T00:00:00.000Z",
          categoryId: "nonexistent123",
        });

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/transactions")
        .send({
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: "2025-01-01T00:00:00.000Z",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/transactions", () => {
    it("should list all transactions", async () => {
      const { user, token } = await createAuthenticatedUser("txn-list-1@example.com");

      await prisma.transaction.createMany({
        data: [
          {
            type: "EXPENSE",
            amount: 100,
            currency: "INR",
            occurredAt: new Date("2025-01-01"),
            description: "Expense 1",
            userId: user.id,
          },
          {
            type: "INCOME",
            amount: 500,
            currency: "INR",
            occurredAt: new Date("2025-01-02"),
            description: "Income 1",
            userId: user.id,
          },
        ],
      });

      const response = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
      });
    });

    it("should filter transactions by type", async () => {
      const { user, token } = await createAuthenticatedUser("txn-list-2@example.com");

      await prisma.transaction.createMany({
        data: [
          {
            type: "EXPENSE",
            amount: 100,
            currency: "INR",
            occurredAt: new Date(),
            description: "Expense",
            userId: user.id,
          },
          {
            type: "INCOME",
            amount: 200,
            currency: "INR",
            occurredAt: new Date(),
            description: "Income",
            userId: user.id,
          },
        ],
      });

      const response = await request(app)
        .get("/api/transactions")
        .query({ type: "EXPENSE" })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((txn: any) => txn.type === "EXPENSE")).toBe(true);
    });

    it("should support pagination", async () => {
      const { user, token } = await createAuthenticatedUser("txn-list-3@example.com");

      // Create transactions with unique timestamps for stable ordering
      const transactions = [];
      for (let i = 0; i < 25; i++) {
        transactions.push({
          type: "EXPENSE" as const,
          amount: i + 1,
          currency: "INR",
          occurredAt: new Date(Date.now() - i * 1000), // Unique timestamps
          description: `Transaction ${i}`,
          userId: user.id,
        });
      }
      await prisma.transaction.createMany({
        data: transactions,
      });

      const response = await request(app)
        .get("/api/transactions")
        .query({ page: 1, pageSize: 10 })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/transactions");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/transactions/:id", () => {
    it("should get transaction by ID", async () => {
      const { user, token } = await createAuthenticatedUser("txn-get-1@example.com");

      const transaction = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: 200,
          currency: "INR",
          occurredAt: new Date("2025-01-05"),
          description: "Transaction for GET test",
          userId: user.id,
        },
      });

      const response = await request(app)
        .get(`/api/transactions/${transaction.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transaction.id);
    });

    it("should return 404 for non-existent transaction", async () => {
      const { token } = await createAuthenticatedUser("txn-get-2@example.com");

      const response = await request(app)
        .get("/api/transactions/nonexistent123")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/transactions/some-id");
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/transactions/:id", () => {
    it("should update transaction", async () => {
      const { user, token } = await createAuthenticatedUser("txn-update-1@example.com");

      const transaction = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: 150,
          currency: "INR",
          occurredAt: new Date("2025-01-10"),
          description: "Original",
          userId: user.id,
        },
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 175,
          description: "Updated",
        });

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.data.amount)).toBe(175);
      expect(response.body.data.description).toBe("Updated");
    });

    it("should return 404 for non-existent transaction", async () => {
      const { token } = await createAuthenticatedUser("txn-update-2@example.com");

      const response = await request(app)
        .put("/api/transactions/nonexistent123")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 200 });

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put("/api/transactions/some-id")
        .send({ amount: 200 });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should delete transaction", async () => {
      const { user, token } = await createAuthenticatedUser("txn-delete-1@example.com");

      const transaction = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: new Date("2025-01-15"),
          description: "To delete",
          userId: user.id,
        },
      });

      const response = await request(app)
        .delete(`/api/transactions/${transaction.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);

      const deleted = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(deleted).toBeNull();
    });

    it("should return 404 for non-existent transaction", async () => {
      const { token } = await createAuthenticatedUser("txn-delete-2@example.com");

      const response = await request(app)
        .delete("/api/transactions/nonexistent123")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete("/api/transactions/some-id");
      expect(response.status).toBe(401);
    });
  });

  describe("Multi-user isolation", () => {
    it("should not allow user2 to access user1's transaction", async () => {
      const { user: user1, token: token1 } = await createAuthenticatedUser("txn-isolation-1@example.com");
      const { token: token2 } = await createAuthenticatedUser("txn-isolation-2@example.com");

      const transaction = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: new Date(),
          description: "User 1 transaction",
          userId: user1.id,
        },
      });

      const response = await request(app)
        .get(`/api/transactions/${transaction.id}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(response.status).toBe(404);
    });

    it("should not list other user's transactions", async () => {
      const { user: user1 } = await createAuthenticatedUser("txn-isolation-3@example.com");
      const { token: token2 } = await createAuthenticatedUser("txn-isolation-4@example.com");

      await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: 100,
          currency: "INR",
          occurredAt: new Date(),
          description: "User 1 transaction",
          userId: user1.id,
        },
      });

      const response = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });
  });
});

import request from 'supertest';
import app from '../../app';
import { createAuthenticatedUser } from '../../__tests__/helpers';
import { prismaTest } from '../../__tests__/setup';
import { CategoryType } from '@prisma/client';

describe('Category API Integration Tests', () => {
  describe('GET /api/categories', () => {
    it('should return all categories for authenticated user', async () => {
      const { user, token } = await createAuthenticatedUser('list@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter categories by type', async () => {
      const { user, token } = await createAuthenticatedUser('filter@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Salary', type: CategoryType.INCOME, userId: user.id },
          { name: 'Bonus', type: CategoryType.INCOME, userId: user.id },
          { name: 'Food', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const response = await request(app)
        .get('/api/categories?type=INCOME')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((c: any) => c.type === 'INCOME')).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return empty array for user with no categories', async () => {
      const { token } = await createAuthenticatedUser('empty@example.com');

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return a single category', async () => {
      const { user, token } = await createAuthenticatedUser('getone@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Test Category', type: CategoryType.INCOME, userId: user.id },
      });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.id).toBe(category.id);
      expect(response.body.data.name).toBe('Test Category');
    });

    it('should return 404 for non-existent category', async () => {
      const { token } = await createAuthenticatedUser('notfound@example.com');

      const response = await request(app)
        .get('/api/categories/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should return 404 for category belonging to another user', async () => {
      const { user: user1 } = await createAuthenticatedUser('owner@example.com');
      const { token: token2 } = await createAuthenticatedUser('other@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'User1 Category', type: CategoryType.INCOME, userId: user1.id },
      });

      await request(app)
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const { token } = await createAuthenticatedUser('create@example.com');

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Category',
          type: 'EXPENSE',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Category');
      expect(response.body.data.type).toBe('EXPENSE');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 409 for duplicate category name', async () => {
      const { user, token } = await createAuthenticatedUser('duplicate@example.com');

      await prismaTest.category.create({
        data: { name: 'Existing', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'existing', // case insensitive
          type: 'EXPENSE',
        })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
    });

    it('should return 400 for missing name', async () => {
      const { token } = await createAuthenticatedUser('missingname@example.com');

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'EXPENSE',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 400 for invalid type', async () => {
      const { token } = await createAuthenticatedUser('invalidtype@example.com');

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          type: 'INVALID',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/categories')
        .send({
          name: 'Test',
          type: 'EXPENSE',
        })
        .expect(401);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category name', async () => {
      const { user, token } = await createAuthenticatedUser('update@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Old Name', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.data.name).toBe('New Name');
    });

    it('should update category type', async () => {
      const { user, token } = await createAuthenticatedUser('updatetype@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Changeable', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'INCOME' })
        .expect(200);

      expect(response.body.data.type).toBe('INCOME');
    });

    it('should return 404 for non-existent category', async () => {
      const { token } = await createAuthenticatedUser('updatenotfound@example.com');

      await request(app)
        .put('/api/categories/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 409 for duplicate name', async () => {
      const { user, token } = await createAuthenticatedUser('updatedup@example.com');

      await prismaTest.category.createMany({
        data: [
          { name: 'Existing', type: CategoryType.EXPENSE, userId: user.id },
          { name: 'ToUpdate', type: CategoryType.EXPENSE, userId: user.id },
        ],
      });

      const toUpdate = await prismaTest.category.findFirst({
        where: { name: 'ToUpdate', userId: user.id },
      });

      const response = await request(app)
        .put(`/api/categories/${toUpdate!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Existing' })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
    });

    it('should return 400 if no fields provided', async () => {
      const { user, token } = await createAuthenticatedUser('updateempty@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'Test', type: CategoryType.EXPENSE, userId: user.id },
      });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      const { user, token } = await createAuthenticatedUser('delete@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'To Delete', type: CategoryType.EXPENSE, userId: user.id },
      });

      await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const found = await prismaTest.category.findUnique({
        where: { id: category.id },
      });

      expect(found).toBeNull();
    });

    it('should return 409 if category is in use', async () => {
      const { user, token } = await createAuthenticatedUser('deleteinuse@example.com');

      const category = await prismaTest.category.create({
        data: { name: 'In Use', type: CategoryType.EXPENSE, userId: user.id },
      });

      await prismaTest.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: 100,
          occurredAt: new Date(),
          description: 'Test',
          userId: user.id,
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toContain('Cannot delete category');
    });

    it('should return 404 for non-existent category', async () => {
      const { token } = await createAuthenticatedUser('deletenotfound@example.com');

      await request(app)
        .delete('/api/categories/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/categories/some-id')
        .expect(401);
    });
  });
});

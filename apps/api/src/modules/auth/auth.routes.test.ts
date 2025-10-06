import request from 'supertest';
import app from '../../app';
import { createAuthenticatedUser, createTestUser } from '../../__tests__/helpers';
import { prismaTest } from '../../__tests__/setup';

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 409 if email already exists', async () => {
      const email = 'existing@example.com';
      await createTestUser(email);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('password'),
          }),
        ])
      );
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = 'login@example.com';
      const password = 'password123';
      await createTestUser(email, password);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(email);
      expect(typeof response.body.data.token).toBe('string');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 401 for incorrect password', async () => {
      const email = 'wrongpass@example.com';
      await createTestUser(email, 'correctpassword');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const { user, token } = await createAuthenticatedUser('me@example.com');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', user.id);
      expect(response.body.data).toHaveProperty('email', user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toContain('Missing or invalid');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toContain('Invalid token');
    });

    it('should return 401 without Bearer prefix', async () => {
      const { token } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 404 if user was deleted', async () => {
      const { user, token } = await createAuthenticatedUser('deleted@example.com');

      // Delete the user
      await prismaTest.user.delete({ where: { id: user.id } });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      const email = 'fullflow@example.com';
      const password = 'password123';

      // Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      const { user: registeredUser, token: registerToken } = registerResponse.body.data;

      // Use token from registration to get profile
      const profileResponse1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(profileResponse1.body.data.id).toBe(registeredUser.id);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      const { token: loginToken } = loginResponse.body.data;

      // Use token from login to get profile
      const profileResponse2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse2.body.data.id).toBe(registeredUser.id);
    });
  });
});

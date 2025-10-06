import { authService } from './auth.service';
import { prismaTest } from '../../__tests__/setup';
import { createTestUser } from '../../__tests__/helpers';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user and return user data with token', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';

      const result = await authService.register({ email, password });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(email);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('createdAt');
      expect(typeof result.token).toBe('string');

      // Verify user was created in database
      const dbUser = await prismaTest.user.findUnique({
        where: { email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(email);
      
      // Verify password was hashed
      const passwordMatch = await bcrypt.compare(password, dbUser!.password);
      expect(passwordMatch).toBe(true);
    });

    it('should throw error if email already exists', async () => {
      const email = 'duplicate@example.com';
      await createTestUser(email);

      await expect(
        authService.register({ email, password: 'password123' })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should hash the password', async () => {
      const email = 'hashtest@example.com';
      const password = 'mySecurePassword';

      await authService.register({ email, password });

      const user = await prismaTest.user.findUnique({
        where: { email },
      });

      expect(user?.password).not.toBe(password);
      expect(user?.password.length).toBeGreaterThan(password.length);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const email = 'login@example.com';
      const password = 'password123';
      await createTestUser(email, password);

      const result = await authService.login({ email, password });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(email);
      expect(typeof result.token).toBe('string');
    });

    it('should throw error with invalid email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      const email = 'wrongpass@example.com';
      await createTestUser(email, 'correctpassword');

      await expect(
        authService.login({ email, password: 'wrongpassword' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should be case-insensitive for email', async () => {
      const email = 'CaseSensitive@example.com';
      const password = 'password123';
      await createTestUser(email.toLowerCase(), password);

      const result = await authService.login({ email, password });

      expect(result.user.email).toBe(email.toLowerCase());
    });
  });

  describe('getProfile', () => {
    it('should return user profile for valid userId', async () => {
      const user = await createTestUser('profile@example.com');

      const profile = await authService.getProfile(user.id);

      expect(profile).toHaveProperty('id', user.id);
      expect(profile).toHaveProperty('email', user.email);
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');
    });

    it('should throw error for non-existent userId', async () => {
      await expect(
        authService.getProfile('non-existent-id')
      ).rejects.toThrow('User not found');
    });

    it('should not return password in profile', async () => {
      const user = await createTestUser('nopass@example.com');

      const profile = await authService.getProfile(user.id);

      expect(profile).not.toHaveProperty('password');
    });
  });
});

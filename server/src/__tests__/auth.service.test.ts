jest.mock('../models/User');
jest.mock('bcryptjs');

import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { registerUser, loginUser, signToken, verifyToken } from '../services/auth.service';
import { AppError } from '../utils/AppError';

const mockedUser = User as jest.Mocked<typeof User>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('registerUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects registration when the email is already taken', async () => {
    (mockedUser.findOne as jest.Mock).mockResolvedValueOnce({ email: 'a@b.com' });

    await expect(registerUser('Alice', 'a@b.com', 'password123')).rejects.toThrow('already exists');
  });

  it('hashes the password and creates the user', async () => {
    (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(null);
    (mockedBcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');
    (mockedUser.create as jest.Mock).mockResolvedValueOnce({ name: 'Alice', email: 'a@b.com' });

    const user = await registerUser('Alice', 'a@b.com', 'password123');

    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed-password' })
    );
    expect(user).toEqual({ name: 'Alice', email: 'a@b.com' });
  });
});

describe('loginUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects when the user does not exist', async () => {
    const selectMock = jest.fn().mockResolvedValueOnce(null);
    (mockedUser.findOne as jest.Mock).mockReturnValueOnce({ select: selectMock });

    await expect(loginUser('nobody@example.com', 'password')).rejects.toThrow(AppError);
  });

  it('rejects when the password does not match', async () => {
    const selectMock = jest.fn().mockResolvedValueOnce({ passwordHash: 'hashed' });
    (mockedUser.findOne as jest.Mock).mockReturnValueOnce({ select: selectMock });
    (mockedBcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(loginUser('a@b.com', 'wrong-password')).rejects.toThrow('Invalid email or password');
  });

  it('returns a user and token on success', async () => {
    const fakeUser = { _id: { toString: () => 'user-id-1' }, passwordHash: 'hashed' };
    const selectMock = jest.fn().mockResolvedValueOnce(fakeUser);
    (mockedUser.findOne as jest.Mock).mockReturnValueOnce({ select: selectMock });
    (mockedBcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const { user, token } = await loginUser('a@b.com', 'correct-password');

    expect(user).toBe(fakeUser);
    expect(typeof token).toBe('string');
    expect(verifyToken(token).userId).toBe('user-id-1');
  });
});

describe('JWT helpers', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ userId: 'abc123' });
    const payload = verifyToken(token);
    expect(payload.userId).toBe('abc123');
  });

  it('throws AppError for an invalid token', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow(AppError);
  });
});

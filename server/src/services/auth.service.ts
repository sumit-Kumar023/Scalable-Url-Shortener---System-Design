import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

const SALT_ROUNDS = 10;

export interface AuthTokenPayload {
  userId: string;
}

export async function registerUser(name: string, email: string, password: string): Promise<IUser> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    return user;
  } catch (err: any) {
    // Defends against a race between the findOne check above and the
    // insert below - the unique index on `email` is the real guarantee.
    if (err?.code === 11000) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: IUser; token: string }> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = signToken({ userId: user._id.toString() });
  return { user, token };
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  }
}

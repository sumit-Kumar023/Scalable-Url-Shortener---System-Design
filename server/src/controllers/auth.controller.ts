import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { registerUser, loginUser } from '../services/auth.service';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const register = asyncHandler(async (req, res: Response) => {
  const { name, email, password } = req.body;
  const user = await registerUser(name, email, password);
  res.status(201).json({ success: true, data: { user: user.toJSON() } });
});

export const login = asyncHandler(async (req, res: Response) => {
  const { email, password } = req.body;
  const { user, token } = await loginUser(email, password);
  res.status(200).json({ success: true, data: { user: user.toJSON(), token } });
});

// Stateless JWT auth: "logout" has no server-side session to destroy.
// The endpoint exists for API completeness/UX; the client discards the
// token. (A token-blocklist in Redis is a documented future improvement.)
export const logout = asyncHandler(async (_req, res: Response) => {
  res.status(200).json({ success: true, data: { message: 'Logged out' } });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  res.status(200).json({ success: true, data: { user: user.toJSON() } });
});

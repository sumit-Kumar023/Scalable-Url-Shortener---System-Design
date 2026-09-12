import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { resolveExpiration } from '../validators/url.validator';
import {
  createShortUrl,
  listUrlsForUser,
  getUrlForUser,
  updateUrlForUser,
  deleteUrlForUser,
} from '../services/url.service';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

function toPublicShape(doc: any) {
  return {
    id: doc._id,
    originalUrl: doc.originalUrl,
    shortCode: doc.shortCode,
    shortUrl: `${env.BASE_URL}/${doc.shortCode}`,
    customAlias: doc.customAlias ?? null,
    expiresAt: doc.expiresAt,
    isExpired: doc.expiresAt ? new Date(doc.expiresAt).getTime() < Date.now() : false,
    clickCount: doc.clickCount,
    createdAt: doc.createdAt,
    lastClickedAt: doc.lastClickedAt,
    isActive: doc.isActive,
  };
}

export const createUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { originalUrl, customAlias, expiresAt } = req.body;
  let expiration: Date | null;
  try {
    expiration = resolveExpiration(expiresAt);
  } catch (err: any) {
    throw AppError.badRequest(err.message, 'INVALID_EXPIRATION');
  }

  const doc = await createShortUrl({
    userId: req.userId!,
    originalUrl,
    customAlias,
    expiresAt: expiration,
  });

  res.status(201).json({ success: true, data: toPublicShape(doc) });
});

export const listUrls = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const docs = await listUrlsForUser(req.userId!);
  res.status(200).json({ success: true, data: docs.map(toPublicShape) });
});

export const getUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doc = await getUrlForUser(req.userId!, req.params.id);
  res.status(200).json({ success: true, data: toPublicShape(doc) });
});

export const updateUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { originalUrl, expiresAt, isActive } = req.body;
  let expiration: Date | null | undefined;
  if (expiresAt !== undefined) {
    try {
      expiration = resolveExpiration(expiresAt);
    } catch (err: any) {
      throw AppError.badRequest(err.message, 'INVALID_EXPIRATION');
    }
  }
  const doc = await updateUrlForUser(req.userId!, req.params.id, {
    originalUrl,
    expiresAt: expiration,
    isActive,
  });
  res.status(200).json({ success: true, data: toPublicShape(doc) });
});

export const deleteUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await deleteUrlForUser(req.userId!, req.params.id);
  res.status(204).send();
});

export const getUrlAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doc = await getUrlForUser(req.userId!, req.params.id);
  res.status(200).json({
    success: true,
    data: {
      id: doc._id,
      shortCode: doc.shortCode,
      shortUrl: `${env.BASE_URL}/${doc.shortCode}`,
      totalClicks: doc.clickCount,
      lastClickedAt: doc.lastClickedAt,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      isActive: doc.isActive,
    },
  });
});

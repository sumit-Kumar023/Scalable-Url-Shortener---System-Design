import { Schema, model, Document, Types } from 'mongoose';

export interface IShortUrl extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  originalUrl: string;
  shortCode: string;
  customAlias?: string;
  expiresAt?: Date | null;
  clickCount: number;
  createdAt: Date;
  lastClickedAt?: Date | null;
  isActive: boolean;
}

const shortUrlSchema = new Schema<IShortUrl>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  customAlias: { type: String, default: null },
  expiresAt: { type: Date, default: null, index: true },
  clickCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastClickedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
});

// Unique index on shortCode is the FINAL protection against race-condition
// collisions - see services/shortCode.service.ts for the full explanation.
shortUrlSchema.index({ shortCode: 1 }, { unique: true });
shortUrlSchema.index({ userId: 1, createdAt: -1 });

// TTL index: MongoDB will eventually purge documents past expiresAt.
// This is a HOUSEKEEPING mechanism only. Because TTL cleanup runs on a
// background sweep (roughly every 60s) it is NOT guaranteed to have
// deleted an expired document by the exact moment it expires, so the
// redirect handler independently checks `expiresAt` before responding.
// expireAfterSeconds: 0 means "expire at the time stored in the field".
shortUrlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShortUrl = model<IShortUrl>('ShortUrl', shortUrlSchema);

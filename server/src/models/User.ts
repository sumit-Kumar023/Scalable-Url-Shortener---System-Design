import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
});

// toJSON transform ensures passwordHash is never accidentally serialized,
// even if a query forgets to .select('-passwordHash').
userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);

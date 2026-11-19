import { Schema, Types } from 'mongoose';
export const PRODUCT_MODEL = 'Product';
export interface ProductRecord { _id: Types.ObjectId; name: string; priceMinor: number; stock: number; description?: string; category?: string; createdAt: Date; updatedAt: Date; }
const safeInteger = { validator: (value: number) => Number.isSafeInteger(value), message: 'Must be a safe integer' };
export const ProductSchema = new Schema<ProductRecord>({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 }, description: { type: String, maxlength: 2000 }, category: { type: String, maxlength: 80 },
  priceMinor: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: safeInteger }, stock: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, validate: safeInteger },
}, { collection: 'products', timestamps: true, versionKey: false, strict: 'throw' });
ProductSchema.index({ createdAt: -1, _id: -1 });
ProductSchema.index({ category: 1, createdAt: -1, _id: -1 });
ProductSchema.index({ name: 1, _id: 1 });
// Sort + identifier tie-break indexes; category equality precedes the same order.
for (const field of ['priceMinor', 'stock', 'updatedAt'] as const) {
  ProductSchema.index({ [field]: 1, _id: 1 });
  ProductSchema.index({ category: 1, [field]: 1, _id: 1 });
}
ProductSchema.index({ category: 1, name: 1, _id: 1 });

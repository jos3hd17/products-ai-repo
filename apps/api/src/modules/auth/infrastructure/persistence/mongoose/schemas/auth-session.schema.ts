import { Schema } from 'mongoose';
export interface AuthSessionRecord {
  _id:string;userId:string;refreshTokenHash:string;previousTokenHashes:string[];tokenFamilyId:string;
  createdAt:Date;updatedAt:Date;expiresAt:Date;revokedAt:Date|null;version:number;
}
export const AuthSessionSchema=new Schema<AuthSessionRecord>({
  _id:{type:String,required:true},userId:{type:String,required:true},refreshTokenHash:{type:String,required:true,match:/^[a-f0-9]{64}$/},
  previousTokenHashes:{type:[String],default:[]},tokenFamilyId:{type:String,required:true},expiresAt:{type:Date,required:true},revokedAt:{type:Date,default:null},version:{type:Number,min:0,max:1000,default:0}
},{collection:'auth_sessions',timestamps:true,versionKey:false});
AuthSessionSchema.index({refreshTokenHash:1},{unique:true});
AuthSessionSchema.index({previousTokenHashes:1});
AuthSessionSchema.index({tokenFamilyId:1},{unique:true});
AuthSessionSchema.index({userId:1,revokedAt:1});
AuthSessionSchema.index({expiresAt:1},{expireAfterSeconds:0});

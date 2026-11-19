import { Schema } from 'mongoose';
export interface UserRecord { _id:string;email:string;passwordHash:string;createdAt:Date;updatedAt:Date; }
export const UserSchema=new Schema<UserRecord>({_id:{type:String,required:true},email:{type:String,required:true,lowercase:true,trim:true,maxLength:254},passwordHash:{type:String,required:true}},{collection:'users',timestamps:true,versionKey:false});
UserSchema.index({email:1},{unique:true});

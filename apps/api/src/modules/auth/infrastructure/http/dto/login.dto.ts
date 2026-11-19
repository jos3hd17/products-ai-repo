import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
export class LoginDto {
  @ApiProperty({type:String,format:'email',maxLength:254,example:'demo@example.test',description:'Trimmed and lowercased before validation. Example is not a seeded account.'})
  @Transform(({value}: {value:unknown})=>typeof value==='string' ? value.trim().toLowerCase():value)
  @IsEmail() @MaxLength(254) email!:string;
  @ApiProperty({type:String,format:'password',minLength:1,maxLength:128,writeOnly:true,example:'DOCUMENTATION-ONLY-password',description:'Login accepts1..128 characters; seed separately requires12..128. No actual credentials included.'})
  @IsString() @MinLength(1) @MaxLength(128) password!:string;
}

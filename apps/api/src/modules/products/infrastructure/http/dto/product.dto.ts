import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
export class CreateProductDto {
  @ApiProperty({type:String,minLength:1,maxLength:120,example:'Organic seed',description:'Trimmed before validation; nonempty after trimming.'})
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiProperty({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:1299,description:'Safe integer in two-decimal minor units; no floating-point amounts.'})
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) priceMinor!: number;
  @ApiProperty({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:3})
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) stock!: number;
  @ApiPropertyOptional({type:String,maxLength:2000,example:'Demonstration product',description:'Optional, trimmed before validation; null is rejected.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({type:String,maxLength:80,example:'Seeds',description:'Optional, trimmed; null is rejected.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(80) category?: string;
}
export class UpdateProductDto {
  @ApiPropertyOptional({type:String,minLength:1,maxLength:120,example:'Organic seed',description:'Trimmed before validation; nonempty after trimming.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @ApiPropertyOptional({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:1299,description:'Safe integer in two-decimal minor units; no floating-point amounts.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) priceMinor?: number;
  @ApiPropertyOptional({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:3})
  @ValidateIf((_object, value: unknown) => value !== undefined) @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) stock?: number;
  @ApiPropertyOptional({type:String,maxLength:2000,example:'Demonstration product',description:'Optional, trimmed before validation; null is rejected.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({type:String,maxLength:80,example:'Seeds',description:'Optional, trimmed; null is rejected.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(80) category?: string;
}

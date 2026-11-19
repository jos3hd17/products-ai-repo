import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { PRODUCT_SORT_FIELDS, ProductSortField } from '../../../domain/ports/product.repository.port';
const numeric = ({ value }: { value: unknown }): unknown => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
export class ListProductsDto {
  @ApiPropertyOptional({type:'integer',minimum:1,maximum:10000,default:1})
  @Transform(numeric) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({type:'integer',minimum:1,maximum:100,default:20})
  @Transform(numeric) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @ApiPropertyOptional({type:String,maxLength:120,description:'Case-insensitive literal substring on name; regex metacharacters are escaped. Trimmed before bounds.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(120) search?: string;
  @ApiPropertyOptional({type:String,maxLength:80,description:'Exact category after trimming; omit to include all.'})
  @ValidateIf((_object, value: unknown) => value !== undefined) @Transform(trim) @IsString() @MaxLength(80) category?: string;
  @ApiPropertyOptional({type:String,enum:PRODUCT_SORT_FIELDS,default:'createdAt'})
  @IsIn(PRODUCT_SORT_FIELDS) sortBy: ProductSortField = 'createdAt';
  @ApiPropertyOptional({type:String,enum:['asc','desc'],default:'desc'})
  @IsIn(['asc', 'desc']) sortDirection: 'asc' | 'desc' = 'desc';
}

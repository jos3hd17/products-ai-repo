import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ProductResponseDto {
  @ApiProperty({type:String,pattern:'^[a-fA-F0-9]{24}$',example:'0123456789abcdef01234567'}) id!:string;
  @ApiProperty({type:String,minLength:1,maxLength:120,example:'Organic seed'}) name!:string;
  @ApiPropertyOptional({type:String,maxLength:2000,example:'Demonstration product'}) description?:string;
  @ApiProperty({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:1299,description:'Integer minor units;1299 represents12.99 at the documented two-decimal convention. No currency conversion.'}) priceMinor!:number;
  @ApiProperty({type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER,example:3}) stock!:number;
  @ApiPropertyOptional({type:String,maxLength:80,example:'Seeds'}) category?:string;
  @ApiProperty({type:String,format:'date-time',example:'2026-11-19T00:00:00.000Z'}) createdAt!:string;
  @ApiProperty({type:String,format:'date-time',example:'2026-11-19T00:00:00.000Z'}) updatedAt!:string;
}
export class AppliedProductFiltersDto {
  @ApiProperty({type:String,nullable:true,maxLength:120,description:'Normalized literal name search; null when omitted.'}) search!:string|null;
  @ApiProperty({type:String,nullable:true,maxLength:80,description:'Normalized exact category; null when omitted.'}) category!:string|null;
  @ApiProperty({type:String,enum:['name','priceMinor','stock','createdAt','updatedAt']}) sortBy!:string;
  @ApiProperty({type:String,enum:['asc','desc']}) sortDirection!:string;
}
export class ProductPageResponseDto {
  @ApiProperty({type:'integer',minimum:0,maximum:100,description:'Number of items in this response, distinct from total matching items.'}) itemCount!:number;
  @ApiProperty({type:AppliedProductFiltersDto}) filters!:AppliedProductFiltersDto;
  @ApiProperty({type:[ProductResponseDto]}) items!:ProductResponseDto[];
  @ApiProperty({type:'integer',minimum:0,example:1}) total!:number;
  @ApiProperty({type:'integer',minimum:1,maximum:10000,example:1}) page!:number;
  @ApiProperty({type:'integer',minimum:1,maximum:100,example:20}) pageSize!:number;
  @ApiProperty({type:'integer',minimum:0,example:1,description:'ceil(total/pageSize);0 when empty. A page beyond the last returns empty items.'}) totalPages!:number;
}
export class TokenResponseDto {
  @ApiProperty({type:String,example:'ACCESS_JWT_RETURNED_BY_LOGIN',description:'Illustrative placeholder; real access tokens are signed HS256 JWTs.'}) accessToken!:string;
  @ApiProperty({type:String,enum:['Bearer'],example:'Bearer'}) tokenType!:'Bearer';
  @ApiProperty({type:'integer',minimum:1,maximum:3600,example:900,description:'Configured access lifetime in seconds; default900.'}) expiresIn!:number;
}
export class CurrentUserResponseDto {
  @ApiProperty({type:String,example:'4d3489de-ccda-4d1b-b722-05384763e81e',description:'Opaque user identifier; seed generates UUIDs.'}) id!:string;
  @ApiProperty({type:String,format:'email',example:'demo@example.test'}) email!:string;
  @ApiProperty({type:String,format:'date-time',example:'2026-11-19T00:00:00.000Z'}) createdAt!:string;
  @ApiProperty({type:String,format:'date-time',example:'2026-11-19T00:00:00.000Z'}) updatedAt!:string;
}
export class ApiErrorResponseDto {
  @ApiProperty({type:'integer',example:400}) statusCode!:number;
  @ApiProperty({type:String,enum:['INVALID_INPUT','UNAUTHORIZED','FORBIDDEN','NOT_FOUND','CONFLICT','PAYLOAD_TOO_LARGE','RATE_LIMITED','INTERNAL_ERROR','REQUEST_FAILED'],example:'INVALID_INPUT'}) code!:string;
  @ApiProperty({oneOf:[{type:'string'},{type:'array',items:{type:'string'}}],example:['stock must not be less than 0']}) message!:string|string[];
  @ApiProperty({type:String,format:'uuid',nullable:true,example:'4d3489de-ccda-4d1b-b722-05384763e81e'}) correlationId!:string|null;
}

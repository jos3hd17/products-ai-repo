import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './response.dto';
export const CORRELATION_HEADERS = {'X-Correlation-Id':{description:'Server-generated request correlation UUID.',schema:{type:'string',format:'uuid'}}};
export const SET_COOKIE_HEADERS = {...CORRELATION_HEADERS,'Set-Cookie':{description:'HttpOnly refresh_token cookie; Path=/auth; configured SameSite; Secure in production. Login/refresh use remaining family expiry; logout clears it. Browser-managed, never copy into JSON/localStorage.',schema:{type:'string'}}};
export function ApiErrors(...statuses:number[]) {
  const descriptions:Record<number,string>={400:'Invalid input; unknown properties and invalid types are rejected.',401:'Missing/invalid/expired authentication or refresh session; invalid credentials are generic.',403:'Origin or CSRF header rejected.',404:'Valid product identifier not found.',413:'JSON body exceeds32kb.',429:'Per-handler/IP rate limit exceeded; thresholds are environment-configured.',500:'Unexpected failure; provider details are never returned.'};
  return applyDecorators(...statuses.map(status=>ApiResponse({status,type:ApiErrorResponseDto,description:descriptions[status],headers:status===429?{...CORRELATION_HEADERS,'Retry-After':{description:'Seconds until retry is allowed.',schema:{type:'integer',minimum:0}}}:CORRELATION_HEADERS})));
}
export function ApiCookieRequestHeaders() {
  return applyDecorators(
    ApiHeader({name:'Origin',required:true,schema:{type:'string'},example:'http://localhost:4200',description:'Exact configured CORS origin. Browsers control this forbidden header automatically; allow the Swagger UI origin explicitly for Try it out.'}),
    ApiHeader({name:'X-CSRF-Protection',required:true,schema:{type:'string',enum:['1']},example:'1',description:'Required independently of CORS, on login/refresh/logout.'}),
  );
}

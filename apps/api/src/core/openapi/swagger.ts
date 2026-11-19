import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SchemaObject, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponseDto, CurrentUserResponseDto, ProductPageResponseDto, ProductResponseDto, TokenResponseDto } from './response.dto';

export function createApiDocument(app:INestApplication):OpenAPIObject {
  const config=new DocumentBuilder().setTitle('Product Management API').setVersion('0.1.0').setOpenAPIVersion('3.0.3')
    .setDescription('Actual NestJS/CQRS assessment backend. Product priceMinor uses safe integer minor units. No registration. Access JWT plus rotating HttpOnly refresh cookie; Origin and CSRF header required on auth mutations. Examples are synthetic; no credentials or live tokens are exported.')
    .addServer('/','Same API origin; no /api prefix')
    .addTag('auth','Login, safe current user, refresh rotation and logout')
    .addTag('products','Bearer-protected product CRUD and bounded server pagination')
    .addBearerAuth({type:'http',scheme:'bearer',bearerFormat:'JWT',description:'HS256 access JWT; validated signature/issuer/audience/expiration. Paste only the access token.'},'access-token')
    .addCookieAuth('refresh_token',{type:'apiKey',in:'cookie',description:'Browser-managed opaque refresh token. HttpOnly; never place in localStorage or JSON. Login sets it; refresh rotates; logout clears.'},'refresh-cookie').build();
  const document=SwaggerModule.createDocument(app,config,{extraModels:[ApiErrorResponseDto,CurrentUserResponseDto,ProductPageResponseDto,ProductResponseDto,TokenResponseDto]});
  const schemas=document.components?.schemas ?? {};
  for (const [name,entry] of Object.entries(schemas)) {
    if ('$ref' in entry) continue;
    // Global whitelist rejects unknown request properties; safe response shapes are closed too.
    entry.additionalProperties=false;
    if (name==='UpdateProductDto') entry.minProperties=1;
    if (['CreateProductDto','UpdateProductDto','LoginDto','ListProductsDto'].includes(name)) {
      for (const [field,schema] of Object.entries(entry.properties ?? {})) {
        if ('$ref' in schema) continue;
        if (['name','description','category','search','email'].includes(field)) Object.assign(schema,{'x-normalization':field==='email'?'trim-and-lowercase-before-validation':'trim-before-validation'});
        if (field==='name') schema.pattern='\\S';
      }
    }
  }
  // Union reflection is erased by TypeScript; make the exact wire error union explicit.
  const error=schemas.ApiErrorResponseDto as SchemaObject|undefined;
  if(error?.properties) error.properties.message={oneOf:[{type:'string'},{type:'array',items:{type:'string'}}],example:['stock must not be less than 0']};
  return document;
}
export function setupSwagger(app:INestApplication):boolean {
  const config=app.get(ConfigService);
  if(config.getOrThrow<string>('NODE_ENV')==='production'||!config.getOrThrow<boolean>('SWAGGER_ENABLED')) return false;
  SwaggerModule.setup('docs',app,()=>createApiDocument(app),{raw:['json'],jsonDocumentUrl:'/docs/openapi.json',customSiteTitle:'Product Management API',
    swaggerOptions:{persistAuthorization:false,withCredentials:true,validatorUrl:null,requestInterceptor:(request:{url:string;headers:Record<string,string>;credentials?:string})=>{
      if(/^\/auth\/(login|refresh|logout)$/.test(new URL(request.url,'http://documentation.invalid').pathname)) request.headers['X-CSRF-Protection']='1';
      request.credentials='include';return request;
    }}});
  return true;
}

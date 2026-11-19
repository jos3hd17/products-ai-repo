import { validateEnvironment } from './environment';
const base = {MONGODB_URI:'mongodb://127.0.0.1:27017/unit',JWT_SECRET:'synthetic-test-only-signing-secret-32bytes'};
it('validates and transforms bounded environment configuration',()=>{
  const config=validateEnvironment(base); expect(config.PORT).toBe(3000);expect(config.CORS_ORIGINS).toEqual(['http://localhost:4200']);
});
it.each([{JWT_SECRET:'short'},{PORT:'-1'},{CORS_ORIGINS:'*'},{COOKIE_SAME_SITE:'none'},{ACCESS_TOKEN_TTL_SECONDS:'1.5'},{NODE_ENV:'production',CORS_ORIGINS:'http://localhost:4200'}])('rejects unsafe configuration %p', patch=>expect(()=>validateEnvironment({...base,...patch})).toThrow());

it('enables Swagger only by policy and validates explicit overrides',()=>{
 expect(validateEnvironment(base).SWAGGER_ENABLED).toBe(true);
 expect(validateEnvironment({...base,NODE_ENV:'test'}).SWAGGER_ENABLED).toBe(false);
 expect(validateEnvironment({...base,NODE_ENV:'development',SWAGGER_ENABLED:'false'}).SWAGGER_ENABLED).toBe(false);
 expect(()=>validateEnvironment({...base,SWAGGER_ENABLED:'yes'})).toThrow();
 expect(()=>validateEnvironment({...base,NODE_ENV:'production',CORS_ORIGINS:'https://example.test',SWAGGER_ENABLED:'true'})).toThrow();
 expect(validateEnvironment({...base,NODE_ENV:'production',CORS_ORIGINS:'https://example.test'}).SWAGGER_ENABLED).toBe(false);
});

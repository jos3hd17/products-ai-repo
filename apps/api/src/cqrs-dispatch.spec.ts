import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CqrsModule, CommandBus, QueryBus } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT } from './modules/products/domain/ports/product.repository.port';
import { USER_REPOSITORY_PORT, SESSION_REPOSITORY_PORT } from './modules/auth/domain/ports/auth-repositories.port';
import { ACCESS_TOKEN_PORT, PASSWORD_HASHER_PORT, REFRESH_TOKEN_PORT, CLOCK_PORT, ID_GENERATOR_PORT, AUTH_SESSION_TTL_SECONDS } from './modules/auth/domain/ports/auth-security.port';
import { CreateProductHandler } from './modules/products/application/commands/create-product/create-product.handler';
import { CreateProductCommand } from './modules/products/application/commands/create-product/create-product.command';
import { CreateProductUseCase } from './modules/products/application/use-cases/create-product.use-case';
import { UpdateProductHandler } from './modules/products/application/commands/update-product/update-product.handler';
import { UpdateProductCommand } from './modules/products/application/commands/update-product/update-product.command';
import { UpdateProductUseCase } from './modules/products/application/use-cases/update-product.use-case';
import { DeleteProductHandler } from './modules/products/application/commands/delete-product/delete-product.handler';
import { DeleteProductCommand } from './modules/products/application/commands/delete-product/delete-product.command';
import { DeleteProductUseCase } from './modules/products/application/use-cases/delete-product.use-case';
import { GetProductHandler } from './modules/products/application/queries/get-product/get-product.handler';
import { GetProductQuery } from './modules/products/application/queries/get-product/get-product.query';
import { GetProductByIdUseCase } from './modules/products/application/use-cases/get-product-by-id.use-case';
import { ListProductsHandler } from './modules/products/application/queries/list-products/list-products.handler';
import { ListProductsQuery } from './modules/products/application/queries/list-products/list-products.query';
import { ListProductsUseCase } from './modules/products/application/use-cases/list-products.use-case';
import { LoginHandler } from './modules/auth/application/commands/login/login.handler';
import { LoginCommand } from './modules/auth/application/commands/login/login.command';
import { LoginUseCase } from './modules/auth/application/use-cases/login.use-case';
import { RefreshTokenHandler } from './modules/auth/application/commands/refresh-token/refresh-token.handler';
import { RefreshTokenCommand } from './modules/auth/application/commands/refresh-token/refresh-token.command';
import { RefreshTokenUseCase } from './modules/auth/application/use-cases/refresh-token.use-case';
import { LogoutHandler } from './modules/auth/application/commands/logout/logout.handler';
import { LogoutCommand } from './modules/auth/application/commands/logout/logout.command';
import { LogoutUseCase } from './modules/auth/application/use-cases/logout.use-case';
import { GetCurrentUserHandler } from './modules/auth/application/queries/get-current-user/get-current-user.handler';
import { GetCurrentUserQuery } from './modules/auth/application/queries/get-current-user/get-current-user.query';
import { GetCurrentUserUseCase } from './modules/auth/application/use-cases/get-current-user.use-case';

const id='0123456789abcdef01234567';
const input={name:'Seed',priceMinor:1234,stock:2};
const now=new Date('2026-11-18T00:00:00Z');
const product={id,...input,createdAt:now,updatedAt:now};
const user={id:'user-uuid',email:'demo@example.test',createdAt:now,updatedAt:now};
const auth={response:{accessToken:'synthetic-result',tokenType:'Bearer' as const,expiresIn:900},refreshToken:'B'.repeat(43),refreshExpiresAt:now};
const page={itemCount:1,filters:{search:null,category:null,sortBy:'createdAt' as const,sortDirection:'desc' as const},items:[product],total:1,page:2,pageSize:20,totalPages:1};
describe('real CQRS discovery, symbol DI and workflow delegation',()=>{
  let app:INestApplication;
  const spy0=jest.spyOn(CreateProductUseCase.prototype,'execute').mockResolvedValue(product);
  const spy1=jest.spyOn(UpdateProductUseCase.prototype,'execute').mockResolvedValue(product);
  const spy2=jest.spyOn(DeleteProductUseCase.prototype,'execute').mockResolvedValue(undefined);
  const spy3=jest.spyOn(GetProductByIdUseCase.prototype,'execute').mockResolvedValue(product);
  const spy4=jest.spyOn(ListProductsUseCase.prototype,'execute').mockResolvedValue(page);
  const spy5=jest.spyOn(LoginUseCase.prototype,'execute').mockResolvedValue(auth);
  const spy6=jest.spyOn(RefreshTokenUseCase.prototype,'execute').mockResolvedValue(auth);
  const spy7=jest.spyOn(LogoutUseCase.prototype,'execute').mockResolvedValue(undefined);
  const spy8=jest.spyOn(GetCurrentUserUseCase.prototype,'execute').mockResolvedValue(user);
  beforeAll(async()=>{
    const module=await Test.createTestingModule({imports:[CqrsModule.forRoot()],providers:[
      CreateProductHandler,
      UpdateProductHandler,
      DeleteProductHandler,
      GetProductHandler,
      ListProductsHandler,
      LoginHandler,
      RefreshTokenHandler,
      LogoutHandler,
      GetCurrentUserHandler,
      ...[PRODUCT_REPOSITORY_PORT,USER_REPOSITORY_PORT,SESSION_REPOSITORY_PORT,ACCESS_TOKEN_PORT,PASSWORD_HASHER_PORT,REFRESH_TOKEN_PORT,CLOCK_PORT,ID_GENERATOR_PORT].map(provide=>({provide,useValue:{}})),
      {provide:AUTH_SESSION_TTL_SECONDS,useValue:604800},
    ]}).compile();
    app=module.createNestApplication({logger:false});await app.init();
  });
  afterAll(async()=>{await app.close();jest.restoreAllMocks();});
  it('dispatches CreateProductCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new CreateProductCommand(input))).resolves.toEqual(product);
    expect(spy0).toHaveBeenCalledWith(...[input]);
  });
  it('dispatches UpdateProductCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new UpdateProductCommand(id, {stock:0}))).resolves.toEqual(product);
    expect(spy1).toHaveBeenCalledWith(...[id, {stock:0}]);
  });
  it('dispatches DeleteProductCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new DeleteProductCommand(id))).resolves.toEqual(undefined);
    expect(spy2).toHaveBeenCalledWith(...[id]);
  });
  it('dispatches GetProductQuery through its registered handler',async()=>{
    await expect(app.get(QueryBus).execute(new GetProductQuery(id))).resolves.toEqual(product);
    expect(spy3).toHaveBeenCalledWith(...[id]);
  });
  it('dispatches ListProductsQuery through its registered handler',async()=>{
    await expect(app.get(QueryBus).execute(new ListProductsQuery({page:2}))).resolves.toEqual(page);
    expect(spy4).toHaveBeenCalledWith(...[{page:2}]);
  });
  it('dispatches LoginCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new LoginCommand({email:'demo@example.test',password:'synthetic-password'}))).resolves.toEqual(auth);
    expect(spy5).toHaveBeenCalledWith(...[{email:'demo@example.test',password:'synthetic-password'}]);
  });
  it('dispatches RefreshTokenCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new RefreshTokenCommand('A'.repeat(43)))).resolves.toEqual(auth);
    expect(spy6).toHaveBeenCalledWith(...['A'.repeat(43)]);
  });
  it('dispatches LogoutCommand through its registered handler',async()=>{
    await expect(app.get(CommandBus).execute(new LogoutCommand(undefined))).resolves.toEqual(undefined);
    expect(spy7).toHaveBeenCalledWith(...[undefined]);
  });
  it('dispatches GetCurrentUserQuery through its registered handler',async()=>{
    await expect(app.get(QueryBus).execute(new GetCurrentUserQuery('user-uuid'))).resolves.toEqual(user);
    expect(spy8).toHaveBeenCalledWith(...['user-uuid']);
  });
});

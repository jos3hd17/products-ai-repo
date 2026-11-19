import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiOkResponse, ApiNoContentResponse, ApiBody } from '@nestjs/swagger';
import { ApiErrors, ApiCookieRequestHeaders, SET_COOKIE_HEADERS, CORRELATION_HEADERS } from '../../../../../core/openapi/http-documentation';
import { TokenResponseDto, CurrentUserResponseDto } from '../../../../../core/openapi/response.dto';
import { Controller, Get, HttpCode, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { getCookieOptions } from '../../../../../shared/infrastructure/configuration/cookies';
import { CookieOriginGuard } from '../../../../../shared/infrastructure/security/cookie-origin.guard';
import { EmptyBodyPipe } from '../../../../../shared/infrastructure/security/empty-body.pipe';
import { Public } from '../../../../../shared/infrastructure/security/public.decorator';
import { AuthResult, TokenResponse } from '../../../application/dto/auth.contracts';
import { LoginCommand } from '../../../application/commands/login/login.command';
import { RefreshTokenCommand } from '../../../application/commands/refresh-token/refresh-token.command';
import { LogoutCommand } from '../../../application/commands/logout/logout.command';
import { GetCurrentUserQuery } from '../../../application/queries/get-current-user/get-current-user.query';
import { SafeUser } from '../../../domain/entities/user';
import { LoginDto } from '../dto/login.dto';
interface AuthRequest extends Request { userId?:string; }
function cookie(req:Request):string|undefined { const cookies=req.cookies as Record<string,unknown>|undefined;const value=cookies?.refresh_token;return typeof value==='string' ? value:undefined; }
@ApiTags('auth')
@ApiErrors(429,500)
@Controller('auth')
export class AuthController {
  constructor(private readonly commands:CommandBus,private readonly queries:QueryBus,private readonly config:ConfigService) {}
  private result(result:AuthResult,res:Response):TokenResponse {
    res.cookie('refresh_token',result.refreshToken,{...getCookieOptions(this.config),maxAge:Math.max(0,result.refreshExpiresAt.getTime()-Date.now())});return result.response;
  }
  @ApiOperation({operationId:'login',summary:'Login and create a refresh-token family',security:[],description:'Public to JWT guard, but exact Origin and X-CSRF-Protection:1 are required. Invalid credentials are generic401. Returns access JWT in JSON; opaque refresh only in HttpOnly cookie. No registration endpoint.'})
  @ApiCookieRequestHeaders()
  @ApiOkResponse({type:TokenResponseDto,headers:SET_COOKIE_HEADERS})
  @ApiErrors(400,401,403,413)
  @Public() @UseGuards(CookieOriginGuard) @Post('login') @HttpCode(200)
  async signIn(@Body() body:LoginDto,@Res({passthrough:true}) res:Response):Promise<TokenResponse> { return this.result(await this.commands.execute<LoginCommand,AuthResult>(new LoginCommand({email:body.email,password:body.password})),res); }
  @ApiOperation({operationId:'refreshTokens',summary:'Atomically rotate a refresh token',description:'Browser-managed refresh_token cookie plus Origin/CSRF headers. Fixed absolute family expiry; current token rotates once. Reuse or a concurrent loser conservatively revokes the whole family; coordinate single-flight on clients.'})
  @ApiCookieAuth('refresh-cookie')
  @ApiCookieRequestHeaders()
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false,maxProperties:0},description:'Absent body or empty object only.'})
  @ApiOkResponse({type:TokenResponseDto,headers:SET_COOKIE_HEADERS})
  @ApiErrors(400,401,403,413)
  @Public() @UseGuards(CookieOriginGuard) @Post('refresh') @HttpCode(200)
  async rotate(@Body(new EmptyBodyPipe()) _body:unknown,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<TokenResponse> { return this.result(await this.commands.execute<RefreshTokenCommand,AuthResult>(new RefreshTokenCommand(cookie(req))),res); }
  @ApiOperation({operationId:'logout',summary:'Revoke refresh capability and clear cookie',security:[{}, {'refresh-cookie':[]}],description:'Idempotent204 when cookie is missing. Origin/CSRF remain required. Already-issued stateless access JWTs remain valid until expiry.'})
  @ApiCookieRequestHeaders()
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false,maxProperties:0},description:'Absent body or empty object only.'})
  @ApiNoContentResponse({headers:SET_COOKIE_HEADERS})
  @ApiErrors(400,403,413)
  @Public() @UseGuards(CookieOriginGuard) @Post('logout') @HttpCode(204)
  async signOut(@Body(new EmptyBodyPipe()) _body:unknown,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<void> {
    await this.commands.execute<LogoutCommand,void>(new LogoutCommand(cookie(req)));
    const options=getCookieOptions(this.config);delete options.maxAge;
    res.clearCookie('refresh_token',options);
  }
  @ApiOperation({operationId:'getCurrentUser',summary:'Return safe current-user data'})
  @ApiBearerAuth('access-token')
  @ApiOkResponse({type:CurrentUserResponseDto,headers:CORRELATION_HEADERS})
  @ApiErrors(401)
  @Get('me') async me(@Req() req:AuthRequest):Promise<SafeUser> { return this.queries.execute<GetCurrentUserQuery,SafeUser>(new GetCurrentUserQuery(req.userId ?? '')); }
}

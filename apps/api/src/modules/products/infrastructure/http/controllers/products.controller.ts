import { ApiTags, ApiBearerAuth, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiParam } from '@nestjs/swagger';
import { ApiErrors, CORRELATION_HEADERS } from '../../../../../core/openapi/http-documentation';
import { ProductResponseDto, ProductPageResponseDto } from '../../../../../core/openapi/response.dto';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from '../../../application/commands/create-product/create-product.command';
import { UpdateProductCommand } from '../../../application/commands/update-product/update-product.command';
import { DeleteProductCommand } from '../../../application/commands/delete-product/delete-product.command';
import { GetProductQuery } from '../../../application/queries/get-product/get-product.query';
import { ListProductsQuery } from '../../../application/queries/list-products/list-products.query';
import { ProductData } from '../../../domain/entities/product';
import { ListProductsOutput } from '../../../application/dto/product.contracts';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { ListProductsDto } from '../dto/list-products.dto';
@ApiTags('products')
@ApiBearerAuth('access-token')
@ApiErrors(401,429,500)
@Controller('products')
export class ProductsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus) {}
  @ApiOperation({operationId:'createProduct',summary:'Create a product',description:'Requires Bearer access JWT. Safe integer priceMinor and stock; input strings are trimmed.'})
  @ApiCreatedResponse({type:ProductResponseDto,headers:CORRELATION_HEADERS})
  @ApiErrors(400,413)
  @Post() create(@Body() input: CreateProductDto): Promise<ProductData> {
    return this.commands.execute<CreateProductCommand, ProductData>(new CreateProductCommand({ ...input }));
  }
  @ApiOperation({operationId:'listProducts',summary:'List products with server-side pagination',description:'Defaults page1/pageSize20, createdAt descending. Literal case-insensitive name search, exact category and allowlisted sorting; _id tie-break. Count/page are not a transactional snapshot.'})
  @ApiOkResponse({type:ProductPageResponseDto,headers:CORRELATION_HEADERS})
  @ApiErrors(400)
  @Get() list(@Query() query: ListProductsDto): Promise<ListProductsOutput> {
    return this.queries.execute<ListProductsQuery, ListProductsOutput>(new ListProductsQuery({ ...query }));
  }
  @ApiOperation({operationId:'getProduct',summary:'Get one product'})
  @ApiParam({name:'id',type:String,schema:{type:'string',pattern:'^[a-fA-F0-9]{24}$'},example:'0123456789abcdef01234567'})
  @ApiOkResponse({type:ProductResponseDto,headers:CORRELATION_HEADERS})
  @ApiErrors(400,404)
  @Get(':id') get(@Param('id') id: string): Promise<ProductData> {
    return this.queries.execute<GetProductQuery, ProductData>(new GetProductQuery(id));
  }
  @ApiOperation({operationId:'updateProduct',summary:'Partially update a product',description:'At least one known field is required. null and unknown properties are rejected; omitted values are preserved.'})
  @ApiParam({name:'id',schema:{type:'string',pattern:'^[a-fA-F0-9]{24}$'},example:'0123456789abcdef01234567'})
  @ApiOkResponse({type:ProductResponseDto,headers:CORRELATION_HEADERS})
  @ApiErrors(400,404,413)
  @Patch(':id') update(@Param('id') id: string, @Body() input: UpdateProductDto): Promise<ProductData> {
    return this.commands.execute<UpdateProductCommand, ProductData>(new UpdateProductCommand(id, { ...input }));
  }
  @ApiOperation({operationId:'deleteProduct',summary:'Delete an existing product',description:'204 with no body; deleting a missing product returns404.'})
  @ApiParam({name:'id',schema:{type:'string',pattern:'^[a-fA-F0-9]{24}$'},example:'0123456789abcdef01234567'})
  @ApiNoContentResponse({headers:CORRELATION_HEADERS})
  @ApiErrors(400,404)
  @Delete(':id') @HttpCode(204) async delete(@Param('id') id: string): Promise<void> {
    await this.commands.execute<DeleteProductCommand, void>(new DeleteProductCommand(id));
  }
}

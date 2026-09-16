import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }
    /**
   * Search & filter products.
   */
  @Get('search')
  search(@Query() dto: SearchProductDto) {
    return this.productsService.search(dto);
  }
  @Get('merchant/:merchantId')
  findByMerchant(@Param('merchantId') merchantId: string) {
    return this.productsService.findByMerchantId(merchantId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

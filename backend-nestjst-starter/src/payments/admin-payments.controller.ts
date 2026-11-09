import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { QueryPaymentTransactionsDto } from './dto/query-payment-transactions.dto';
import { ResolveTransactionDto } from './dto/resolve-transaction.dto';
import { PaymentsService } from './payments.service';

// Chỉ ADMIN (không STAFF): xử lý tiền thật
@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:id/confirm-payment')
  @HttpCode(200)
  confirmPayment(
    @Param('id', parseIdPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.confirmManually(id, dto, user);
  }

  @Get('payments/transactions')
  listTransactions(@Query() query: QueryPaymentTransactionsDto) {
    return this.payments.listTransactions(query);
  }

  @Post('payments/transactions/:id/resolve')
  @HttpCode(200)
  resolve(
    @Param('id', parseIdPipe) id: number,
    @Body() dto: ResolveTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.resolveTransaction(id, dto, user);
  }
}

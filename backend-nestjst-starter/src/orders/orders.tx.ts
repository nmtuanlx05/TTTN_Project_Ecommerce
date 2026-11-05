import { conflict } from '../common/errors/coded-errors';
import { Prisma } from '../generated/prisma/client';
import { MAX_TX_RETRIES } from '../cart/cart.constants';
import { ORDER_ERROR } from './orders.constants';

export const isPrismaCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

interface TransactionRunner {
  $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
}

// Chạy lại khi MySQL báo deadlock/write conflict (P2034), tối đa MAX_TX_RETRIES lần rồi trả 409.
export async function runWithRetry<T>(
  prisma: TransactionRunner,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(work, options);
    } catch (error) {
      if (!isPrismaCode(error, 'P2034')) throw error;
      if (attempt >= MAX_TX_RETRIES) {
        throw conflict(
          ORDER_ERROR.SYSTEM_BUSY,
          'Hệ thống đang bận, vui lòng thử lại sau ít phút',
        );
      }
    }
  }
}

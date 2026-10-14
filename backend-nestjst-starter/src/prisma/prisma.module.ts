import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: các module nghiệp vụ inject PrismaService mà không cần import lại.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

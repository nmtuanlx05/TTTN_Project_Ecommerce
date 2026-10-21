// Tạo tài khoản ADMIN đầu tiên từ ADMIN_EMAIL / ADMIN_PASSWORD trong .env.development (hoặc .env.production).
// Chạy lại an toàn: email đã tồn tại thì bỏ qua, không ghi đè mật khẩu hay role.
// Chạy: npx prisma db seed (production: npm run db:seed:prod)
import { config } from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';
import { ENV_FILE } from '../src/config/env-file';

config({ path: ENV_FILE, quiet: true });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!email || !password) {
    throw new Error(`Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong ${ENV_FILE}`);
  }
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD phải có ít nhất 6 ký tự');
  }
  if (!databaseUrl) {
    throw new Error(`Thiếu DATABASE_URL trong ${ENV_FILE}`);
  }

  // Cùng cấu hình adapter với PrismaService
  const url = new URL(databaseUrl);
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectionLimit: 2,
      allowPublicKeyRetrieval: true,
    }),
  });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Đã có tài khoản ${email}, bỏ qua.`);
      return;
    }

    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name: 'Administrator',
        role: Role.ADMIN,
      },
    });
    console.log(`Đã tạo tài khoản ADMIN: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

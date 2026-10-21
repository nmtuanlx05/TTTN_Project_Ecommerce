// File biến môi trường theo NODE_ENV: development (mặc định) -> .env.development, production -> .env.production.
// Không import thư viện nào để dùng chung được cho Nest, prisma.config.ts và prisma/seed.ts.
export const ENV_FILE = `.env.${process.env.NODE_ENV || 'development'}`;

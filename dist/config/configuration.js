"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    jwt: {
        secret: process.env.JWT_SECRET ?? 'default-secret-ganti-di-production',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    supabase: {
        url: process.env.SUPABASE_URL ?? '',
        anonKey: process.env.SUPABASE_ANON_KEY ?? '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
    },
    midtrans: {
        serverKey: process.env.MIDTRANS_SERVER_KEY ?? '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY ?? '',
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    },
    redis: {
        url: process.env.UPSTASH_REDIS_REST_URL ?? '',
        token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    },
});
//# sourceMappingURL=configuration.js.map
declare const _default: () => {
    port: number;
    nodeEnv: string;
    appUrl: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceKey: string;
    };
    midtrans: {
        serverKey: string;
        clientKey: string;
        isProduction: boolean;
    };
    redis: {
        url: string;
        token: string;
    };
};
export default _default;

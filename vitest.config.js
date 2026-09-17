"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        root: './',
        include: [
            'src/**/*.spec.ts',
            'test/**/*.spec.ts',
            'test/**/*.e2e-spec.ts',
        ],
        exclude: ['node_modules', 'dist'],
        setupFiles: ['./test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.spec.ts',
                'src/**/*.dto.ts',
                'src/**/*.module.ts',
                'src/main.ts',
                'src/**/index.ts',
            ],
        },
        testTimeout: 30000,
        hookTimeout: 30000,
        pool: 'forks',
    },
    resolve: {
        alias: {
            '@': (0, path_1.resolve)(__dirname, './src'),
        },
        tsconfigPaths: true,
    },
});
//# sourceMappingURL=vitest.config.js.map
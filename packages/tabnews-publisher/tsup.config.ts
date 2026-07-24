import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
    'mcp-server': 'src/mcp-server.ts',
  },
  format: ['esm'],
  target: 'node20',
  clean: true,
  dts: true,
  sourcemap: true,
});

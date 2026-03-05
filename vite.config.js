export default {
  base: '/',
  build: {
    outDir: 'dist-v2'
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/oauth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}

module.exports = {
  webpack: {
    configure: {
      target: 'electron-renderer',
      resolve: {
        fallback: {
          "path": require.resolve("path-browserify"),
          "fs": false,
          "crypto": false,
          "stream": false,
          "assert": false,
          "http": false,
          "https": false,
          "os": false,
          "url": false,
          "zlib": false,
          "net": false,
          "tls": false,
          "child_process": false,
          "dgram": false,
          "dns": false,
          "querystring": false,
          "readline": false,
          "repl": false,
          "string_decoder": false,
          "sys": false,
          "v8": false,
          "vm": false,
          "constants": false
        }
      }
    }
  }
}; 
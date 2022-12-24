const path = require('path')

module.exports = {
  mode: 'production',
  entry: './src/content.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'content.js',
    path: path.resolve(__dirname, 'dist')
  },
  experiments: {
    topLevelAwait: true
  }
}

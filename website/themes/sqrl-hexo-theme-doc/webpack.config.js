'use strict';
const path = require('path');

module.exports = {
  mode: 'production',
  externals: {
    jquery: '$',
    lunr: true,
  },
  entry:  {
    'doc': './lib/browser/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'source/script'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', "@babel/preset-react"]
          }
        }
      }
    ]
  }
};

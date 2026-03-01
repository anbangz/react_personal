const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");

const outputPath = path.join(__dirname, "dist");

module.exports = {
  entry: {
    app: ["./src/index.tsx"]
  },
  output: {
    path: outputPath,
    filename: "bundle.js",
    publicPath: "/"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  devServer: {
    static: { directory: outputPath },
    compress: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    historyApiFallback: true
  },

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"]
  },

  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      // Load images
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: "asset/resource"
      },
      // Load markdown files as raw strings
      {
        test: /\.md$/,
        type: "asset/source"
      }

      // // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      // { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: "My Website",
      template: __dirname + "/index.html",
      inject: "body"
    })
  ]
};

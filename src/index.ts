import { resolve } from "path";
import { spawn } from "child_process";

import Dotenv from "dotenv";
import { resolveTsAliases } from "resolve-ts-aliases";
import { Configuration } from "webpack";

import { CleanWebpackPlugin as CleanPlugin } from "clean-webpack-plugin";
import DotenvPlugin from "dotenv-webpack";
import HtmlPlugin from "html-webpack-plugin";

Dotenv.config();

const devMode = process.env.NODE_ENV !== "production";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");

const alias = resolveTsAliases(resolve(root, "tsconfig.json"));
const extensions = [".tsx", ".ts", ".jsx", ".js", ".json"];

const generateScopedName = devMode ? "[local]--[hash:base64:7]" : "[hash:base64:7]";

const config: Configuration = {
  devtool: "cheap-module-eval-source-map",
  resolve: {
    alias: {
      ...alias,
      "react-dom": "@hot-loader/react-dom"
    },
    extensions
  },
  context: resolve(root, "src"),
  entry: {
    index: "./index"
  },
  output: {
    filename: devMode ? "[name].js" : "[name].[hash:7].js",
    path: dist
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          name: "commons",
          test: /[\\/]node_modules[\\/]/,
          chunks: "all"
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.ejs$/,
        use: [
          { loader: "ejs-compiled-loader" }
        ]
      },
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              babelrc: false,
              cacheDirectory: true,
              presets: [
                "@babel/preset-env",
                "@babel/preset-typescript",
                "@babel/preset-react"
              ],
              plugins: [
                "@babel/plugin-proposal-class-properties",
                "@babel/plugin-proposal-object-rest-spread",
                ["@babel/plugin-transform-runtime", {
                  helpers: false
                }],
                ["babel-plugin-react-css-modules", {
                  context: resolve(process.cwd(), "src"),
                  exclude: "node_modules",
                  webpackHotModuleReloading: true,
                  autoResolveMultipleImports: true,
                  generateScopedName
                }],
                ["module-resolver", {
                  alias,
                  extensions
                }],
                "react-hot-loader/babel"
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: generateScopedName
              }
            }
          },
          {
            loader: "postcss-loader",
            options: {
              ident: "postcss",
              plugins: () => [
                require("postcss-preset-env")({
                  stage: 3,
                  features: {
                    "nesting-rules": true
                  }
                })
              ]
            }
          }
        ]
      },
      {
        test: /\.(ttf|png|apng|svg)$/,
        use: [
          { loader: "url-loader" }
        ]
      }
    ]
  },
  plugins: [
    new CleanPlugin(),
    new DotenvPlugin({ systemvars: true }),
    new HtmlPlugin({
      template: "!!ejs-compiled-loader!src/index.ejs",
      templateParameters: {
        reactDevtools: devMode ? `//${process.env.DEV_HOST}:8097` : false
      }
    })
  ],
  devServer: {
    contentBase: dist,
    host: "0.0.0.0",
    hot: true,
    after: () => {
      devMode && spawn("react-devtools", { shell: true, stdio: "inherit" });
    }
  }
};

// fix: babel/babel-loader#603
const patch = {
  stats: {
    warningsFilter: /export .+ was not found/
  }
};

Object.assign(config, patch);
Object.assign(config.devServer, patch);

export default config;

module.exports = {
  publicPath: './',
  chainWebpack: config => config.resolve.symlinks(false),
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false
    }
  }
}
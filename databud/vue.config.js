module.exports = {
  publicPath: './',
  chainWebpack: config => {
    config.resolve.symlinks(false);
    config.module
      .rule('yaml')
      .test(/\.yaml$/)
      .use('raw-loader')
      .loader('raw-loader')
      .end();

    console.log(config.module.rules);

    return config;
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false
    }
  }
}
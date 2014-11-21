module.exports = function(config) {
  config.set({
    basePath:       '',
    frameworks:     ['jasmine'],
    exclude:        [],
    preprocessors:  {},
    reporters:      ['progress'],
    port:           9876,
    colors:         true,
    logLevel:       config.LOG_WARN,
    autoWatch:      false,
    browsers:       ['PhantomJS'],
    singleRun:      true,
    files:          [
      //3rd Party
      'bower_components/angular/angular.min.js',
      'bower_components/restangular/restangular.min.js',
      'bower_components/angular-mocks/angular-mocks.js',
      
      //module
      'src/**/*.js',
      
      //tests
      'test/unit/**/*_spec.js'
    ]
  });
};

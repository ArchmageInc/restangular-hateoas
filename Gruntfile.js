/*global module:false*/
module.exports = function(grunt) {
  grunt.initConfig({
    watch:{
      js:{
        options:{
          interrupt: true
        },
        files:  ['src/**/*.js','test/**/*.js'],
        tasks:  ['test','build']
      }
    },
    karma:{
      unit:{
        configFile: 'karma.conf.js'
      }
    },
    jshint:{
      files: ['src/ngc-exceptions.js']
    },
    uglify:{
      options:{
        sourceMap: true,
        sourceMapName:  'dist/restangular-hateoas.min.js.map'
      },
      src:{
        files:{
          'dist/restangular-hateoas.min.js': ['src/**/*']
        }
      }
    },
    clean:['dist']
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-karma');
  
  grunt.registerTask('test',['karma:unit']);
  grunt.registerTask('build',['clean','jshint','uglify']);
  grunt.registerTask('default', ['build','test','watch']);
};

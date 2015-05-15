(function () {
    'use strict';

    var del         =   require('del'),
        gulp        =   require('gulp'),
        connect     =   require('gulp-connect'),
        jscs        =   require('gulp-jscs'),
        jshint      =   require('gulp-jshint'),
        ngAnnotate  =   require('gulp-ng-annotate'),
        open        =   require('gulp-open'),
        uglify      =   require('gulp-uglifyjs'),
        rename      =   require('gulp-rename'),
        less        =   require('gulp-less'),
        stylish     =   require('jshint-stylish'),
        karma       =   require('karma').server,
        bowerFiles  =   require('main-bower-files'),
        wiredep     =   require('wiredep'),
        path        =   require('path'),
        mergeStream =   require('merge-stream');

    var port = 8000;

    gulp.task('build', ['clean', 'bower', 'js', 'html', 'fonts', 'css', 'images'], function (cb) {
        cb();
    });
    gulp.task('clean', ['clean:build'], function (cb) {
        cb();
    });
    gulp.task('clean:build', function(cb) {
        del([
            'dist',
            'example/build'
        ], cb);
    });

    gulp.task('js', ['js:compress', 'js:example', 'js:wiredep'], function (cb) {
        cb();
    });

    gulp.task('js:compress', ['clean'], function () {
        var exportFiles = [
            '!**/*-test.js',
            'src/**/*-module.js',
            'src/**/*.js'
        ];
        return gulp.src(exportFiles)
            .pipe(ngAnnotate())
            .pipe(uglify('restangular-hateoas.min.js', {
                outSourceMap: false
            }))
            .pipe(gulp.dest('dist/js'))
            .pipe(gulp.dest('example/build/js'));
    });
    gulp.task('js:example', ['clean'], function () {
        var exportFiles = [
            '!example/src/**/*-test.js',
            'example/src/**/*-module.js',
            'example/src/**/*.js'
        ];
        var annotated = gulp.src(exportFiles)
            .pipe(ngAnnotate());

        var compressed = annotated
            .pipe(uglify('restangular-hateoas-example-app.min.js', {
                outSourceMap: true,
                sourceRoot:   './'
            }))
            .pipe(gulp.dest('example/build/js'));

        var uncompressed = annotated
            .pipe(gulp.dest('example/build/js/src'));

        return mergeStream(compressed, uncompressed);
    });
    gulp.task('js:wiredep', ['clean', 'bower'], function () {
        return gulp.src(
            'example/src/index.html'
        )
        .pipe(wiredep.stream({
            fileTypes: {
                html: {
                    replace: {
                        js: function (filePath) {
                            return '<script src="js/lib/' + path.basename(filePath) + '"></script>';
                        },
                        css: function (filePath) {
                            return '<link rel="stylesheet" href="css/' + path.basename(filePath) + '" />';
                        }
                    }
                }
            }
        }))
        .pipe(gulp.dest('example/build'));
    });
    gulp.task('bower', ['clean'], function () {
        return gulp.src(bowerFiles({
            paths: {
                includeDev: true,
                bowerDirectory: 'bower_components',
                bowerJson: 'example/src/bower.json'
            }
        }))
        .pipe(gulp.dest('example/build/js/lib'));
    });

    gulp.task('html', ['clean'], function () {
        return gulp.src([
            'example/src/**/*.html',
            '!example/src/index.html'
        ])
        .pipe(gulp.dest('dist'));
    });

    gulp.task('css', ['css:less', 'css:vendor'], function (cb) {
        del([
          'example/build/js/lib/**/*.css',
          'example/build/js/lib/**/*.css.map'
        ], cb);
    });
    gulp.task('css:less', ['clean'], function () {
        return gulp.src('./example/src/less/main.less')
            .pipe(less())
            .pipe(rename('style.css'))
            .pipe(gulp.dest('example/css'));
    });
    gulp.task('css:vendor', ['clean', 'bower'], function () {
        return gulp.src([
            'example/buid/js/lib/**/*.css',
            'example/build/js/lib/**/*.css.map'
        ])
        .pipe(gulp.dest('dist/css'));
    });

    gulp.task('fonts', ['fonts:vendor'], function (cb) {
        del([
            'example/build/js/lib/**/*.ttf',
            'example/build/js/lib/**/*.eot',
            'example/build/js/lib/**/*.woff',
            'example/build/js/lib/**/*.otf',
            'example/build/js/lib/**/*.svg'
        ],cb);
    });

    gulp.task('fonts:vendor', ['clean', 'bower'], function () {
        return gulp.src([
            'example/src/assets/fonts/**/*',
            'example/build/js/lib/**/*.ttf',
            'example/build/js/lib/**/*.eot',
            'example/build/js/lib/**/*.woff',
            'example/build/js/lib/**/*.otf',
            'example/build/js/lib/**/*.svg'
        ])
        .pipe(gulp.dest('example/build/fonts'));
    });

    gulp.task('images', ['clean'], function (cb) {
        return gulp.src([
            'example/src/assets/images/**/**.*'
        ])
        .pipe(gulp.dest('example/build/images'));
    });

    gulp.task('test:js', ['test:jshint', 'test:jscs', 'test:unit'], function (cb) {
        cb();
    });
    gulp.task('test:unit', function(cb) {
        var files   =   wiredep({
            devDependencies: true
        }).js.concat([
            'example/src/**/*-module.js',
            'example/src/**/*.js'
        ]);
        karma.start({
            configFile: __dirname + '/karma.conf.js',
            files:      files
        }, function () {
            cb();
        });
    });
    gulp.task('test:jshint', function () {
        return gulp.src([
            'src/**.*.js',
            'example/src/**/*.js'
        ])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
    });

    gulp.task('test:jscs', function () {
        return gulp.src([
            'src/**/*.js',
            'example/src/**/*.js'
        ])
        .pipe(jscs());
    });
    gulp.task('connect', ['build'], function () {
        connect.server({
            port:       port,
            root:       'example/build',
            livereload: true
        });
    });
    gulp.task('watch', function (cb) {
        return gulp.watch([
            'src/**/*',
            'example/src/**/*'
        ], ['build', 'test:js', 'reload']);

    });

    gulp.task('reload', ['build'], function () {
        return gulp.src('')
            .pipe(connect.reload());
    });

    gulp.task('open', ['connect'], function () {
        return gulp.src('example/build/index.html')
            .pipe(open('', {
                url: 'http://localhost:' + port
        }));
    });

    gulp.task('tdd', ['build', 'open','test:js', 'watch'], function (cb) {
        cb();
    });
}());

const gulp = require('gulp');

const browserify = require('gulp-browserify');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const plumber = require('gulp-plumber');
const notify = require("gulp-notify");
const sourcemaps = require("gulp-sourcemaps");
const gulpIf = require("gulp-if");
const rename = require("gulp-rename");

var isDev = !(process.env.DEV == 'production');
var path = {
	build: 'dist',
	src: 'src/index.js',
	watch: 'src/*.js'
};

var errorMessage = () => {
	return plumber({errorHandler: notify.onError((err) => {
		return {
			title: err.name,
			message: err.message
		}
	})})
}

gulp.task('build', () => {
	return gulp.src(path.src)
		.pipe(errorMessage())
		.pipe(browserify({
			debug: isDev
		}))
		.pipe(
			gulpIf(!isDev, 
				babel({
					presets: ['es2015']
				})
			)
		)
		.pipe(rename('PolyRun.js'))
		.pipe(gulpIf(!isDev, uglify()))
		.pipe(gulp.dest(path.build))
});



// watch
gulp.task('watch', function() {
	gulp.watch(path.watch, ['build']);
});

// Tasks
gulp.task('default', ['build', 'watch']);
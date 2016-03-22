/***
* 前端自动构建
*
* @author wuxm
*/
var gulp = require("gulp");
var yargs = require('yargs').argv;//Light-weight option parsing with an argv hash.
var browserSync = require('browser-sync');

var imagemin = require("gulp-imagemin");//图片压缩
//var htmlmin = require("gulp-htmlmin");//html压缩
var sass = require("gulp-ruby-sass");//sass
var less = require("gulp-less");
var autoprefixer = require('gulp-autoprefixer');//自动处理浏览器前缀
var minifycss = require("gulp-minify-css");//css压缩
var jshint = require("gulp-jshint");    //js语法检查
var concat = require("gulp-concat");	//文件合并
var uglify = require("gulp-uglify");	//文件压缩
var rename = require("gulp-rename");	//文件重命名
var sourcemaps = require('gulp-sourcemaps');

var gulpif = require("gulp-if");
var order = require("gulp-order");
var rev = require("gulp-rev"); //文件名加MD5后缀
var revCollector = require("gulp-rev-collector"); //路径替换

var inlineSource = require("gulp-inline-source");//内联外部静态文件

var clean  = require("gulp-clean");
var livereload = require("gulp-livereload");
var pkg = require('./package.json');



//是否开发模式，开发模式下不进行js，css的压缩
var isDebug = false;

//图片，字体路径变量
var revConfDst = "dist/rev",
    imageSrc = "src/images/**/*",
    imageDst = "dist/images",
    fontSrc = "src/font/**/*",
    fontDest = "dist/font";


/*清除文件*/
gulp.task('clean',function(){
	var dst = ["dist/css","dist/js","dist/images"];
	return gulp.src(dst,{read:false})
	.pipe(clean());
});


/********js操作********/
//js语法检查
gulp.task('jshint', function() {
	return gulp.src("src/**/*.js")
	.pipe(jshint())
	.pipe(jshint.reporter('default'));
});

/*js合并\压缩*/
// 排除文件写法：
// [
//   '/src/**/!(foobar)*.js', // all files that end in .js EXCEPT foobar*.js
//   '/src/js/foobar.js',
// ]
// ['./source/js/*.js', './source/js/**/underscore.js', './source/js/**/!(underscore)*.js']
gulp.task('minifyjs',function(){
    //yargs.jsfile参数可以按顺序指定合并顺序，如['a.js', 'b.js', 'c.js'])
   //console.log(yargs.jsfile);
	var jsSrc = yargs.jsfile || "src/js/**/*.js",
    jsDst = "dist/js";

	return gulp.src(["src/js/base.js","src/js/**/*.js"])
    //gulp.src(["src/js/base.js","src/js/htmlformat.js","src/js/jsformat.js","src/js/jsformat2.js"])
    //.pipe(order(["src/js/base.js","src/js/1.js","src/js/2.js"]))
	.pipe(concat("main.js"))
	.pipe(gulp.dest(jsDst))
	.pipe(uglify())
	.pipe(gulpif(isDebug,uglify()))
	//.pipe(rename({suffix:".min"}))
	.pipe(rev())  //- 文件名加MD5后缀
	.pipe(gulp.dest(jsDst))
	.pipe(rev.manifest())  //- 生成一个rev-manifest.json
	.pipe(gulp.dest(revConfDst + '/js'));//- 将 rev-manifest.json 保存到 rev 目录内

});



/********CSS操作********/
/*CSS编译*/
gulp.task('sass', function(){
	/*gulp.src('src/sass/*.sass')
    .pipe(sass())
    .pipe(gulp.dest('dist/css'));*/
return sass("src/css/sass/*.sass", { style: 'expanded'})
    .on('error', sass.logError)
    //.pipe(autoprefixer())
    .pipe(gulp.dest('dist/css/sass'));//css文件夹不会自己创建，需要提前创建
});

gulp.task('less',function(){
	return gulp.src("src/css/less/**/*.less")
    .pipe(sourcemaps.init())
	.pipe(less().on('error',function(e){
        console.error(e.message);
        this.emit('end');
    }))
    .pipe(sourcemaps.write())
	.pipe(gulp.dest("dist/css"))
    .pipe(browserSync.reload({stream: true}));
});


/*CSS合并压缩*/
gulp.task('minifycss',function(){
	var cssSrc = "dist/css/**/*.css",
		cssDst = "dist/css";

	return gulp.src(cssSrc)
	.pipe(concat("all.css"))
	.pipe(gulp.dest(cssDst))
	.pipe(minifycss())
	//.pipe(gulpif(isDebug, minifycss()))
	//.pipe(gulpif(isDebug, rename({suffix:".min"})))
	.pipe(rev())
	.pipe(gulp.dest(cssDst))
	.pipe(rev.manifest())  //- 生成一个rev-manifest.json
	.pipe(gulp.dest(revConfDst + '/css'));//- 将 rev-manifest.json 保存到 rev 目录内

});



/********图片操作********/
/*图片压缩*/
gulp.task('imagemin',function(){
	return gulp.src(imageSrc)
	.pipe(imagemin())
	.pipe(gulp.dest(imageDst));
});

//Fonts & Images 根据MD5获取版本号
gulp.task('revFont', function(){
    return gulp.src(fontSrc)
        .pipe(rev())
        .pipe(gulp.dest(fontDest))
        .pipe(rev.manifest())
        .pipe(gulp.dest(revConfDst + '/font'));
});

gulp.task('revImg', function(){
    return gulp.src(imgSrc)
        .pipe(rev())
        .pipe(gulp.dest(imgDest))
        .pipe(rev.manifest())
        .pipe(gulp.dest(revConfDst + '/images'));
});

/*html*/

/**MD5文件名称替换**/
gulp.task("rev", function(){
    return gulp.src(['dist/rev/**/*.json','src/html/**/*.html'])//- 读取 rev-manifest.json 文件以及需要进行css名替换的文件
    .pipe(revCollector({
            replaceReved: true,
            dirReplacements: {
                '../css': 'dist/css',
                '../js': 'dist/js/',
                'cdn/': function(manifest_value) {
                    return '//cdn' + (Math.floor(Math.random() * 9) + 1) + '.' + 'exsample.dot' + '/img/' + manifest_value;
                }
            }
        })) //执行文件内名称的替换
    .pipe(gulp.dest('/dist/html/'))
    .pipe(browserSync.reload({stream: true}));
})

// 把css、js以inline的形式插入html
gulp.task('inlinesource', function () {
    return gulp.src('src/html/**/*.html')
        .pipe(inlineSource())
        .pipe(gulp.dest('dist/html'));
});


gulp.task('build:html',['rev']);
gulp.task('build:css',['less']);
gulp.task('build:js',['minifyjs']);
gulp.task('release',['build:css','build:js','build:html']);

//监视文件变化
gulp.task('watch',function(){
	gulp.watch("src/css/**/*",['build:css']);
    gulp.watch("src/rev/**/*.json",['rev']);
	gulp.watch("src/js/**/*.js",['build:js']);
    gulp.watch("src/html/**/*",['build:html']);
})


gulp.task('help',function (){
  console.log(' gulp build          文件打包');
  console.log(' gulp watch          文件监控打包');
  console.log(' gulp help           gulp参数说明');
  console.log(' gulp server         测试server');
  console.log(' gulp -p             生产环境（默认生产环境）');
  console.log(' gulp -d             开发环境');
  console.log(' gulp -m <module>        部分模块打包（默认全部打包）');
});

//动态加载html
gulp.task('server',function () {
    yargs.p = yargs.p || 8080;
    browserSync.init({
        server: {
            baseDir: "./dist"
        },
        //proxy: "your server ip or domain",
        ui: {
            port: yargs.p + 1,
            weinre: {
                port: yargs.p + 2
            }
        },
        port: yargs.p,
        startPath: 'html/demo.html'

    });

    //gulp.watch("src/css/less/*.less", ['less']);
    //gulp.watch("dist/html/*.html").on('change', reload);
});

/*默认任务,第二个参数是依赖的作业列表，它们是由顺序的，按数组顺序依次执行。*/
gulp.task('default',[], function(){
    console.log(yargs);
    if(yargs.s){
        gulp.start('server');
    }

    if(yargs.w){
        gulp.start('watch');
    }

})
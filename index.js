var express=require('express');
var path=require('path');
var crypto=require('crypto');
var bodyParser=require('body-parser');
var session=require('express-session');
var models=require('./models/models');
var mongoose=require('mongoose');
var moment=require('moment');
var checkLogin=require('./checkLogin.js');
var cantBack=require('./cantBackToLoginRes.js');

var User=models.User;
var Note=models.Note;

mongoose.Promise=global.Promise;
mongoose.connect('mongodb://localhost:27017/notes');//连接数据库
mongoose.connection.on('error',console.error.bind(console,'Failed to connect to the database!'));

var error='';
var reg=/^[a-zA-Z0-9_]*$/;//判断字符串是否是只包含数字和大小写字母
var reg2=/^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).*$/;//判断字符串是否同时包含数字以及大小写字母
var app=express();

app.set('views',path.join(__dirname,'views'));//在任何模块文件内部__dirname可以获得所在目录的完整目录名
//__filename可以获得当前模块文件所在目录的完整绝对路径。path.join函数将完整目录名与views相连接，并指定为放置动态模板的文件路径
app.set('view engine','ejs');//将模板引擎设置为ejs

app.use(express.static(path.join(__dirname,'public')));//设置静态文件目录为项目根目录+/public

app.use(bodyParser.json());//对于所有请求进行json数据格式的解析
app.use(bodyParser.urlencoded({extended:true}));//用于解析form表单提交的数据

app.use(session({
	secret:'1234',// 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改
	name:'mynote',// 设置 cookie 中保存 session id 的字段名称
	cookie:{maxAge:1000*60*60*24*7},//1000*60*60*24*7// 过期时间，过期后 cookie 中的 session id 自动删除
	resave:false,
	saveUninitialized:true//将session存储到内存中

}));

app.get('/',checkLogin.noLogin);//通过使用checkLogin.noLogin函数将对于‘/’的请求路由到指定路径，如果未登陆不可直接访问首页
app.get('/',function(req,res){
	if(req.session.user){//当检测到发出请求的用户名存在
	Note.find({author:req.session.user.username})//则在存放Note的数据库里查找该用户名对应信息
	    .exec(function(err,allNotes){//执行以下函数
		if(err){//若有错误 打印错误 并刷新当前页面
		    console.log(err);
		    return res.redirect('/');
		    }
	console.log(req.session.user);
	console.log(req.body.username);

       		res.render('index',{//打开index页面 直接把模板呈现为一个响应
		user:req.session.user,//将user title notes值传递给index视图的局部变量
		title:'homepage',
		notes:allNotes
		});
		})
	}
	else{
       		res.render('index',{//打开index页面 直接把模板呈现为一个响应
		user:req.session.user,//将user title notes值传递给index视图的局部变量
		title:'homepage',
		notes:null
		});
    	}
});

app.get('/register',cantBack.cantback);//通过使用checkLogin.noLogin函数将对于‘/register’的请求路由到指定路
//径，即如果已经登陆成功不可访问注册页面

app.get('/register',function(req,res){//获得在请求/register页面时得到的页面上的数据
	console.log("register!");
	res.render('register',{//打开register页面 直接把模板呈现为一个响应
	user:req.session.user,//将user title error值传递给register视图的局部变量
	title:'register',
	error:error
	});
	error='';
});

app.post('/register',function(req,res){//获得在/register页面提交的数据，并执行以下函数
	error="";
	var username=req.body.username;//用户在注册时提交的用户名
	var password=req.body.password;//用户在注册时提交的密码
	var passwordRepeat=req.body.passwordRepeat;//用户在注册时二次提交的密码

	if(username.trim().length==0){//判断提交username的长度是否等于0
	error="用户名不能为空 !";//如果是就将错误内容记录为username不可以为空
	console.log("Username cannot be empty!");
	return res.redirect('/register');//重新刷新/register页面
	}
	if(username.trim().length<3||username.trim().length>20){//判断提交的username的长度是否在3-20范围之外
	error+="用户名长度在3-20之间 !";//若是 将错误值设置为用户名长度错误
	console.log("Username length is out of range!");
	return res.redirect('/register');//重新刷新/register页面
	}
	if(!reg.test(username)){//调用reg.test函数测试用户名是否只包含数字大小写字母以及_
	error+="用户名必须包含数字、大小写字母和下划线 !";
	console.log("Username can only be component by zimu number and _");
	return res.redirect('/register');//重新刷新/register页面
	}

	if(password.trim().length==0||passwordRepeat.trim().length==0){//判断密码长度以及再次输入的密码长度是否为0
	error+="密码不能为空 !";//若是 则将错误值设置为密码不可为0
	console.log("password cannot be empty!");
	return res.redirect('/register');
	}
	if(password.trim().length<6){//判断密码长度是否小于6
	error+="密码长度不能小于6 !";//若是 则提示密码长度小于6
	console.log("password cannot be shorter than 6!");
	return res.redirect('/register');//重新刷新/register页面
	}
	if(!reg2.test(password)){//测试输入的密码是否符合要求 同时包含数字大小写字母
	error+="用户名必须包含数字、大小写字母和下划线 !";//不符合要求则将错误值设置为提示密码组合不符合要求
	console.log("password must have little and big word and number!");
	return res.redirect('/register');//重新刷新页面
	}

	if(password!=passwordRepeat){//判断两次密码输入是否相同
	error+="两次输入密码不相同 !";//不相同则提示两次密码输入不一致
	console.log("two input of password are different!");
	return res.redirect('/register');//重新刷新该页面
	}
	User.findOne({username:username},function(err,user){//在数据库存放User文档的部分查找是否存在输入的username
       	if(err){//如果出现错误
		console.log(err);//控制台打印错误
		return res.redirect('/register');//重新刷新该页面
	}
       	if(user){//如果查找到了
		error+="该用户名已存在 !";//错误：提示用户名已经存在
		console.log("The username is exist!");
		return res.redirect('/register');//重新刷新该页面
	}
	var md5=crypto.createHash('md5');//使用md5算法将密码值加密存储
	    md5password=md5.update(password).digest('hex');

	var newUser=new User({//创建该页面中提交得到的用户名密码的新用户
	username:username,
	password:md5password
	});

	newUser.save(function(err,doc){//调用save函数将该用户存入数据库中
	if(err){
	console.log(err);
	return res.redirect('/register');//如果发生错误打印错误并重新刷新注册界面
	}

	console.log("register successful!");
	return res.redirect('/');//如果成功，跳转到主页面
	});
	});
});

app.get('/login',cantBack.cantback);//检测如果用户已经登陆，则无法返回登陆界面
app.get('/login',function(req,res){//将用户向login界面发出请求时，根据匿名函数路由到指定路径
	console.log("login! ");
	res.render('login',{//呈现login界面 并将user title error最为局部变量传递给login界面
	user:req.session.user,
	title:'login',
	error:error
	});
	error='';
	console.log("req.body.username in login app.get : " + req.body.username);
});

app.post('/login',function(req,res){//用户在login界面提交数据
	var username=req.body.username;//用两个变量存储提交的用户名以及密码
	password=req.body.password;

	error='';
	console.log(req.body);
	User.findOne({username:username},function(err,user){//在user数据库中查找对应的用户名
		if(err){//若出现错误 打印错误 刷新login界面
		console.log(err);
		return res.redirect('/login');
		}
		if(!user){//如果用户不存在
		console.log("The user is not exist!");
		error="用户名或密码错误 !";//将error值置为用户名或密码错误
		//req.session.err="The user is not exist!";
		return res.redirect('/login');//重新刷新login界面
		}
		//console.log("login username: "+username);
		//console.log("login req.body.username: "+req.body.username);
		var md5=crypto.createHash('md5');
		    md5password=md5.update(password).digest('hex');//通过md5算法对用户密码进行加密存储
		if(user.password!=md5password){//若输入密码与数据库中对应用户密码不同，则提示密码错误或用户名错误
		error="用户名或密码错误 !";
		console.log("wrong password!");
		return res.redirect('/login');//重新刷新login界面
		}
		console.log("login successful!");
		user.password=null;//重置密码
		delete user.password;
		req.session.user=user;
		return res.redirect('/');

	});

});

app.get('/quit',function(req,res){//退出界面
	console.log("quit!");
	req.session.user=null;//将当前用户名置为null，退出界面
	return res.redirect('/');
});
app.get('/post',function(req,res){//当用户访问post界面
	console.log("post!");
	res.render('post',{//呈现post界面，并将用户名传入给该界面文件的局部变量
	title:'post',
	user:req.session.user
	});
});

app.post('/post',function(req,res){//在post界面提交数据时
	var note=new Note({//新定义一个Note变量，如下是该Note的相关信息
	title:req.body.title,
	author:req.session.user.username,
	tag:req.body.tag,
	content:req.body.content
	});
	console.log("in the post: "+req.session.user);
	console.log("in the post req session user username: "+req.session.user.username);
	note.save(function(err,doc){//并将其存储进note数据库中
	if(err){
	console.log(err);
	return res.redirect('/post');
	}
	console.log("Publish successful!!");
	return res.redirect('/');
	});

});


app.get('/detail/:_id',function(req,res){//获取访问detail/：id的相关界面
	console.log('check note');
	Note.findOne({_id:req.params._id})//在Note中查找对应id值
	    .exec(function(err,art){
		if(err){
		    console.log(err);//打印错误
		    return res.redirect('/');//重新刷新主页面
		}
		if(art){
		    res.render('detail',{//如果查到了文章，则显示detail页面 并将一下数据传入detail页面对应的文件
		    title:'check note',
		    user:req.session.user,
		    art:art,
		    moment:moment
		    });
		}
		});
});


app.listen(2231,function(req,res){//监听 2231端口
	console.log('app is running at port 2231');

});

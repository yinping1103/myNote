function noLogin(req,res,next){
	if(!req.session.user){//判断如果当前用户名为空则说明没有登陆
	    console.log("sorry you have not login!");
	    return res.redirect('/login');
	}
	next();
}
exports.noLogin=noLogin;

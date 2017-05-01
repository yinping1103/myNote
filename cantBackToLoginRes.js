function cantBack(req,res,next){
	if(req.session.user){//如果当前用户名存在，说明已经登陆成功
	    return res.redirect('/');
	}
	next();
}
exports.cantback=cantBack;

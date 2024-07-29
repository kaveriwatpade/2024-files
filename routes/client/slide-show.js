var express = require('express');
var router = express.Router();
var slideShow = require(__base + 'models').slideShow;
var authenticationHelpers = require('../authentication-helpers');

router.post('/getSlideShowList', authenticationHelpers.isClientAuth, function (req, res) {
	slideShow.getSlideShowList(req.session.passport.user, function (err ,result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
        }
        var slideShowAry = [];
        for (var i = 0; i < result.length; i++) {
			var viewers = result[i].viewers_id != 'null'? JSON.parse(result[i].viewers_id):[];
            if ((req.session.passport.user.role_name == 'Company Admin')||(req.session.passport.user.role_name == 'Company User' && viewers.indexOf(req.session.passport.user.user_id)!= -1 )) {
                slideShowAry.push(result[i])
            }
        }
		res.json({ "error": false ,"result": slideShowAry});
		res.end();
		return res;
	});
});

router.post('/submitSlideShowDashboard', authenticationHelpers.isClientAuth, function (req, res) {
    if (req.body.action == 'add') {
	slideShow.submitSlideShowDashboard(req.body, req.session.passport.user,function (err,id) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Slide-Show settings updated successfully." ,'id':id});
		res.end();
		return res;
    });
}
if (req.body.action == 'edit') {
    slideShow.updateSlideShowDashboard(req.body, req.session.passport.user,function (err,id) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Slide-Show settings updated successfully." ,'id':id});
		res.end();
		return res;
    });
}

});


router.post('/deleteSideShow', authenticationHelpers.isClientAuth, function (req, res) {
	slideShow.deleteSideShow(req.body,function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "Slide-Show settings deleted successfully."});
		res.end();
		return res;
	});
});


router.post('/userList', authenticationHelpers.isClientAuth, function (req, res) {	
		var fieldsAry = [];		
			fieldsAry[0] = 'companies';
			fieldsAry[1] = req.session.passport.user.company_id;		
            slideShow.userList(fieldsAry, req.session.passport.user.role_name, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!result) {
				res.json({ "error": true, "reason": "No records found." });
				return res;
            }
            for(var i = 0 ; i<result.length;i++)
            {
				result[i]['role_name'] = result[i]['companies'][req.session.passport.user.company_id]['role'];				
				result[i]['name'] = result[i].firstname+" "+result[i].lastname;				
            }
			res.json({ "error": false, "result": result });
			res.end();
			return res;
		});
});


router.post('/dashboardList', authenticationHelpers.isClientAuth, function (req, res) {
	slideShow.dashboardList(req.session.passport.user, function (err, dashboardResult) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		var dashboardAry = [];
		for (var i = 0; i < dashboardResult.length; i++) {
			dashboardAry.push(dashboardResult[i].dashboard_id)
				
			
		}
		res.json({ dashboardAry:dashboardAry});
		res.end();
		return res;
	});
});

module.exports = router;
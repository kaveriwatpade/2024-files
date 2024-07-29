var express	              = require('express');
var router                = express.Router();
var parameter    		  = require(__base + 'models').parameter;
var authenticationHelpers = require('../authentication-helpers');
// var sparkAPIHelper = require('./sparkapi');
// const sparkAPI = new sparkAPIHelper();


router.post('/list', authenticationHelpers.isAuth, function(req, res){
	parameter.list(function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
		if (result.length == 0) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
    res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/submit', authenticationHelpers.isEslAuth, function(req, res){
	req.checkBody("data.parameterName", "Parameter Name is required.").notEmpty();
	req.checkBody("data.hierarchy", "Hierarchy is required.").notEmpty();
	req.checkBody("data.parameterDesc", "Parameter Description is required.").notEmpty();
	req.checkBody("data.category", "Category is required.").notEmpty();
	req.checkBody("data.basicMeasurement", "Basic Measurement is required.").notEmpty();
	req.checkBody("data.unit", "Unit is required.").notEmpty();
	//req.checkBody("data.symbol", "Symbol is required.").notEmpty();
	req.checkBody("data.parameterType", "Parameter Type is required.").notEmpty();
	req.checkBody("data.showInReport", "Show In Report is required.").notEmpty();
	var errorMsg = '';
	req.getValidationResult().then(function(errors) {
		if (!errors.isEmpty()) {
			errors.array().map(function (elem) {
				errorMsg += elem.msg+"\n";
			});
			errorMsg = errorMsg.trim("\n");
			res.json({"error" : true,"reason": errorMsg}); 
			return res;
		}
		if(req.body.action == 'add'){
			if(req.body.data.hierarchy == 'primary'){
				parameter.addPrimaryParameter(req.body,function(err){
					if (err) { 
						res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
					}
					res.json({"error": false,"reason": "Parameter added successfully."});
					res.end();
					return res;
				});
			}
			if(req.body.data.hierarchy == 'secondary'){
				parameter.addSecondaryParameter(req.body,function(err,result){
					if (err) { 
						res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
          }
          res.json({"error": false,"reason": "Parameter added successfully."});
          res.end();
          return res;
          // if(0 == req.body.data['parameterType'] || 1 == req.body.data['parameterType']){
          //   sparkAPI.addParameterInSpark(result,req.body.data['parameterType'], function(error, sparkData) {
          //     if(error) {
          //       res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
          //       return res;
          //     }
          //     res.json({"error": false,"reason": "Parameter added successfully."});
          //     res.end();
          //     return res;
          //   });
          // }
          // else{
          //   res.json({"error": false,"reason": "Parameter added successfully."});
          //   res.end();
          //   return res;
          // }
        });
			}
		}
		if(req.body.action == 'edit'){
			if(req.body.data.hierarchy == 'primary'){
				parameter.editPrimaryParameter(req.body,function(err){
					if (err) { 
						res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
					}
					parameter.secondaryParameterExists(req.body.data.primaryParameter,function(err,result){
						if (err) { 
							res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
							return res;
						}
						if(result.length == 0){
							res.json({"error": false,"reason": "Parameter updated successfully."});
							res.end();
							return res;
						}
						var idAry = [];
						result.forEach(parameter => {
							idAry.push(parameter['id']);
						});
						parameter.updateSecondaryParameters(req.body, idAry, function(err){
							if (err) { 
								res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
								return res;
							}
							res.json({"error": false,"reason": "Parameter updated successfully."});
							res.end();
							return res;
						});
					});
				});
			}
			if(req.body.data.hierarchy == 'secondary'){
				parameter.editSecondaryParameter(req.body,function(err){
					if (err) { 
						res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
						return res;
					}
					res.json({"error": false,"reason": "Parameter updated successfully."});
					res.end();
					return res;
				});
			}
		}
	});
});

router.post('/find', authenticationHelpers.isEslAuth, function(req, res){
	parameter.findById(req.body.id,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
    if (!result) {  
			res.json({"error" : true,"reason": "No records found."}); 
			return res; 
		}
    res.json({"result" : result});
		res.end();
		return res;
	});
});

router.post('/delete', authenticationHelpers.isEslAuth, function(req, res){
	if(req.body.hierarchy == 'primary'){
		parameter.secondaryParameterExists(req.body.primaryParameterId,function(err,result){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if(result.length > 0){
				res.json({"error": false,"reason": "Cannot delete this parameter as it has associated secondary parameter(s)."});
				res.end();
				return res;
			}
			parameter.delete(req.body.id,function(err,result){
				if (err) { 
					res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
					return res;
				}
				res.json({"error": false,"reason": "Parameter deleted successfully."});
				res.end();
				return res;
			});
		});
	}
	else{
		parameter.delete(req.body.id,function(err,result){
			if (err) { 
				res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if(result == 1){
				res.json({"error": false,"reason": "Meter models are assigned to this meter make. Cannot delete record."});
				return res;
      }
      res.json({"error": false,"reason": "Parameter deleted successfully."});
      res.end();
      return res;
      // if(0 == req.body['paramType'] || 1 == req.body['paramType']){
      //   sparkAPI.deleteParameterInSpark(req.body['secondaryParamId'],req.body['paramType'], function(error, sparkData) {
      //     if(error) {
      //       res.json({"error": true,"reason": "Error: Something went wrong. Please try again!"}); 
      //       return res;
      //     }
      //     res.json({"error": false,"reason": "Parameter deleted successfully."});
			// 	res.end();
			// 	return res;
      //   });
      // }
      // else{
      //   res.json({"error": false,"reason": "Parameter deleted successfully."});
			// 	res.end();
			// 	return res;
      // }
		});
	}
});

router.post('/uniqueParameter', authenticationHelpers.isEslAuth, function(req, res){
	parameter.uniqueParameter(req.body,function(err, result){
		if (err) { 
			res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
			return res;
		}
        res.json({"result" : result});
		res.end();
		return res;
	});
});

module.exports = router;
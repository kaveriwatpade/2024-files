var express = require('express');
var router = express.Router();
var user = require(__base + 'models').user;
var node = require(__base + 'models').node;//for user wise module
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var ejs = require('ejs');
var bcrypt = require('bcrypt-nodejs');
var lodash = require('lodash');

router.post('/userList', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 1, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		var fieldsAry = [];
		if (req.session.passport.user.company_id) {
			fieldsAry[0] = 'companies';
			fieldsAry[1] = req.session.passport.user.company_id;
		}
		if (req.session.passport.user.partner_id) {
			fieldsAry[0] = 'partners';
			fieldsAry[1] = req.session.passport.user.partner_id;
		}
		user.userList(fieldsAry, req.session.passport.user.role_name, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!result) {
				res.json({ "error": true, "reason": "No records found." });
				return res;
			}
			res.json({ "error": false, "result": result });
			res.end();
			return res;
		});
	});
});

router.post('/companyList', authenticationHelpers.isClientAuth, function (req, res) {
	user.companyList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/partnerList', authenticationHelpers.isClientAuth, function (req, res) {
	user.partnerList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/permissionList', authenticationHelpers.isClientAuth, function (req, res) {
	user.permissionList(function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/submitUser', authenticationHelpers.isClientAuth, function (req, res) {
	var permissionId = ('add' == req.body.action) ? 2 : 3;
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, permissionId, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		req.checkBody("data.firstName", "First Name is required.").notEmpty();
		req.checkBody("data.lastName", "Last Name is required.").notEmpty();
		req.checkBody("data.email", "Email address is not valid.").isEmail();
		// req.checkBody("data.mobile", "Mobile number must be digit.").isNumeric();
		var errorMsg = '';
		req.getValidationResult().then(function (errors) {
			if (!errors.isEmpty()) {
				errors.array().map(function (elem) {
					errorMsg += elem.msg + "\n";
				});
				errorMsg = errorMsg.trim("\n");
				res.json({ "error": true, "reason": errorMsg });
				return res;
			}
			if (req.body.action == 'add') {
				user.userAdd(req.body.data, req.body.companiesPartnersObj, req.session.passport.user.user_id, function (err, result) {
					if (err || !result) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					Promise.all([sendEmailToUser(req.body.data, result.toString())]).then(function (result) {
						if (result[0] != 'done') {
							res.json({ "error": false, "reason": "Error: Confirmation email not sent to user!" });
							return res;
						}
						res.json({ "error": false, "reason": "User added successfully and confirmation email sent to user" });
						res.end();
						return res;
					}).catch(error => {
						res.json({ "error": false, "reason": "Error: Confirmation email not sent to user!" });
						return res;
					});
				});
			}
			if (req.body.action == 'edit') {
				/* **added for user wise module  */
				if (req.body.data.node != null && undefined != req.body.data.node) {
					checkNodeAssignedToUser(req.body.id, req.session.passport.user.company_id, req.body.data.node, function (result) {
						// console.log('checkNodeAssignedToUser', result)
						if (!result) return res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						var msg = "";
						let emailMsg = "";
						var moduleIndex = 1;
						var moduleWiseIdForDeletionObj = {};
						for (let index = 0; index < result.length; index++) {
							var elem = result[index];
							if (2 == elem['status']) {
								msg += "\n" + moduleIndex + ") " + elem['module'] + ",";
								elem['otherDataAry'] = lodash.uniq(elem['otherDataAry']);
								emailMsg += "\n" + moduleIndex + ") " + elem['module'] + " - " + elem['otherDataAry'].join(',') + ",";
								moduleIndex++;
								if ('undefined' == typeof moduleWiseIdForDeletionObj[elem['module']]) moduleWiseIdForDeletionObj[elem['module']] = {};
								moduleWiseIdForDeletionObj[elem['module']] = { 'ids': elem['idAry'] };
								moduleWiseIdForDeletionObj[elem['module']]['added_date_time'] = ('alarm' == elem['module'] || 'notification' == elem['module']) ? elem['otherDataAry'] : [];
							}
						}
						if ('' == msg) {
							user.userUpdate(req.body, req.session.passport.user.user_id, function (err) {
								if (err) {
									res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
									return res;
								}
								res.json({ "error": false, "reason": "User updated successfully." });
								res.end();
								return res;
							});
						}
						else {
							msg = msg.replace(/,\s*$/, "");
							var displayMsg = "You cannot unassign this node for selected user as he/she has configured this node on below modules - \n" + msg;
							res.json({ "error": true, "reason": displayMsg, "result": moduleWiseIdForDeletionObj });
							return res;
						}
					})
				}
				else {
					user.userUpdate(req.body, req.session.passport.user.user_id, function (err) {
						if (err) {
							res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
							return res;
						}
						res.json({ "error": false, "reason": "User updated successfully." });
						res.end();
						return res;
					});
				}
			}
		});
	});
});
/* **added for user wise to check in every possible app start */
function checkNodeAssignedToUser(userId, companyId, nodeId, fn) {
	var promiseAry = [checkInDashboard(userId, companyId, nodeId), checkInTimeSlice(userId, companyId, nodeId), checkInScada(userId, companyId, nodeId), checkInCustomExcel(userId, companyId, nodeId), checkInSolarPlant(userId, companyId, nodeId), checkInTransformer(userId, companyId, nodeId), checkInPowerFactor(userId, companyId, nodeId), checkInAlarm(userId, companyId, nodeId), checkInNotification(userId, companyId, nodeId)];//pushed all module displayed in sidebar in promise array.
	Promise.all(promiseAry).then(function (nodeExistResult) {
		return fn(nodeExistResult);
	}).catch(nodeExistResultError => {
		console.log(nodeExistResultError,'nodeExistResultError---')
		return fn(nodeExistResultError);
	});
	// return {success:false, message:'work in progress'};
}

function checkInDashboard(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInDashboard(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				let idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					var widgetData = (null != row['widget_data']) ? JSON.parse(row['widget_data']) : {};
					nodeId.forEach(nodeId => {
						if ('undefined' != typeof widgetData['nodeId'] && -1 != widgetData['nodeId'].indexOf(nodeId)) {
							nodeFound = true;
							idAry.push(row['dashboard_id'].toString());
						}
						if ('undefined' != typeof widgetData['tableType'] && 'advanced' == widgetData['tableType']) {
							for (let key in widgetData['cellData']) {
								if (('n' == widgetData['cellData'][key]['type'] && -1 != widgetData['cellData'][key]['value'].indexOf(nodeId)) || ('r' == widgetData['cellData'][key]['type'] && widgetData['cellData'][key]['value'].split(':')[0] == nodeId)) {
									nodeFound = true;
									idAry.push(row['dashboard_id'].toString());
									break;
								}
							}
						}
					});
				});
				idAry = lodash.uniq(idAry);
				if (0 == idAry.length) return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'dashboard', idAry: idAry, otherDataAry: otherDataAry });
				node.getDashboardNames(idAry, function (dasboardErr, dasboardResult) {
					if (dasboardErr) return reject(0);
					if (!dasboardResult) return resolve(1);
					dasboardResult.forEach(function (row) {
						otherDataAry.push(row['dashboard_name']);
					});
					return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'dashboard', idAry: idAry, otherDataAry: otherDataAry });
				});

			});
		});
	}
	catch (Exception) {
		console.log(Exception, '----excepion');
		return reject(Exception);
	}
}

function checkInTimeSlice(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInTimeSlice(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				var idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					nodeId.forEach(nodeId => {
						if (null != row['node'] && -1 != row['node'].indexOf(nodeId)) {
							nodeFound = true;
							idAry.push(row['app_id']);
							otherDataAry.push(row['app_name']);
						}
					});
				})
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'time slice app', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInScada(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInScada(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				var idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					var nodeParameterData = (null != row['node_parameter']) ? JSON.parse(row['node_parameter']) : {};
					for (let key in nodeParameterData) {
						for (let k in nodeParameterData[key]) {
							nodeId.forEach(nodeId => {
								if (nodeId == nodeParameterData[key][k]['node']) {
									nodeFound = true;
									idAry.push(row['app_id']);
									otherDataAry.push(row['app_name']);
								}
							});
						}
					}
				});
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'SCADA app', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInCustomExcel(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInCustomExcel(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				var idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					var nodeData = (null != row['excel_report_settings']) ? JSON.parse(row['excel_report_settings']) : {};
					for (let key in nodeData) {
						nodeId.forEach(nodeId => {
							if (-1 != nodeData[key]['node'].indexOf(nodeId)) {
								nodeFound = true;
								idAry.push(row['app_id']);
								otherDataAry.push(row['app_name']);
							}
						});
					}
				});
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'custom excel app', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInSolarPlant(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInSolarPlant(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				var idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					var nodeData = (null != row['inverter_panel_setting']) ? JSON.parse(row['inverter_panel_setting']) : {};
					for (let key in nodeData) {
						nodeId.forEach(nodeId => {
							if (nodeData[key]['node'] == nodeId) {
								nodeFound = true;
								idAry.push(row['app_id']);
								otherDataAry.push(row['app_name']);
							}
						});
					}
				});
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'solar plant app', idAry: idAry, otherDataAry: otherDataAry });
			});
		})
	}
	catch (Exception) { return reject(Exception); }
}

function checkInTransformer(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			node.checkInTransformer(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				var idAry = [];
				let otherDataAry = [];
				result.forEach(function (row) {
					nodeId.forEach(nodeId => {
						if (false == nodeFound && null != row['primary_node'] && '' != row['primary_node'] && nodeId == row['primary_node']) {
							nodeFound = true;
							idAry.push(row['app_id']);
							otherDataAry.push(row['app_name']);
						}

						if (false == nodeFound && null != row['secondary_node'] && '' != row['secondary_node'] && nodeId == row['secondary_node']) {
							nodeFound = true;
							idAry.push(row['app_id']);
							otherDataAry.push(row['app_name']);
						}
					});
				})
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'transformer app', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInPowerFactor(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			var idAry = [];
			let otherDataAry = [];
			node.checkInPowerFactor(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				result.forEach(function (row) {
					nodeId.forEach(nodeId => {
						if (null != row['node'] && -1 != row['node'].indexOf(nodeId)) {
							nodeFound = true;
							idAry.push(row['app_id']);
							otherDataAry.push(row['app_name']);
						}
					});
				})
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'power factor app', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInAlarm(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			var idAry = [];
			let otherDataAry = [];
			node.checkInAlarm(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				result.forEach(function (row) {
					var queryData = JSON.parse(row['query']);
					nodeId.forEach(nodeId => {
						if (nodeId == queryData['query']['group']['rules'][0]['node']['nodeId']) {
							nodeFound = true;
							idAry.push(row['alarm_id']);
							otherDataAry.push(row['title']);
						}
					});
				})
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'alarm', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}

function checkInNotification(userId, companyId, nodeId) {
	try {
		return new Promise((resolve, reject) => {
			var nodeFound = false;
			var idAry = [];
			let otherDataAry = [];
			node.checkInNotification(userId, companyId, function (err, result) {
				if (err) return reject(0);
				if (!result) return resolve(1);
				result.forEach(function (row) {
					nodeId.forEach(nodeId => {
						if (nodeId == row['node_id']) {
							nodeFound = true;
							idAry.push(row['notification_id']);
							otherDataAry.push(row['title']);
						}
					});
				})
				return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'notification', idAry: idAry, otherDataAry: otherDataAry });
			});
		});
	}
	catch (Exception) { return reject(Exception); }
}
/* **added for user wise to check in every possible app end */

router.post('/userData', authenticationHelpers.isClientAuth, function (req, res) {
	user.userData(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/deleteUser', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 4, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		user.deleteUser(req.body.id, req.session.passport.user.user_id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "User deleted successfully." });
			res.end();
			return res;
		});
	});
});

router.post('/submitChangePwd', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 7, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		req.checkBody("data.password", "Password is required.").notEmpty();
		req.checkBody("data.confirmPassword", "Passwords do not match.").equals(req.body.data.password);
		var errorMsg = '';
		req.getValidationResult().then(function (errors) {
			if (!errors.isEmpty()) {
				errors.array().map(function (elem) {
					errorMsg += elem.msg + "\n";
				});
				errorMsg = errorMsg.trim("\n");
				res.json({ "error": true, "reason": errorMsg });
				return res;
			}
			commonfunctionmodel.getPasswordHistory(req.body.id, function (err, result) {
				if (err) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return res;
				}
				var passwordHistoryAry = [], pwdExists = 0;
				if (null != result['password_history'] && '' != result['password_history']) {
					result['password_history'].forEach(password => {
						if (true == bcrypt.compareSync(req.body.data.password, password)) {
							pwdExists = 1;
						}
						passwordHistoryAry.push(password);
					});
				}
				if (pwdExists) {
					res.json({ "error": true, "reason": "Error: New password must be different from your last 5 passwords!" });
					return res;
				}
				passwordHistoryAry.push(bcrypt.hashSync(req.body.data.password));
				if (passwordHistoryAry.length > 5) passwordHistoryAry.shift();
				user.changePwd(req.body, passwordHistoryAry, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "User password updated successfully." });
					res.end();
					return res;
				});
			});
		});
	});
});

router.post('/submitPermission', authenticationHelpers.isClientAuth, function (req, res) {
	user.submitPermission(req.body, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "User permission updated successfully." });
		res.end();
		return res;
	});
});

function sendEmailToUser(userDetail, userId) {
	return new Promise((resolve, reject) => {
		try {
			var baseLink = marcconfig.ANGULARBASEPATH + '/#/confirm/';
			var htmlObj = {};
			htmlObj['user'] = userDetail.firstName + ' ' + userDetail.lastName;
			htmlObj['body'] = '<p>You are receiving this email because you have been added as MARC user.<br> Please <a href="' + baseLink + userId + '">click here</a> to confirm your email address and activate account.</p>';
			htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
			htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
			ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
				var mailOptions = {
					from: marcconfig.SMTPFROMNAME,
					to: userDetail.email,
					subject: 'MARC email confirmation',
					html: html
				};
				mailSettingDetails.sendMail(mailOptions, function (error, info) {
					if (error) {
						return reject(error);
					}
					return resolve('done');
				});
			});
		}
		catch (exception) {
			return reject(exception);
		}
	});
}

router.post('/setUserCookies', authenticationHelpers.isClientAuth, function (req, res) {
	user.setUserCookies(req.session.passport.user.user_id, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "reason": "User cookies updated successfully." });
		res.end();
		return res;
	});
});

router.post('/setUserDeviceIds', authenticationHelpers.isClientAuth, function (req, res) {
	user.setUserDeviceIds(req.body, req.session.passport.user.user_id, function (err) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		var htmlObj = {};
		htmlObj['user'] = req.session.passport.user.firstname + ' ' + req.session.passport.user.lastname;
		htmlObj['body'] = '<p>Your MARC Account was just signed in to from ' + req.headers['user-agent'] + '. You&#39;re getting this email to make sure it was you.<br>IP : ' + req.body.deviceData['ip'] + '<br>City : ' + req.body.deviceData['city'] + '<br>Country : ' + req.body.deviceData['country'] + '</p>';
		htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
		htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
		ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
			var mailOptions = {
				from: marcconfig.SMTPFROMNAME,
				to: req.session.passport.user.email_address,
				subject: 'MARC Security Alert : New device signed',
				html: html
			};
			mailSettingDetails.sendMail(mailOptions, function (error, info) {
				if (error) {
					res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
					return;
				}
				res.json({ "error": false, "reason": "User devices updated successfully." });
				res.end();
				return res;
			});
		});
	});
});

router.post('/userAlreadyExists', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 2, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		user.emailOrMobileAlreadyExists(req.body.email, 'email_address', function (err, emailResult) {
			// console.log('!!!!!!!!!!!!!!!!!!!!!!!!',emailResult);
			// if (err) {
			// 	//console.log('!!!!!!!!!!!!!!!!!!!!!!!!',err);
			// 	res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!666666666666" });
			// 	return res;
			// }
			if (emailResult && 'undefined' != typeof emailResult) {
				if (emailResult['partners'] && req.body.userSide == 'partner') {
					res.json({ "error": true, "reason": "User with this email is already added partner." });
					return res;
				}
				if (!emailResult['is_active']) {
					res.json({ "error": true, "reason": "This email is currently inactive. Please activate it through confirmation email!" });
					return res;
				}
				if ('contact' == emailResult['user_type']) {
					res.json({ "error": true, "reason": "This email is already associated with other directory user." });
					return res;
				}
				if (emailResult['companies'] != null && emailResult['companies'].hasOwnProperty(req.body.companyId)) {
					res.json({ "error": true, "reason": "User with this email is already added in selected company." });
					return res;
				}

				res.json({ "error": true, "reason": "This email is already associated with other user!", result: emailResult });
				res.end();
				return res;
			}
			if (!emailResult || 'undefined' == typeof emailResult) {
				user.emailOrMobileAlreadyExists(req.body.mobile, 'mobile_number', function (err, mobileResult) {
					if (mobileResult && 'undefined' != typeof mobileResult) {
						if (mobileResult['partners'] && req.body.userSide == 'partner') {
							res.json({ "error": true, "reason": "User with this email is already added partner." });
							return res;
						}
						if (!mobileResult['is_active']) {
							res.json({ "error": true, "reason": "This mobile is currently inactive. Please activate it through confirmation email!" });
							res.end();
							return res;
						}
						if ('contact' == mobileResult['user_type']) {
							res.json({ "error": true, "reason": "This mobile is already associated with other directory user." });
							return res;
						}
						if (mobileResult['companies'].hasOwnProperty(req.body.companyId)) {
							res.json({ "error": true, "reason": "User with this mobile is already added in selected company." });
							return res;
						}
						res.json({ "error": true, "reason": "This mobile is already associated with other user!", result: mobileResult });
						res.end();
						return res;
					}
					if ('undefined' == typeof emailResult && 'undefined' == typeof mobileResult || !emailResult || !mobileResult) {

						res.json({ "error": false, "reason": "No record found!" });
						res.end();
						return res;
					}
				});
			}
		});
	});
});

router.post('/updateCompanyIdForExistingUser', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 3, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		user.updateCompanyIdForExistingUser(req.body, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			try {
				var htmlObj = {};
				htmlObj['user'] = req.body['firstname'] + ' ' + req.body['lastname'];
				htmlObj['body'] = '<p>You are receiving this email because you have been added as MARC user in ' + req.session.passport.user.company_name + ' company by ' + req.session.passport.user.firstname + ' ' + req.session.passport.user.lastname + '.</p>';
				htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
				htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
				ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
					var mailOptions = {
						from: marcconfig.SMTPFROMNAME,
						to: req.body['email_address'],
						subject: 'MARC Alert',
						html: html
					};
					mailSettingDetails.sendMail(mailOptions, function (error, info) {
						if (error) {
							res.json({ "error": false, "reason": "Error: User Added email not sent to user!" });
							res.end();
							return res;
						}
						res.json({ "error": false, "reason": "User added successfully." });
						res.end();
						return res;
					});
				});
			}
			catch (exception) {
				res.json({ "error": false, "reason": "Error: User Added email not sent to user!" });
				res.end();
				return res;
			}
		});
	});
});

router.post('/companyNamesFromIds', authenticationHelpers.isClientAuth, function (req, res) {
	user.companyNamesFromIds(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/deleteUserFromCompany', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 4, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		user.deleteUserFromCompany(req.body, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			res.json({ "error": false, "reason": "User deleted successfully." });
			res.end();
			return res;
		});
	});
});


router.post('/singleUserList', function (req, res) {
	user.singleUserList(req.body.id, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		if (!result) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
})

module.exports = router;
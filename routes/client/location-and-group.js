var express = require('express');
var router = express.Router();
var locationandgroup = require(__base + 'models').locationandgroup;
var commonfunctionmodel = require(__base + 'models').commonfunction;
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');

router.post('/locationList', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 8, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.locationList(req.session.passport.user.company_id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!result) {
				res.json({ "error": true, "reason": "No records found." });
				return res;
			}
			if (result) {
				var locations = result;
				var parentWiseLocationArray = {};
				var parent_id = 0;

				for (var loc in locations) {
					parent_id = ('null' == locations[loc].parent) ? 0 : locations[loc].parent;
					if ('undefined' == typeof parentWiseLocationArray[parent_id]) {
						parentWiseLocationArray[parent_id] = {};
					}
					if ('undefined' == typeof parentWiseLocationArray[parent_id][locations[loc].location_id]) {
						parentWiseLocationArray[parent_id][locations[loc].location_id] = {};
					}
					parentWiseLocationArray[parent_id][locations[loc].location_id] = locations[loc];
				}
				var locationTreeData = generateLocationTree(parentWiseLocationArray);
				res.json({ "error": false, "result": locationTreeData });
				res.end();
				return res;
			}
		});
	});
});

router.post('/locationData', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 10, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.locationData(req.body, function (err, result) {
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

router.post('/submitLocation', authenticationHelpers.isClientAuth, function (req, res, next) {
	var permissionId = ('add' == req.body.action) ? 9 : 10;
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, permissionId, function (data) {
	 
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		req.checkBody("data.locationName", "Location name must be atleast 2 characters.").isLength(2);
		if ('sub' == req.body.data.hierarchy) {
			req.checkBody("parentLocation", "Parent location is required.").notEmpty();
		}
		if ('parent' == req.body.data.hierarchy) {
			//req.checkBody("data.timezone", "Timezone is required.").notEmpty();
		}
		req.checkBody("data.hierarchy", "Location hierarchy is required.").notEmpty();
		//req.checkBody("data.addrLine1", "Address line 1 is required.").notEmpty();
		//req.checkBody("data.addrLine2", "Address line 2 is required.").notEmpty();
		//req.checkBody("data.pincode", "Pincode must be digits.").isNumeric();
		req.checkBody("data.pincode", "Pincode must be between 5 to 10 digits.").isLength(5, 10);
		req.checkBody("data.country", "Country is required.").notEmpty();
		req.checkBody("data.state", "State is required.").notEmpty();
		req.checkBody("data.city", "City is required.").notEmpty();
		req.checkBody("data.latitude", "Latitude is required.").notEmpty();
		req.checkBody("data.longitude", "Longitude is required.").notEmpty();
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
				locationandgroup.addLocation(req.body, req.session.passport.user, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						 
					}
					res.json({ "error": false, "reason": "Location added successfully." });
					res.end();
					return res;
				});
			}

			if (req.body.action == 'edit') {
				locationandgroup.editLocation(req.body, req.body.id, req.session.passport.user.user_id, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					Promise.all([updateLocationShifts(req.body, res)]).then(function (shiftresult) {
						if ('parent' == req.body.data.hierarchy) {
							var latlong = { 'latitude': parseFloat(req.body.data.latitude), 'longitude': parseFloat(req.body.data.longitude) };
							Promise.all([
								addTimezoneToNode(req, res)
							]).then(function (result) {
								if ('done' == result[0]) {
									res.json({ "error": false, "reason": "Location " + req.body.action + "ed successfully." });
									res.end();
									return res;
								}
							}).catch(error => {
								res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
								return res;
							});
						}
						else {
							res.json({ "error": false, "reason": "Location " + req.body.action + "ed successfully." });
							res.end();
							return res;
						}
					}).catch(error => {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					});
				});
			}
		});
	});
});


router.post('/uniqueName', authenticationHelpers.isClientAuth, function (req, res) {
	var companyId = req.session.passport.user.company_id;
	locationandgroup.uniqueName(req.body, companyId, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/deleteLocation', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 11, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.locationChildExists(req.body.id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (0 === Object.keys(result).length) {
				locationandgroup.deleteLocation(req.body.id, req.session.passport.user.user_id, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Location deleted successfully." });
					res.end();
					return res;
				});
			}
			else {
				res.json({ "error": false, "reason": "Cannot delete this location as it has either child location or child nodes." });
				return res;
			}
		});
	});
});

router.post('/timezone', authenticationHelpers.isClientAuth, function (req, res) {
	locationandgroup.timezone(function (err, result) {
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

/* router.post('/grouplist', authenticationHelpers.isClientAuth, function(req, res){
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user,12,function(data){
		if(false == data){
			res.json({"error" : true,"reason": "Error: Permission Denied!"}); 
			return res;
		}
		locationandgroup.grouplist(req.session.passport.user.company_id,function(err, result){
			if (err) { 
				res.json({"error" : true,"reason": "Error: Something went wrong. Please try again!"}); 
				return res;
			}
			if (!result) {  
				res.json({"error" : true,"reason": "No records found."}); 
				return res; 
			}
			if(result){
				var groups = result;
		var parentWiseGroupArray = {};
		var parent_id = 0;
		for (var group in groups) {
		  parent_id = ('null' == groups[group].parent_group_id) ? 0 : groups[group].parent_group_id;
		  if('undefined' == typeof parentWiseGroupArray[parent_id]){
			parentWiseGroupArray[parent_id] = {};
		  }
		  if('undefined' == typeof parentWiseGroupArray[parent_id][groups[group].group_id] ){
			parentWiseGroupArray[parent_id][groups[group].group_id]  = {};
		  }
		  parentWiseGroupArray[parent_id][groups[group].group_id] = groups[group];
		}
				var groupTreeData = commonfunctionmodel.generateGroupTree(parentWiseGroupArray);
				res.json({"error" : false,"result": groupTreeData});
				res.end();
				return res;
			}
		});
	});
}); */

router.post('/grouplist', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 12, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.grouplist(req.session.passport.user.company_id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (!result) {
				res.json({ "error": true, "reason": "No records found." });
				return res;
			}
			if (result) {
				var groupTreeData = commonfunctionmodel.testgrouptree(result);
				res.json({ "error": false, "result": groupTreeData });
				res.end();
				return res;
			}
		});
	});
});

router.post('/groupData', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 14, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.groupData(req.body, function (err, result) {
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

router.post('/submitgroup', authenticationHelpers.isClientAuth, function (req, res, next) {
	var permissionId = ('add' == req.body.action) ? 13 : 14;
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, permissionId, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		req.checkBody("data.groupName", "Group name must be atleast 2 characters.").isLength(2);
		/* if ('sub' == req.body.data.hierarchy) {
			req.checkBody("parentGroupId", "Parent group is required.").notEmpty();
		} */
		// req.checkBody("data.hierarchy", "Group hierarchy is required.").notEmpty();
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
				locationandgroup.addGroup(req.body, req.session.passport.user, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Group added successfully." });
					res.end();
					return res;
				});
			}

			if (req.body.action == 'edit') {
				locationandgroup.editGroup(req.body, req.body.id, req.session.passport.user.user_id, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Group updated successfully." });
					res.end();
					return res;
				});
			}
		});
	});
});

router.post('/uniqueGroupName', authenticationHelpers.isClientAuth, function (req, res) {
	locationandgroup.uniqueGroupName(req.body, function (err, result) {
		if (err) {
			res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
			return res;
		}
		res.json({ "error": false, "result": result });
		res.end();
		return res;
	});
});

router.post('/deleteGroup', authenticationHelpers.isClientAuth, function (req, res) {
	commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 15, function (data) {
		if (false == data) {
			res.json({ "error": true, "reason": "Error: Permission Denied!" });
			return res;
		}
		locationandgroup.groupChildExists(req.body.id, function (err, result) {
			if (err) {
				res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
				return res;
			}
			if (0 === Object.keys(result).length) {
				locationandgroup.deleteGroup(req.body.id, req.session.passport.user.user_id, function (err) {
					if (err) {
						res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
						return res;
					}
					res.json({ "error": false, "reason": "Group deleted successfully." });
					res.end();
					return res;
				});
			}
			else {
				res.json({ "error": false, "reason": "Cannot delete this group as it has either child group or child nodes." });
				return res;
			}
		});
	});
});

addTimezoneToNode = function (req, res) {
	return new Promise((resolve, reject) => {
		locationandgroup.getNodesByLocationId(req.session.passport.user.company_id, req.body.id, function (error, result) {
			if (error) {
				return reject(error);
			}
			if (!result || 0 == result.length) {
				return resolve('done');
			}
			var postDataObj = {};
			var nodeObj = {};
			for (var node of result) {
				nodeObj[node.node_id] = node.node_unique_id;
			}
			postDataObj['nodeObj'] = nodeObj;
			
			var tz = req.body.data.timezone.split('|');
			postDataObj['timezone'] = tz[0];
			postDataObj['timezoneOffset'] = tz[1];
			locationandgroup.updateTimezoneInNode(postDataObj, req.session.passport.user.company_id, function (err) {
				if (err) {
					return reject(err);
				}
				return resolve('done');
			});
		});
	});
}

router.post('/parentLocationData', authenticationHelpers.isClientAuth, function (req, res) {
 
	Promise.all([
		
		findParentLocationData(req.body, res),
		
		findLocationShift(req.body, res),
	
	]).then(function (result) {
		if (('undefined' == typeof result[0] || result[0].length == 0) || ('undefined' == typeof result[1] || result[1].length == 0)) {
			res.json({ "error": true, "reason": "No records found." });
			return res;
		}
		res.json({ "error": false, "result": result });
	 
		res.end();
		return res;
	}).catch(error => {
		res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
		return res;
	});
});

updateLatLongInAllSubLocation = function (id, latlong, res) {
	return new Promise((resolve, reject) => {
		locationandgroup.findBymainLocationId(id, latlong, function (err, result) {
			if (err) {
				return reject(err);
			}
			return resolve('done');
		});
	});
}

updateLocationShifts = function (data, res) {
	if ('parent' == data.data.hierarchy && (data.data.parentLocation == 'null' || !data.data.parentLocation)) {
		return new Promise((resolve, reject) => {
			locationandgroup.findLocationsAndUpdateShifts(data, 'main_location_id', function (err, result) {
				if (err) {
					return reject(err);
				}
				return resolve('done');
			});
		});
	}
	else if ('sub' == data.data.hierarchy && data.data.mainLocationId == data.data.parentLocation) {
		return new Promise((resolve, reject) => {
			locationandgroup.findLocationsAndUpdateShifts(data, 'parent', function (err, result) {
				if (err) {
					return reject(err);
				}
				return resolve('done');
			});
		});
	}
}

findParentLocationData = function (data, res) {
 
	return new Promise((resolve, reject) => {
		locationandgroup.parentLocationData(data, function (err, result) {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
}

findLocationShift = function (data, res) {
	return new Promise((resolve, reject) => {
		locationandgroup.findLocationShift(data, function (err, result) {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
}

generateLocationTree = function (parentWiseLocationArray, locationId = 0) {
	var locationObject = [];
	var index = 0;
	for (var loc in parentWiseLocationArray[0]) {
		//If this function calls from edit form then check location id with edit location id, if its same then leave current location and its sublocations.
		if (locationId == parentWiseLocationArray[0][loc].location_id) {
			continue;
		}
		var id = parentWiseLocationArray[0][loc].location_id; // Main parent location id
		locationObject[index] = { id: id, name: parentWiseLocationArray[0][loc].location_name, children: [], mainLocId: id, isChecked: false };
		if ('undefined' != typeof parentWiseLocationArray[id]) {
			locationObject[index] = generateLocationChildrens(parentWiseLocationArray, parentWiseLocationArray[id], locationObject[index], locationId, id);
		}
		index++;
	}
	return locationObject;
}
router.post('/getcompanydata', function(req, res){
	locationandgroup.companydata(req.body.id,function (err, result){
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





generateLocationChildrens = function (parentWiseLocationArray, parentWiseLocation, locationObject, locationId, mainLocId) {
	for (var loc in parentWiseLocation) {
		//If this function calls from edit form then check location id with edit location id, if its same then leave current location and its sublocations.
		if (locationId == parentWiseLocation[loc].location_id) {
			parentLocationName = locationObject.name;
			continue;
		}
		var id = parentWiseLocation[loc].location_id;
		var index = locationObject['children'].length;
		locationObject['children'][index] = { id: id, name: parentWiseLocation[loc].location_name, children: [], mainLocId: mainLocId, isChecked: false };
		if ('undefined' != typeof parentWiseLocationArray[id]) {
			locationObject['children'][index] = generateLocationChildrens(parentWiseLocationArray, parentWiseLocationArray[id], locationObject['children'][index], locationId, mainLocId);
		}
	}
	return locationObject;
}
module.exports = router;
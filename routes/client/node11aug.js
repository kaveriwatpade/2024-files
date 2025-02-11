var express = require('express');
var router = express.Router();
var node = require(__base + 'models').node;
var authenticationHelpers = require('../authentication-helpers');
var logic = require(__base + 'models').logic;
var general = require(__base + 'models').general;
var lodash = require('lodash');
var ejs = require('ejs');
var Promise = require('promise');
var nioAPIHelper = require('./nioapi');
const nioAPI = new nioAPIHelper();

router.post('/list', authenticationHelpers.isClientAuth, function (req, res) {
  commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 20, function (data) {
    if (false == data) {
      res.json({ "error": true, "reason": "Error: Permission Denied!" });
      return res;
    }
    node.list(req.session.passport.user.company_id, function (err, result) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!result) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      var responseObj = { 'nodeList': [], 'nodeModelAry': [], 'gatewayAry': [] };
      for (let i = 0; i < result.length; i++) {
        if ('Company Admin' != req.session.passport.user['role_name'] && null != result[i].access_denied_users && -1 != result[i].access_denied_users.indexOf(req.session.passport.user['user_id'])) continue;
        responseObj['nodeList'].push(result[i]);
      }
      node.nodeModelDataBridgeList(req.session.passport.user.company_id, responseObj['nodeList'], function (err, nodeModelDataBridgeObj) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        responseObj['nodeModelAry'] = nodeModelDataBridgeObj['nodeModelAry'];
        responseObj['gatewayAry'] = nodeModelDataBridgeObj['gatewayAry'];
        res.json({ "result": responseObj });
        res.end();
        return res;
      });
    });
  });
});

router.post('/nodeType', authenticationHelpers.isClientAuth, function (req, res) {
  node.nodeType(function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    if (!result) {
      res.json({ "error": true, "reason": "No records found." });
      return res;
    }
    result.forEach(function (user, k) {
      if (user.user_id == req.session.passport.user.user_id) {
        result.splice(k, 1);
      }
    });
    res.json({ "result": result });
    res.end();
    return res;
  });
});

// router.post('/nodeData', authenticationHelpers.isClientAuth, function (req, res) {
//   commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 22, function (data) {
//     if (false == data) {
//       res.json({ "error": true, "reason": "Error: Permission Denied!" });
//       return res;
//     }
    
//     node.nodeData(req.body, function (err, result) {
//       if (err) {
//         res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//         return res;
//       }
//       if (!result) {
//         res.json({ "error": true, "reason": "No records found." });
//         return res;
//       }
//       res.json({ "result": result });
//       res.end();
//       return res;
//     });
//   });
// });
router.post('/nodeData', authenticationHelpers.isClientAuth, function (req, res) {
  commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 22, function (data) {
    if (false == data) {
      res.json({ "error": true, "reason": "Error: Permission Denied!" });
      return res;
    }
    logic.getNodesMapping(req.body, function (logicErr, logicResult) {
      if (logicErr) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      node.nodeData(req.body, req.session.passport.user, function (err, result) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        if (!result) {
          res.json({ "error": true, "reason": "No records found." });
          return res;
        }
        res.json({ "result": result, "mapping": logicResult });
        res.end();
        return res;
      });
    });
  });
});
router.post('/submitNode', authenticationHelpers.isClientAuth, function (req, res) {
  var permissionId = ('add' == req.body.action) ? 21 : 22;
  commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, permissionId, function (data) {
    if (false == data) {
      res.json({ "error": true, "reason": "Error: Permission Denied!" });
      return res;
    }
    req.checkBody("data.nodeUniqueId", "Node Unique ID is required.").notEmpty();
    req.checkBody("data.nodeName", "Node Name must be atleast 3 characters.").isLength(3);
    req.checkBody("data.parentNode", "Parent Node is required.").notEmpty();
    req.checkBody("data.location", "Location is required.").notEmpty();
    req.checkBody("data.subLocation", "Sub Location is required.").notEmpty();
    req.checkBody("data.gateway", "Gateway is required.").notEmpty();
    req.checkBody("data.nodeModel", "Node Model is required.").notEmpty();
    req.checkBody("data.nodeType", "Node Type is required.").notEmpty();
    if (req.body.data.sourceType != null) {
      req.checkBody("data.sourceType", "Source Type is required.").notEmpty();
    }
    if (req.body.data.loadType != null) {
      req.checkBody("data.loadType", "Load Type is required.").notEmpty();
    }
    var errorMsg = '';
    req.getValidationResult().then(function (err) {
      if (!err.isEmpty()) {
        err.array().map(function (elem) {
          errorMsg += elem.msg + "\n";
        });
        errorMsg = errorMsg.trim("\n");
        res.json({ "error": true, "reason": errorMsg });
        return res;
      }
      var nodeId = '';
      if (req.body.id) {
        nodeId = req.body.id;
      }
      var queryParameters = { gateway: req.body.data.gateway, nodeAddress: req.body.data.nodeAddress, nodeId: nodeId, companyId: req.session.passport.user.company_id };
      node.uniqueDeviceIdNodeAddress(queryParameters, function (err, result) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        if (result > 0) {
          res.json({ "error": true, "reason": "Error: Node address is already assigned to this gateway." });
          res.end();
          return res;
        }
        req.body.dbNodeDataSettingsStr = '';
        var nioAPIObj = {};
        nioAPIObj[req.body.data.nodeUniqueId] = (req.body.parameterMapping != null) ? JSON.parse(req.body.parameterMapping) : null;
        // nioAPIObj[req.body.data.nodeUniqueId] = {"nodeID":req.body.data.nodeUniqueId,"equation":'',"companyID":req.session.passport.user.company_id};
        if (req.body.nodeDataSettings) {
          var nodeDataSettingsObj = req.body.nodeDataSettings ? JSON.parse(req.body.nodeDataSettings) : {};
          delete nodeDataSettingsObj['queryLength'];
          delete nodeDataSettingsObj['indexing'];
          req.body.dbNodeDataSettingsStr = JSON.stringify(nodeDataSettingsObj);
          // nioAPIObj[req.body.data.nodeUniqueId]["equation"] = (nodeDataSettingsObj['equations']) ? extractEquations(nodeDataSettingsObj['equations']) : '';
        }
        req.body.data.user = (req.body.data.user && 'undefined' != typeof req.body.data.user) ? req.body.data.user.join(",") : '';
        var onOffNotificationObj = {};
        onOffNotificationObj['communicationType'] = req.body.data.communicationType;
        onOffNotificationObj['frequency'] = req.body.data.frequency;
        onOffNotificationObj['user'] = req.body.data.user;
        if (req.body.action == 'add') {
          node.uniqueNodeId(req.body.data.nodeUniqueId, function (err, result) {
            if (err) {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              return res;
            }
            if (result == 0) {
              res.json({ "error": true, "reason": "Error: Please generate node id again!", "alreadyexists": 1 });
              return res;
            }
            node.addNode(req.body, req.session.passport.user, function (err, result) {
              if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + err });
                return res;
              }
              //Function to insert into logic
              Promise.all([logicInsert(req), updateMultiplyingFactorSettingInSession(req)]).then(function (result) {
                if (!result[0] || !result[1]) {
                  res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                  return res;
                }
                if (nioAPIObj[req.body.data.nodeUniqueId] != null) {
                  nioAPI.addEditNodeInNioJob(JSON.stringify(nioAPIObj), function (err, status) {
                    if (status == 'success' && err != null) {
                      res.json({ "error": false, "reason": "Node added successfully." });
                      res.end();
                      return res;
                    }
                    else {
                      res.json({ "error": false, "reason": err });
                      res.end();
                      return res;
                    }
                  });
                }
                // res.json({ "error": false, "reason": "Node added successfully." });
                // res.end();
                // return res;
              }).catch(error => {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + error });
                return res;
              });
            });
          });
        }
        if (req.body.action == 'edit') {
          node.updateNode(req.body, req.session.passport.user, function (err, result) {
            if (err) {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
              return res;
            }
            //If node data settings or node model changed then insert into logic
            if (req.body.dbNodeDataSettingsStr != req.body.dbNodeDataSettings || req.body.data.dbNodeModelId != req.body.data.nodeModel || JSON.stringify(onOffNotificationObj) != JSON.stringify(req.body.dbOnOffNotification)) {
              Promise.all([logicInsert(req), updateMultiplyingFactorSettingInSession(req)]).then(function (result) {
                if (!result[0] || !result[1]) {
                  console.log('result node', result);
                  res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                  return res;
                }
                if (nioAPIObj[req.body.data.nodeUniqueId] != null) {
                  nioAPI.addEditNodeInNioJob(JSON.stringify(nioAPIObj), function (err, status) {
                    if (err) {
                      res.json({ "error": true, "reason": err });
                      res.end();
                      return res;
                    }
                    else {
                      res.json({ "error": false, "reason": "Node model updated successfully." });
                      res.end();
                      return res;
                    }
                  });
                }
              }).catch(error => {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" + error });
                return res;
              });
            }
            else {
              res.json({ "error": false, "reason": "Node updated successfully." });
              res.end();
              return res;
            }
          });
        }
      });
    });
  });
});

extractEquations = function (equations) {
  var equationString = '';
  //If equations are there in array, prepare in the following format:
  //ParameterId,=,Equation,,(double comma)
  //Single Comma for separating each entity i.e ParameterId/Constant/Operator
  //Double comma for separating two different equations eg. ParameterId,=,Equation,,ParameterId,=,Equation,,ParameterId,=,Equation
  for (var equationIndex in equations) {
    equationString += equationIndex + ',=,' + equations[equationIndex] + ',,';
  }
  equationString = equationString.substring(0, equationString.length - 2);
  return equationString;
};

logicInsert = function (req) {
  mapping = (req.body.parameterMapping != null) ? req.body.parameterMapping : null;
  return new Promise((resolve, reject) => {
    var userId = req.body.data.onOffNotification ? req.body.data.user : '';
    var nodeData = [];
    nodeData.push({ nodeUniqueId: req.body.data.nodeUniqueId, companyId: req.session.passport.user.company_id, nodeName: req.body.data.nodeName, nodeDataSettings: req.body.nodeDataSettings, nodeParameterIds: req.body.nodeModelParameterIdAry.toString(), communicationType: req.body.data.communicationType, frequency: req.body.data.frequency, userId: userId, parameterMapping: mapping });
    logic.insertToLogic(nodeData, function (err) {
      if (err) {
        return reject(0);
      }
      return resolve(1);
    });
  });
}

updateMultiplyingFactorSettingInSession = function (req) {
  return new Promise((resolve, reject) => {
    req.session.passport.user.nodeObj[req.body.data.nodeUniqueId] = req.body.dbNodeDataSettingsStr;
    myCache.set("multiplyingFactorNodeSettingObj" + req.session.passport.user.company_id, req.session.passport.user.nodeObj);
    req.logIn(req.session.passport.user, function (err) {
      if (err) return reject(0);
      req.session.save();
      return resolve(1);
    })
  });
}

router.post('/deleteNode', authenticationHelpers.isClientAuth, function (req, res) {
  commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 23, function (data) {
    if (false == data) {
      res.json({ "error": true, "reason": "Error: Permission Denied!" });
      return res;
    }
    if ('undefined' == typeof req.body.id || 'undefined' == typeof req.body.nodeName || 'undefined' == typeof req.body.nodeUniqueId || '' == req.body.id || '' == req.body.nodeName || '' == req.body.nodeUniqueId) {
      res.json({ "error": true, "reason": "Error: Please select node." });
      return res;
    }

    queryParameters = { fields: 'parent_node_id', company_id: req.session.passport.user.company_id };
    node.nodeList(req.session.passport.user.company_id, function (err, result) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      isParent = 0;
      if (result.length > 0) {
        result.forEach(function (node) {
          if (node.parent_node_id != "null" && node.parent_node_id != null) {
            parentNodeAry = node.parent_node_id.split(',');
            if (parentNodeAry.indexOf(req.body.id) !== -1) {
              isParent = 1;
            }
          }
        });
      }
      if (isParent) {
        res.json({ "error": true, "reason": "Error: Node is set as Parent node." });
        res.end();
        return res;
      }
      checkNodeAssignedToUser('', req.session.passport.user.company_id, req.body.id, function (result) {
        if (0 == result['status'] || 2 == result['status']) {
          var msg = (0 == result['status']) ? "Error: Something went wrong. Please try again!" : "Cannot delete this node, as used by some user's";
          res.json({ "error": true, "reason": msg });
          return res;
        }
        try {
          nioAPI.deleteNodeInNioJob(req.body.nodeUniqueId, function (err, data) {
            if (err) {
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again !!!" });
              return res;
            }
            node.delete(req.body, req.session.passport.user.user_id, req.session.passport.user.company_id, function (err, result) {
              if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
              }
              logic.delete([req.body.nodeUniqueId], function (err, del) {
                deleteReceiverFileFromWSO2(req, res, req.body.nodeUniqueId);
              });
            });
          });

        } catch (e) {
          console.log(e);
        }
      });
    });
  });
});

router.post('/uniqueNode', authenticationHelpers.isClientAuth, function (req, res) {
  node.uniqueNode(req.body, req.session.passport.user.company_id, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});

router.post('/nodeModelData', authenticationHelpers.isClientAuth, function (req, res) {
  commonfunctionmodel.checkIfPermissionExists(req.session.passport.user, 24, function (data) {
    if (false == data) {
      res.json({ "error": true, "reason": "Error: Permission Denied!" });
      return res;
    }
    node.nodeModelData(req.body.id, function (err, result) {
      if (err) {
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        return res;
      }
      if (!result) {
        res.json({ "error": true, "reason": "No records found." });
        return res;
      }
      res.json({ "result": result });
      res.end();
      return res;
    });
  });
});

deleteReceiverFileFromWSO2 = function (req, res) {
  /* WSO2 connection is done in general.js file. if connection successfull then proceed else return */
  general.ssh2Connection(function (err, sftp) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    try {
      var readStream = sftp.createReadStream(marcconfig.REMOTEPATHFORRECEIVER + req.body.deviceIdNodeAddress + '.xml');
      /* if receiver file not found then return */
      readStream.on('error', function (err) {
        var errToString = err.toString();
        if ('Error: No such file' == errToString) {
          res.json({ "error": false, "reason": "Node deleted successfully." });
          res.end();
          return res;
        }
      });
      /* if receiver file already exist then delete receiver file from wso2 receiver path specified in config file */
      readStream.on('data', function (chunk) {
        sftp.unlink(marcconfig.REMOTEPATHFORRECEIVER + req.body.deviceIdNodeAddress + '.xml', function (err) {
          if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
          }
          res.json({ "error": false, "reason": "Node deleted successfully." });
          res.end();
          return res;
        });
      });
    }
    catch (exception) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
  });
}

router.post('/checkNodeAssignedToUser', authenticationHelpers.isClientAuth, function (req, res) {
  //List of all module displayed in sidebar mut be same as in checkNodeAssignedToUser function on nodejs side.
  checkNodeAssignedToUser(req.body.userId, req.session.passport.user.company_id, req.body.nodeId, function (result) {
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
    if ('' == msg) return res.json({ "error": false, "result": 0 });
    else {
      msg = msg.replace(/,\s*$/, "");
      emailMsg = emailMsg.replace(/,\s*$/, "");
      Promise.all([sendEmailToUser(req.session.passport.user, req.body, emailMsg)]).then(function (result) {
        var displayMsg = "You cannot unassign this node for selected user as he/she has configured this node on below modules - <br>" + msg + ". <br>Also, please check your mail id for more details.";
        res.json({ "error": true, "reason": displayMsg, "result": moduleWiseIdForDeletionObj });
        return res;
      }).catch(error => {
        return res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      });
    }
  });
});

function checkNodeAssignedToUser(userId, companyId, nodeId, fn) {
  var promiseAry = [checkInDashboard(userId, companyId, nodeId), checkInTimeSlice(userId, companyId, nodeId), checkInScada(userId, companyId, nodeId), checkInCustomExcel(userId, companyId, nodeId), checkInSolarPlant(userId, companyId, nodeId), checkInTransformer(userId, companyId, nodeId), checkInPowerFactor(userId, companyId, nodeId), checkInAlarm(userId, companyId, nodeId), checkInNotification(userId, companyId, nodeId)];//pushed all module displayed in sidebar in promise array.
  Promise.all(promiseAry).then(function (nodeExistResult) {
    return fn(nodeExistResult);
  }).catch(nodeExistResultError => {
    return fn(nodeExistResultError);
  });
}

/* function checkNodeAssignedToUser1(userId, companyId, nodeId, fn) {
  Promise.all([checkInDashboard(userId, companyId, nodeId)]).then(function (dashoboardResult) {
    console.log('dashoboardResult',dashoboardResult)
    if (0 == dashoboardResult[0]) return fn({ 'status': 0, 'type': 'dashboard' });
    if (2 == dashoboardResult[0]) return fn({ 'status': dashoboardResult[0], 'type': 'dashboard' });
    Promise.all([checkInTimeSlice(userId, companyId, nodeId)]).then(function (timeSliceResult) {
      if (0 == timeSliceResult[0]) return fn({ 'status': 0, 'type': 'time slice app' });
      if (2 == timeSliceResult[0]) return fn({ 'status': timeSliceResult[0], 'type': 'time slice app' });
      Promise.all([checkInScada(userId, companyId, nodeId)]).then(function (scadaResult) {
        if (0 == scadaResult[0]) return fn({ 'status': 0, 'type': 'SCADA app' });
        if (2 == scadaResult[0]) return fn({ 'status': scadaResult[0], 'type': 'SCADA app' });
        Promise.all([checkInCustomExcel(userId, companyId, nodeId)]).then(function (customExcelResult) {
          if (0 == customExcelResult[0]) return fn({ 'status': 0, 'type': 'custom excel app' });
          if (2 == customExcelResult[0]) return fn({ 'status': customExcelResult[0], 'type': 'custom excel app' });
          Promise.all([checkInSolarPlant(userId, companyId, nodeId)]).then(function (solarPlantResult) {
            if (0 == solarPlantResult[0]) return fn({ 'status': 0, 'type': 'solar plant app' });
            if (2 == solarPlantResult[0]) return fn({ 'status': solarPlantResult[0], 'type': 'solar plant app' });
            Promise.all([checkInTransformer(userId, companyId, nodeId)]).then(function (transformerResult) {
              if (0 == transformerResult[0]) return fn({ 'status': 0, 'type': 'transformer app' });
              if (2 == transformerResult[0]) return fn({ 'status': transformerResult[0], 'type': 'transformer app' });
              Promise.all([checkInPowerFactor(userId, companyId, nodeId)]).then(function (powerFactorResult) {
                if (0 == powerFactorResult[0]) return fn({ 'status': 0, 'type': 'power factor app' });
                if (2 == powerFactorResult[0]) return fn({ 'status': powerFactorResult[0], 'type': 'power factor app' });
                Promise.all([checkInAlarm(userId, companyId, nodeId)]).then(function (alarmResult) {
                  if (0 == alarmResult[0]) return fn({ 'status': 0, 'type': 'alarm' });
                  if (2 == alarmResult[0]) return fn({ 'status': alarmResult[0], 'type': 'alarm' });
                  Promise.all([checkInNotification(userId, companyId, nodeId)]).then(function (notificationResult) {
                    if (0 == notificationResult[0]) return fn({ 'status': 0, 'type': 'notification' });
                    if (2 == notificationResult[0]) return fn({ 'status': notificationResult[0], 'type': 'notification' });
                    return fn({ 'status': 3, 'type': 'notification' });
                  }).catch(notificationError => {
                    return fn({ 'status': 0, 'type': 'notification' });
                  });
                }).catch(alarmError => {
                  return fn({ 'status': 0, 'type': 'alarm' });
                });
              }).catch(powerFactorError => {
                return fn({ 'status': 0, 'type': 'power factor app' });
              });
            }).catch(transformerError => {
              return fn({ 'status': 0, 'type': 'transformer app' });
            });
          }).catch(solarPlantError => {
            return fn({ 'status': 0, 'type': 'solar plant app' });
          });
        }).catch(customExcelError => {
          return fn({ 'status': 0, 'type': 'custom excel app' });
        });
      }).catch(scadaError => {
        if (0 == scadaResult[0]) return fn({ 'status': 0, 'type': 'SCADA app' });
      });
    }).catch(timeSliceError => {
      return fn({ 'status': 0, 'type': 'time slice app' });
    });
  }).catch(dashboardError => {
    return fn({ 'status': 0, 'type': 'dashboard' });
  });
} */

checkInDashboard = function (userId, companyId, nodeId) {
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
  catch (Exception) { return reject(Exception); }
}

checkInTimeSlice = function (userId, companyId, nodeId) {
  try {
    return new Promise((resolve, reject) => {
      var nodeFound = false;
      node.checkInTimeSlice(userId, companyId, function (err, result) {
        if (err) return reject(0);
        if (!result) return resolve(1);
        var idAry = [];
        let otherDataAry = [];
        result.forEach(function (row) {
          if (null != row['node'] && -1 != row['node'].indexOf(nodeId)) {
            nodeFound = true;
            idAry.push(row['app_id']);
            otherDataAry.push(row['app_name']);
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'time slice app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInScada = function (userId, companyId, nodeId) {
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
              if (nodeId == nodeParameterData[key][k]['node']) {
                nodeFound = true;
                idAry.push(row['app_id']);
                otherDataAry.push(row['app_name']);
              }
            }
          }
        });

        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'SCADA app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInCustomExcel = function (userId, companyId, nodeId) {
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
            if (-1 != nodeData[key]['node'].indexOf(nodeId)) {
              nodeFound = true;
              idAry.push(row['app_id']);
              otherDataAry.push(row['app_name']);
            }
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'custom excel app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInSolarPlant = function (userId, companyId, nodeId) {
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
            if (nodeData[key]['node'] == nodeId) {
              nodeFound = true;
              idAry.push(row['app_id']);
              otherDataAry.push(row['app_name']);
            }
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'solar plant app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInTransformer = function (userId, companyId, nodeId) {
  try {
    return new Promise((resolve, reject) => {
      var nodeFound = false;
      node.checkInTransformer(userId, companyId, function (err, result) {
        if (err) return reject(0);
        if (!result) return resolve(1);
        var idAry = [];
        let otherDataAry = [];
        result.forEach(function (row) {
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
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'transformer app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInPowerFactor = function (userId, companyId, nodeId) {
  try {
    return new Promise((resolve, reject) => {
      var nodeFound = false;
      var idAry = [];
      let otherDataAry = [];
      node.checkInPowerFactor(userId, companyId, function (err, result) {
        if (err) return reject(0);
        if (!result) return resolve(1);
        result.forEach(function (row) {
          if (null != row['node'] && -1 != row['node'].indexOf(nodeId)) {
            nodeFound = true;
            idAry.push(row['app_id']);
            otherDataAry.push(row['app_name']);
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'power factor app', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInAlarm = function (userId, companyId, nodeId) {
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
          if (nodeId == queryData['query']['group']['rules'][0]['node']['nodeId']) {
            nodeFound = true;
            idAry.push(row['alarm_id']);
            otherDataAry.push(row['title']);
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'alarm', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

checkInNotification = function (userId, companyId, nodeId) {
  try {
    return new Promise((resolve, reject) => {
      var nodeFound = false;
      var idAry = [];
      let otherDataAry = [];
      node.checkInNotification(userId, companyId, function (err, result) {
        if (err) return reject(0);
        if (!result) return resolve(1);
        result.forEach(function (row) {
          if (nodeId == row['node_id']) {
            nodeFound = true;
            idAry.push(row['notification_id']);
            otherDataAry.push(row['title']);
          }
        });
        return resolve({ 'status': (true == nodeFound) ? 2 : 1, 'module': 'notification', idAry: idAry, otherDataAry: otherDataAry });
      });
    });
  }
  catch (Exception) { return reject(Exception); }
}

function sendEmailToUser(cmpAdminDetails, data, emailMsg) {
  return new Promise((resolve, reject) => {
    try {
      var htmlObj = {};
      htmlObj['user'] = cmpAdminDetails.name;
      htmlObj['body'] = '<p>Please find the details of <b>' + data.nodeName + '</b> node used by ' + data.userName + ' in below modules of MARC. For unassigning node, user need to remove node setting from below list.</p>' + emailMsg;
      htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
      htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
      ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
        var mailOptions = {
          from: marcconfig.SMTPFROMNAME,
          to: [cmpAdminDetails.email_address],
          subject: 'MARC node unassignment',
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
module.exports = router;
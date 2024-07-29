var express = require('express');
var router = express.Router();
var nodemodel = require(__base + 'models').nodemodel;
var authenticationHelpers = require('../authentication-helpers');
var logic = require(__base + 'models').logic;
var lodash = require('lodash');
var nioAPIHelper = require('../client/nioapi');
const { turn } = require('core-js/fn/array');
const nioAPI = new nioAPIHelper();

router.post('/list', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.list(function (err, result) {
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

router.post('/parameterUnitList', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.parameterUnitList(function (err, result) {
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

router.post('/nodeModelData', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.nodeModelData(req.body, function (err, result) {
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


router.post('/submitNodeModel', authenticationHelpers.isEslAuth, function (req, res) {


  req.checkBody("nodeMake", "Node Make is required.").notEmpty();
  req.checkBody("nodeModel", "Node Model name must be atleast 3 characters.").isLength(3);
  var errorMsg = '';
  req.getValidationResult().then(function (errors) {
    if (!errors.isEmpty()) {
      errors.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      })
      errorMsg = errorMsg.trim("\n");
      res.json({ "error": true, "reason": errorMsg });
      return res;
    }

    /* *added for impletation of ksql for parameter mapping save to meter model changed by piyush */
    var data = req.body.parameterlist
    var instantaneous = [], cummulative = [];
    var parameter = { instantaneous: [], cummulative: [] };
    var parameterMapping = {};
    data.forEach((parameter, i) => {
      if (parameter.type == 0) {
        cummulative.push(parameter.value)
      }
      if (parameter.type == 1) {
        instantaneous.push((parameter.value))
      }
    });
    parameter['cummulative'] = cummulative;
    parameter['instantaneous'] = instantaneous;
    parameter['instantaneous'].forEach((element, i) => {
      i = i + 1
      parameterMapping[element] = 'I' + i;
    });
    parameter['cummulative'].forEach((element, i) => {
      i += 1;
      parameterMapping[element] = 'C' + i;

    });
    if (req.body.action == 'add') {
      nodemodel.addNodeModel(req.body, req.session.passport.user.user_id, JSON.stringify(parameterMapping), function (err) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
          return res;
        }
        res.json({ "error": false, "reason": "Node model added successfully." });
        res.end();
        return res;
      });
    }

    if (req.body.action == 'edit') {
      nodemodel.updateNodeModel(req.body, req.session.passport.user.user_id, JSON.stringify(parameterMapping), function (err) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!11" });
          return res;
        }


        if (!req.body.changedDataSettings) {
        console.log("Node model updated successfully", "11111111111111111111111111111");

          res.json({ "error": false, "reason": "Node model updated successfully." });
          res.end();
          return res;
        }
        logic.getNodeModelNodes(req.body.id, function (err, nodeResult) {
          if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!22" });
            res.end();
            return res;
          }
          if (nodeResult && 0 == nodeResult.length) {
            console.log("Node model updated successfully", "222222222222222222222222222");
            res.json({ "error": false, "reason": "Node model updated successfully." });
            res.end();
            return res;
          }
          var nodeDataAry = [];
          var nodeObj = {};
          var parameterId = [];
          var cellComObj = JSON.parse(req.body.cellcom);

          var nodeModelParameterIdAry = req.body.nodeModelParameterIdAry;


          for (var nodeIndex = 0; nodeIndex < nodeResult.length; nodeIndex++) {
            var nodeModelDataSettingsObj = { queryLength: cellComObj['queryLength'], autoUnit: false, indexing: {}, equations: {}, incomingDataUnit: {}, displayDataUnit: {}, caption: {}, select: {} };
            if (nodeResult[nodeIndex]['is_default_settings'] == null || nodeResult[nodeIndex]['is_default_settings'] == true) {

              parameterId = [];

              nodeModelDataSettingsObj['indexing'] = cellComObj['indexing'];
              nodeModelDataSettingsObj['equations'] = cellComObj['equations'];
              nodeModelDataSettingsObj['incomingDataUnit'] = cellComObj['incomingDataUnit'];
              nodeModelDataSettingsObj['displayDataUnit'] = cellComObj['displayDataUnit'];
              nodeModelDataSettingsObj['caption'] = cellComObj['caption'];
              nodeModelDataSettingsObj['select'] = cellComObj['select'];

              for (const [key, value] of Object.entries(cellComObj.select)) {
                if (value == true) {
                  parameterId.push(key);
                }
              }
              // console.log(cellComObj['indexing'], "cellComObj['indexing']")


            }

            if (nodeResult[nodeIndex]['is_default_settings'] == false) {
              var dbNodeDataSettingsObj = JSON.parse(nodeResult[nodeIndex]['data_settings']);
              console.log(JSON.stringify(nodeResult[nodeIndex]), "nodeResultnodeResultnodeResultnodeResultnodeResult");

              if ('undefined' == typeof dbNodeDataSettingsObj['displayDataUnit']) dbNodeDataSettingsObj['displayDataUnit'] = {};
              if ('undefined' == typeof dbNodeDataSettingsObj['caption']) dbNodeDataSettingsObj['caption'] = {};
              nodeModelDataSettingsObj['autoUnit'] = ('undefined' != typeof dbNodeDataSettingsObj['autoUnit']) ? dbNodeDataSettingsObj['autoUnit'] : false;

              parameterId = [];
              console.log(dbNodeDataSettingsObj['select'],Object.keys(dbNodeDataSettingsObj['select']).length > 0,Object.keys(dbNodeDataSettingsObj['select']).length == nodeModelParameterIdAry.length,'!!!!!!!!!!!!!!!!!!!!!!!!');

              if ((dbNodeDataSettingsObj['select']) && (Object.keys(dbNodeDataSettingsObj['select']).length > 0) && (Object.keys(dbNodeDataSettingsObj['select']).length == nodeModelParameterIdAry.length)) {

                nodeModelDataSettingsObj['select'] = dbNodeDataSettingsObj['select']

                for (const [key, value] of Object.entries(dbNodeDataSettingsObj.select)) {
                  if (value == true) {
                    parameterId.push(key);
                  }
                }

              } else {
                nodeModelDataSettingsObj['select'] = {};
                // console.log(nodeResult, 'nodeResult[nodeIndex]');
                // console.log(nodeResult[nodeIndex], 'nodeResult[nodeIndex].parameters');
                console.log(nodeResult[nodeIndex].parameters, "JSON.parse(nodeResult[nodeIndex].parameters)");
                var nodeResultParas = JSON.parse(nodeResult[nodeIndex].parameters);
                

                nodeModelParameterIdAry.forEach(function (parameter) {

                  var flag = false;
                  nodeResultParas.forEach(function (nodeParas) {
                    if (parameter == nodeParas) {
                      nodeModelDataSettingsObj.select[nodeParas] = true;
                      parameterId.push(nodeParas);
                      flag = true;
                    }
                  })

                  if (flag == false) {
                    nodeModelDataSettingsObj.select[parameter] = false;
                  }

                })


              }


              nodeModelParameterIdAry.forEach(function (parameter) {

                if (cellComObj['indexing'][parameter] && 'undefined' != typeof cellComObj['indexing'][parameter]) {

                  nodeModelDataSettingsObj['indexing'][parameter] = cellComObj['indexing'][parameter];
                  if (dbNodeDataSettingsObj['equations'][parameter] && req.body.equation.indexOf(dbNodeDataSettingsObj['equations'][parameter]) != -1) {
                    nodeModelDataSettingsObj['equations'][parameter] = dbNodeDataSettingsObj['equations'][parameter];
                  }
                  if (dbNodeDataSettingsObj['incomingDataUnit'][parameter]) {
                    nodeModelDataSettingsObj['incomingDataUnit'][parameter] = dbNodeDataSettingsObj['incomingDataUnit'][parameter];
                  }
                  if (dbNodeDataSettingsObj['displayDataUnit'][parameter]) {
                    nodeModelDataSettingsObj['displayDataUnit'][parameter] = dbNodeDataSettingsObj['displayDataUnit'][parameter];
                  }
                  if (dbNodeDataSettingsObj['caption'][parameter]) {
                    nodeModelDataSettingsObj['caption'][parameter] = dbNodeDataSettingsObj['caption'][parameter];
                  }

                }
              });
            }
            var nodeDataSettingsObj = lodash.clone(nodeModelDataSettingsObj);
            delete nodeDataSettingsObj['queryLength'];
            delete nodeDataSettingsObj['indexing'];
            nodeObj[nodeResult[nodeIndex]['node_id']] = { nodeUniqueId: nodeResult[nodeIndex]['node_unique_id'], companyId: nodeResult[nodeIndex]['company_id'], dataSettings: JSON.stringify(nodeDataSettingsObj), parameters: JSON.stringify(parameterId) };
            var nodeParameterIds = nodeModelParameterIdAry.toString();
            nodeParameterIds = nodeParameterIds.replace(/,/g, ' ')
            nodeDataAry.push({ nodeUniqueId: nodeResult[nodeIndex]['node_unique_id'], companyId: nodeResult[nodeIndex]['company_id'], nodeName: nodeResult[nodeIndex]['node_name'], nodeDataSettings: JSON.stringify(nodeModelDataSettingsObj), nodeParameterIds: nodeParameterIds, communicationType: nodeResult[nodeIndex]['communication_type'], frequency: nodeResult[nodeIndex]['frequency'], userId: nodeResult[nodeIndex]['user_id'], parameterMapping: JSON.stringify(parameterMapping) });
          }
          var promiseAry = [];
          try {
            promiseAry.push(updateNodeModelNodes(nodeObj));
            promiseAry.push(insertToLogic(nodeDataAry));

            Promise.all(promiseAry).then(function (promiseResults) {
              if (!promiseResults[0] || !promiseResults[1]) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!33" });
                res.end();
                return res;
              }
              var nioAPIObj = {};
              nodeDataAry.forEach((element, i) => {
                nioAPIObj[element.nodeUniqueId] = JSON.parse(element.parameterMapping);
              });
              nioAPI.addEditNodeInNioJob(JSON.stringify(nioAPIObj), function (err, status) {
                if (err) {
                  res.json({ "error": true, "reason": err });
                  res.end();
                  return res;
                }
                else {
                  console.log("Node model updated successfully", "3333333333333333333333333333333");
                  res.json({ "error": false, "reason": "Node model updated successfully." });
                  res.end();
                  return res;
                }

              });
            }).catch(err => {
              console.log(err,'error 1');
              res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!44" });
              res.end();
              return res;
            });
          } catch (ee) {

          }
        });
      });
    }
  });
});
// router.post('/submitNodeModel', authenticationHelpers.isEslAuth, function (req, res) {


//   req.checkBody("nodeMake", "Node Make is required.").notEmpty();
//   req.checkBody("nodeModel", "Node Model name must be atleast 3 characters.").isLength(3);
//   var errorMsg = '';
//   req.getValidationResult().then(function (errors) {
//     if (!errors.isEmpty()) {
//       errors.array().map(function (elem) {
//         errorMsg += elem.msg + "\n";
//       })
//       errorMsg = errorMsg.trim("\n");
//       res.json({ "error": true, "reason": errorMsg });
//       return res;
//     }

//     /* *added for impletation of ksql for parameter mapping save to meter model changed by piyush */
//     var data = req.body.parameterlist
//     var instantaneous = [], cummulative = [];
//     var parameter = { instantaneous: [], cummulative: [] };
//     var parameterMapping = {};
//     data.forEach((parameter, i) => {
//       if (parameter.type == 0) {
//         cummulative.push(parameter.value)
//       }
//       if (parameter.type == 1) {
//         instantaneous.push((parameter.value))
//       }
//     });
//     parameter['cummulative'] = cummulative;
//     parameter['instantaneous'] = instantaneous;
//     parameter['instantaneous'].forEach((element, i) => {
//       i = i + 1
//       parameterMapping[element] = 'I' + i;
//     });
//     parameter['cummulative'].forEach((element, i) => {
//       i += 1;
//       parameterMapping[element] = 'C' + i;
  
//     });
//     if (req.body.action == 'add') {
//       nodemodel.addNodeModel(req.body, req.session.passport.user.user_id, JSON.stringify(parameterMapping), function (err) {
//         if (err) {
//           res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//           return res;
//         }
//         res.json({ "error": false, "reason": "Node model added successfully." });
//         res.end();
//         return res;
//       });
//     }

//     if (req.body.action == 'edit') {
//       nodemodel.updateNodeModel(req.body, req.session.passport.user.user_id, JSON.stringify(parameterMapping), function (err) {
//         if (err) {
//           res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//           return res;
//         }
//         if (!req.body.changedDataSettings) {
//           res.json({ "error": false, "reason": "Node model updated successfully." });
//           res.end();
//           return res;
//         }
//         logic.getNodeModelNodes(req.body.id, function (err, nodeResult) {
//           if (err) {
//             res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//             res.end();
//             return res;
//           }
//           if (nodeResult && 0 == nodeResult.length) {
//             res.json({ "error": false, "reason": "Node model updated successfully." });
//             res.end();
//             return res;
//           }
//           var nodeDataAry = [];
//           var nodeObj = {};
//           var parameterId = [];
//           var cellComObj = JSON.parse(req.body.cellcom);
        
//           var nodeModelParameterIdAry = req.body.nodeModelParameterIdAry;
          
        
//           for (var nodeIndex = 0; nodeIndex < nodeResult.length; nodeIndex++) {
//             var nodeModelDataSettingsObj = { queryLength: cellComObj['queryLength'], autoUnit: false, indexing: {}, equations: {}, incomingDataUnit: {}, displayDataUnit: {}, caption: {} , select:{}};
//             if (nodeResult[nodeIndex]['is_default_settings'] == null || nodeResult[nodeIndex]['is_default_settings'] == true) {

//               parameterId = [];

//               nodeModelDataSettingsObj['indexing'] = cellComObj['indexing'];
//               nodeModelDataSettingsObj['equations'] = cellComObj['equations'];
//               nodeModelDataSettingsObj['incomingDataUnit'] = cellComObj['incomingDataUnit'];
//               nodeModelDataSettingsObj['displayDataUnit'] = cellComObj['displayDataUnit'];
//               nodeModelDataSettingsObj['caption'] = cellComObj['caption'];
//               nodeModelDataSettingsObj['select'] = cellComObj['select'];

//               for (const [key, value] of Object.entries(cellComObj.select)) {
//                 if (value == true) {
//                   parameterId.push(key);
//                 }
//               }

//             }
      
//             if (nodeResult[nodeIndex]['is_default_settings'] == false) {
//               var dbNodeDataSettingsObj = JSON.parse(nodeResult[nodeIndex]['data_settings']);
        
//               if ('undefined' == typeof dbNodeDataSettingsObj['displayDataUnit']) dbNodeDataSettingsObj['displayDataUnit'] = {};
//               if ('undefined' == typeof dbNodeDataSettingsObj['caption']) dbNodeDataSettingsObj['caption'] = {};
//               nodeModelDataSettingsObj['autoUnit'] = ('undefined' != typeof dbNodeDataSettingsObj['autoUnit']) ? dbNodeDataSettingsObj['autoUnit'] : false;

//               parameterId = [];

//               if ((dbNodeDataSettingsObj['select']) && (Object.keys(dbNodeDataSettingsObj['select']).length > 0) && (Object.keys(dbNodeDataSettingsObj['select']).length == nodeModelParameterIdAry.length)) {

//                 nodeModelDataSettingsObj['select'] = dbNodeDataSettingsObj['select']

//                 for (const [key, value] of Object.entries(dbNodeDataSettingsObj.select)) {
//                   if (value == true) {
//                     parameterId.push(key);
//                   }
//                 }

//               } else {
//                 nodeModelDataSettingsObj['select'] = {};

//                 var nodeResultParas = JSON.parse(nodeResult[nodeIndex].parameters);
              

//                 nodeModelParameterIdAry.forEach(function (parameter) {

//                   var flag = false;
//                   nodeResultParas.forEach(function (nodeParas) {
//                     if (parameter == nodeParas) {
//                       nodeModelDataSettingsObj.select[nodeParas] = true;
//                       parameterId.push(nodeParas);
//                       flag = true;
//                     }
//                   })

//                   if (flag == false) {
//                     nodeModelDataSettingsObj.select[parameter] = false;
//                   }

//                 })


//               }


//               nodeModelParameterIdAry.forEach(function (parameter) {

//                 if (cellComObj['indexing'][parameter] && 'undefined' != typeof cellComObj['indexing'][parameter]) {

//                   nodeModelDataSettingsObj['indexing'][parameter] = cellComObj['indexing'][parameter];
//                   if (dbNodeDataSettingsObj['equations'][parameter] && req.body.equation.indexOf(dbNodeDataSettingsObj['equations'][parameter]) != -1) {
//                     nodeModelDataSettingsObj['equations'][parameter] = dbNodeDataSettingsObj['equations'][parameter];
//                   }
//                   if (dbNodeDataSettingsObj['incomingDataUnit'][parameter]) {
//                     nodeModelDataSettingsObj['incomingDataUnit'][parameter] = dbNodeDataSettingsObj['incomingDataUnit'][parameter];
//                   }
//                   if (dbNodeDataSettingsObj['displayDataUnit'][parameter]) {
//                     nodeModelDataSettingsObj['displayDataUnit'][parameter] = dbNodeDataSettingsObj['displayDataUnit'][parameter];
//                   }
//                   if (dbNodeDataSettingsObj['caption'][parameter]) {
//                     nodeModelDataSettingsObj['caption'][parameter] = dbNodeDataSettingsObj['caption'][parameter];
//                   }

//                 }
//               });
//             }
//             var nodeDataSettingsObj = lodash.clone(nodeModelDataSettingsObj);
//             delete nodeDataSettingsObj['queryLength'];
//             delete nodeDataSettingsObj['indexing'];
//             nodeObj[nodeResult[nodeIndex]['node_id']] = { nodeUniqueId: nodeResult[nodeIndex]['node_unique_id'], companyId: nodeResult[nodeIndex]['company_id'], dataSettings: JSON.stringify(nodeDataSettingsObj), parameters: JSON.stringify(parameterId) };
//             var nodeParameterIds = nodeModelParameterIdAry.toString();
//             nodeParameterIds = nodeParameterIds.replace(/,/g, ' ')
//             nodeDataAry.push({ nodeUniqueId: nodeResult[nodeIndex]['node_unique_id'], companyId: nodeResult[nodeIndex]['company_id'], nodeName: nodeResult[nodeIndex]['node_name'], nodeDataSettings: JSON.stringify(nodeModelDataSettingsObj), nodeParameterIds: nodeParameterIds, communicationType: nodeResult[nodeIndex]['communication_type'], frequency: nodeResult[nodeIndex]['frequency'], userId: nodeResult[nodeIndex]['user_id'], parameterMapping: JSON.stringify(parameterMapping) });
//           }
//           var promiseAry = [];
//           try {
//             promiseAry.push(updateNodeModelNodes(nodeObj));
//             promiseAry.push(insertToLogic(nodeDataAry));

//             Promise.all(promiseAry).then(function (promiseResults) {
//               if (!promiseResults[0] || !promiseResults[1]) {
//                 res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//                 res.end();
//                 return res;
//               }
//               var nioAPIObj = {};
//               nodeDataAry.forEach((element, i) => {
//                 nioAPIObj[element.nodeUniqueId] = JSON.parse(element.parameterMapping);
//               });
//               nioAPI.addEditNodeInNioJob(JSON.stringify(nioAPIObj), function (err, status) {
//                 if (err) {
//                   res.json({ "error": true, "reason": err });
//                   res.end();
//                   return res;
//                 }
//                 else {
//                   res.json({ "error": false, "reason": "Node model updated successfully." });
//                   res.end();
//                   return res;
//                 }

//               });
//             }).catch(err => {
//               res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
//               res.end();
//               return res;
//             });
//           } catch (ee) {
           
//           }
//         });
//       });
//     }
//   });
// });

function updateNodeModelNodes(nodeObj) {

  return new Promise((resolve, reject) => {
    nodemodel.updateNodeModelNodes(nodeObj, function (err, data) {
      if (err) {
        return reject(0);
      }
      return resolve(1);
    });
  });
}

function insertToLogic(nodeDataAry) {
  return new Promise((resolve, reject) => {
    logic.insertToLogic(nodeDataAry, function (err) {
      if (err) {
        return reject(0);
      }
      return resolve(1);
    });
  });
}

router.post('/delete', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.delete(req.body.id, req.session.passport.user.user_id, function (err) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "Node-model deleted successfully." });
    res.end();
    return res;
  });
});

router.post('/parametersList', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.parametersList(function (err, result) {
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

router.post('/uniqueNodeModel', authenticationHelpers.isEslAuth, function (req, res) {
  nodemodel.uniqueNodeModel(req.body, function (err, result) {
    if (err) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "result": result });
    res.end();
    return res;
  });
});



module.exports = router;
var express = require('express');
var router = express.Router();
var sidebar = require(__base + 'models').sidebar;
var authenticationHelpers = require('../authentication-helpers');
var lodash = require('lodash');
const { result } = require('lodash');
const { stringify } = require('querystring');

router.post('/sidebarlocationdata', authenticationHelpers.isClientAuth, function (req, res) {
  var result = { location: {} };
  sidebar.locationList(req.session.passport.user.company_id, function (err, locationResult) {
    if (err) {
    } else if (locationResult) {
      var locationList = {};
      for (var index = 0; index < locationResult.length; index++) {
        locationList[locationResult[index].location_id] = locationResult[index];
      }
      result = { location: locationList };
    }
    res.json(result);
    res.end();
    return res;

  });
});

// router.post('/sidebarnodedata', authenticationHelpers.isClientAuth, function (req, res) {
//   var response = { allNodes: {}, node: {}, locationNodes: {}, groupNodes: {}, meterModels: {}, language: 'en' };
//   sidebar.nodeList(req.session.passport.user.company_id, function (err, nodeResult) {
//     if (err) {
//     } else if (nodeResult) {
//       var nodeList = {};
//       var locationWiseNodes = {};
//       var groupWiseNodes = {};
//       var meterModels = {};
//       var allNodes = {};
//       for (var index = 0; index < nodeResult.length; index++) {
//         allNodes[nodeResult[index].node_id] = nodeResult[index];
//         allNodes[nodeResult[index].node_id]['parameters'] = [];
//         if ('Company Admin' != req.session.passport.user.role_name && null != nodeResult[index]['access_denied_users'] && -1 != nodeResult[index]['access_denied_users'].indexOf(req.session.passport.user.user_id)) continue;
//         nodeList[nodeResult[index].node_id] = nodeResult[index];
//         nodeList[nodeResult[index].node_id]['parameters'] = [];

//         if (!meterModels[nodeResult[index].meter_model_id]) meterModels[nodeResult[index].meter_model_id] = [];
//         if (!locationWiseNodes[nodeResult[index].sub_location_id]) {
//           locationWiseNodes[nodeResult[index].sub_location_id] = {};
//         }
//         locationWiseNodes[nodeResult[index].sub_location_id][nodeResult[index].node_id] = nodeResult[index].node_unique_id;
//         if (null !== nodeResult[index].group_id && '' !== nodeResult[index].group_id) {
//           if (!groupWiseNodes[nodeResult[index].group_id]) {
//             groupWiseNodes[nodeResult[index].group_id] = {};
//           }
//           groupWiseNodes[nodeResult[index].group_id][nodeResult[index].node_id] = nodeResult[index].node_unique_id;
//         }
//       }
//       response = { allNodes: allNodes, node: nodeList, locationNodes: locationWiseNodes, groupNodes: groupWiseNodes, meterModels: {}, parameterTag: {}, language: req.session.passport.user.language };
//       if (0 == Object.keys(meterModels).length) {
//         res.json(response);
//         res.end();
//         return res;
//       }
//       sidebar.getParametersFromMeterModel(Object.keys(meterModels), function (err, meterModelResult) {
//         if (err) { }
//         if (meterModelResult) {
//           meterModelResult.forEach(function (k, v) {
//             if (0 == k.is_deleted) {
//               meterModels[k.meter_model_id] = ((null != k.node_parameter_ids) ? k.node_parameter_ids.split(',').map(Number) : []);
//               /* Sorting parameters */
//               meterModels[k.meter_model_id] = lodash.sortBy(meterModels[k.meter_model_id]);
//               meterModels[k.meter_model_id].map(String);
//             }
//           });
//         }
//         response['meterModels'] = meterModels;
//         res.json(response);
//         res.end();
//         return res;
//       });
//     }
//   });
// });

router.post('/sidebarnodedata', authenticationHelpers.isClientAuth, function (req, res) {
  var response = { allNodes: {}, node: {}, locationNodes: {}, groupNodes: {}, meterModels: {}, language: 'en' };
  sidebar.nodeList(req.session.passport.user.company_id, function (err, nodeResult) {
    if (err) {
    } else if (nodeResult) {
      var nodeList = {};
      var locationWiseNodes = {};
      var groupWiseNodes = {};
      var meterModels = {};
      var allNodes = {};
      for (var index = 0; index < nodeResult.length; index++) {
        /* start code by kaveri*/
        let parameter = nodeResult[index].parameters ? JSON.parse(nodeResult[index].parameters) : [];
        allNodes[nodeResult[index].node_id] = nodeResult[index];
        allNodes[nodeResult[index].node_id]['selectedParameters'] = parameter
        allNodes[nodeResult[index].node_id]['parameters'] = [];
        // if('Company Admin' != req.session.passport.user.role_name && null != nodeResult[index]['access_denied_users'] && -1 != nodeResult[index]['access_denied_users'].indexOf(req.session.passport.user.user_id)) continue;
        nodeList[nodeResult[index].node_id] = nodeResult[index];
        nodeList[nodeResult[index].node_id]['selectedParameters'] = parameter
        nodeList[nodeResult[index].node_id]['parameters'] = [];
        /* end code by kaveri*/
        if (!meterModels[nodeResult[index].meter_model_id]) meterModels[nodeResult[index].meter_model_id] = [];
        if (!locationWiseNodes[nodeResult[index].sub_location_id]) {
          locationWiseNodes[nodeResult[index].sub_location_id] = {};
        }
        locationWiseNodes[nodeResult[index].sub_location_id][nodeResult[index].node_id] = nodeResult[index].node_unique_id;
        if (null !== nodeResult[index].group_id && '' !== nodeResult[index].group_id) {
          if (!groupWiseNodes[nodeResult[index].group_id]) {
            groupWiseNodes[nodeResult[index].group_id] = {};
          }
          groupWiseNodes[nodeResult[index].group_id][nodeResult[index].node_id] = nodeResult[index].node_unique_id;
        }
      }

      /* *for remove access_denied_nodes from nodelist in userwise module start*/
      if ('Company Admin' != req.session.passport.user.role_name && req.session.passport.user.access_denied_nodes) {
        nodeList = lodash.omit(nodeList, req.session.passport.user.access_denied_nodes);
        locationWiseNodes = lodash.omit(locationWiseNodes, req.session.passport.user.access_denied_nodes);
        groupWiseNodes = lodash.omit(groupWiseNodes, req.session.passport.user.access_denied_nodes);
      }
      /* *for change in userwise module end*/

      response = { allNodes: allNodes, node: nodeList, locationNodes: locationWiseNodes, groupNodes: groupWiseNodes, meterModels: {}, parameterTag: {}, language: req.session.passport.user.language };
      if (0 == Object.keys(meterModels).length) {
        res.json(response);
        res.end();
        return res;
      }
      sidebar.getParametersFromMeterModel(Object.keys(meterModels), function (err, meterModelResult) {
        if (err) { }
        if (meterModelResult) {
          meterModelResult.forEach(function (k, v) {
            if (0 == k.is_deleted) {
              meterModels[k.meter_model_id] = ((null != k.node_parameter_ids) ? k.node_parameter_ids.split(',').map(Number) : []);
              /* Sorting parameters */
              meterModels[k.meter_model_id] = lodash.sortBy(meterModels[k.meter_model_id]);
              meterModels[k.meter_model_id].map(String);
            }
          });
        }
        response['meterModels'] = meterModels;
        res.json(response);
        res.end();
        return res;
      });
    }
  });
});

router.post('/submitFavoriteNodes', authenticationHelpers.isClientAuth, function (req, res) {
  sidebar.submitFavoriteNodes(req.body, function (err) {
    if (err) { }
    res.json({ "error": false, "reason": "Favorite node saved successfully." });
    res.end();
    return res;
  });
});

router.post('/sidebargroupdata', authenticationHelpers.isClientAuth, function (req, res) {
  var result = { groups: {} };
  sidebar.groupList(req.session.passport.user.company_id, function (err, groupResult) {
    if (err) {
    } else if (groupResult) {
      var groupList = {};
      for (var index = 0; index < groupResult.length; index++) {
        groupList[groupResult[index].group_id] = groupResult[index];
      }
      result = { groups: groupList };
    }
    res.json(result);
    res.end();
    return res;
  });
});

module.exports = router;
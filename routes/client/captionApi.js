var express = require('express');
var router = express.Router();
var db = require(__base + 'models').node;
var lodash = require('lodash');

var authenticationHelpers = require('../authentication-helpers');

router.post('/captionApiData',authenticationHelpers.isClientAuth, function (req, res) {
  // console.log('req to api');
  var response = {}, captionAry = [];
  db.apiNodeData(Object.values(req.body), function (err, result) {
    if (result) {
      var captionObj = JSON.parse(result[0].data_settings).caption
      for (const id in captionObj) {
        if (Object.hasOwnProperty.call(captionObj, id)) {
          const element = captionObj[id];
          captionAry.push({ 'secondary_parameter_id': id, 'name': element })
        //  console.log(id,'id');
        }
      }
      result.forEach((nodeData, index) => {
        response['data'] = { 'node_id': nodeData.node_id, 'node_unique_id': nodeData.node_unique_id }
        // reponse['data'] = {'node_id' :nodeData.node_id,'node_unique_id' : nodeData.node_unique_id,'caption':captionAry }
      });
      response['data']['caption'] = captionAry;
    }
  // console.log('resp=====',response);
    res.json(response);
    res.end();
    return res;

  });
});

// router.post('/captionApiData', function (req, res) {
//   console.log('req to api',req.body);
//   var response = {}, captionAry = [];
//   db.apiNodeData(Object.values(req.body), function (err, result) {
//     if (result) {
//       var captionObj = JSON.parse(result[0].data_settings).caption
//       for (const id in captionObj) {
//         if (Object.hasOwnProperty.call(captionObj, id)) {
//           const element = captionObj[id];
//           captionAry.push({ 'secondary_parameter_id': id, 'name': element })
//         }
//       }
//       result.forEach((nodeData, index) => {
//         response['data'] = { 'node_id': nodeData.node_id, 'node_unique_id': nodeData.node_unique_id }
//         // reponse['data'] = {'node_id' :nodeData.node_id,'node_unique_id' : nodeData.node_unique_id,'caption':captionAry }
//       });
//       response['data']['caption'] = captionAry;
//     }
//     // console.log('resp=====',response);
//     res.json(response);
//     res.end();
//     return res;

//   });
// });

module.exports = router;
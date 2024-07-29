const request = require("request");
const nioAPIUrl = 'http://' + marcconfig.KSQLMAPPING;
const nioPROCESSDATAAPIUrl = 'http://' + marcconfig.KSQLAPIIP;

function nioAPIHelper() {
  if (!(this instanceof nioAPIHelper)) {
    return new nioAPIHelper();
  }
}
nioAPIHelper.prototype.addEditNodeInNioJob = function (nioAPIObj, cb) {
  // console.log(nioAPIObj,'!!!!!!!!!!!!!',cb);
  request.put({
    headers: { 'content-type': 'application/json' },
    url: nioAPIUrl + '/add-node',
    body: nioAPIObj
  }, function (err, data) {
    if (err && data != {}) {
      console.log(err,'error-----------');
      return cb('Something went wrong!!!1', null)
    }
    else {
      request.put({
        headers: { 'content-type': 'application/json' },
        url: nioPROCESSDATAAPIUrl + '/add-node',
        body: nioAPIObj
      }, function (err, data) {
        if (err && data != {}) {
          return cb('Something went wrong!!!2', null)
        }
        // else {
        //   var data = JSON.parse(data['body'])['status'];
        //   return cb(false, data)
        // }
        else {
          var data;
          try {
            data = JSON.parse(data['body'])['status'];  
            console.log(data,'data -----');
          } catch (error) {
            console.log(error,'error in catch...');
            data = 'success';
          }
          return cb(false, data)
        }
      })
    }
  });
};
nioAPIHelper.prototype.deleteNodeInNioJob = function (nodeUniqueId, cb) {
  request.post({
    url: nioAPIUrl + '/remove-node/' + nodeUniqueId,
  }, function (err, data) {
    if (err) {
      return cb(true, null);
    }
    else {
      request.post({
        url: nioPROCESSDATAAPIUrl + '/remove-node/' + nodeUniqueId,
      }, function (err, data) {
        if (err) return cb(true, null);
        else {
          return cb(false, data)
        }
      });
    }
  });
};

module.exports = nioAPIHelper;

var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var Promise = require('promise');
var general = require(__base + 'models').general;



router.post('/nodeInCompany', authenticationHelpers.isEslAuth, function (req, res) {
    Promise.all([nodeInCompany(req.body.nodeid)]).then(promiseResult => {
        if (promiseResult) {
            res.json({ "error": false, "reason": "", "result": promiseResult[0] });
            return res
        }
    }).catch(err => {
        console.log(err);
        res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
        res.end();
        return res;
    });
})


function nodeInCompany(id) {
    return new Promise((resolve, reject) => {
        params = { query: "select * from node where node_unique_id = ? allow filtering", where: [id] };
        general.dbSelect(params, function (err, result) {
            if (err != null) {
                return reject(err);
            }
            if (result.length == 0) {
                return reject(result);
            }
            params = { query: "select * from company where company_id = ?", where: [result[0]['company_id']] };
            general.dbSelect(params, function (err1, result1) {
                if (err != null) {
                    return reject(err1);
                }
                var result2 = { "node": result[0], "company": result1[0] }
                return resolve(result2);
            });
        });
    });
};

router.post('/submitDetalis', authenticationHelpers.isEslAuth, function (req, res) {
    if (req.body.data.action == 'add') {
        if (req.body.data.serial_no) {
            params = {
                query: "insert into gateway_via_sms_detail (id,serial_no,sim_no) values (uuid(), ?, ?)",
                where: [req.body.data.serial_no, req.body.data.sim_no]
            };
            general.dbInsert(params, function (err) {
                if (err != null) {
                    res.json({ "error": true, "reason": "record not added." });
                    return res;
                }
                if (err == null) {
                    res.json({ "error": false, "reason": "record added." });
                    return res;
                }
                return res;
            })
        }
        if (req.body.data.imei_no) {
            params = {
                query: "insert into gateway_via_mqtt_detail (id,iemi_no) values (uuid(), ?)",
                where: [req.body.data.imei_no]
            };
            general.dbInsert(params, function (err) {
                if (err != null) {
                    res.json({ "error": true, "reason": "record not added." });
                    return res;
                }
                if (err == null) {
                    res.json({ "error": false, "reason": "record added." });
                    return res;
                }
                return res;
            })
        }
    }
    if (req.body.data.action == 'edit') {
        if (req.body.data.serial_no != null) {
            params = {
                query: "insert into gateway_via_sms_detail (id,serial_no,sim_no) values (?,?, ?)",
                where: [req.body.data.id, req.body.data.serial_no, req.body.data.sim_no,]
            };
            general.dbInsert(params, function (err) {
                if (err != null) {
                    res.json({ "error": true, "reason": "record not editeded." });
                    return res;
                }
                if (err == null) {
                    res.json({ "error": false, "reason": "record edited added." });
                    return res;
                }
                return res;
            })
        } else {
            params = {
                query: "insert into gateway_via_mqtt_detail (id,iemi_no) values (?,?)",
                where: [req.body.data.id, req.body.data.imei_no]
            };
            general.dbInsert(params, function (err) {
                if (err != null) {
                    res.json({ "error": true, "reason": "record not editeded." });
                    return res;
                }
                if (err == null) {
                    res.json({ "error": false, "reason": "record edited added." });
                    return res;
                }
                return res;
            })
        }
    }
})

router.post('/editDetalis', authenticationHelpers.isEslAuth, function (req, res) {
    if (req.body.id.serial_no) {
        params = { query: "select * from gateway_via_sms_detail where id = ? allow filtering", where: [req.body.id.id] };
        general.dbSelect(params, function (err, result) {
            if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
            }
            if (result.length == 0) {
                res.json({ "error": true, "reason": "No records found." });
                return res;
            }
            res.json({ "result": result });
            res.end();
            return res;
        })
    } else {
        params = { query: "select * from gateway_via_mqtt_detail where id = ? allow filtering", where: [req.body.id.id] };
        general.dbSelect(params, function (err, result) {
            if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
            }
            if (result.length == 0) {
                res.json({ "error": true, "reason": "No records found." });
                return res;
            }
            res.json({ "result": result });
            res.end();
            return res;
        })
    }

})

router.post('/smslist', authenticationHelpers.isEslAuth, function (req, res) {
    params = { query: "select * from gateway_via_sms_detail" };
    general.dbSelect(params, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        if (result.length == 0) {
            res.json({ "error": true, "reason": "No records found." });
            return res;
        }
        res.json({ "result": result });
        res.end();
        return res;
    })
})
router.post('/iemilist', authenticationHelpers.isEslAuth, function (req, res) {
    params = { query: "select * from gateway_via_mqtt_detail" };
    general.dbSelect(params, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        if (result.length == 0) {
            res.json({ "error": true, "reason": "No records found." });
            return res;
        }
        res.json({ "result": result });
        res.end();
        return res;
    })
})

router.post('/delete', authenticationHelpers.isEslAuth, function (req, res) {
    if (req.body.data.serial_no) {
        params = { query: 'delete from gateway_via_sms_detail where id = ?', where: [req.body.data.id] }
        general.dbDelete(params, function (err) {
            if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
            } else {
                res.json({ "error": false, "reason": "Deleted successfully" });
                return res;
            }

        });
    }
    if (req.body.data.iemi_no) {
        params = { query: 'delete from gateway_via_mqtt_detail where id = ?', where: [req.body.data.id] }
        general.dbDelete(params, function (err) {
            if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
            } else {
                res.json({ "error": false, "reason": "Deleted successfully" });
                return res;
            }

        });
    }

})

router.post('/insertUpdateDetails', authenticationHelpers.isEslAuth, function (req, res) {
    params = {
        query: "insert into updateHistory (id,version,feature,date) values (uuid(), ?, ?,toTimestamp(now()))",
        where: [req.body.data.version, JSON.stringify(req.body.data['feature'])]
    };
    general.dbInsert(params, function (err) {
        if (err != null) {
            res.json({ "error": true, "reason": "record not added." });
            return res;
        }
        if (err == null) {
            res.json({ "error": false, "reason": "record added." });
            return res;
        }
        return res;
    })
})

router.get('/getUpdateDetails', authenticationHelpers.isEslAuth, function (req, res) {
    params = { query: "select * from updateHistory" };
    general.dbSelect(params, function (err, result) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        }
        if (result.length == 0) {
            res.json({ "error": true, "reason": "No records found." });
            return res;
        }
        res.json({ "result": result });
        res.end();
        return res;
    })
})

router.post('/editUpdateDetalis', authenticationHelpers.isEslAuth, function (req, res) {
    if (req.body.data.version) {
        params = { query: "insert into updateHistory (id,version,feature,date) values (?, ?, ?,toTimestamp(now()))", where: [req.body.id, req.body.data.version, JSON.stringify(req.body.data['feature'])] };
        general.dbSelect(params, function (err, result) {
            if (err) {
                res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
                return res;
            }
            res.json({ "result": result });
            res.end();
            return res;
        })
    }
})

router.post('/deleteUpdatedetails', authenticationHelpers.isEslAuth, function (req, res) {
    params = { query: 'delete from updateHistory where id = ?', where: [req.body.data.id] }
    general.dbDelete(params, function (err) {
        if (err) {
            res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
            return res;
        } else {
            res.json({ "error": false, "reason": "Deleted successfully" });
            return res;
        }
    });

})

// exports.nodeInCompany = function (id, cb) {
//     params = { query: "select * from node where node_unique_id = ? allow filtering", where: [id] };
//     general.dbSelect(params, function (err, result) {
//         if (err != null) {
//             return cb(err, null);
//         }
//         console.log(result)
//         params = { query: "select * from company where company_id = ?", where: [result[0]['company_id']] };
//         general.dbSelect(params, function (err, result1) {
//             if (err != null) {
//                 return cb(err, null);
//             }
//             var result2 = { "node": result, "company": result1 }
//             return cb(null, result2);
//         });
//     });
// }
module.exports = router;
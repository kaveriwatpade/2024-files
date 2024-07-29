var express = require("express");
var router = express.Router();
var passport = require("passport");
var authenticationHelpers = require("../authentication-helpers");
commonfunctionmodel = require(__base + "models").commonfunction;
var user = require("./user");
var profile = require("./profile");
var analytics = require("./analytics");
var assetanalysis = require("./asset-analysis");
var gateway = require("./gateway");
var node = require("./node");
var locationgroup = require("./location-and-group");
var dashboard = require("./dashboard");
var slideShow = require("./slide-show");
var sidebar = require("./side-bar");
var dbUser = require(__base + "models").user;
var network = require("./network");
var summary = require("./summary");
var alarmandnotification = require("./alarm-notification");
var help = require("./help");
var commonfunction = require("./common-function");
var directory = require("./directory");
var downloademail = require("./download-email");
var singleNodeDownloadReport = require("./single-node-download-report");
var rochemAnalytics = require("./rochem-analytics");
var virtualNode = require("./virtual-node");
var newFeature = require("./newfeature");
var excelReport = require("./excel-report");
var caption = require("./captionApi");

var virtualNodeRoutes = require("../../mvc/virtual-node-eq/routes/virtual-node.routes");

var ejs = require("ejs");
var bcrypt = require("bcrypt-nodejs");
var AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: marcconfig.AWSACCESSKEYID,
  secretAccessKey: marcconfig.AWSSECRETACCESSKEY,
  region: marcconfig.AWSREGION,
});

router.use("/user", user);
router.use("/profile", profile);
router.use("/analytics", analytics);
router.use("/assetanalysis", assetanalysis);
router.use("/gateway", gateway);
router.use("/node", node);
router.use("/locationgroup", locationgroup);
router.use("/dashboard", dashboard);
router.use("/slideShow", slideShow);
router.use("/sidebar", sidebar);
router.use("/network", network);
router.use("/summary", summary);
router.use("/alarmandnotification", alarmandnotification);
router.use("/help", help);
router.use("/commonfunction", commonfunction);
router.use("/directory", directory);
router.use("/downloademail", downloademail);
router.use("/singleNodeDownloadReport", singleNodeDownloadReport);
router.use("/rochemAnalytics", rochemAnalytics);
router.use("/virtualNode", virtualNode);
router.use("/newfeature", newFeature);
router.use("/excelReport", excelReport);
router.use("/captionApi", caption);
router.use("/virtual/node", virtualNodeRoutes);

router.get(
  "/logout",
  authenticationHelpers.isClientAuth,
  function (req, res, next) {
    req.logout();
    res.json({ loggedOut: req.isAuthenticated() });
  }
);

router.get(
  "/authenticated",
  authenticationHelpers.isClientAuth,
  function (req, res, next) {
    res.json({ authenticated: true });
  }
);

router.post("/authenticateUser", function (req, response) {
  req.checkBody("email", "Email is required.").notEmpty();
  req.checkBody("password", "Password is required.").notEmpty();
  var errorMsg = "";
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      response.json({ error: true, reason: errorMsg });
      return response;
    }
    dbUser.authenticateUser(req.body, function (err, result) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return response;
      }
      if (result == 1) {
        response.json({
          error: true,
          reason: "Error: Invalid email. Please try again!",
        });
        return response;
      }
      if (result == 2) {
        response.json({
          error: true,
          reason: "Error: Invalid email or password.",
        });
        return response;
      }
      if (result == 3) {
        response.json({
          error: true,
          reason: "Error: Invalid password. Please try again!",
        });
        return response;
      }
      dbUser.userCompanyList(
        result["companies"],
        function (err, companyResult) {
          if (err) {
            response.json({
              error: true,
              reason: "Error: Something went wrong. Please try again!",
            });
            return response;
          }
          if (!result) {
            response.json({
              error: true,
              reason: "No company is assigned to user.",
            });
            return response;
          }
          response.json({ error: false, result: companyResult });
          response.end();
          return response;
        }
      );
    });
  });
});

router.post("/login", function (req, response) {
  passport.authenticate("local", function (error, user, info) {
    if (error) {
      response.json({
        is_authenticated: false,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    if (!user) {
      response.json({
        is_authenticated: false,
        reason: "Invalid Credentials. Please try again.",
      });
      return response;
    }
    if (
      user.device_id &&
      user.device_type &&
      req.body.device_id &&
      req.body.device_type
    ) {
      console.log("DB   ", user.device_id);
      console.log("device", req.body.device_id);
      if (
        user.device_id != req.body.device_id ||
        user.device_type != req.body.device_type
      ) {
        response.json({
          is_authenticated: false,
          reason: "You are already registered on another device.",
          userId: user.user_id.toString(),
          mobileNumber: user.mobile_number,
        });
        return;
      }
    }
    if (
      req.body.email == "sandip.shivaji.mahajan@gmail.com" ||
      req.body.email == "sandip@aviotlumen.com"
    ) {
      if (req.body.device_type == "android" || req.body.device_type == "ios") {
        req.logIn(user, function (error) {
          if (error) {
            response.json({
              is_authenticated: false,
              reason: "Invalid Credentials. Please try again.",
            });
            return;
          }
          response.json({
            is_authenticated: true,
            reason: "Valid Credentials.",
            current_user: user,
          });
          response.end();
          return response;
        });
      } else {
        response.json({
          is_authenticated: false,
          reason: "Invalid Credentials. Please try again.",
        });
        return response;
      }
    } else {
      req.logIn(user, function (error) {
        if (error) {
          response.json({
            is_authenticated: false,
            reason: "Invalid Credentials. Please try again.",
          });
          return;
        }
        myCache.set(
          "multiplyingFactorNodeSettingObj" + user.company_id,
          user.nodeObj
        );
        response.json({
          is_authenticated: true,
          reason: "Valid Credentials.",
          current_user: user,
        });
        response.end();
        return response;
      });
    }
  })(req, response);
});

//Added By Salim

router.post("/update", function (req, response) {
  console.log(req.body, "model");
  dbUser.flagUpdate(
    req.body.userId,
    function (err, userResult) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return;
      }
      response.json({ error: false, reason: "User Update" });
      return;
    }
  );
});
router.post("/updateList", function (req, response) {
  dbUser.flagUpdateList(
    req.body.userId,
    function (err, userResult) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return;
      }
      response.json({ error: false, reason: "User Update", data:userResult });
      return;
    }
  );
});

router.post("/forgotPassword", function (req, response) {
  dbUser.emailExists(req.body, function (err, result) {
    if (err) {
      response.json({
        error: true,
        reason: "Invalid Credentials. Please try again.",
      });
      return;
    }
    if (0 == result.usercnt || "ESL Admin" == result.role_name) {
      response.json({ error: true, reason: "Invalid email address." });
      return;
    }
    /* Saving reset password token in user table */
    var timestamp = new Date().getTime();
    dbUser.updateResetPasswordToken(
      timestamp,
      result.user_id,
      function (err, userResult) {
        if (err) {
          response.json({
            error: true,
            reason: "Error: Something went wrong. Please try again!",
          });
          return;
        }
        var baseLink = marcconfig.ANGULARBASEPATH + "/#/resetPassword/";
        var htmlObj = {};
        htmlObj["user"] = result.firstname + " " + result.lastname;
        htmlObj["body"] =
          '<p>You recently requested to reset your password for your MARC account. <a href="' +
          baseLink +
          result.user_id +
          '">Click Here</a> to reset it.</p>';
        htmlObj["imagePath"] = marcconfig.ANGULARBASEPATH + "/assets/images";
        htmlObj["basePath"] = marcconfig.ANGULARBASEPATH;
        ejs.renderFile(
          __base + marcconfig.EMAILTEMPLATEPATH + "/email.ejs",
          htmlObj,
          function (err, html) {
            var mailOptions = {
              from: marcconfig.SMTPFROMNAME,
              to: req.body.email,
              subject: "MARC reset password link",
              html: html,
            };
            mailSettingDetails.sendMail(mailOptions, function (error, info) {
              if (error) {
                response.json({
                  error: true,
                  reason: "Error: Something went wrong. Please try again!",
                });
                return;
              }
              response.json({
                error: false,
                reason:
                  "Password reset link has been send to your email address.",
              });
              return;
            });
          }
        );
      }
    );
  });
});

router.post("/resetPassword", function (req, response) {
  req.checkBody("data.password", "Password is required.").notEmpty();
  req
    .checkBody("data.confirmPassword", "Passwords do not match.")
    .equals(req.body.data.password);
  var errorMsg = "";
  req.getValidationResult().then(function (err) {
    if (!err.isEmpty()) {
      err.array().map(function (elem) {
        errorMsg += elem.msg + "\n";
      });
      errorMsg = errorMsg.trim("\n");
      response.json({ error: true, reason: errorMsg });
      return response;
    }
    commonfunctionmodel.getPasswordHistory(req.body.id, function (err, result) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return response;
      }
      var passwordHistoryAry = [],
        pwdExists = 0;
      if (
        null != result["password_history"] &&
        "" != result["password_history"]
      ) {
        result["password_history"].forEach((password) => {
          if (true == bcrypt.compareSync(req.body.data.password, password)) {
            pwdExists = 1;
          }
          passwordHistoryAry.push(password);
        });
      }
      if (pwdExists) {
        response.json({
          error: true,
          reason:
            "Error: New password must be different from your last 5 passwords!",
        });
        return response;
      }
      passwordHistoryAry.push(bcrypt.hashSync(req.body.data.password));
      if (passwordHistoryAry.length > 5) passwordHistoryAry.shift();
      if (req.body.data.fromUrl == "confirm") {
        dbUser.confirmUserEmail(req.body, passwordHistoryAry, function (err) {
          if (err) {
            response.json({
              error: true,
              reason: "Error: Something went wrong. Please try again!",
            });
            return response;
          }
          response.json({
            error: false,
            reason: "User password set successfully.",
          });
          response.end();
          return response;
        });
      }
      if (req.body.data.fromUrl == "resetPassword") {
        dbUser.changePwdWithResetPassword(
          req.body,
          passwordHistoryAry,
          function (err) {
            if (err) {
              response.json({
                error: true,
                reason: "Error: Something went wrong. Please try again!",
              });
              return response;
            }
            response.json({
              error: false,
              reason: "User password changed successfully.",
            });
            response.end();
            return response;
          }
        );
      }
    });
  });
});

router.post("/getResetPasswordToken", function (req, response) {
  dbUser.userData(req.body, function (err, result) {
    if (err || !result) {
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    var reset_password_token = new Date(result.reset_password_token);
    reset_password_token.setDate(reset_password_token.getDate() + 1);
    result.reset_password_token = reset_password_token.getTime();
    response.json({ result: result });
    response.end();
    return response;
  });
});

router.post("/sendOTP", function (req, response) {
  dbUser.verifyUser(req.body, function (err, result) {
    if (err) {
      console.log("294", err);
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    if (!result || "undefined" == typeof result) {
      response.json({
        error: true,
        reason: "Invalid user and/or mobile number. Please try again.",
      });
      return response;
    }
    var OTP = Math.floor(100000 + Math.random() * 900000);
    var otpExpiryDate = new Date();
    otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 3);

    /**Indin county code check for SMS */
    var promiseArry = [];
    var countryCodeCheck = req.body.mobileNumber.startsWith("+91");
    // if(countryCodeCheck == true){
    //   promiseArry.push(sendOTP(req.body.mobileNumber, result, OTP));
    // }
    // else{
    promiseArry.push(sendOTPEmail(req.body.mobileNumber, result, OTP));
    // }
    // (countryCodeCheck == true)? promiseArry.push(sendOTP(req.body.mobileNumber, result, OTP)):promiseArry.push(sendOTPEmail(req.body.mobileNumber,result, OTP));
    /**Indin county code check for SMS */

    Promise.all(promiseArry)
      .then(function (otpResult) {
        if (!otpResult[0]) {
          response.json({ error: false, reason: "OTP Sent." });
          return response;
        }
        dbUser.updateUserOTP(
          result.user_id,
          OTP,
          otpExpiryDate,
          function (err, userResult) {
            response.json({ error: false, reason: "OTP Sent." });
            return response;
          }
        );
      })
      .catch((err) => {
        response.json({ error: true, reason: "OTP Not Sent." });
        return response;
      });
  });
});

function sendOTP(mobileNumber, user, OTP) {
  console.log(mobileNumber);
  return 0;
  return new Promise((resolve, reject) => {
    var sns = new AWS.SNS();
    var params = {
      attributes: {
        DefaultSMSType: "Transactional",
      },
    };
    sns.setSMSAttributes(params, function (err, data) {
      if (err) {
        return reject(false);
      } else {
        var params = {
          Message: "OTP for registering your mobile number with MARC is " + OTP,
          MessageStructure: "string",
          PhoneNumber: mobileNumber,
          MessageAttributes: {
            "AWS.SNS.SMS.SenderID": {
              DataType: "String",
              StringValue: "MARCom",
            },
          },
        };
        var postdata = {};
        postdata["phoneNo"] = params.PhoneNumber;
        postdata["smsObj"] = params;
        postdata["sendBy"] = "Send_Otp";
        postdata["smsCount"] = Math.ceil(params.Message.length / 160); // add for sms count (1.04 = 2 or 1.9 = 2)
        commonfunctionmodel.insertSmsLog([postdata], function (err, result) {
          if (err) {
            return reject(false);
          }
          sns.publish(params, function (err, result) {
            if (err) {
              console.log("sns.publish", err);
              return reject(false);
            } else return resolve(true);
          });
        });
      }
    });
  });
}
/* 
router.post('/sendOTP', function (req, response) {
  dbUser.verifyUser(req.body, function (err, result) {
    if (err) {
      response.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return response;
    }
    if (!result || 'undefined' == typeof result) {
      response.json({ "error": true, "reason": "Invalid user and/or mobile number. Please try again." });
      return response;
    }
    var OTP = Math.floor(100000 + Math.random() * 900000);
    var otpExpiryDate = new Date();
    otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 10); //previously it was 3
    Promise.all([sendOTP(req.body.mobileNumber, result, OTP)]).then(function (otpResult) {
      if (!otpResult[0]) {
        response.json({ "error": false, "reason": "OTP Sent. Please check your email" });
        return response;
      }
      dbUser.updateUserOTP(result.user_id, OTP, otpExpiryDate, function (err, userResult) {
        response.json({ "error": false, "reason": "OTP Sent. Please check your email" });
        return response;
      });
    }).catch(err => {
      response.json({ "error": false, "reason": "OTP Sent. Please check your email" });
      return response;
    });
  });
});*/

function sendOTPEmail(mobileNumber, user, OTP) {
  console.log("sendOTPEmail", mobileNumber);
  return new Promise((resolve, reject) => {
    var data = { id: user.user_id, fields: "firstname,lastname,email_address" };
    dbUser.userData(data, function (err, result) {
      if (err) return reject(false);
      try {
        var htmlObj = {};
        htmlObj["user"] = result.firstname + " " + result.lastname;
        htmlObj["body"] =
          "<p>Please verify your OTP.Below is your one time OTP</p>\n\n" + OTP;
        htmlObj["imagePath"] = marcconfig.ANGULARBASEPATH + "/assets/images";
        htmlObj["basePath"] = marcconfig.ANGULARBASEPATH;
        ejs.renderFile(
          __base + marcconfig.EMAILTEMPLATEPATH + "/email.ejs",
          htmlObj,
          function (err, html) {
            var mailOptions = {
              from: marcconfig.SMTPFROMNAME,
              to: result.email_address,
              subject: "MARC OTP Verification",
              html: html,
            };
            mailSettingDetails.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
                return reject(error);
              }
              return resolve("done");
            });
          }
        );
      } catch (exception) {
        return reject(exception);
      }
    });
  });
}

router.post("/verifyOTP", function (req, response) {
  dbUser.verifyOTP(req.body, function (err, result) {
    if (err) {
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    if (!result) {
      response.json({ error: true, reason: "Invalid OTP. Please try again." });
      return response;
    }
    if (result["otp"] != req.body.OTP) {
      response.json({ error: true, reason: "Invalid OTP." });
      return response;
    }
    var currentDate = new Date();
    var diffMilliSec = result["otp_expiry_time"] - currentDate;
    var diffMins = Math.round(((diffMilliSec % 86400000) % 3600000) / 60000);
    if (diffMins < 0) {
      response.json({ error: true, reason: "OTP Expired." });
      return response;
    }
    response.json({ error: false, reason: "Valid OTP." });
    return response;
  });
});

router.post("/resendOTP", function (req, response) {
  dbUser.verifyUser(req.body, function (err, result) {
    if (err) {
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    if (!result || "undefined" == typeof result) {
      response.json({
        error: true,
        reason: "Invalid user and/or mobile number. Please try again.",
      });
      return response;
    }
    var OTP = Math.floor(100000 + Math.random() * 900000);
    var otpExpiryDate = new Date();
    otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 3);
    // Promise.all([sendOTP(req.body.mobileNumber, result, OTP)]).then(function (otpResult) {
    Promise.all([sendOTPEmail(req.body.mobileNumber, result, OTP)])
      .then(function (otpResult) {
        if (!otpResult[0]) {
          response.json({
            error: true,
            reason: "Error: Something went wrong. Please try again!",
          });
          return response;
        }
        dbUser.updateUserOTP(
          result.user_id,
          OTP,
          otpExpiryDate,
          function (err, userResult) {
            response.json({ error: false, reason: "OTP Sent." });
            return response;
          }
        );
      })
      .catch((err) => {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return response;
      });
  });
});

router.post("/updateUserDetails", function (req, response) {
  dbUser.updateUserDetails(req.body, function (err, result) {
    if (err) {
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    response.json({
      error: false,
      reason: "User details updated successfully.",
    });
    return response;
  });
});

router.post("/switchToESLAdmin", function (req, response) {
  dbUser.findAdminUser(function (err, result) {
    if (err) {
      response.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return response;
    }
    if (!result) {
      response.json({ error: true, reason: "Error: No user found!" });
      return response;
    }
    req.logout();
    req.body.email = result.email_address;
    req.body.password = result.password;
    req.body.switchToAdmin = true;
    passport.authenticate("esllogin", function (error, user, info) {
      if (!user) {
        response.json({
          is_authenticated: false,
          reason: "Invalid Credentials. Please try again.",
        });
        return response;
      }
      req.logIn(user, function (error) {
        if (error) {
          response.json({
            is_authenticated: false,
            reason: "Invalid Credentials. Please try again.",
          });
          return;
        }
        response.json({
          is_authenticated: true,
          reason: "Valid Credentials.",
          current_user: user,
        });
        response.end();
        return response;
      });
    })(req, response);
  });
});

router.post("/switchToPartnerAdmin", function (req, response) {
  if (!req.session.passport || "undefined" == typeof req.session.passport) {
    response.json({
      error: true,
      reason: "Error: Something went wrong. Please try again!",
    });
    return response;
  }
  dbUser.findPartnerAdminUser(
    req.session.passport.user.company_id,
    function (err, result) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return response;
      }
      if (!result) {
        response.json({ error: true, reason: "Error: No user found!" });
        return response;
      }
      req.logout();
      req.body.email = result.email_address;
      req.body.password = result.password;
      req.body.switchToAdmin = true;
      passport.authenticate("adminlogin", function (error, user, info) {
        if (!user) {
          response.json({
            is_authenticated: false,
            reason: "Invalid Credentials. Please try again.",
          });
          return response;
        }
        req.logIn(user, function (error) {
          if (error) {
            response.json({
              is_authenticated: false,
              reason: "Invalid Credentials. Please try again.",
            });
            return;
          }
          response.json({
            is_authenticated: true,
            reason: "Valid Credentials.",
            current_user: user,
          });
          response.end();
          return response;
        });
      })(req, response);
    }
  );
});

router.post("/switchToCompany", function (req, response) {
  dbUser.getEmailPasswordOnCompanySwitch(
    req.body.email,
    function (err, result) {
      if (err) {
        response.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return response;
      }
      req.logout();
      req.body.email = result.email_address;
      req.body.password = result.password;
      req.body.switchToCompany = true;
      passport.authenticate("local", function (error, user, info) {
        if (!user) {
          response.json({
            is_authenticated: false,
            reason: "Invalid Credentials. Please try again.",
          });
          return response;
        }
        req.logIn(user, function (error) {
          if (error) {
            response.json({
              is_authenticated: false,
              reason: "Invalid Credentials. Please try again.",
            });
            return;
          }
          response.json({
            is_authenticated: true,
            reason: "Valid Credentials.",
            current_user: user,
          });
          response.end();
          return response;
        });
      })(req, response);
    }
  );
});

module.exports = router;

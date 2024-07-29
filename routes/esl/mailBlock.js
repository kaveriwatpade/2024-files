var express = require("express");
var router = express.Router();
var mailBlock = require(__base + "models").mailBlock;
var authenticationHelpers = require("../authentication-helpers");

router.post("/list", authenticationHelpers.isEslAuth, function (req, res) {
  mailBlock.list(function (err, result) {
    if (err) {
      res.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return res;
    }
    if (!result) {
      res.json({ error: true, reason: "No records found." });
      return res;
    }
    res.json({ result: result });
    res.end();
    return res;
  });
});

router.post("/submit", authenticationHelpers.isEslAuth, function (req, res) {
  mailBlock.add(req.body.data, function (err) {
    if (err) {
      res.json({
        error: true,
        reason: "Error: Something went wrong. Please try again!",
      });
      return res;
    }
    res.json({ error: false, reason: "Mail Ids added successfully." });
    res.end();
    return res;
  });
});

router.post("/delete", authenticationHelpers.isEslAuth, function (req, res) {
	console.log(req.body);
  mailBlock.delete(
    req.body.data,
    function (err, result) {
      if (err) {
        res.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
		console.log(err);
        return res;
      }
      if (!result) {
        res.json({
          error: true,
          reason: "This Mail Id can't be deleted as it has associated company.",
        });
        res.end();
        return res;
      }
      res.json({ error: false, reason: "Mail Id deleted successfully." });
      res.end();
      return res;
    }
  );
});

module.exports = router;

var express = require('express');
var router = express.Router();
var authenticationHelpers = require('../authentication-helpers');
var fs = require('fs');
var Promise = require('promise');
var XLSX = require('@sheet/edit');
const tempfile = require('tempfile');
var ejs = require('ejs');
var assetanalysis = require('../../models').assetanalysis;
var common = require(__base + 'routes/common');
var momentTimezone = require('moment-timezone');
var intervalObj = { 'fifteen': '15min', 'hourly': 'Hourly', 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'yearly': 'Yearly', 'all': 'All' };
var fonts = {
  Roboto: {
    normal: './assets/fonts/Roboto-Regular.ttf',
    bold: './assets/fonts/Roboto-Medium.ttf',
    italics: './assets/fonts/Roboto-Italic.ttf',
    bolditalics: './assets/fonts/Roboto-MediumItalic.ttf'
  }
};
var PdfPrinter = require('pdfmake/src/printer');
const { log } = require('console');
var printer = new PdfPrinter(fonts);

router.post('/downloadFile', authenticationHelpers.isClientAuth, function (req, res) {
  var promiseAry = [];
  if (req.body['format'] == 'xls') {
    switch (req.body['reportType']) {
      case 'Consumption':
        promiseAry.push(generateReportExcelFile(req.body, req.session.passport.user, 1));
        break;
      case 'Location Wise Consumption':
        promiseAry.push(generateGroupReportExcelFile(req.body, req.session.passport.user, 1));
        break;
      case 'Group Wise Consumption':
        promiseAry.push(generateGroupReportExcelFile(req.body, req.session.passport.user, 1));
        break;
      case 'Trend':
        promiseAry.push(generateReportExcelFile(req.body, req.session.passport.user, 1));
        break;
      case 'Timeslice':
        promiseAry.push(generateTimeSliceExcelFile(req.body, req.session.passport.user, 1));
        break;
    }
  }
  if (req.body['format'] == 'pdf') {
    switch (req.body['reportType']) {
      case 'Consumption':
        promiseAry.push(generateReportPDFFile(req.body, req.session.passport.user, 1));
        break;
      case 'Location Wise Consumption':
        promiseAry.push(generateGroupReportPDFFile(req.body, req.session.passport.user, 1));
        break;
      case 'Group Wise Consumption':
        promiseAry.push(generateGroupReportPDFFile(req.body, req.session.passport.user, 1));
        break;
      case 'Trend':
        promiseAry.push(generateReportPDFFile(req.body, req.session.passport.user, 1));
        break;
      case 'Timeslice':
        promiseAry.push(generateTimeSlicePDFFile(req.body, req.session.passport.user, 1));
        break;
      case 'TenantBilling':
        promiseAry.push(generateTenantBillingPDFFile(req.body, req.session.passport.user));
        break;
    }
  }
  Promise.all(promiseAry).then(function (result) {
    if (!result[0]) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    res.json({ "error": false, "reason": "File downloaded successfully!", "data": result[0] });
    res.end();
    return res;
  }).catch(err => {
    console.log(err);
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

router.post('/emailFile', authenticationHelpers.isClientAuth, function (req, res) {
  var promiseAry = [];
  var filename = '', contentType = '';
  if (req.body['format'] == 'xls') {
    filename = req.body['reportType'].toLowerCase() + '-report.xlsx';
    contentType = 'application/xlsx';
    switch (req.body['reportType']) {
      case 'Consumption':
        promiseAry.push(generateReportExcelFile(req.body, req.session.passport.user, 0));
        break;
      case 'Location Wise Consumption':
        promiseAry.push(generateGroupReportExcelFile(req.body, req.session.passport.user, 0));
        break;
      case 'Group Wise Consumption':
        promiseAry.push(generateGroupReportExcelFile(req.body, req.session.passport.user, 0));
        break;
      case 'Trend':
        promiseAry.push(generateReportExcelFile(req.body, req.session.passport.user, 0));
        break;
      case 'Timeslice':
        promiseAry.push(generateTimeSliceExcelFile(req.body, req.session.passport.user, 0));
        break;
    }
  }
  if (req.body['format'] == 'pdf') {
    filename = req.body['reportType'].toLowerCase() + '-report.pdf';
    contentType = 'application/pdf';
    switch (req.body['reportType']) {
      case 'Consumption':
        promiseAry.push(generateReportPDFFile(req.body, req.session.passport.user, 0));
        break;
      case 'Location Wise Consumption':
        promiseAry.push(generateGroupReportPDFFile(req.body, req.session.passport.user, 0));
        break;
      case 'Group Wise Consumption':
        promiseAry.push(generateGroupReportPDFFile(req.body, req.session.passport.user, 0));
        break;
      case 'Trend':
        promiseAry.push(generateReportPDFFile(req.body, req.session.passport.user, 0));
        break;
      case 'Timeslice':
        promiseAry.push(generateTimeSlicePDFFile(req.body, req.session.passport.user, 0));
        break;
    }
  }
  Promise.all(promiseAry).then(function (result) {
    if (!result[0]) {
      res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
      return res;
    }
    var tempFilePath = result[0];
    var htmlObj = {};
    htmlObj['user'] = '';
    htmlObj['body'] = '<p>PFA</p>';
    htmlObj['imagePath'] = marcconfig.ANGULARBASEPATH + '/assets/images';
    htmlObj['basePath'] = marcconfig.ANGULARBASEPATH;
    ejs.renderFile(__base + marcconfig.EMAILTEMPLATEPATH + '/email.ejs', htmlObj, function (err, html) {
      var mailOptions = {
        from: marcconfig.SMTPFROMNAME,
        to: req.body['emailAddress'],
        subject: req.body['reportType'] + ' Report',
        html: html,
        attachments: [{
          filename: filename,
          path: tempFilePath,
          contentType: contentType
        }]
      };
      mailSettingDetails.sendMail(mailOptions, function (err, result) {
        if (err) {
          res.json({ "error": true, "reason": "Error: Report not sent.!" });
          return res;
        }
        fs.unlink(tempFilePath, function () { });
        res.json({ "error": false, "reason": "Report mailed successfully.!" });
        res.end();
        return res;
      });
    });
  }).catch(err => {
    res.json({ "error": true, "reason": "Error: Something went wrong. Please try again!" });
    return res;
  });
});

/** SheetJS Library Integration...... timeslice report style done dynamically */
function generateTimeSliceExcelFile(reportDataObj,session,download){
  return new Promise((resolve, reject) =>{
    try{
      var columnAry = JSON.parse(reportDataObj['columns']);
      var rowAry = JSON.parse(reportDataObj['rows']);
      var company_name = session['company_name'];
      var reportType = 'Time Slice';
      var columnLength = columnAry.length;
      var columnMergeChar = getCellCharacterCodeFromInteger(columnLength);

        /** columnHeader array for headings */
        let columnHeader = []; 
        columnAry.forEach(column => {
          columnHeader.push(column['header']); 
        });
        
        let rowDataAry = [];
        rowAry.forEach(row => {
          delete row['total'];
          rowDataAry.push(Object.values(row)); 
        });

        /** sheet_add_aoa for add column array and row array in sheet */
        var workbook = XLSX.utils.book_new();
        var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
        XLSX.utils.sheet_set_range_style(worksheet, 'A1:'+columnMergeChar+'1', { bold: true, sz:12, name: "Cambria", alignment:{vertical: "middle",horizontal: "center"}});
        XLSX.utils.sheet_add_aoa(worksheet, [["Report",reportType],["Generation Datetime",reportDataObj['reportDate']],["Parameter", reportDataObj['parameter']]], {origin: "A3"});
        XLSX.utils.sheet_set_range_style(worksheet,"A3:A5", { bold: true, name: "Cambria", sz:11, alignment:{vertical: "middle",horizontal: "center"}});
        
        var merges = worksheet['!merges'] = []; 
        merges.push({ s: 'A1', e: columnMergeChar+'1'}); 
        merges.push({ s: 'B3', e: columnMergeChar+'3'});
        merges.push({ s: 'B4', e: columnMergeChar+'4'});
        merges.push({ s: 'B5', e: columnMergeChar+'5' });
        
        var columnInteger = 1, columnChar = '', rowInteger = 1, rowChar = '', rowCellNo = 9, rowChar1 = '',lastRowInteger = 1;
        for(i=0; i<columnHeader.length; i++){
        columnChar = getCellCharacterCodeFromInteger(columnInteger);
        XLSX.utils.sheet_add_aoa(worksheet, [columnHeader], {origin: "A7"});
        XLSX.utils.sheet_set_range_style(worksheet, columnChar+'7', { bold: true, name: "Cambria", sz:11, auto: 1, alignment:{vertical: "middle",horizontal: "center"}});
        columnInteger++;
        }

        for(i=0 ; i<rowDataAry.length; i++){
          rowChar = getCellCharacterCodeFromInteger(rowInteger);
          rowChar1 = getCellCharacterCodeFromInteger(columnHeader.length);
          XLSX.utils.sheet_add_aoa(worksheet, [rowDataAry[i]], {origin: "A'"+rowCellNo+"'"});
          XLSX.utils.sheet_set_range_style(worksheet,rowChar+rowCellNo+':'+rowChar1+rowCellNo, { sz:11, name: "Cambria", alignment:{vertical: "middle",horizontal: "center"}});
          rowCellNo++;
          lastRowInteger = rowCellNo;
        }
          
        lastRowInteger = lastRowInteger + 2;
        merges.push({ s:'A'+lastRowInteger, e:columnMergeChar+lastRowInteger});
        XLSX.utils.sheet_add_aoa(worksheet, [["** Note : This report is based on 15 mins data."]], {origin: "A'"+lastRowInteger+"'"});
        XLSX.utils.sheet_set_range_style(worksheet,'A'+lastRowInteger, { bold: true, sz:10, color:{rgb:'FF0000'}, name: "Cambria", alignment:{vertical: "middle",horizontal: "left"}});
        
      if(download){
        XLSX.utils.book_append_sheet(workbook,worksheet,'Report');
        var wbout = XLSX.write(workbook, {type:"array", bookType:'xlsx',cellStyles: true}); 
        const buf2 = Buffer.from(wbout);
        return resolve(buf2);
      }

      if(!download){
        var tempFilePath = tempfile('.xlsx');
        XLSX.utils.book_append_sheet(workbook,worksheet,'Report');
        XLSX.writeFile(workbook,tempFilePath,{type:"file", bookType:'xlsx', cellStyles: true});
        return resolve(tempFilePath);
      }

    }catch(err){
      return reject(0);
    }
  });
}

function generateReportPDFFile(reportDataObj, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var columnAry = JSON.parse(reportDataObj['columns']);
      var rowAry = JSON.parse(reportDataObj['rows']);
      var pdfTblBody = [];
      var pdfTblCols = [], pdfTblRowsObj = {};
      columnAry.forEach((column, columnIndex) => {
        pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
        rowAry.forEach((row, rowIndex) => {
          if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
            pdfTblRowsObj[rowIndex] = [];
          }
          pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
        });
      });
      pdfTblBody.push(pdfTblCols);
      for (var pdfTblRowIndex in pdfTblRowsObj) {
        pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
      }
      var docDefinition = {
        footer: function (currentPage, pageCount) {
          return {
            margin: [40, 0, 0, 0],
            columns: [{
              fontSize: 8,
              text: [
                {
                  text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                }
              ],
            }]
          };
        },
        content: [
          { text: session['company_name'], style: 'clsHeader' },
          { text: 'Report : ' + reportDataObj['reportType'], style: 'clsSubHeader' },
          { text: 'Node Name : ' + reportDataObj['node'], style: 'clsSubHeader' },
          { text: 'Duration : ' + reportDataObj['reportDate'], style: 'clsSubHeader' },
          { text: 'Interval : ' + intervalObj[reportDataObj['interval']], style: 'clsSubHeader' },
          {
            image: reportDataObj['chartImg'],
            width: 530,
            height: 800,
            fit: [530, 600],
            pageBreak: 'after',
            style: 'clsImage'
          },
          {
            style: 'clsTable',
            table: {
              headerRows: 1,
              body: pdfTblBody
            }
          },
        ],
        styles: {
          clsHeader: {
            fontSize: 12,
            bold: true
          },
          clsSubHeader: {
            fontSize: 10
          },
          clsTblHeader: {
            fillColor: '#9e9e9e',
            color: '#FFFFFF'
          },
          clsImage: {
            margin: [0, 40, 0, 0]
          },
          clsTable: {
            fontSize: 8
          }
        },
        defaultStyle: {
          alignment: 'justify'
        }
      }
      var doc = printer.createPdfKitDocument(docDefinition);
      var chunks = [];
      doc.on('readable', function () {
        var chunk;
        while ((chunk = doc.read(9007199254740991)) !== null) {
          chunks.push(chunk);
        }
      });

      if (download) {
        doc.on('end', function () {
          var buffer = Buffer.concat(chunks);
          return resolve(buffer);
        });
        doc.end();
      }
      if (!download) {
        var tempFilePath = tempfile('.pdf');
        var wait;
        doc.pipe(wait = fs.createWriteStream(tempFilePath));
        doc.end();
        wait.on('finish', function () {
          return resolve(tempFilePath);
        });
      }
    } catch (err) {
      console.log("catch try", err)
      return reject(0);
    }
  });
}

function getCellCharacterCodeFromInteger(number) {
  var baseChar = ("A").charCodeAt(0), letters = "";
  do {
    number -= 1;
    letters = String.fromCharCode(baseChar + (number % 26)) + letters;
    number = (number / 26) >> 0;
  } while (number > 0);
  return letters;
}

function generateSingleNodeReportPDFFile(req, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var postDataObj = {};
      var promiseAry = [];
      var columnAry = JSON.parse(req.body.columns);
      var reportType = req.body['reportType'];
      var node = req.body.node;
      var reportDate = req.body.reportDate;
      var interval = req.body.interval;
      var chartImg = req.body.chartImg;
      postDataObj['nodeId'] = req.body['postData']['nodeId'];
      postDataObj['parameterId'] = req.body['postData']['parameterId'];
      postDataObj['interval'] = req.body['interval'];
      postDataObj['fromDate'] = req.body['postData']['fromDate'];
      postDataObj['toDate'] = req.body['postData']['toDate'];
      postDataObj['isinstantaneous'] = req.body['postData']['isinstantaneous'];
      postDataObj['emailAddress'] = req.body['postData']['emailAddress'];
      postDataObj['reportType'] = req.body['postData']['reportType'];
      promiseAry.push(getPostdataReadings(req, postDataObj));
      Promise.all(promiseAry).then(promiseResult => {
        var dateIndex = 1;
        var rowAry = [];
        for (var date in promiseResult[0]['data']) {
          var dataObj = {};
          dataObj['srno'] = dateIndex;
          dataObj['date'] = date;
          for (var nodeUniqueIdParamId in promiseResult[0]['data'][date]) {
            if ('timestamp' == nodeUniqueIdParamId) {
              continue;
            }
            dataObj['s' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['startReading']['unitReading'];
            dataObj['e' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['endReading']['unitReading'];
            dataObj['d' + nodeUniqueIdParamId] = promiseResult[0]['data'][date][nodeUniqueIdParamId]['difference']['unitReading'];
          }
          rowAry.push(dataObj);
          dateIndex++;
        }
        var pdfTblBody = [];
        var pdfTblCols = [], pdfTblRowsObj = {};
        columnAry.forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          rowAry.forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
          });
        });
        pdfTblBody.push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          pdfTblBody.push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        var docDefinition = {
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                  }
                ],
              }]
            };
          },
          content: [
            { text: session['company_name'], style: 'clsHeader' },
            { text: 'Report : ' + reportType, style: 'clsSubHeader' },
            { text: 'Node Name : ' + node, style: 'clsSubHeader' },
            { text: 'Duration : ' + reportDate, style: 'clsSubHeader' },
            { text: 'Interval : ' + intervalObj[interval], style: 'clsSubHeader' },
            {
              image: chartImg,
              width: 530,
              height: 800,
              fit: [530, 600],
              pageBreak: 'after',
              style: 'clsImage'
            },
            {
              style: 'clsTable',
              table: {
                headerRows: 1,
                body: pdfTblBody
              }
            },
          ],
          styles: {
            clsHeader: {
              fontSize: 12,
              bold: true
            },
            clsSubHeader: {
              fontSize: 10
            },
            clsTblHeader: {
              fillColor: '#9e9e9e',
              color: '#FFFFFF'
            },
            clsImage: {
              margin: [0, 40, 0, 0]
            },
            clsTable: {
              fontSize: 8
            }
          },
          defaultStyle: {
            alignment: 'justify'
          }
        }
        var doc = printer.createPdfKitDocument(docDefinition);
        var chunks = [];
        doc.on('readable', function () {
          var chunk;
          while ((chunk = doc.read(9007199254740991)) !== null) {
            chunks.push(chunk);
          }
        });

        if (download) {
          doc.on('end', function () {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
          doc.end();
        }
        if (!download) {
          var tempFilePath = tempfile('.pdf');
          var wait;
          doc.pipe(wait = fs.createWriteStream(tempFilePath));
          doc.end();
          wait.on('finish', function () {
            return resolve(tempFilePath);
          });
        }
      }).catch(err => {
        console.log('in catch block1', err)
        return err;
      });
    } catch (err) {
      return reject(0);
    }
  });
}

function getPostdataReadings(req, postDataObj) {
  req.body = postDataObj;
  return new Promise((resolve, reject) => {
    try {
      var isInstantaneous = parseInt(req.body.isinstantaneous);
      var interval = ('proccessdata' == req.body.interval || 'all' == req.body.interval || 'realtime' == req.body.interval) ? req.body.interval : ((1 === isInstantaneous) ? 'instantaneous' + req.body.interval : 'cummulative' + req.body.interval);
      switch (interval) {
        case 'cummulativefifteen': common.getCummulativeFifteenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativehourly': common.getCummulativeHourlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativedaily': common.getCummulativeDailyData(req, function (error, data) {
          if(error){
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativeweekly': common.getCummulativeWeeklyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativemonthly': common.getCummulativeMonthlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'cummulativeyearly': common.getCummulativeYearlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousfifteen': common.getInstantaneousFifteenMinutesData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneoushourly': common.getInstantaneousHourlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousdaily': common.getInstantaneousDailyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousweekly': common.getInstantaneousWeeklyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousmonthly': common.getInstantaneousMonthlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'instantaneousyearly': common.getInstantaneousYearlyData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'all': common.getRawData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'realtime': common.getRealtimeData(req, function (error, data) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'proccessdata': common.getProcessedRawData(req, function (error, result) {
          if (error) {
            return reject(error);
          }
          return resolve(data);
        });
          break;
        case 'default':
          if (error) {
            return reject(error);
          }
          return resolve(data);
      }
    } catch (exception) {
      return reject(exception);
    }
  });
}

function generateGroupReportPDFFile(reportDataObj, session, download) {
  return new Promise((resolve, reject) => {
    try {
      var readingDataObj = JSON.parse(reportDataObj['requestActionData']);
      var contentAry = [{ text: session['company_name'], style: 'clsHeader' },
      { text: 'Report : ' + reportDataObj['reportType'], style: 'clsSubHeader' },
      { text: 'Parameter Name : ' + reportDataObj['parameter'], style: 'clsSubHeader' },
      { text: 'Duration : ' + reportDataObj['reportDate'], style: 'clsSubHeader' },
      { text: 'Interval : ' + intervalObj[reportDataObj['interval']], style: 'clsSubHeader' },
      {
        image: reportDataObj['chartImg'],
        width: 530,
        height: 800,
        fit: [530, 600],
        pageBreak: 'after',
        style: 'clsImage'
      }];

      var index = 0;
      for (var nodeGroupId in readingDataObj) {
        var pdfParentTblCols = [], pdfTblCols = [], pdfTblRowsObj = {};
        if (index == 0) contentAry.push({ text: readingDataObj[nodeGroupId]['nodeGroup'] + ' : ' + readingDataObj[nodeGroupId]['nodeGroupReading'], style: 'clsSubHeader' });
        else contentAry.push({ text: readingDataObj[nodeGroupId]['nodeGroup'] + ' : ' + readingDataObj[nodeGroupId]['nodeGroupReading'], style: 'clsSubHeader', pageBreak: 'before' });
        var tableObj = { table: { headerRows: 2, body: [] } };
        readingDataObj[nodeGroupId]['nodeGroupTblParentCols'].forEach((pColumn, pColumnIndex) => {
          if (pColumnIndex < 2) {
            pdfParentTblCols.push({ text: pColumn['header'], style: 'clsTblHeader' });
          }
          if (pColumnIndex >= 2) {
            pdfParentTblCols.push({ text: pColumn['header'], style: 'clsTblHeader', colSpan: 3 });
            pdfParentTblCols.push({});
            pdfParentTblCols.push({});
          }
        });
        readingDataObj[nodeGroupId]['nodeGroupTblCols'].forEach((column, columnIndex) => {
          pdfTblCols.push({ text: column['header'], style: 'clsTblHeader' });
          readingDataObj[nodeGroupId]['nodeGroupTblRows'].forEach((row, rowIndex) => {
            if ('undefined' == typeof pdfTblRowsObj[rowIndex]) {
              pdfTblRowsObj[rowIndex] = [];
            }
            if ('undefined' != typeof row[column['columnDef']]) pdfTblRowsObj[rowIndex].push(row[column['columnDef']]);
            else pdfTblRowsObj[rowIndex].push('-');
          });
        });
        tableObj['table']['body'].push(pdfParentTblCols);
        tableObj['table']['body'].push(pdfTblCols);
        for (var pdfTblRowIndex in pdfTblRowsObj) {
          tableObj['table']['body'].push(pdfTblRowsObj[pdfTblRowIndex]);
        }
        contentAry.push(tableObj);
        index++;
      }
      var docDefinition = {
        footer: function (currentPage, pageCount) {
          return {
            margin: [40, 0, 0, 0],
            columns: [{
              fontSize: 8,
              text: [
                {
                  text: 'Page ' + currentPage.toString() + ' / ' + pageCount,
                }
              ],
            }]
          };
        },
        content: contentAry,
        styles: {
          clsHeader: {
            fontSize: 12,
            bold: true
          },
          clsSubHeader: {
            fontSize: 10
          },
          clsTblHeader: {
            fillColor: '#9e9e9e',
            color: '#FFFFFF'
          },
          clsImage: {
            margin: [0, 40, 0, 0]
          },
          clsTable: {
            fontSize: 8
          }
        },
        defaultStyle: {
          alignment: 'justify'
        }
      }
      var doc = printer.createPdfKitDocument(docDefinition);
      var chunks = [];
      doc.on('readable', function () {
        var chunk;
        while ((chunk = doc.read(9007199254740991)) !== null) {
          chunks.push(chunk);
        }
      });

      if (download) {
        doc.on('end', function () {
          var buffer = Buffer.concat(chunks);
          return resolve(buffer);
        });
        doc.end();
      }
      if (!download) {
        var tempFilePath = tempfile('.pdf');
        var wait;
        doc.pipe(wait = fs.createWriteStream(tempFilePath));
        doc.end();
        wait.on('finish', function () {
          return resolve(tempFilePath);
        });
      }
    } catch (err) {
      return reject(0);
    }
  });
}

router.post('/getTenantBillingInfo', authenticationHelpers.isClientAuth, function (req, res) {
  var appId = req['body']['app_id'];
  var promiseAry = [];
  var dataPromiseAry = [];
  promiseAry.push(isDualSource(req['body']['node'], appId));/**check whether node is dual source or not and return the node_unique_id of all nodes */
  Promise.all(promiseAry).then(function (promiseResult) {
    for (var userId in req['body']['tenantDetails']) {
      var postDataObj = {};
      var billingDate = {};
      if ('undefined' == typeof billingDate[userId]) {
        billingDate[userId] = [];
      }
      billingDate[userId] = req['body']['month'] + '-' + req['body']['tenantDetails'][userId]['billingCycle'];
      postDataObj['company_id'] = req.body.company_id;
      for (var tenantId in billingDate) {
        postDataObj['nodeId'] = promiseResult[0][appId]['nodeUniqueId'];
        postDataObj['parameterId'] = [37, 326];
        postDataObj['interval'] = 'daily';
        postDataObj['fromDate'] = momentTimezone(billingDate[tenantId]).format('YYYY-MM-DD 00:00:00' + req.session.passport.user.timezone_offset);
        postDataObj['toDate'] = momentTimezone(billingDate[tenantId]).add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD 23:59:59' + req.session.passport.user.timezone_offset);
        dataPromiseAry.push(getBillingDataConsumption(req.body, postDataObj, tenantId));/*use to get consumption */
      }
    }
    Promise.all(dataPromiseAry).then(function (promiseResults) {
      var billingObj = {}, finalBillingObj = {};
      var selectedMonth = req['body']['month'];
      var billingRateObj = req['body']['billing_setting'][selectedMonth];
      if ('undefined' == typeof billingRateObj) {
        res.json({ "error": true, "reason": "Error: Could'nt find billing rate for selected month,Please select month with billing rate!" });
        return res;
      }
      /**final billing userwise calculations individual as well as common done here */
      for (var index in promiseResults) {
        for (var userId in promiseResults[index]) {
          if (Object.keys(promiseResults[index][userId]).length == 0) {
            res.json({ "error": true, "reason": "Error: Could'nt Process due to no consumption data for selected month of selected tenant!" });
            return res;
          }
          if ('undefined' == typeof billingObj[userId]) { billingObj[userId] = { individual: { 37: 0, 326: 0, s_37: 0 }, common: { 37: 0, 326: 0, s_37: 0 } }; }
          if ('undefined' == typeof finalBillingObj[userId]) { finalBillingObj[userId] = { individual: { 37: {}, 326: {}, total: 0 }, common: { 37: {}, 326: {}, total: 0 }, total: 0 }; }
          if ('undefined' != typeof promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['individualTenantwithNode'][userId]]) {
            var nodeUniqId_37 = promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['individualTenantwithNode'][userId]] + '_' + 37;
            var nodeUniqId_326 = promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['individualTenantwithNode'][userId]] + '_' + 326;
            var singleWhConsumption = ('undefined' == typeof promiseResults[index][userId][nodeUniqId_37]) ? 0 : promiseResults[index][userId][nodeUniqId_37];
            var singleDgConsumption = ('undefined' == typeof promiseResults[index][userId][nodeUniqId_326]) ? 0 : promiseResults[index][userId][nodeUniqId_326];
            billingObj[userId]['individual']['37'] = singleWhConsumption;
            billingObj[userId]['individual']['326'] = singleDgConsumption;
          }
          if ('undefined' != typeof promiseResult[0][appId]['isSingleSourceNodeIdWise'][req['body']['individualTenantwithNode'][userId]]) {
            var nodeUniqId = promiseResult[0][appId]['isSingleSourceNodeIdWise'][req['body']['individualTenantwithNode'][userId]] + '_' + 37;
            var consumption = ('undefined' == typeof promiseResults[index][userId][nodeUniqId]) ? 0 : promiseResults[index][userId][nodeUniqId];
            billingObj[userId]['individual']['s_37'] = consumption;
          }
          finalBillingObj[userId]['individual']['37']['consumption'] = billingObj[userId]['individual']['37'] + billingObj[userId]['individual']['s_37'];
          finalBillingObj[userId]['individual']['37']['total'] = finalBillingObj[userId]['individual']['37']['consumption'] * billingRateObj['msebrate'];
          finalBillingObj[userId]['individual']['326']['consumption'] = billingObj[userId]['individual']['326'];
          finalBillingObj[userId]['individual']['326']['total'] = finalBillingObj[userId]['individual']['326']['consumption'] * billingRateObj['manualrate'];
          finalBillingObj[userId]['individual']['total'] = finalBillingObj[userId]['individual']['37']['total'] + finalBillingObj[userId]['individual']['326']['total'];
          for (var nodeId in req['body']['commonNodesWithTenant'][userId]) {
            var nodeCount = req['body']['nodeCountObj'][req['body']['commonNodesWithTenant'][userId][nodeId]];
            if ('undefined' != typeof promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['commonNodesWithTenant'][userId][nodeId]]) {
              var nodeuniqueId_37 = promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['commonNodesWithTenant'][userId][nodeId]] + '_' + 37;
              var nodeuniqueId_326 = promiseResult[0][appId]['isDualSourceNodeIdWise'][req['body']['commonNodesWithTenant'][userId][nodeId]] + '_' + 326;
              var whConsumption = ('undefined' == typeof promiseResults[index][userId][nodeuniqueId_37]) ? 0 : promiseResults[index][userId][nodeuniqueId_37];
              var dgConsumption = ('undefined' == typeof promiseResults[index][userId][nodeuniqueId_326]) ? 0 : promiseResults[index][userId][nodeuniqueId_326];
              var whCommonConsumption = whConsumption / nodeCount;
              var dgCommonConsumption = dgConsumption / nodeCount;
              billingObj[userId]['common']['37'] += whCommonConsumption;
              billingObj[userId]['common']['326'] += dgCommonConsumption;
            }
            if ('undefined' != typeof promiseResult[0][appId]['isSingleSourceNodeIdWise'][req['body']['commonNodesWithTenant'][userId][nodeId]]) {
              var nodeUniqueId = promiseResult[0][appId]['isSingleSourceNodeIdWise'][req['body']['commonNodesWithTenant'][userId][nodeId]] + '_' + 37;
              var whSingleConsumption = ('undefined' == typeof promiseResults[index][userId][nodeUniqueId]) ? 0 : promiseResults[index][userId][nodeUniqueId];
              var monthlyBillingGeneration = whSingleConsumption / nodeCount;
              billingObj[userId]['common']['s_37'] += monthlyBillingGeneration;
            }
          }
          finalBillingObj[userId]['common']['37']['consumption'] = billingObj[userId]['common']['37'] + billingObj[userId]['common']['s_37'];
          finalBillingObj[userId]['common']['37']['total'] = finalBillingObj[userId]['common']['37']['consumption'] * billingRateObj['msebrate'];
          finalBillingObj[userId]['common']['326']['consumption'] = billingObj[userId]['common']['326'];
          finalBillingObj[userId]['common']['326']['total'] = finalBillingObj[userId]['common']['326']['consumption'] * billingRateObj['manualrate'];
          finalBillingObj[userId]['common']['total'] = finalBillingObj[userId]['common']['37']['total'] + finalBillingObj[userId]['common']['326']['total'];
          finalBillingObj[userId]['total'] = finalBillingObj[userId]['individual']['total'] + finalBillingObj[userId]['common']['total'];
          finalBillingObj[userId]['name'] = req['body']['tenantDetails'][userId]['tenantName'];
          finalBillingObj[userId]['address'] = req['body']['tenantDetails'][userId]['address'];
          finalBillingObj[userId]['mobile'] = req['body']['tenantDetails'][userId]['mobile'];
          finalBillingObj[userId]['pinCode'] = req['body']['tenantDetails'][userId]['pinCode'];
          finalBillingObj[userId]['country'] = req['body']['tenantDetails'][userId]['country'];
          finalBillingObj[userId]['state'] = req['body']['tenantDetails'][userId]['state'];
          finalBillingObj[userId]['city'] = req['body']['tenantDetails'][userId]['city'];
        }
      }
      if (Object.keys(finalBillingObj).length > 0) {
        res.json({ "error": false, "reason": "data succesfully sent!", "data": finalBillingObj });
        res.end();
        return res;
      }
    });
  });
});

function getBillingDataConsumption(req, postData, tenantId) {
  return new Promise((resolve, reject) => {
    req.body = postData;
    common.getCummulativeDailyData(req, function (error, data) {
      var billingObj = {};
      if ('undefined' == typeof billingObj[tenantId]) { billingObj[tenantId] = {} };
      if (!data['error'] && 'undefined' != typeof data['data'] && Object.keys(data['data']).length > 0) {
        for (var key in data['data']) {
          for (var deviceId in data['data'][key]) {
            if ('timestamp' == deviceId) {
              continue;
            }
            if (data['data'][key][deviceId]['difference']['reading'] != null) {
              if ('undefined' == typeof billingObj[tenantId][deviceId]) {
                billingObj[tenantId][deviceId] = 0;
              }
              billingObj[tenantId][deviceId] += data['data'][key][deviceId]['difference']['reading'];
            }
          }
        }
      }
      return resolve(billingObj);
    });
  });
}

function isDualSource(nodeIds, appId) {
  return new Promise((resolve, reject) => {
    assetanalysis.isDualSource(nodeIds, function (err, result) {
      if (err) {
        return reject(err);
      }
      var dualSourceObj = {};
      for (var i = 0; i < result.length; i++) {
        if ('undefined' == typeof dualSourceObj[appId]) {
          dualSourceObj[appId] = { nodeUniqueId: [], isDualSourceNodeIdWise: {}, isSingleSourceNodeIdWise: {} };
        }
        dualSourceObj[appId]['nodeUniqueId'].push(result[i]['node_unique_id']);
        if (result[i]['dual_source'] == 'Yes') {
          dualSourceObj[appId]['isDualSourceNodeIdWise'][result[i]['node_id']] = result[i]['node_unique_id'];
        } else {
          dualSourceObj[appId]['isSingleSourceNodeIdWise'][result[i]['node_id']] = result[i]['node_unique_id'];
        }
      }
      return resolve(dualSourceObj)
    });
  });
}

/** created docdefination format for all tenant pdf billing(inserted individual and common values) as well as created buffer and return it to promise */
function generateTenantBillingPDFFile(billingDataObj, sessionData) {
  return new Promise((resolve, reject) => {
    try {
      var docDefinition = [], docDef = [], tenantMapping = [];
      var selectedMonth = billingDataObj['requestData']['month'];
      var billingRateObj = billingDataObj['requestData']['billing_setting'][selectedMonth];
      var currentDate = momentTimezone.tz(sessionData.timezone);
      var billingDate = momentTimezone.tz(currentDate, 'YYYY-MM-DD HH:mm:ssZ', sessionData.timezone).format('YYYY-MM-DD');
      for (var userId in billingDataObj['requestData']['data']) {
        var billingPeriod = selectedMonth + '-' + billingDataObj['requestData']['tenantDetails'][userId]['billingCycle'] + ' to ' + momentTimezone(selectedMonth + '-' + billingDataObj['requestData']['tenantDetails'][userId]['billingCycle']).add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD');
        tenantMapping.push(billingDataObj['requestData']['data'][userId]['name']);
        docDefinition.push({
          header: function (currentPage, pageCount) {
            return {
              margin: 10,
              columns: [
                {
                  image: './uploads/images/company-logo/marc_logo.png',
                  width: 100,
                  height: 50,
                  alignment: 'left'
                },
              ],
            }
          },
          content: [
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [{ text: 'Report', bold: true, color: '#FF0000' }, { text: 'Tenant Name', bold: true, color: '#FF0000' }, { text: 'Address', bold: true, color: '#FF0000' }, { text: 'Mobile No', bold: true, color: '#FF0000' }],
                  ['Tenant Bill', billingDataObj['requestData']['data'][userId]['name'], billingDataObj['requestData']['data'][userId]['address'], billingDataObj['requestData']['data'][userId]['mobile']]
                ]
              }, style: 'clsReportHeader'
            },
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [{ text: 'Pin Code', bold: true, color: '#FF0000' }, { text: 'Country', bold: true, color: '#FF0000' }, { text: 'State', bold: true, color: '#FF0000' }, { text: 'City', bold: true, color: '#FF0000' }],
                  [billingDataObj['requestData']['data'][userId]['pinCode'], billingDataObj['requestData']['data'][userId]['country'], billingDataObj['requestData']['data'][userId]['state'], billingDataObj['requestData']['data'][userId]['city']]
                ]
              }, style: 'clsSubHeader'
            },
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*'],
                body: [
                  [{ text: 'Billing Date', bold: true, color: '#FF0000' }, { text: 'Billing Period', bold: true, color: '#FF0000' }],
                  [billingDate, billingPeriod]
                ]
              }, style: 'clsSubHeader'
            },
            { text: 'individual meter billing assigned to tenant', style: 'subheader' },
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [{ text: '', bold: true }, { text: 'Individual', bold: true, color: '#FF0000' }, { text: 'Rate per unit', bold: true, color: '#FF0000' }, { text: 'Total', bold: true, color: '#FF0000' }],
                  [{
                    stack: [
                      {
                        ul: [
                          '37_Consumption',
                          '326_Consumption',
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingDataObj['requestData']['data'][userId]['individual']['37']['consumption'],
                          billingDataObj['requestData']['data'][userId]['individual']['326']['consumption'],
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingRateObj['msebrate'],
                          billingRateObj['manualrate'],
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingDataObj['requestData']['data'][userId]['individual']['37']['total'],
                          billingDataObj['requestData']['data'][userId]['individual']['326']['total'],
                          billingDataObj['requestData']['data'][userId]['individual']['total']
                        ]
                      }
                    ]
                  }]
                ]
              }, style: 'clsTenantBillHeader'
            },
            { text: 'common facility meter billing assigned to tenant', style: 'subheader' },
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*', '*', '*'],
                body: [
                  [{ text: '', bold: true }, { text: 'Common', bold: true, color: '#FF0000' }, { text: 'Rate per unit', bold: true, color: '#FF0000' }, { text: 'Total', bold: true, color: '#FF0000' }],
                  [{
                    stack: [
                      {
                        ul: [
                          '37_Consumption',
                          '326_Consumption',
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingDataObj['requestData']['data'][userId]['common']['37']['consumption'],
                          billingDataObj['requestData']['data'][userId]['common']['326']['consumption'],
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingRateObj['msebrate'],
                          billingRateObj['manualrate'],
                          ''
                        ]
                      }
                    ]
                  }, {
                    stack: [
                      {
                        ul: [
                          billingDataObj['requestData']['data'][userId]['common']['37']['total'],
                          billingDataObj['requestData']['data'][userId]['common']['326']['total'],
                          billingDataObj['requestData']['data'][userId]['common']['total']
                        ]
                      }
                    ]
                  }]
                ]
              }, style: 'clsTenantBillHeader'
            },
            {
              style: 'tableExample',
              table: {
                widths: ['*', '*', '*'],
                body: [
                  [{ text: 'Individual Total', bold: true, color: '#FF0000' }, { text: 'Common Total', bold: true, color: '#FF0000' }, { text: 'Total', bold: true, color: '#FF0000' }],
                  [billingDataObj['requestData']['data'][userId]['individual']['total'], billingDataObj['requestData']['data'][userId]['common']['total'], billingDataObj['requestData']['data'][userId]['total']]
                ]
              }, style: 'clsTenantBillHeader'
            },
            { text: 'Note: Generation of billing will be based on tenant billing cycle and consumption consumed within that period by respective tenant.', style: 'clsReportHeader', color: '#FF1493' }
          ],
          styles: {
            clsReportHeader: {
              margin: [-30, 30, 1, 1]
            },
            clsSubHeader: {
              margin: [-30, 0, 1, 1]
            },
            clsTenantBillHeader: {
              margin: [-30, 5, 1, 1]
            },
            subheader: {
              fontSize: 14,
              bold: true,
              margin: [0, 10, 0, 0],
              color: '#696969',
              alignment: 'center'
            },
            tableExample: {
              margin: [0, 5, 0, 15]
            }
          },
          defaultStyle: {
            alignment: 'justify'
          },
          footer: function (currentPage, pageCount) {
            return {
              margin: [40, 0, 0, 0],
              columns: [{
                fontSize: 8,
                text: [
                  {
                    text: 'Page ' + currentPage.toString() + ' / ' + pageCount
                  }
                ],
              }]
            };
          },
        });
      }
      for (var i = 0; i < docDefinition.length; i++) {
        docDef.push(getBufferData(docDefinition[i]));
      }
      Promise.all(docDef).then(function (promiseBufferResult) {
        var finalPdfBufferObj = { type: 'tenantBill', data: {} };
        for (var index = 0; index < promiseBufferResult.length; index++) {
          finalPdfBufferObj['data'][tenantMapping[index]] = promiseBufferResult[index];
        }
        return resolve(finalPdfBufferObj);
      });
    }catch(err){
      return reject(0);
    }
  });
}

function getBufferData(data) {
  return new Promise((resolve, reject) => {
    var doc = printer.createPdfKitDocument(data);
    var chunks = [];
    doc.on('data', function (chunk) {
      chunks.push(chunk);
    });
    doc.on('end', function () {
      var result = Buffer.concat(chunks);
      return resolve(result);
    });
    doc.end();
  });
}

//Added by Salim
router.post(
  "/downloadEmailFileSolar",
  authenticationHelpers.isClientAuth,
  function (req, res) {
    // console.log(req.body);
    let check = req.body.requestAction == "email" ? 0 : 1;
    let response;
    if (req.body.format == "pdf") {
      response = generateSolarPDFFile(
        req.body,
        req.session.passport.user,
        check
      );
    } else {
      response = generateSolarExcelFile(
        req.body,
        req.session.passport.user,
        check
      );
    }
    response
      .then((result) => {
        if (!result) {
          res.json({
            error: true,
            reason: "Error: Something went wrong. Please try again!",
          });
          return res;
        }
        if (req.body.requestAction == "email") {
          console.log(result);
          var tempFilePath = result;
          var filename = "Solar-Report." + req.body.format;
          var contentType = "application/" + req.body.format;
          var htmlObj = {};
          htmlObj["user"] = "";
          htmlObj["body"] = "<p>PFA</p>";
          htmlObj["imagePath"] = marcconfig.ANGULARBASEPATH + "/assets/images";
          htmlObj["basePath"] = marcconfig.ANGULARBASEPATH;
          ejs.renderFile(
            __base + marcconfig.EMAILTEMPLATEPATH + "/email.ejs",
            htmlObj,
            function (err, html) {
              var mailOptions = {
                from: marcconfig.SMTPFROMNAME,
                to: req.body["emailAddress"],
                subject: "Solar Report",
                html: html,
                attachments: [
                  {
                    filename: filename,
                    path: tempFilePath,
                    contentType: contentType,
                  },
                ],
              };
              mailSettingDetails.sendMail(mailOptions, function (err, result) {
                if (err) {
                  res.json({ error: true, reason: "Error: Report not sent.!" });
                  return res;
                }
                fs.unlink(tempFilePath, function () {});
                res.json({
                  error: false,
                  reason: "Report mailed successfully.!",
                });
                res.end();
                return res;
              });
            }
          );
        } else {
          res.json({
            error: false,
            reason: "File downloaded successfully!",
            data: result,
          });
          res.end();
          return res;
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          error: true,
          reason: "Error: Something went wrong. Please try again!",
        });
        return res;
      });
  }
);

/** SheetJS Library Integration...... timeslice report style done dynamically */

function generateSolarExcelFile(reportDataObj, session, download) {
  return new Promise((resolve, reject) => {
    var company_name = session["company_name"];
    var workbook = XLSX.utils.book_new();
    var worksheet = XLSX.utils.aoa_to_sheet([[company_name]]);
    var columnMergeChar = getCellCharacterCodeFromInteger(
      reportDataObj.postData[2].length
    );
    console.log(columnMergeChar);
    XLSX.utils.sheet_set_range_style(worksheet, "A1:" + columnMergeChar + "1", {
      bold: true,
      sz: 12,
      name: "Cambria",
      alignment: { vertical: "middle", horizontal: "center" },
    });
    var merges = (worksheet["!merges"] = []);
    merges.push({ s: "A1", e: columnMergeChar + "1" });

    XLSX.utils.sheet_add_aoa(worksheet, [["App Name"]], {origin: "A3"});
    XLSX.utils.sheet_add_aoa(worksheet, [["Interval"]], {origin: "A4"});
    XLSX.utils.sheet_add_aoa(worksheet, [["Location"]], {origin: "A5"});
    XLSX.utils.sheet_add_aoa(worksheet, [["Duration"]], {origin: "A6"});
    XLSX.utils.sheet_add_aoa(worksheet, [[reportDataObj["appDetails"]["name"]]], {origin: "B3"});
    XLSX.utils.sheet_add_aoa(worksheet, [[reportDataObj["appDetails"]["interval"]]], {origin: "B4"});
    XLSX.utils.sheet_add_aoa(worksheet, [[reportDataObj["appDetails"]["location"]]], {origin: "B5"});
    XLSX.utils.sheet_add_aoa(worksheet, [[reportDataObj["appDetails"]["duration"]]], {origin: "B6"});
    XLSX.utils.sheet_set_range_style( worksheet, "A3:A6", { bold: true, sz: 11, name: "Cambria" });

    var columnInteger = 1,
      columnChar = "",
      rowCellNo = 8;
    reportDataObj.postData.map((item, index) => {
      columnInteger = 1;
      if (index == 0 || index == 1) {
        item.map((obj, i) => {
          if (i > 1) {
            columnChar = getCellCharacterCodeFromInteger(columnInteger);
            let mergeChar = getCellCharacterCodeFromInteger(columnInteger + 2);
            XLSX.utils.sheet_add_aoa(worksheet, [[obj]], {
              origin: columnChar + rowCellNo,
            });
            XLSX.utils.sheet_set_range_style(
              worksheet,
              columnChar + rowCellNo + ":" + mergeChar + rowCellNo,
              {
                bold: true,
                sz: 11,
                name: "Cambria",
                alignment: { vertical: "middle", horizontal: "center" },
              }
            );
            merges.push({
              s: columnChar + rowCellNo,
              e: mergeChar + rowCellNo,
            });
            columnInteger = columnInteger + 3;
          } else {
            columnChar = getCellCharacterCodeFromInteger(columnInteger);
            XLSX.utils.sheet_add_aoa(worksheet, [[obj]], {
              origin: columnChar + rowCellNo,
            });
            columnInteger++;
          }
        });
        rowCellNo++;
      } else {
        item.map((obj, i) => {
          columnChar = getCellCharacterCodeFromInteger(columnInteger);
          XLSX.utils.sheet_add_aoa(worksheet, [[obj]], {
            origin: columnChar + rowCellNo,
          });
          XLSX.utils.sheet_set_range_style(
            worksheet,
            columnChar + rowCellNo + ":" + columnChar + rowCellNo,
            {
              sz: 11,
              name: "Cambria",
              alignment: { vertical: "middle", horizontal: "center" },
            }
          );
          columnInteger++;
        });
        rowCellNo++;
      }
    });

    if (download) {
      XLSX.utils.book_append_sheet(workbook, worksheet, "Solar-Report");
      var wbout = XLSX.write(workbook, {
        type: "array",
        bookType: reportDataObj.format,
        cellStyles: true,
      });
      const buf2 = Buffer.from(wbout);
      return resolve(buf2);
    }

    if (!download) {
      var tempFilePath = tempfile(".xlsx");
      XLSX.utils.book_append_sheet(workbook, worksheet, "Solar-Report");
      XLSX.writeFile(workbook, tempFilePath, {
        type: "file",
        bookType: "xlsx",
        cellStyles: true,
      });
      return resolve(tempFilePath);
    }
  });
}

function generateSolarPDFFile(reportDataObj, session, download) {
  console.log(download, "downloaddownloaddownloaddownload");

  var array = [];
  reportDataObj.postData.map((item, index) => {
    if (index == 0 || index == 1) {
      array.push([]);
      item.map((obj, i) => {
        if (i == 0 || i == 1) {
          array[index].push({});
        } else {
          array[index].push({ text: obj, style: "clsTblHeader", colSpan: 3 });
          array[index].push({});
          array[index].push({});
        }
      });
    } else {
      array.push(item);
    }
  });

  let chunkedArray = chunkNestedArray(array, 9);

  let tableArray = [];
  chunkedArray.map((item,index) => {
    let pageBreak = "none";
    if(index != 0){
      pageBreak = "before"
    }
    tableArray.push({
      style: "clsTable",
      pageBreak: pageBreak,
      table: {
        headerRows: 3,
        body: item,
        dontBreakRows: true
      },
    });
  });
  // return
  return new Promise((resolve, reject) => {
    try {
      var docDefinition = {
        footer: function (currentPage, pageCount) {
          return {
            margin: [40, 0, 0, 0],
            columns: [
              {
                fontSize: 8,
                text: [
                  {
                    text: "Page " + currentPage.toString() + " / " + pageCount,
                  },
                ],
              },
            ],
          };
        },
        content: [
          { text: session["company_name"], style: "clsHeader" },
          { text: "App Name: "+ reportDataObj["appDetails"]["name"], style: "clsSubHeader" },
          { text: "Interval: "+ reportDataObj["appDetails"]["interval"], style: "clsSubHeader" },
          { text: "Location: " +reportDataObj["appDetails"]["location"], style: "clsSubHeader" },
          { text: "Duration: "+ reportDataObj["appDetails"]["duration"], style: "clsSubHeader" },
          {
            image: reportDataObj["chartImg"],
            width: 530,
            height: 800,
            fit: [530, 600],
            style: "clsImage",
          },
          ...tableArray,
        ],
        styles: {
          clsHeader: {
            fontSize: 12,
            bold: true,
            alignment: "center",
          },
          clsSubHeader: {
            fontSize: 10,
          },
          clsTblHeader: {
            fillColor: "#9e9e9e",
            color: "#FFFFFF",
          },
          clsImage: {
            margin: [0, 40, 0, 40],
          },
          clsTable: {
            fontSize: 8,
            alignment: "center",
          },
        },
        defaultStyle: {
          alignment: "justify",
        },
      };
      // console.log(JSON.stringify(docDefinition), "docDefinitiondocDefinitiondocDefinition");
      var doc = printer.createPdfKitDocument(docDefinition);
      var chunks = [];
      doc.on("readable", function () {
        var chunk;
        while ((chunk = doc.read(9007199254740991)) !== null) {
          chunks.push(chunk);
        }
      });

      if (download) {
        doc.on("end", function () {
          var buffer = Buffer.concat(chunks);
          return resolve(buffer);
        });
        doc.end();
      }
      if (!download) {
        var tempFilePath = tempfile(".pdf");
        var wait;
        doc.pipe((wait = fs.createWriteStream(tempFilePath)));
        doc.end();
        wait.on("finish", function () {
          return resolve(tempFilePath);
        });
      }
    } catch (err) {
      // console.log("catch try", err);
      return reject(0);
    }
  });
}

function chunkNestedArray(array, chunkSize) {
  // return new Promise((resolve, reject)=> {
  const chunks = [];
  for (let i = 0; i < array.length; i++) {
    chunks.push([]);
    for (let s = 2; s < array[i].length; s += chunkSize) {
      //console.log(s)
      chunks[i].push([
        ...array[i].slice(0, 2),
        ...array[i].slice(s, s + chunkSize),
      ]);
    }
  }
  let arrayTest = [];
  chunks.map((item, index) => {
    item.map((i, s) => {
      if (index == 0) {
        arrayTest.push([]);
        arrayTest[s].push(i);
      } else {
        arrayTest[s].push(i);
      }
    });
  });
  // console.log(arrayTest)
  return arrayTest;
  // resolve(arrayTest);
  // })
}

module.exports = router;
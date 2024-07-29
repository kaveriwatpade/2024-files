import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { DashboardService, CompanyService, CommonFunctionService } from '../shared/services';

var moment = require('moment'); // Added by Arjun
import * as momentTimezone from 'moment-timezone'; // Added by Arjun

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  actionButtonLabel: string = 'OK';
  action: boolean = false;

  /******* Edited by Arjun - Start : Partner Dashboard display *****/
  dashboardDataObj = {
    partnerCompanyCnt: 0, partnerCompanyUserCnt: 0, partnerCompanyNodeCnt: 0, partnerCompanyConnectedNodes: 0, renewalCnt: 0, nodeData: {
      totalEnergy: '', totalEnergyNode: 0, totalPosWattSum: '', totalPosWattNode: 0, totalNagWattSum: '', totalNagWattNode: 0
    }
  };
  /******* Edited by Arjun - End : Partner Dashboard display***************/
  rows = [];
  temp = [];
  displayedColumns = ['company_name', 'connectedNodeCount', 'sms_balance', 'renewal_date'];
  companyTblList: MatTableDataSource<any>;
  tableConfig = {};

  finalNodeData = []; // Added by Arjun
  totalEnergy = 0; // Added by Arjun
  totalEnergyNode = 0; // Added by Arjun
  totalPosWattSum = 0; // Added by Arjun
  totalPosWattNode = 0; // Added by Arjun
  totalNagWattSum = 0; // Added by Arjun
  totalNagWattNode = 0; // Added by Arjun
  nodeUniqueIdAry = []; // Added by Arjun
  timeOut; // Added by Arjun
  loader: boolean = true; // Added by Arjun

  constructor(public matSnackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public dashboardService: DashboardService, public companyService: CompanyService, public commonFunction: CommonFunctionService) { }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.tableConfig = this.commonFunction.getTableConfig();
    this.getPartnerCompanyList();
    this.getPartnerCompanyUserCount();
    this.getPartnerCompanyRenewalCount();
  }

  /****** Added By Arjun Start ******/
  ngOnDestroy() {
    if (this.timeOut) {
      clearTimeout(this.timeOut);
    }
  }
  /****** Added By Arjun End ******/

  getPartnerCompanyList() {
    this.dashboardService.getPartnerCompanyList().subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }

      console.log(' Test NodeUniqueid:  ', data)

      if (!data['result']) return;
      if (data['result'].length == 0) return;


      var nodeUniqueIdAry = []; //Added by Arjun

      for (let index in data['result']) {

        console.log(' data[result][index][nodeUniqueIdAry] Test %%%%%% ', data['result'][index])
        /************** Added by Arjun - Start :Partner Dashboard display*********/

        if ((data['result'][index]['nodeUniqueIdAry']) && data['result'][index]['nodeUniqueIdAry'].length > 0) {
          data['result'][index]['nodeUniqueIdAry'].forEach(element => {
            nodeUniqueIdAry.push(element);
          });
        }
        /************ Added by Arjun - End ***************/
        this.dashboardDataObj['partnerCompanyNodeCnt'] += parseInt(data['result'][index]['totalNodeCount']);
        this.dashboardDataObj['partnerCompanyConnectedNodes'] += parseInt(data['result'][index]['connectedNodeCount']); // Added by Arjun
      }
      this.companyTblList = new MatTableDataSource(data['result']);
      this.companyTblList.paginator = this.paginator;
      this.companyTblList.sort = this.sort;

      /************** Added by Arjun - start : Partner Dashboard display*********/
      try {

        setTimeout(() => {
          this.getTotalEnergySum(nodeUniqueIdAry);
          this.loader = false;
        }, 3000);

      }
      catch (err) { }
      /************ Added by Arjun - End ***************/

    },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }

  getPartnerCompanyUserCount() {
    this.dashboardService.getPartnerCompanyUserCount().subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dashboardDataObj['partnerCompanyCnt'] = data['result']['partnerCompanyCnt'];
      this.dashboardDataObj['partnerCompanyUserCnt'] = data['result']['partnerCompanyUserCnt'];
    },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }

  getPartnerCompanyRenewalCount() {
    this.dashboardService.getPartnerCompanyRenewalCount().subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dashboardDataObj['renewalCnt'] = data['result'];
    },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }

  updateFilter(filterValue: string) {
    if ('undefined' == typeof this.companyTblList) {
      return;
    }
    filterValue = filterValue.trim();
    filterValue = filterValue.toLocaleLowerCase();
    this.companyTblList.filter = filterValue;
    if (this.companyTblList.paginator) {
      this.companyTblList.paginator.firstPage();
    }
  }



  /************* Added by Arjun - Start : Partner Dashboard display *********/

  getTotalEnergySum(nodeUniqueIdAry) {

    this.nodeUniqueIdAry = nodeUniqueIdAry;


    this.totalEnergy = 0;
    this.totalEnergyNode = 0;
    this.totalPosWattSum = 0;
    this.totalPosWattNode = 0;
    this.totalNagWattSum = 0;
    this.totalNagWattNode = 0;

    var startingTime = moment('2017-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss').valueOf();

    let userTimezone = this.commonFunction.extractUserTimezone();


    var currentTime = momentTimezone.tz(userTimezone.timezone);


    var fromTime = momentTimezone.tz(currentTime, 'YYYY-MM-DD HH:mm:ssZ', userTimezone.timezone).subtract(30, 'minutes').format('YYYY-MM-DD HH:mm:ssZ');

    var temp = fromTime.split('+');

    var finalTime = momentTimezone.utc(temp[0] + '+0000', 'YYYY-MM-DD HH:mm:ssZ');

    var slot = Math.floor((((moment(finalTime.format('YYYY-MM-DD HH:mm:ss')).valueOf() - startingTime) / 1000) / 60) / 15);

    var dataObj = {};

    dataObj['slot'] = slot;
    dataObj['nodeUniqueIdAry'] = nodeUniqueIdAry;

    console.log('Component DataObj ', dataObj)


    this.dashboardService.getPartnerNodeData(dataObj).subscribe(data => {

      if (data['error'] == true) {
        return;
      }

      var values = data['result'];

      console.log('Component Inside service call DataObj ', values)


      values.forEach(element => {

        if (this.finalNodeData.length == 0) {
          let temp = {
            nodeId: element.node_id,
            values: element.parameters_values,
            ctime: element.ctime_stamp
          }
          this.finalNodeData.push(temp);
        } else {

          var flag = false;

          this.finalNodeData.forEach(element1 => {

            if (element.node_id == element1.nodeId) {

              if (element.ctime_stamp > element1.ctime) {
                element1.values = element.parameters_values;
                element1.ctime = element.ctime_stamp;
              }

              flag = true;
            }
          });

          if (flag == false) {
            let temp = {
              nodeId: element.node_id,
              values: element.parameters_values,
              ctime: element.ctime_stamp
            }
            this.finalNodeData.push(temp);
          }
        }
      });

      console.log(' Line 234 - finalNodeData : ', this.finalNodeData)

      this.finalNodeData.forEach(node => {

        console.log(' Line 238 - node : ', node)

        var temp = JSON.parse(node.values);
        console.log(' Line 241 - temp[84] : ', temp[84])
        if (temp[84]) {

          console.log(' Line 244 - JSON.parse(temp[84]) : ', JSON.parse(temp[84]))

          if (JSON.parse(temp[84]) < 0) {

            // this.totalEnergy += JSON.parse(temp[84]);
            // this.totalEnergyNode++;
          } else {
            console.log(' Today Energy Data : ', node.nodeId, '   -- ', JSON.parse(temp[84]))
            this.totalEnergy += JSON.parse(temp[84]);
            this.totalEnergyNode++;

          }

        }
        console.log(' Line 255 - temp[27] : ', temp[27])
        if (temp[27]) {

          console.log(' Line 258 - JSON.parse(temp[27]) : ', JSON.parse(temp[27]))

          if (JSON.parse(temp[27]) < 0) {

            this.totalNagWattSum += JSON.parse(temp[27]);
            this.totalNagWattNode++;
          } else {

            this.totalPosWattSum += JSON.parse(temp[27]);
            this.totalPosWattNode++;
          }

        }
      });

      this.dashboardDataObj['nodeData']['totalEnergy'] = this.totalEnergy.toFixed(3) + ' Wh';
      this.dashboardDataObj['nodeData']['totalEnergyNode'] = this.totalEnergyNode;
      this.dashboardDataObj['nodeData']['totalPosWattSum'] = this.totalPosWattSum.toFixed(3) + ' W';
      this.dashboardDataObj['nodeData']['totalPosWattNode'] = this.totalPosWattNode;
      this.dashboardDataObj['nodeData']['totalNagWattSum'] = this.totalNagWattSum.toFixed(3) + ' W';
      this.dashboardDataObj['nodeData']['totalNagWattNode'] = this.totalNagWattNode;

      // console.log(' This.finalNodeData : ', this.finalNodeData);

      this.setRefresh();

    })
  }

  setRefresh() {

    let userTimezone = this.commonFunction.extractUserTimezone();
    let currentTime = (JSON.stringify((momentTimezone.tz(userTimezone.timezone))['_d']).split('T'));
    let finalTime = Number((currentTime[1].split(':'))[1]);
    let setTime

    if (finalTime < 30) {
      setTime = 30 - finalTime;
      setTime = setTime * 60000;
    } else if (finalTime > 30) {
      setTime = 60 - finalTime;
      setTime = setTime * 60000;

    } else if ((finalTime == 30) || (finalTime == 0)) {
      setTime = 30
      setTime = setTime * 60000;

    }

    this.timeOut = setTimeout(() => {
      this.getTotalEnergySum(this.nodeUniqueIdAry);
    }, setTime);


  }


  /**************** Added by Arjun - End  *************/






}
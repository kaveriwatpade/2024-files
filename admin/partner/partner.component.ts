import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material';
import { CommonFunctionService } from '../shared/services';

@Component({
  selector: 'app-partner-info',
  templateUrl: './partner.component.html',
  styleUrls: ['./partner.component.scss']
})

export class PartnerComponent implements OnInit {
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  partnerData = [];

  constructor(public matSnackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public commonFunction: CommonFunctionService) {}

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.commonFunction.getPartnerInfo().subscribe(data =>{
      if(true == data['error']){
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.partnerData = data['result'];
    });
  }
}
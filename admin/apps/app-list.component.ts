import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { MatSnackBar, MatSnackBarConfig, MatDialog, MatDialogConfig } from '@angular/material';
import { AppSettingDialog } from '../shared/dialog/app-setting-dialog.component';
import { AppDialogComponent } from './app-dialog.component';
import { DialogsService } from '../../core/shared/dialog/dialog.service';
import { CommonFunctionService } from '../shared/services';

@Component({
  selector: 'app-admin-app-list',
  templateUrl: './app-list.component.html',
  styleUrls: ['./app-list.component.scss'],
  animations: [
    trigger(
      'enterAnimation', [
        transition(':enter', [
          style({ transform: 'translateX(100%)', opacity: 0 }),
          animate('500ms', style({ transform: 'translateX(0)', opacity: 1 }))
        ]),
        transition(':leave', [
          style({ transform: 'translateX(0)', opacity: 1 }),
          animate('500ms', style({ transform: 'translateX(100%)', opacity: 0 }))
        ])
      ]
    )
  ]
})

export class AppListComponent implements OnInit {
  categoryFilter: string = 'All';
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  catergories = [{ name: 'All' }, { name: 'Dashboard' }, { name: 'Analytics' }, { name: 'Asset Analysis' }];
  apps: Array<any> = [{ title: 'Water Plant', category: 'Asset Analysis', state:'waterPlant', name: 'Water Plant', function: 'addWaterPlant', description: 'AppWaterDesc',image: 'coming_soon.jpg',version: '1.0',updated: 'February 18, 2019', language: 'English', overview: '',isAdd :true}];

  constructor(public dialog: MatDialog, public dialogConfig: MatDialogConfig, public snackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public dialogsService: DialogsService, public viewContainerRef: ViewContainerRef, public commonFunction: CommonFunctionService) { }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
  }

  setAppsCategory(category) {
    this.categoryFilter = category;
  }

  addApp(appData) {
    if (false == appData.isAdd) return;
    this.commonFunction.checkPartnerAppExists().subscribe(data => {
      if (true == data['error']) {
        this.snackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dialogsService.confirm('Are you sure?', 'You want to add this app!', this.viewContainerRef).subscribe(res => {
        if (res == true) {
          let table = '';
          switch (appData['function']) {
            case 'addWaterPlant': table = 'water_plant'; break;
          }
          let dialogRef = this.dialog.open(AppSettingDialog, {
            disableClose: true,
            width: '70%',
            data: { requestAction:'add',requestActionData: {},table:table }
          });
          dialogRef.afterClosed().subscribe(data => {
            dialogRef = null;
          });
        }
      });
    },
    error => {
      this.snackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  open(appData) {
    let dialogRef = this.dialog.open(AppDialogComponent, {
      disableClose: false,
      width: '70%',
      data: {requestActionData: appData }
    });
    dialogRef.afterClosed().subscribe(data => {
      dialogRef = null;
    });
  }
}
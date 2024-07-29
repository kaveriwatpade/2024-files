import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, MatSnackBar, MatSnackBarConfig } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { forkJoin } from 'rxjs';
import { UserService, CommonFunctionService, CompanyService } from '../../shared/services';
import { DialogsService } from '../../../core/shared/dialog/dialog.service';
import { UserComponent } from './user.component';

@Component({
  selector: 'app-admin-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0', display: 'none'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})

export class UserListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  companyId: string = '';
  companyObj = {};
  expanded: any = {};
  displayedColumns = ['firstname', 'email_address', 'is_active', 'Actions'];
  userTblList: MatTableDataSource<any>;
  tableConfig = {};

  constructor(public dialog: MatDialog, public userService: UserService, public matSnackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public dialogsService: DialogsService, public viewContainerRef: ViewContainerRef, public route: ActivatedRoute, public commonFunction: CommonFunctionService,public companyService:CompanyService) { }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.tableConfig = this.commonFunction.getTableConfig();
    this.route.params.subscribe(params => {
      this.companyId = params['id'] ? params['id'] : '';
      this.companyService.getPartnerCompanyList().subscribe(data => {
        if (true == data['error']) {
          this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        if(!data['result']) return;
        data['result'].forEach(company => {
          this.companyObj[company['company_id']] = company['company_name'];
        });
        this.getPartnerCompanyUserList();
      },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
    });
  }

  getPartnerCompanyUserList() {
    this.userService.getPartnerCompanyUserList(this.companyId).subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if(!data['result'] || !data['result']['partnerCompanyUser']) return;
      let userDataAry = data['result']['partnerCompanyUser'];
      userDataAry.forEach((res, index) => {
        userDataAry[index]['index'] = index;
        userDataAry[index]['expanded'] = false;
        if (null != userDataAry[index].companies) {
          userDataAry[index]['companyIds'] = Object.keys(userDataAry[index].companies);
        }
      });
      this.userTblList = new MatTableDataSource(userDataAry);
      this.userTblList.paginator = this.paginator;
      this.userTblList.sort = this.sort;
    },
    error => {
      this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  open(action, userData) {
    console.log(userData,'userDataddddfddf')
    let dialogRef = this.dialog.open(UserComponent, {
      disableClose: true,
      width: '70%',
      data: { requestAction: action, requestActionData: userData,companyObj:this.companyObj }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result['success'] == true) this.getPartnerCompanyUserList();
    });
  }

  delete(userData) {
    let userCompanyCnt = userData['companies'] ? Object.keys(userData['companies']).length : 1;
    let confirmMsgStr = userCompanyCnt == 1 ? 'You will not be able to recover this user!' : userData['firstname'] + ' ' + userData['lastname'] + ' is associated with multiple companies.</br> If you want to remove from specific company click on edit or proceed to delete from all companies';
    this.dialogsService.confirm('Are you sure?', confirmMsgStr, this.viewContainerRef).subscribe(res => {
      if (res == true) {
        this.userService.deleteUser(userData['user_id']).subscribe(data => {
          if (true == data['error']) {
            this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
          }
          this.getPartnerCompanyUserList();
          this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        },
        error => {
          this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
        });
      }
    });
  }

  updateFilter(filterValue: string) {
    if ('undefined' == typeof this.userTblList) {
      return;
    }
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.userTblList.filter = filterValue;
    if (this.userTblList.paginator) {
      this.userTblList.paginator.firstPage();
    }
  }

  resendEmail(data){		
    this.commonFunction.resendEmail(data).subscribe(result =>{		
      if(true == result['error']){		
        this.matSnackBar.open(result['reason'],this.action && this.actionButtonLabel,this.snackBarConfig);		
        return;		
      }		
      this.matSnackBar.open(result['reason'],this.action && this.actionButtonLabel,this.snackBarConfig);		
    });		
  }
}
import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource, MatSnackBar, MatSnackBarConfig, MatDialog, MatDialogConfig } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { UserComponent } from './user.component';
import { DialogsService } from '../../core/shared/dialog/dialog.service';
import { UserService, AuthenticationService } from '../../shared/services';
import{ CommonFunctionService} from '../../shared/services/common-functions.service'


@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})

export class UserListComponent implements OnInit {
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  userViewPermissionObj;
  companyAdminUserId;
  userRole;
  userCompanyId;
  userDisplayedColumns = ['firstname', 'email_address', 'is_active', 'Actions'];
  userTblList: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  tableConfig = {};
  currentUser
  constructor(public router: Router, public route: ActivatedRoute, public dialog: MatDialog, public dialogConfig: MatDialogConfig, public snackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public userService: UserService, public dialogsService: DialogsService, public commonFunction: CommonFunctionService, public viewContainerRef: ViewContainerRef, public authenticationService: AuthenticationService) { }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.tableConfig = this.commonFunction.getTableConfig();
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.companyAdminUserId = this.currentUser['user_id'];
    this.userViewPermissionObj = this.commonFunction.checkIfPermissionExists([1, 2, 3, 4, 7]);
    this.userCompanyId = this.currentUser['company_id'];
    this.getUserList();
  }

  getUserList() {
    this.userService.getUserList().subscribe(data => {
      if (true == data['error']) {
        this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if (0 == data['result'].length) {
        return;
      }
      this.userTblList = new MatTableDataSource(data['result']);
      this.userTblList.paginator = this.paginator;
      this.userTblList.sort = this.sort;
    },
      error => {
        this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }
  hidesetPermissionOption(data) {
    this.userRole = data.companies[this.currentUser['company_id']].role;
  }
  filter(filterValue: string) {
    if ('undefined' == typeof this.userTblList) return;
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.userTblList.filter = filterValue;
    if (this.userTblList.paginator) {
      this.userTblList.paginator.firstPage();
    }
  }

  open(action, userData) {
    let dialogRef = this.dialog.open(UserComponent, {
      disableClose: true,
      width: '70%',
      data: { requestAction: action, requestActionData: userData, userViewPermissionObj: this.userViewPermissionObj }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result['success'] == true) this.getUserList();
    });
  }


  delete(userData) {
    var sortedObj = {}
    var postdataIbj = {}
    let userCompanyPartnerCnt = Object.values(userData['companies']).length;

    for (var key in userData['companies']) {
      if ('undefined' == typeof sortedObj[userData['companies'][key]['sequence']])
        sortedObj[userData['companies'][key]['sequence']] = {}
      sortedObj[userData['companies'][key]['sequence']][key] = {}
      sortedObj[userData['companies'][key]['sequence']][key] = userData['companies'][key]
    }
    var i = 0
    for (var key in sortedObj) {
      if (Object.keys(sortedObj[key])[0] === this.currentUser['company_id']) {
        delete sortedObj[key]
      }
      else {
        sortedObj[key][Object.keys(sortedObj[key])[0]]['sequence'] = i.toString()
        postdataIbj[Object.keys(sortedObj[key])[0]] = sortedObj[key][Object.keys(sortedObj[key])[0]]
        i++
      }
      Object.assign(postdataIbj, sortedObj[key])
    }

    let companiesPartnersObj = { companies: {}, parnters: {} }
    if (userData['companies']) {
      userCompanyPartnerCnt = Object.keys(userData['companies']).length;
      companiesPartnersObj.companies = userData['companies']
    }
    if (userData['partners']) {
      userCompanyPartnerCnt = Object.keys(userData['partners']).length;
      companiesPartnersObj.parnters = userData['partners']
    }
    userData['companiesPartnersObj'] = companiesPartnersObj
    let confirmMsgStr = 'You will not be able to recover this user! ';
    this.dialogsService.confirm('Are you sure?', confirmMsgStr, this.viewContainerRef).subscribe(res => {

      if (res == true) {
        var postdataObj = {}
        postdataObj['user_id'] = userData['user_id']
        postdataObj['companies'] = {}
        Object.assign(postdataObj['companies'], postdataIbj)
        if (Object.keys(postdataObj['companies']).length == 0) {        
          this.userService.deleteUser(userData['user_id'], userData.firstname, userData.lastname).subscribe(data2 => {
            if (true == data2['error']) {
              this.snackBar.open(data2['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
              return;
            }
            this.commonFunction.getDirectoryUsers().subscribe(result => {
              if (true == data2['error']) return;
              this.commonFunction.setDirectoryUsers(result);
            });
            this.snackBar.open(data2['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            this.getUserList();
            return;
          })
        }
        else {       
          this.userService.deleteUserFromCompany(postdataObj).subscribe(data1 => {
            if (true == data1['error']) {
              this.snackBar.open(data1['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
              return;
            }
            this.commonFunction.getDirectoryUsers().subscribe(result => {
              if (true == data1['error']) return;
              this.commonFunction.setDirectoryUsers(result);
            });
            this.snackBar.open(data1['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            if (userData.user_id == this.companyAdminUserId) {
              this.authenticationService.logout().subscribe(data => {
                if (!data['loggedOut']) this.router.navigate(['/']);
              });
            }
            else {
              this.getUserList();
              return;
            }
          })
        }

      }

    });
  }

  resendEmail(data) {
    this.commonFunction.resendEmail(data).subscribe(result => {
      if (true == result['error']) {
        this.snackBar.open(result['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.snackBar.open(result['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }
}
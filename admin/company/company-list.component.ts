import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort, MatSnackBar, MatSnackBarConfig, MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { CompanyService, AuthenticationService, CommonFunctionService } from '../shared/services';
import { DialogsService } from '../../core/shared/dialog/dialog.service';
import { CompanyComponent } from './company.component';
import { CompanyUserComponent } from './company-user.component';
import { SwitchToPartnerDialog } from '../shared/dialog/SwitchToPartnerDialog';

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss']
})

export class CompanyListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  actionButtonLabel: string = 'ekta';
  action: boolean = true;
  displayedColumns = ['company_name', 'connectedNodeCount', 'activeDate', 'expiryDate', 'Actions'];
  companyTblList: MatTableDataSource<any>;
  tableConfig = {};
  countryAry = [];
  datePipe;
  bodyText
  abc
  constructor(public dialog: MatDialog, public companyService: CompanyService, public snackBar: MatSnackBar, public matSnackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public dialogsService: DialogsService, public viewContainerRef: ViewContainerRef, public authenticationService: AuthenticationService, public router: Router, public commonFunction: CommonFunctionService) { }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.tableConfig = this.commonFunction.getTableConfig();
    let localizationSettingsObj = this.commonFunction.getlocalizationSettings();
    this.datePipe = ('undefined' != typeof localizationSettingsObj['date_format']) ? localizationSettingsObj['date_format'] : '';
    this.getPartnerCompanyList();
    this.commonFunction.getCountries().subscribe(data => { this.countryAry = data });
  }

  getPartnerCompanyList() {
    this.companyService.getPartnerCompanyList().subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if (!data['result']) return;
      if (data['result'].length == 0) return;
      this.companyTblList = new MatTableDataSource(data['result']);
      this.companyTblList.paginator = this.paginator;
      this.companyTblList.sort = this.sort;
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
  opendialog(row) {

    let dialogRef = this.dialog.open(SwitchToPartnerDialog, {
     disableClose: true,
      width: '20%',

      data: { company: row },
 
    });
 
    dialogRef.afterClosed().subscribe(result => {
      if (result['success'] == true)
       
      this.authenticationService.switchToUser(row.company_id, row.company_name, row.logo, result['data']).subscribe(result => {
      if (true == result['error']) {
            this.matSnackBar.open(result['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
          }
          this.router.navigate(['summary']);
          return;
        });


    });


  }



  open(action, companyData) {
    let dialogRef = this.dialog.open(CompanyComponent, {
      disableClose: true,
      width: '70%',
      data: { requestAction: action, requestActionData: companyData, countryAry: this.countryAry }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result['success'] == true) this.getPartnerCompanyList();
    });
  }

  delete(row) {
    this.dialogsService.confirm('Are you sure?', 'You will not be able to recover this company!', this.viewContainerRef).subscribe(res => {
      if (res == true) {
        this.companyService.deleteCompany(row['company_id']).subscribe(data => {
          if (true == data['error']) {
            this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
          }
          this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
          this.getPartnerCompanyList();
          return;
        },
          error => {
            this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
          });
      }
    });
  }

  addUser(companyData) {

    console.log(companyData);
    

    let dialogRef = this.dialog.open(CompanyUserComponent, {
      disableClose: true,
      width: '55%',
      data: { requestActionData: companyData }
    });
  }

  companyUserList(companyId) {
    console.log(companyId,'lgogoogol 136');
    
    this.router.navigate(['admin/settings/company-users', companyId]);
  }
 
}
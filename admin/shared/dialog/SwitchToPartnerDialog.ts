import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CompanyService } from '../services';
import { CommonFunctionService } from '../services';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material';
 
 
 @Component({
    selector: 'app-SwitchtoUser-diglog',
    template: `<mat-card class="clsCustomZeroMargin" style="position: initial !important;overflow: hidden!important;transform-origin: 49% 127.5px 0px;min-width: calc(95% + 40px);min-width: 294px!important;top:598.938px !important;">
  
    <form #form="ngForm" [formGroup]="downloadEmailForm" (ngSubmit)="close(downloadEmailForm.value)">
      <mat-card-content> 
        <mat-form-field class="clsCustomFullWidth">
          <p style="color:orange;text-align:center;font-size: 15px;font-family: Roboto, 'Helvetica Neue', sans-serif;font-size:16px"> Switch to user? 
            <br>  <br><span style="color:black;font-size:14px;">You will be logged in to &nbsp;{{ this.bodyText}}!</span></p>
          
            <mat-select class="form-control" formControlName="userlist"  style="color:black;padding-top:14px; max-height: 80vh !important;"  required>
             
            <ngx-mat-select-search #searchInterval placeholderLabel="{{'Search'| translate}}" [noEntriesFoundLabel]="'No record found'" style="width: 300px!important;margin-top: 75px!important;
            "></ngx-mat-select-search>
  
 <mat-option *ngFor="let user of filteredDirectoryUsersAry | search:searchInterval.value" [value]="user">
  {{ user.firstname }} {{ user.lastname }}

            
            </mat-option>
          
          </mat-select>
         </mat-form-field>
      </mat-card-content> 
      <mat-card-actions align="center" class="clsCustomZeroMargin" >
        
        <button mat-raised-button type="submit" color="primary"  [disabled]="!downloadEmailForm.valid" style="padding-top:0px!important;margin-top: 10px;">{{'Submit'|translate}}</button>
        &nbsp; <button mat-raised-button type="button" (click)="cancel()">{{'Cancel'|translate}}</button>
      </mat-card-actions>
    </form>
  </mat-card>`  
})

export class SwitchToPartnerDialog implements OnInit {
    actionButtonLabel: string = 'OK';
    action: boolean = true;
    appTypeAry = [{ name: 'private', description: 'privateDescription', disabled: true }, { name: 'public', description: 'publicDescription', disabled: false }];
    tooltipPosition = 'after';
    appSettingForm: FormGroup;
    filteredDirectoryUsersAry = [];
    directoryUsersAry = [];
    downloadEmailForm
    company
    user
    firstname

    UserInfo: Object[]
    userAry: Object[]
    displayedColumns = ['company_unique_id', 'company_name', 'partner_id', 'connectedNodeCount', 'added_datetime', 'Actions'];

    bodyText: string;


    constructor(public companyService: CompanyService, public fb: FormBuilder, public dialogRef: MatDialogRef<SwitchToPartnerDialog>, public snackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, @Inject(MAT_DIALOG_DATA) public data: any, public commonFunction: CommonFunctionService) { }

    ngOnInit() {


        this.downloadEmailForm = this.fb.group({
            userlist: ['', Validators.compose([Validators.required])],
        });
         /* this function used for getting partnerlist */
        this.bodyText = this.data.company.company_name;
        this.companyService.getPartnerUserList(this.data.company.company_id).subscribe(result => {
            this.directoryUsersAry = result['result'];
            
            this.userAry =  this.directoryUsersAry.filter(function(student){
                return student.password !=null;  
                 
              })
              
              this.filteredDirectoryUsersAry= this.userAry;
            this.UserInfo = this.filteredDirectoryUsersAry.filter(student => student.role_name === 'Company Admin')
            this.user = this.UserInfo[0];

           
            this.downloadEmailForm = this.fb.group({
                userlist: [this.user, Validators.compose([Validators.required])],
            });

            if (result['result'].length == 0) {
                this.cancel();
                this.snackBar.open('Error: User(s) is not yet added in this company!', this.action && this.actionButtonLabel, this.snackBarConfig);

            }

        });

    }


    close(form) {

        this.dialogRef.close({ success: true, data: form });
    }

    cancel() {
        this.dialogRef.close({ success: false });
    }

}
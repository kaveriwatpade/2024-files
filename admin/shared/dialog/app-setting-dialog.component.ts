import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MatSnackBar, MatSnackBarConfig, MAT_DIALOG_DATA } from '@angular/material';
import { FormBuilder, FormGroup, Validators} from '@angular/forms';
import { CommonFunctionService } from '../services';

@Component({
  selector: 'app-admin-app-setting-dialog',
  template: `<mat-card class="clsCustomZeroMargin">
              <mat-card-title>{{ data['requestAction'] | capitalizeFirst |translate}}  {{'App'|translate}}</mat-card-title>
              <form [formGroup]="appSettingForm" (ngSubmit)="submitAppData(appSettingForm.value)">
                <mat-card-content> 
                  <mat-form-field class="clsCustomFullWidth">
                    <input matInput placeholder="{{'App Name'| translate}}" formControlName="appName" required>
                    <mat-error *ngIf="appSettingForm.controls['appName'].hasError('required') && appSettingForm.controls['appName'].touched">{{'appNameReq' |translate}}</mat-error>
                    <mat-error *ngIf="appSettingForm.controls['appName'].errors?.minlength && appSettingForm.controls['appName'].touched">{{'appMinLenReq' |translate}}</mat-error>
                   
                  </mat-form-field>
                  <div class="pb-1">
                  <label class="pr-1">{{'App Type'|translate}}: </label>
                    <mat-radio-group formControlName="appType">
                      <mat-radio-button *ngFor="let appType of appTypeAry" [value]="appType.name" [disabled]="appType.disabled">
                      {{appType.name | capitalizeFirst |translate}}
                      <mat-icon matSuffix class="clsCustomMatIcon" matTooltip="{{appType.description |translate}}" [matTooltipPosition]="tooltipPosition">info_outline</mat-icon>
                      </mat-radio-button>
                    </mat-radio-group>
                  </div>
                  <mat-error *ngIf="appSettingForm.controls['appType'].hasError('required') && appSettingForm.controls['appType'].touched" class="mat-text-warn">{{'appTypeReq'|translate}}</mat-error>
                </mat-card-content>
                <mat-card-actions align="start" class="clsCustomZeroMargin">
                    <button mat-raised-button type="submit" color="primary" [disabled]="!appSettingForm.valid">{{'Submit'|translate}}</button>
                    <button mat-raised-button type="button" (click)="cancel()">{{'Cancel'|translate}}</button>
                </mat-card-actions>
              </form>
            </mat-card>`
})

export class AppSettingDialog implements OnInit {
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  appTypeAry = [{ name: 'private', description: 'privateDescription', disabled: true }, { name: 'public', description: 'publicDescription', disabled: false }];
  tooltipPosition = 'after';
  appSettingForm: FormGroup;

  constructor(public fb: FormBuilder, public dialogRef: MatDialogRef<AppSettingDialog>, public snackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig,@Inject(MAT_DIALOG_DATA) public data: any,public commonFunction:CommonFunctionService) {}

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.appSettingForm = this.fb.group({
      appName: [null, Validators.compose([Validators.required, Validators.minLength(3)])],
      appType: [null, Validators.compose([Validators.required])],
    });
    if(this.data['requestAction'] == 'edit'){
      this.appSettingForm.controls['appName'].setValue(this.data['requestActionData']['appName']);
    }
    this.appSettingForm.controls['appType'].setValue('public');
  }

  submitAppData(form) {
    let postDataObj = {};
    postDataObj['action'] = this.data['requestAction'];
    postDataObj['appId'] = this.data['requestActionData'] ? this.data['requestActionData']['appId'] : '';
    postDataObj['table'] = this.data['table'];
    postDataObj['formData'] = form;
    this.commonFunction.submitAppSettings(postDataObj).subscribe(data => {
      if (true == data['error']) {
        this.snackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.snackBar.open(data['reason'],this.action && this.actionButtonLabel,this.snackBarConfig);
      this.dialogRef.close({ success: true });
    },
    error => {
      this.snackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  cancel() {
    this.dialogRef.close({ success: false });
  }
}
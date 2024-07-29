import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute} from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CustomValidators } from 'ng2-validation';
import { MatDialog,MatSnackBar, MatSnackBarConfig } from '@angular/material';
import { AuthenticationService,CommonFunctionService } from '../shared/services/index';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})

export class ResetPasswordComponent implements OnInit {
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  isButtonDisabled:boolean =  false;
  showView:string = '0';
  userId;
  fromUrl = '';
  settingDataObj = { newPwd: true, confirmPwd: true };
  resetPasswordForm: FormGroup;

  constructor(public dialog: MatDialog,public authenticationService: AuthenticationService,public commonFunction:CommonFunctionService,public route: ActivatedRoute,public fb: FormBuilder,public router: Router,public snackBar: MatSnackBar,public matSnackBarConfig: MatSnackBarConfig) {}

  ngOnInit() {
    this.matSnackBarConfig.duration = 5000;
    let newPwd = new FormControl('', Validators.compose([Validators.required, Validators.pattern(this.commonFunction.validPassword())]));
    let confirmPassword = new FormControl('', CustomValidators.equalTo(newPwd));
    this.resetPasswordForm = this.fb.group({
      password: newPwd,
      confirmPassword: confirmPassword,
      fromUrl: []
    });
    this.route.params.subscribe(params => {
      this.userId = params['id']; 
      if(this.router.url){ 
        let fromUrlAry = this.router.url.split('/');
        this.fromUrl = fromUrlAry[2];
        this.resetPasswordForm['controls']['fromUrl'].setValue(this.fromUrl);
      }
      let fields = (this.fromUrl && this.fromUrl == 'confirm') ? 'is_active' : 'reset_password_token';
      this.authenticationService.getResetPasswordToken(fields,this.userId).subscribe(data => {
        let currentTimestamp = new Date().getTime();
        if (true == data['error']) {
          this.isButtonDisabled = true;
          this.showView = '1';
          return;
        }
        if(this.fromUrl && this.fromUrl == 'confirm'){
          this.showView = '2';
          return;
        }
        this.showView = (currentTimestamp > data['result'].reset_password_token) ? '1' : '2';
      });
    });
  }

  submitResetPassword(formData){
    this.isButtonDisabled = true;
    this.authenticationService.resetPassword(formData,this.userId).subscribe(data => {
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.snackBar.open(data['reason'],this.action && this.actionButtonLabel, this.matSnackBarConfig);
        return;
      }
      this.snackBar.open(data['reason'],this.action && this.actionButtonLabel,this.matSnackBarConfig);
      this.router.navigate(['/admin/login']);
    },
    error => {
      this.snackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.matSnackBarConfig);
      return;
    });
  }
}

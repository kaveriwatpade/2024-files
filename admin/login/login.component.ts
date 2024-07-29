import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBarConfig, MatSnackBar } from '@angular/material';
import { AuthenticationService } from '../shared/services';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomValidators } from 'ng2-validation';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-admin-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

export class LoginComponent implements OnInit {
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  toggleShowHide: string = 'login';
  isButtonDisabled: boolean = false;
  redirectUrl;
  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;

  constructor(public matSnackBarConfig: MatSnackBarConfig,public authenticationService: AuthenticationService,public route: ActivatedRoute,public fb:FormBuilder,
    public router: Router,public matSnackBar: MatSnackBar, public translate:TranslateService) { }

  ngOnInit() {
    this.matSnackBarConfig.duration = 5000;
    this.authenticationService.logout();
    this.route.queryParams.subscribe(params =>{
      this.redirectUrl = params['url'];
    });
    this.loginForm = this.fb.group({
      email: [null, Validators.compose([Validators.required,CustomValidators.email])],
      password: [null, Validators.compose([Validators.required,Validators.minLength(5)])]
    });
    this.forgotPasswordForm = this.fb.group({
      email: [null, Validators.compose([Validators.required,CustomValidators.email])]
    });
  }

  submitLoginForm(value){
    this.isButtonDisabled = true;
    this.authenticationService.login(value.email, value.password).subscribe(result =>{
      this.isButtonDisabled = false;
      if (true === result) {
        let routeTo = 'undefined' !== typeof this.redirectUrl ? this.redirectUrl : '/admin/dashboard';
        this.router.navigate([routeTo]); 
        return;
      }
      this.matSnackBar.open('Error: Invalid email or password.',this.action && this.actionButtonLabel, this.matSnackBarConfig);
    },
    error => {
      this.isButtonDisabled = false;
      this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.matSnackBarConfig);
    });
  }

  submitForgotPasswordForm(value) {
    this.isButtonDisabled = true;
    this.authenticationService.forgotPassword(value.email).subscribe(data => {
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.matSnackBarConfig);
        return;
      }
      this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.matSnackBarConfig);
      this.toggleShowHide = 'login';
      this.loginForm.controls['email'].setValue(null);
    }, error => {
      this.isButtonDisabled = false;
      this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.matSnackBarConfig);
      return;
    });
  }
}
import { Component, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, FormControl, Validators } from "@angular/forms";
import { CustomValidators } from "ng2-validation";
import { Router } from "@angular/router";;
import { MatSnackBarConfig, MatSnackBar } from "@angular/material";
import { CommonFunctionService, ProfileService } from '../shared/services'

@Component({
	selector: 'app-profile-basic',
	templateUrl: './profile-basic.component.html',
	styleUrls: ['./profile.component.scss']
})

export class ProfileBasicComponent implements OnInit {
	isButtonDisabled: boolean = false;
	editBasicProfile: boolean = false;
	dropdownLink: string = 'Edit';
	actionButtonLabel: string = 'OK';
	action: boolean = true;
	partnerAry: any = [];
	requestActionId: any;
	firstName: string;
	lastName: string;
	email: string;
	mobile: string;
	basicProfileForm: FormGroup;

	constructor(public fb: FormBuilder, public router: Router, public commonFunction: CommonFunctionService, public snackBarConfig: MatSnackBarConfig,public matSnackBar: MatSnackBar, public profileService: ProfileService) { }

	ngOnInit() {
		let currentUser = this.commonFunction.extractCurrentUser();
		this.snackBarConfig.duration = 5000;
		this.basicProfileForm = this.fb.group({
			firstName: new FormControl({ value: '', disabled: false }, Validators.compose([Validators.required])),
			lastName: new FormControl({ value: '', disabled: false }, Validators.compose([Validators.required])),
			mobile: new FormControl({ value: '', disabled: false }, Validators.compose([Validators.required]), this.commonFunction.validAndUniqueMobileNumber.bind(this.commonFunction, currentUser['user_id'])),
			email: new FormControl({ value: '', disabled: false }, Validators.compose([Validators.required, CustomValidators.email]))
		});
		this.getUserData();
	}

	getUserData() {
		let fields: string = '';
		fields = 'user_id,firstname,lastname,email_address,mobile_number';
		this.profileService.getUserData(fields).subscribe(data => {
			if (true == data['error']) {
				this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
				return;
			}
			this.firstName = data['result']['firstname'];
			this.lastName = data['result']['lastname'];
			this.email = data['result']['email_address'];
			this.mobile = data['result']['mobile_number'];
			this.requestActionId = data['result']['user_id'];
			this.basicProfileForm.controls['firstName'].setValue(this.firstName);
			this.basicProfileForm.controls['lastName'].setValue(this.lastName);
			this.basicProfileForm.controls['email'].setValue(this.email);
			this.basicProfileForm.controls['mobile'].setValue(this.mobile);
		}, 
		error => {
			this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
		});
	}

	toggleView() {
		this.editBasicProfile = !this.editBasicProfile;
		if (true == this.editBasicProfile) {
			this.dropdownLink = 'Cancel';
			return;
		}
		this.dropdownLink = 'Edit';
	}

	submitBasic(form) {
		this.isButtonDisabled = true;
		this.profileService.submitBasic(form.value, this.requestActionId).subscribe(data => {
			this.isButtonDisabled = false;
			if (true == data['error']) {
				this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
				return;
			}
			this.toggleView();
			this.getUserData();
			this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
		},
		error => {
			this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
		});
	}
}
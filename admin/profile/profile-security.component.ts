import { Component, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, FormControl, Validators } from "@angular/forms";
import { CustomValidators } from "ng2-validation";
import { MatSnackBarConfig, MatSnackBar } from "@angular/material";
import { Router } from "@angular/router";
import { ProfileService,CommonFunctionService,AuthenticationService  } from '../shared/services'

@Component({
	selector: 'app-profile-security',
	templateUrl: './profile-security.component.html',
	styleUrls: ['./profile.component.scss']
})

export class ProfileSecurityComponent implements OnInit {
	isButtonDisabled: boolean = false;
	editSecurityProfile: boolean = false;
	dropdownLink: string = 'Edit';
	actionButtonLabel: string = 'OK';
	action: boolean = true;
	currentUserObj = {};
	settingDataObj = { oldPwd: true, newPwd: true, confirmPwd: true };
	securityProfileForm: FormGroup;

	constructor(public fb: FormBuilder, public snackBarConfig: MatSnackBarConfig, public router: Router, public profileService: ProfileService, public matSnackBar: MatSnackBar,public commonFunction:CommonFunctionService,public authenticationService:AuthenticationService) { }

	ngOnInit() {
		this.snackBarConfig.duration = 5000;
		let newPwd = new FormControl('', Validators.compose([Validators.required, Validators.pattern(this.commonFunction.validPassword())]));
    let confirmPassword = new FormControl('', CustomValidators.equalTo(newPwd));
		this.securityProfileForm = this.fb.group({
			oldPwd: [null, Validators.compose([Validators.required])],
			newPwd: newPwd,
			confirmPwd: confirmPassword
		});
		this.currentUserObj = this.commonFunction.extractCurrentUser();
	}

	toggleView() {
		this.editSecurityProfile = !this.editSecurityProfile;
		this.dropdownLink = (true == this.editSecurityProfile) ? 'Cancel' : 'Edit';
	}

	submitSecurity(form) {
		this.isButtonDisabled = true;
		this.profileService.submitSecurity(form.value, this.currentUserObj['user_id']).subscribe(data => {
			this.isButtonDisabled = false;
			if (true == data['error']) {
				this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
				return;
			}
			this.toggleView();
			this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
			this.authenticationService.logout().subscribe(data => {
				if (!data['loggedOut']) this.router.navigate(['/admin']);
			});
		},
		error => {
			this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
		});
	}
} 
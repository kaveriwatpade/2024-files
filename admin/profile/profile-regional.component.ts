import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatSnackBarConfig, MatSnackBar } from "@angular/material";;
import { ProfileService, CommonFunctionService } from '../shared/services'
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-profile-regional',
  templateUrl: './profile-regional.component.html',
  styleUrls: ['./profile.component.scss'],
})

export class ProfileRegionalComponent implements OnInit {
  dropdownLink: string = 'Edit';
  editRegionalProfile: boolean = false;
  regionalProfileForm: FormGroup;
  languages = [];
  dateFormatAry = [];
  numberFormatAry = [];
  isButtonDisabled: boolean = false;
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  requestActionId: any;
  language: any;
  languageName: any;
  search: string = '';
  dateFormat;
  numberFormat;
  searchLanguage: string = '';
  searchDate: string = '';
  searchNumberFormat: string = '';
  numberFormatToDisplay = '';

  constructor(public fb: FormBuilder, public snackBarConfig: MatSnackBarConfig, public profileService: ProfileService, public commonFunction: CommonFunctionService,
    public matSnackBar: MatSnackBar, public translate: TranslateService) {
    this.languages = this.commonFunction.getarrOfLanguages();
    this.dateFormatAry = this.commonFunction.dateFormatAry;
    this.numberFormatAry = this.commonFunction.numberFormatAry;
  }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.getUserData();
    this.regionalProfileForm = this.fb.group({
      language: [null, Validators.compose([Validators.required])],
      dateFormat: [],
      numberFormat: [],
      timezoneSetting: []
    })
  }

  getUserData() {
    let fields: string = '';
    fields = 'user_id,language,date_format,number_format';
    this.profileService.getUserData(fields).subscribe(data => {
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.language = data['result']['language'];
      this.languages.forEach(language => {
        if (data['result']['language'] == language['value']) {
          this.languageName = language['name'];
        }
      })
      this.requestActionId = data['result']['user_id'];
      this.dateFormat = ('' == data['result']['date_format'] || null == data['result']['date_format']) ? data['result']['date_formate'] : this.commonFunction.dateFormatAry[0].value;
      this.numberFormat = ('' === data['result']['number_format'] || null === data['result']['number_format']) ? this.commonFunction.numberFormatAry[0].value : data['result']['number_format'];
      if ('' == data['result']['number_format'] || null == data['result']['number_format']) {
        this.numberFormatToDisplay = this.commonFunction.numberFormatAry[0].name;
      } 
      else {
        for (let i = 0; i < this.commonFunction.numberFormatAry.length; i++) {
          if (data['result']['number_format'] == this.commonFunction.numberFormatAry[i].value) {
            this.numberFormatToDisplay = this.commonFunction.numberFormatAry[i].name;
          }
        }
      }
      this.dateFormat = data['result']['date_format'];
      this.numberFormat = data['result']['number_format'];
      this.regionalProfileForm['controls']['language'].setValue(data['result']['language']);
      this.regionalProfileForm['controls']['dateFormat'].setValue(('' == data['result'].date_format || null == data['result'].date_format) ? this.commonFunction.dateFormatAry[0].value : data['result'].date_format);
      this.regionalProfileForm['controls']['numberFormat'].setValue(('' == data['result'].number_format || null == data['result'].number_format) ? this.commonFunction.numberFormatAry[0].value : data['result'].number_format);
    },
    error => {
      this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
    })
  }

  toggleView() {
    this.getUserData();
    this.editRegionalProfile = !this.editRegionalProfile;
    this.dropdownLink = (true == this.editRegionalProfile) ? 'Cancel' : 'Edit';
  }

  submitRegional(form) {
    this.isButtonDisabled = true;
    this.profileService.submitRegional(form.value, this.requestActionId).subscribe(data => {
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
      }
      this.translate.use(form.value.language);
      this.commonFunction.setlocalizationSettings();
      this.commonFunction.setDecimalPipe();
      this.commonFunction.setDatePipe();
      this.getUserData();
      this.toggleView();
      this.matSnackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
    },
    error => {
      this.matSnackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }
}
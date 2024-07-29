import { Component, OnInit, ViewContainerRef, Inject } from '@angular/core';
import { MatDialogRef, MatSelect, MatSnackBar, MatSnackBarConfig, MAT_DIALOG_DATA ,} from '@angular/material';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { CustomValidators } from 'ng2-validation';
import { UserService, CommonFunctionService, CompanyService } from '../../shared/services';
import { DialogsService } from '../../../core/shared/dialog/dialog.service';
import { ProfileService } from 'src/app/admin/shared/services/profile.service';
import { Router, ActivatedRoute } from '@angular/router'; 
import * as lodash from 'lodash';

@Component({
  selector: 'app-admin-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user-list.component.scss']
})

export class UserComponent implements OnInit {
  isButtonDisabled: boolean = false;
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  roles = [{ value: 'Company Admin', name: 'Company Admin' }, { value: 'Company User', name: 'Company User' }];;
  existingCompanyObj = {};
  userId;
  companyAry = [];
  settingDataObj = { updatePassword: true, updateConfirmPassword: true };
  userForm: FormGroup;
  timezoneAry = []; 
  dumyArray = [];
  numberFormatAry = []; //added
  changePwdForm: FormGroup;
  languages = [];
  language: any;
  currentUser;
  /* *for adding node list*/
  nodes = [];
  selected_nodes = [];
  selectedNodes: any[];
  selectallnodes : any;
  nodeaccess: boolean;
  test:boolean= false;
  currency: any; //added
  currencies = []; //added
  helpTextObj; //added
  numberFormatToDisplay = ''; 

  constructor(public fb: FormBuilder, public dialogRef: MatDialogRef<UserComponent>, public userService: UserService,public profileService: ProfileService,public route: ActivatedRoute, public snackBar: MatSnackBar, public snackBarConfig: MatSnackBarConfig, public commonFunction: CommonFunctionService, public dialogsService: DialogsService, public viewContainerRef: ViewContainerRef, @Inject(MAT_DIALOG_DATA) public data: any, public companyService: CompanyService) { 
    this.languages = this.commonFunction.getarrOfLanguages();
    this.currencies = this.commonFunction.getCurrenies();
    this.currency = this.commonFunction.getUserCurrency(this.currency); 
    this.numberFormatAry = this.commonFunction.numberFormatAry;
    console.log( this.numberFormatAry ,' this.numberFormatAry ')
    //this.getTimezone();
  }

  ngOnInit() {
    this.currentUser = this.commonFunction.extractCurrentUser();
    this.snackBarConfig.duration = 5000;
     this.getTimezone(); //added

    // this.nodes = Object.values(this.commonFunction.jsonParser(localStorage.getItem('allNode')));
    // this.selectallnodes = Object.keys(this.commonFunction.jsonParser(localStorage.getItem('node')));
    if (this.data['requestAction'] == 'edit') {
      
      this.userForm = this.fb.group({
        firstName: [null, Validators.compose([Validators.required])],
        lastName: [null, Validators.compose([Validators.required])],
        companyAry: this.fb.array([]),
        email: [null, Validators.compose([Validators.required, CustomValidators.email]), this.commonFunction.uniqueEmail.bind(this.commonFunction, this.data['requestActionData']['user_id'])],
        mobile: [null, Validators.compose([Validators.pattern(/^\+[1-9][0-9]{7,11}$/)]), ],
        node: [null],
        language:[null, Validators.compose([Validators.required])],
        timezone:[null, Validators.compose([Validators.required])],   //added
        currency:[null, Validators.compose([Validators.required])],   //added
        numberFormat: [],

      });
      console.log(this.data ,'tetetestsett line 75');
      
      this.userId = this.data['requestActionData']['user_id'];
      this.userForm.controls['firstName'].setValue(this.data['requestActionData']['firstname']);
      this.userForm.controls['lastName'].setValue(this.data['requestActionData']['lastname']);
      this.userForm.controls['email'].setValue(this.data['requestActionData']['email_address']);
      this.userForm.controls['mobile'].setValue(this.data['requestActionData']['mobile_number']);
      this.userForm.controls['language'].setValue(this.data['requestActionData']['language']);
     //  this.userForm.controls['timezone'].setValue(this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']); 
      // this.userForm.controls['currency'].setValue(this.data['requestActionData']['currency']);   //added  
      // this.userForm.controls['numberFormat'].setValue(this.data['requestActionData']['number_format']);   //added     
      
      this.currencies = this.commonFunction.getCurrenies();
       // console.log(this.currencies[0].value,'line163.>@@');
             
      this.userForm.controls['currency'].setValue(('' == this.data['requestActionData'].currency || null == this.data['requestActionData'].currency) ? this.currencies[0].value : this.data['requestActionData'].currency);
// console.log(this.timezoneAry[0].value,'line166');

let offset1='+0530'
// this.userForm.controls['timezone'].setValue(null == this.data['requestActionData']['timezone'] ? this.timezoneAry[0].value:this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']);

this.userForm.controls['timezone'].setValue(('' == this.data['requestActionData']['timezone'] || null == this.data['requestActionData']['timezone']+ '|' + '' == this.data['requestActionData']['timezone_offset']|| null == this.data['requestActionData']['timezone_offset'] )?this.timezoneAry[221].name + '|' +offset1:this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']);

console.log(this.dumyArray,'logloglgooffset1');


      //  this.userForm.controls['timezone'].setValue(('' == this.data['requestActionData'].timezone + '|' + this.data['requestActionData']['timezone_offset'] || null == this.data['requestActionData'].timezone + '|' + this.data['requestActionData']['timezone_offset']) ? this.timezoneAry[0].value : this.data['requestActionData'].timezone + '|' + this.data['requestActionData']['timezone_offset']);
        // this.userForm['controls']['numberFormat'].setValue(data['result']['number_format']);
        this.numberFormatAry = this.commonFunction.numberFormatAry;
        console.log(this.numberFormatAry[0].value, 'line168..@@');
        

        this.userForm.controls['numberFormat'].setValue(('' == this.data['requestActionData'].number_format || null == this.data['requestActionData'].number_format) ? this.numberFormatAry[0].value : this.data['requestActionData'].number_format);
      

      // this.userForm.controls['node'].setValue(this.data['requestActionData']['access_denied_nodes']);

      let companyFbControl = <FormArray>this.userForm.controls.companyAry;
      if ('undefined' != typeof this.data['requestActionData']['dbcompanies'] && null != this.data['requestActionData']['dbcompanies']) {
        this.roles = [{ value: 'Company Admin', name: 'Company Admin' }, { value: 'Company User', name: 'Company User' }];
        this.existingCompanyObj = {};
        this.companyAry = [];
        this.existingCompanyObj = lodash.cloneDeep(this.data['requestActionData']['dbcompanies']);
        let sequencyAry = [];
        for (let companyId in this.data['requestActionData']['companies']) {
          sequencyAry.push(this.data['requestActionData']['companies'][companyId]['sequence']);
          companyFbControl.push(new FormControl)
        }
        sequencyAry = sequencyAry.sort();
        for (let companyId in this.existingCompanyObj) {
          console.log(this.existingCompanyObj, 'line..125');
          
          if ('undefined' != typeof this.data['requestActionData']['companies'][companyId]) {
            let sequence = sequencyAry.indexOf(this.existingCompanyObj[companyId]['sequence']);
            if (sequence != -1) {
              companyFbControl.setControl(sequence, this.fb.group({ company: this.data['companyObj'][companyId], role: this.existingCompanyObj[companyId].role }));
            }
            this.companyAry[this.existingCompanyObj[companyId]['sequence']] = { id: companyId, sequence: this.existingCompanyObj[companyId].sequence, role: this.existingCompanyObj[companyId].role };
          }
        }
      }
    }
    if (this.data['requestAction'] == 'changePwd' && this.data['requestActionData'] != '') {
      let updatePassword = new FormControl('', Validators.compose([Validators.required, Validators.pattern(this.commonFunction.validPassword())]));
      let updateConfirmPassword = new FormControl('', CustomValidators.equalTo(updatePassword));
      this.changePwdForm = this.fb.group({
        password: updatePassword,
        confirmPassword: updateConfirmPassword
      });
    }
  }

  // getTimezone() {
    
  //   this.profileService.getTimzone().subscribe(data => {
      
      
  //     if (true == data['error']) {
  //       this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
  //       return;
  //     }

      

  //     data['result'].forEach(timezone => {
  //       console.log(timezone, "datadatadta");
  //       console.log(data['result'], 'resultresult line161');
        
        
  //       this.timezoneAry.push({ name: timezone.timezone, value: timezone.timezone + '|' + timezone.offset,  offset: timezone.offset});
  //     });

  //     console.log(this.timezoneAry[221], "datadatadta");
  //     let offset1='+0530'
  //     console.log(this.data);
      
  //     // this.userForm.controls['timezone'].setValue(('' == this.data['requestActionData'].timezone + '|' + this.data['requestActionData']['timezone_offset'] || null == this.data['requestActionData'].timezone + '|' + this.data['requestActionData']['timezone_offset']) ?this.timezoneAry.find(a => a.offset == offset1).value : this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']);

  //    // this.userForm.controls['timezone'].setValue(('' == data['result']['timezone'] || null == data['result']['timezone']+ '|' + '' == data['result']['timezone_offset']|| null == data['result']['timezone_offset'] )?this.timezoneAry.find(a => a.offset == offset1).value : this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']);

  //     // this.userForm.controls['timezone'].setValue((null == this.data['requestActionData']['timezone'] ||'' == this.data['requestActionData']['timezone'] )? this.timezoneAry.find(a => a.offset == offset1).value : this.data['requestActionData']['timezone'] + '|' + this.data['requestActionData']['timezone_offset']);
  //   },
  //     error => {
  //       this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
  //     });
  // }

  getTimezone() {
    this.profileService.getTimzone().subscribe(data => {

      if (true == data['error']) {
        this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      data['result'].forEach(timezone => {

        this.timezoneAry.push({ name: timezone.timezone, value: timezone.timezone + '|' + timezone.offset });
      });
    },
      error => {
        this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }


  cancel() {
    this.dialogRef.close({ success: false });
  }

  get companyAr() {
    return this.userForm.get('companyAry') as FormArray
  }
  // selectAll(select: MatSelect, values) {
  //   select.value = values;
  //   this.selectedNodes = select.value ;
  // }
  // deselectAll(select: MatSelect) {
  //   this.selectedNodes = [];
  //   select.value = [];
  // }
/* *hide/show node list */
  Toggle(role){
    this.nodeaccess = (role == 'Company Admin') ? true : false;
  }

  userEmail(form) {
   this.test = true;
    this.isButtonDisabled = false;
    let companyObj = {};
    this.companyAry.forEach((company, index) => {
      if ('undefined' != typeof company) {
        companyObj[company['id']] = company;
        companyObj[company['id']]['role'] = ('undefined' != typeof form.value.companyAry[index] && ('Company Admin' == company['role'] || 'Company User' == company['role'])) ? form.value.companyAry[index]['role'] : company['role'];
      }
    });
  }
  submitUser(form) {
    form.value.timezoneSetting=true
    if (form.value.timezoneSetting == true) {
      if('' == form.value.timezone){
        this.snackBar.open('Timezone setting is required.', this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      let tz = form.value.timezone.split('|');
      form.value.timezone = tz[0];
      form.value.offset = tz[1];
    }
    else {
      form.value.timezone = '';
      form.value.offset = '+0000';
    }
    
    this.isButtonDisabled = true;
    let companyObj = {};
    this.companyAry.forEach((company, index) => {
      if ('undefined' != typeof company) {
        companyObj[company['id']] = company;
        companyObj[company['id']]['role'] = ('undefined' != typeof form.value.companyAry[index] && ('Company Admin' == company['role'] || 'Company User' == company['role'])) ? form.value.companyAry[index]['role'] : company['role'];
      }
    });
    this.userService.userUpdate(form.value, { "companies": companyObj }, this.data['requestActionData']['user_id'], this.data['requestAction']).subscribe(data => {      
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dialogRef.close({ success: true });
      this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
    },
      error => {
        this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }

  submitChangePwd(form) {
    this.isButtonDisabled = true;
    this.userService.submitChangePwd(form.value, this.data['requestActionData']['user_id']).subscribe(data => {
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dialogRef.close({ success: false });
      this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
    },
      error => {
        this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
      });
  }

  removeCompany(i: number, companyId) {
    if (this.currentUser['role_name'] != "Partner Admin") {
      this.snackBar.open("Error:You don't have permission to delete, contact Company Admin.", this.action && this.actionButtonLabel, this.snackBarConfig);
      return;
    }
    if (this.companyAry.length == 1) {
      this.snackBar.open("Error:You can not delete this company, as user must have atleast one company.", this.action && this.actionButtonLabel, this.snackBarConfig);
      return;
    }

    this.dialogsService.confirm('Are you sure?', 'You will not be able to recover this settings!', this.viewContainerRef).subscribe(res => {
      if (res == true) {
        this.isButtonDisabled = true;
        this.companyAr.removeAt(i);
        this.companyAry.splice(i, 1);
        let deletedIndex = this.existingCompanyObj[companyId].sequence;
        delete this.existingCompanyObj[companyId];
        for (let key in this.companyAry) {
          if (deletedIndex < this.companyAry[key].sequence) {
            this.companyAry[key].sequence = (this.companyAry[key].sequence - 1).toString();
            this.existingCompanyObj[this.companyAry[key]['id']].sequence = (this.existingCompanyObj[this.companyAry[key]['id']].sequence - 1).toString();
          }
        }
        this.isButtonDisabled = false;
      }
    });
  }
}
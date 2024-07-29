import { Component, OnInit, ViewContainerRef, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatDialogRef, MAT_DIALOG_DATA, MatSelect } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { CustomValidators } from 'ng2-validation';
import { AuthenticationService, UserService } from '../../shared/services';
import{ CommonFunctionService} from '../../shared/services/common-functions.service'
import { DialogsService } from '../../core/shared/dialog/dialog.service';
import { ProfileService } from 'src/app/shared/services/profile.service';
import * as lodash from 'lodash';
import { TranslateService } from '@ngx-translate/core';


export interface PermissionAry {
  name: string;
  value: number;
  checked: boolean;
  permissions?: PermissionAry[];
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user-list.component.scss']
})

export class UserComponent implements OnInit {
  @ViewChild('select') select: MatSelect;
  isButtonDisabled: boolean = false;
  checkuser: boolean = false;
  sequence;
  dataObj = {};
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  permissionAry: PermissionAry[];
  checkedAry: any = [];
  checkedStr: string;
  existingCompanyObj = {};
  userId;
  companyName = '';
  language: any;
  roles = [{ value: 'Company Admin', name: 'Company Admin' }, { value: 'Company User', name: 'Company User' }];
  currentUser;
  timezoneAry = [];
  numberFormatAry = [];
  currency: any;
  currency1=[]
  abc = [];
  currencies = [];
  numberFormat;
  companyNamesObj = {};
  companyIdAry = [];
  helpTextObj;
  languages = [];
  tooltipPosition = 'below';
  userDeletedFromCurrentCompany: boolean = false;
  settingDataObj = { updatePassword: true, updateConfirmPassword: true };
  userForm: FormGroup;
  changePwdForm: FormGroup;
  companyAdminIndexAry = [];
  currentCompanyUsers = [];
  // disabled = true;
  spinnerService: any;
  /* *for adding node list*/
  nodes = [];
  selected_nodes = [];
  selectedNodes: any[];
  selectallnodes: any;
  nodeaccess: boolean;
  disableMessage = true;
  isExistingUser;
  test: boolean = false;
  companyObjForSession = {}
  isReadonly = false;
  isDisabled = false;
  isType = "text";
  numberFormatToDisplay = '';
  constructor(public fb: FormBuilder, public dialogRef: MatDialogRef<UserComponent>, public snackBar: MatSnackBar, public translate: TranslateService, public route: ActivatedRoute, public snackBarConfig: MatSnackBarConfig, public userService: UserService, public commonFunction: CommonFunctionService, public dialogsService: DialogsService,public profileService: ProfileService, public authenticationService: AuthenticationService, public router: Router, public viewContainerRef: ViewContainerRef, @Inject(MAT_DIALOG_DATA) public data: any, private cd: ChangeDetectorRef) {
    // this.route.data.subscribe((data) => {
    //   this.helpTextObj = data['data']['result'];
    // });
    this.languages = this.commonFunction.getarrOfLanguages();
    this.currencies = this.commonFunction.getCurrenies();
    this.currency1= this.commonFunction.getCurrenies();
    this.currency = this.commonFunction.getUserCurrency(this.currency);
    this.numberFormatAry = this.commonFunction.numberFormatAry;
    console.log(this.numberFormatAry, ' this.numberFormatAry ')
    // this.getTimezone();

  }

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.getTimezone();
    this.currentUser = this.commonFunction.extractCurrentUser();
    this.nodes = Object.values(this.commonFunction.jsonParser(localStorage.getItem('allNode')));
    this.selectallnodes = Object.keys(this.commonFunction.jsonParser(localStorage.getItem('node')));
    if (this.data['requestAction'] == 'add') {
      this.userForm = this.fb.group({
        firstName: [null, Validators.compose([Validators.required])],
        lastName: [null, Validators.compose([Validators.required])],
        company: this.fb.array([]),
        role: [null, Validators.compose([Validators.required])],
        email: [null, Validators.compose([Validators.required, CustomValidators.email])],
        mobile: [null, Validators.compose([Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])],
        // mobile: new FormControl({ value: '', disabled: false }, Validators.compose([Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])),
        // mobile: [null,this.commonFunction.validAndUniqueMobileNumber.bind(this.commonFunction, this.data['requestActionData']['user_id'])],

        // mobile1: [null],
        language: [null, Validators.compose([Validators.required])],
        timezone: [null, Validators.compose([Validators.required])],
        //timezone: [null, Validators.compose([Validators.required])],
        currency: [null,Validators.compose([Validators.required])],
        // numberFormat: [],
        numberFormat: [null,Validators.compose([Validators.required])],    
        node: [null]
      });
    }


    if (this.data['requestAction'] == 'edit' && this.data['requestActionData']['user_id'] != '') {

      this.userForm = this.fb.group({
        firstName: [null, Validators.compose([Validators.required]),],
        lastName: [null, Validators.compose([Validators.required])],
        company: this.fb.array([]),
        role: [null],
        email: [null, Validators.compose([Validators.required, CustomValidators.email]), this.commonFunction.uniqueEmail.bind(this.commonFunction, this.data['requestActionData']['user_id'])],

        // mobile: [null, Validators.compose([Validators.required, Validators.pattern(/^\+[1-9][0-9]{7,11}$/)]), this.commonFunction.validAndUniqueMobileNumber.bind(this.commonFunction, this.data['requestActionData']['user_id'])],

        //  mobile: [null,this.commonFunction.validAndUniqueMobileNumber.bind(this.commonFunction, this.data['requestActionData']['user_id'])],

        mobile: [null, Validators.compose([Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])],
        // mobile1: [null],
        language: [null, Validators.compose([Validators.required])],
        timezone: [null, Validators.compose([Validators.required])],
        currency: [null, Validators.compose([Validators.required])],
        // numberFormat: [],
        numberFormat: [null, Validators.compose([Validators.required])],
        node: [null]
      });
      let fields: string = '';
      fields = 'user_id,firstname,lastname,partners,email_address,mobile_number,companies,language,timezone,currency,number_format,timezone_offset,access_denied_nodes';
      this.userService.getUserData(fields, this.data['requestActionData']['user_id']).subscribe(data => {
        if (true == data['error']) {
          this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        /* *show node list as user role*/
        if (data['result']['companies'][this.currentUser['company_id']]['role'] == 'Company Admin') this.nodeaccess = true;
        this.userId = data['result']['user_id'];
        this.userForm.controls['firstName'].setValue(data['result']['firstname']);
        this.userForm.controls['lastName'].setValue(data['result']['lastname']);
        this.userForm.controls['email'].setValue(data['result']['email_address']);
        this.userForm.controls['mobile'].setValue(data['result']['mobile_number']);
        // this.userForm.controls['mobile1'].setValue(data['result']['mobile_number']);
        this.userForm.controls['language'].setValue(data['result']['language']);
        this.userForm.controls['node'].setValue(data['result']['access_denied_nodes']);
        this.userForm.controls['role'].setValue(data['result']['companies'][this.currentUser['company_id']]['role']);
        // this.userForm.controls['timezone'].setValue(data['result']['timezone'] + '|' + data['result']['timezone_offset']);
        // console.log(data['result']['timezone'] + '|' + data['result']['timezone_offset'], '45676')
        // this.userForm.controls['currency'].setValue(data['result']['currency']);
        
        this.currencies = this.commonFunction.getCurrenies();
        // console.log(this.currencies[0].value,'line163.>@@');
              
        this.userForm.controls['currency'].setValue(('' == data['result'].currency || null == data['result'].currency) ? this.currencies[0].value : data['result'].currency);
// console.log(this.timezoneAry[0].value,'line166');

let offset1='+0530'
this.userForm.controls['timezone'].setValue(('' == data['result']['timezone'] || null == data['result']['timezone']+ '|' + '' == data['result']['timezone_offset']|| null == data['result']['timezone_offset'] )?this.timezoneAry[221].name + '|' +offset1:data['result']['timezone'] + '|' + data['result']['timezone_offset']);
        // this.userForm.controls['numberFormat'].setValue(data['result']['number_format']);
        this.numberFormatAry = this.commonFunction.numberFormatAry;
        // console.log(this.numberFormatAry[0].value, 'line168..@@');
        

        this.userForm.controls['numberFormat'].setValue(('' == data['result'].number_format || null == data['result'].number_format) ? this.numberFormatAry[0].value : data['result'].number_format);
       /// this.userForm.controls['numberFormat'].setValue(data['result']['number_format']);

        if (null != data['result']['companies']) {
          this.existingCompanyObj = {};
          this.existingCompanyObj = data['result'].companies;
          this.userService.companyNamesFromIds(Object.keys(this.existingCompanyObj)).subscribe(companyData => {
            companyData['result'].forEach(data => {
              this.companyNamesObj[data.company_id] = data.company_name;
            });
            for (let key in this.existingCompanyObj) {
              this.companyIdAry[this.existingCompanyObj[key]['sequence']] = { company: key, sequence: this.existingCompanyObj[key].sequence };
              this.companyObjForSession[key] = { 'company_id': key, 'company_name': this.companyNamesObj[key], 'role_name': this.existingCompanyObj[key]['role'] };
            }
          });
        }
      },
        error => {
          this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
        });
    }

    if (this.data['requestAction'] == 'changePwd') {
      let updatePassword = new FormControl('', Validators.compose([Validators.required, Validators.pattern(this.commonFunction.validPassword())]));
      let updateConfirmPassword = new FormControl('', CustomValidators.equalTo(updatePassword));
      this.changePwdForm = this.fb.group({
        password: updatePassword,
        confirmPassword: updateConfirmPassword
      });
    }

    if (this.data['requestAction'] == 'permission' && this.data['requestActionData']['user_id'] != '') {
      let permissionCategories = [];
      this.userService.getPermissionList().subscribe(data => {
        if (true == data['error']) {
          this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        if (!data['result']) {
          this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        let index = 0;
        for (let moduleName in data['result']) {
          permissionCategories[index] = { name: moduleName, value: 0, checked: false, permissions: [] };
          data['result'][moduleName].forEach((perm, key) => {
            /*code by kaveri start*/
            if (perm.permission_id == 2 || perm.permission_id == 3 || perm.permission_id == 4 || perm.permission_id == 6 || perm.permission_id == 9 || perm.permission_id == 10 || perm.permission_id == 11 || perm.permission_id == 13 || perm.permission_id == 14 || perm.permission_id == 15 || perm.permission_id == 17 || perm.permission_id == 18 || perm.permission_id == 19 || perm.permission_id == 21 || perm.permission_id == 22 || perm.permission_id == 23 || perm.permission_id == 25 || perm.permission_id == 27 || perm.permission_id == 28 || perm.permission_id == 29) {

            } else {
              permissionCategories[index].permissions.push({ module_name: moduleName, name: perm.permission_name, value: perm.permission_id, checked: false });
            }
            /*code by kaveri end*/
          });
          index++;
        }
        this.permissionAry = permissionCategories;
        let fields: string = '';
        fields = 'mod_permission';
        this.userService.getUserData(fields, this.data['requestActionData']['user_id']).subscribe(data => {
          if (true == data['error']) {
            this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
          }
          this.permissionAry.forEach((perm, k) => {
            perm.permissions.forEach((permission, permission_id) => {
              if (data['result'].mod_permission) {
                data['result'].mod_permission.forEach(t => {
                  if (permission.value == t) {
                    this.permissionAry[k].permissions[permission_id].checked = true;
                  }
                });
              }
            });
          });
        },
          error => {
            this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
          });
      },
        error => {
          this.snackBar.open('Error! Something went wrong.', '', this.snackBarConfig);
        });
    }
  }

  getTimezone() {
    this.profileService.getTimezone().subscribe(data => {

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
    // window.location.reload();
  }

  refreshPage() {
    this.router.navigate(['/login'])
      .then(() => {
        // window.location.reload(true);
        window.location.reload();
      });
  }
  selectAll(select: MatSelect, values) {
    select.value = values;
    this.selectedNodes = select.value;
  }
  deselectAll(select: MatSelect) {
    this.selectedNodes = [];
    select.value = [];
  }
  /* *hide/show node list */
  Toggle(role) {
    this.nodeaccess = (role == 'Company Admin') ? true : false;
  }
  userEmail(form) {
    this.isButtonDisabled = true;
    let postDatObj = { companyObj: {}, companyObjForSession: {} };
    if (this.data['requestAction'] == 'add') {
      let postData = { email: form.value.email, companyId: this.currentUser['company_id'], userSide: 'company' };
      if (postData.email == null || postData.email == 'undefined') {
        return;
      }
      else {
        this.userService.userAlreadyExists(postData).subscribe(data => {
          this.isButtonDisabled = false;
          if (data['error'] == false) {                 
            this.checkuser = true;
          }
          else {
            this.checkuser = false;
            this.isReadonly = false;
            this.isDisabled = false;
            this.isType = "text";
            if (!data['result'] && data['error'] == true) {
              this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
              return;
            }
            if (data['result'] && data['error'] == true) {
              this.isButtonDisabled = false;
              this.isReadonly = true;
              this.isDisabled = true;
              this.isType = "password";

              this.userId = data['result']['user_id'];
              this.userForm.controls['firstName'].setValue(data['result']['firstname']);
              this.userForm.controls['lastName'].setValue(data['result']['lastname']);
              this.userForm.controls['email'].setValue(data['result']['email_address']);
              this.userForm.controls['mobile'].setValue(data['result']['mobile_number']);
              this.userForm.controls['language'].setValue(data['result']['language']);
              // this.userForm.controls['timezone'].setValue(data['result']['timezone'] + '|' + data['result']['timezone_offset']);
              // this.userForm.controls['currency'].setValue(data['result']['currency']);
              // console.log(this.commonFunction.getCurrenies[0].value,'line324.>@@');
              
              this.userForm.controls['currency'].setValue(('' == data['result'].currency || null == data['result'].currency) ? this.currencies[0].value : data['result'].currency);

              
              // this.userForm.controls['timezone'].setValue(('' == data['result'].timezone || null == data['result'].timezone) ? this.timezoneAry[0].value : data['result'].timezone);

             

              let offset1='+0530'
              this.userForm.controls['timezone'].setValue(('' == data['result']['timezone'] || null == data['result']['timezone']+ '|' + '' == data['result']['timezone_offset']|| null == data['result']['timezone_offset'] )?this.timezoneAry[221].name + '|' +offset1:data['result']['timezone'] + '|' + data['result']['timezone_offset']);
             // this.userForm.controls['numberFormat'].setValue(data['result']['number_format']);
             this.numberFormatAry = this.commonFunction.numberFormatAry;
            console.log(this.numberFormatAry[0].value, 'line346..@@');
                      
              
            this.userForm.controls['numberFormat'].setValue(('' == data['result'].number_format || null == data['result'].number_format) ? this.numberFormatAry[0].value : data['result'].number_format);
            //  this.userForm.controls['numberFormat'].setValue(data['result']['number_format']);

              this.userForm.controls['role'].setValue(data['result']['role_name']);
              let targetElem = document.getElementById('input');
              targetElem.focus();
              this.isButtonDisabled = false;
              this.sequence = (null != data['result']['companies'] && 'undefined' != typeof data['result']['companies'] && (0 < Object.keys(data['result']['companies']).length)) ? Object.keys(data['result']['companies']).length : 0;
              this.dataObj = data['result'];
              this.dataObj['companyId'] = this.currentUser['company_id'];
              this.dataObj['companyName'] = '';
              this.dataObj['sequence'] = this.sequence;
            } else {
              this.userId = null;
            }
            postDatObj['companyObj'][this.currentUser['company_id']] = { sequence: '0', role: form.value.role };
            this.cd.markForCheck();
          }
        });
      }
    }
    if (this.data['requestAction'] == 'edit') {
      this.isButtonDisabled = false;
      form.value.company.forEach((element, index) => {
        postDatObj['companyObj'][this.companyIdAry[index]['company']] = { sequence: this.existingCompanyObj[this.companyIdAry[index]['company']].sequence, role: element.role };
        postDatObj['companyObjForSession'][this.companyIdAry[index]['company']] = { 'company_id': element.company, 'company_name': this.companyNamesObj[element.company], 'role_name': element.role };
      });
    }
  }


  submitUser(form) {
    //logout if currentuser and loginuser are same
    form.value.timezoneSetting = true
    if (form.value.timezoneSetting == true) {
      if ('' == form.value.timezone) {
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
    let postDatObj = { companyObj: {}, companyObjForSession: {} };
    if (this.data['requestAction'] == 'add') {
      let postData = { email: form.value.email, companyId: this.currentUser['company_id'], userSide: 'company' };
      if (this.checkuser == true) {
        postDatObj['companyObj'][this.currentUser['company_id']] = { sequence: '0', role: form.value.role };
        this.submitUserDb(this.userForm,postDatObj)
      }
      else {
        this.dialogsService.confirm('Are you sure?', 'You want to add existing user to this company!', this.viewContainerRef).subscribe(res => {
          if (res == true) {
            this.isButtonDisabled = false;
            this.dataObj['role'] = form.value.role
            this.userService.updateCompanyIdForExistingUser(this.dataObj).subscribe(data => {
              this.isButtonDisabled = false;
              if (true == data['error']) {
                this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
                return;
              }
              this.dialogRef.close({ success: true });
              this.snackBar.open("User added successfully", this.action && this.actionButtonLabel, this.snackBarConfig);
              if (this.currentUser['user_id'] == this.userId) {
                this.authenticationService.logout().subscribe(data => {
                  this.isButtonDisabled = false;
                  this.refreshPage();
                });
              }
              return;
            },
              error => {
                this.snackBar.open('Error: Something went wrong. Please try again!', this.action && this.actionButtonLabel, this.snackBarConfig);
                return;
              });
          }
        });
      }
    }
    if (this.data['requestAction'] == 'edit') {
      this.isButtonDisabled = false;
      this.existingCompanyObj[this.currentUser['company_id']]['role'] = form.value.role
      this.companyObjForSession[this.currentUser['company_id']]['role_name'] = form.value.role
      postDatObj['companyObj'] = this.existingCompanyObj;
      postDatObj['companyObjForSession'] = this.companyObjForSession;

      this.submitUserDb(form, postDatObj);
    }
  }

  submitUserDb(form, postDatObj) {
    this.isButtonDisabled = true;
    let id = ('undefined' != typeof this.data['requestActionData']) ? this.data['requestActionData'].user_id : '';
    this.userService.submitUser(form.value, id, this.data['requestAction'], { "companies": postDatObj['companyObj'], "parnters": {} }).subscribe(data => {  
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.snackBar.open(data['reason'], this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if (this.data['requestAction'] == 'edit' && this.currentUser['user_id'] == this.data['requestActionData'].user_id) {
        let currentUser = lodash.clone(this.currentUser);
        currentUser['companies'] = postDatObj['companyObj'];
        currentUser['companiesObj'] = postDatObj['companyObjForSession'];
        localStorage.removeItem('currentUser');
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        this.currentUser = this.commonFunction.extractCurrentUser();
        if (this.userDeletedFromCurrentCompany) {
          this.authenticationService.logout().subscribe(data => {
            this.dialogRef.close({ success: false });
            if (!data['loggedOut']) this.router.navigate(['/']);
          });
          this.userDeletedFromCurrentCompany = false;
        }
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

  submitPermission() {
    this.isButtonDisabled = true;
    this.checkedAry = [];
    this.permissionAry.forEach(perm => {
      perm.permissions.forEach(permission => {
        if (permission.checked == true) {
          //don't push if already exists  in array
          if (-1 == this.checkedAry.indexOf(permission.value)) {
            this.checkedAry.push(permission.value);
          }
          //Assign by default view permission if not assigned
          let checkForViewPerm = this.assignModuleViewPermission(permission);
          if (-1 == this.checkedAry.indexOf(checkForViewPerm)) {
            this.checkedAry.push(checkForViewPerm);
          }
        }
      });
    });
    this.checkedStr = this.checkedAry.join(',');
    this.userService.submitPermission(this.checkedStr, this.data['requestActionData']['user_id']).subscribe(data => {
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

  allComplete(permission: PermissionAry): boolean {
    let permissions = permission.permissions;
    return permissions.every(t => t.checked) ? true : permissions.every(t => !t.checked) ? false : permission.checked;
  }

  someComplete(permissions: PermissionAry[]): boolean {
    const numComplete = permissions.filter(t => t.checked).length;
    return numComplete > 0 && numComplete < permissions.length;
  }

  setAllCompleted(permissions: PermissionAry[], checked: boolean) {
    permissions.forEach(t => {
      t.checked = checked;
    });
  }

  assignModuleViewPermission(permission) {
    let checkForViewPerm = 0;
    switch (permission.module_name) {
      case 'Users': checkForViewPerm = 1;
        break;
      case 'Locations': checkForViewPerm = 8;
        break;
      case 'Groups': checkForViewPerm = 12;
        break;
      case 'Data Bridge': checkForViewPerm = 16;
        break;
      case 'Node': checkForViewPerm = 20;
        break;
    }
    return checkForViewPerm;
  }

  get companyFbAry() {
    return this.userForm.get('company') as FormArray
  }

  removeCompany(i: number, companyId) {
    if (this.companyFbAry.length == 1) {
      this.snackBar.open("Error:You can not delete this company, as user must have atleast one company.", this.action && this.actionButtonLabel, this.snackBarConfig);
      return;
    }
    this.dialogsService.confirm('Are you sure?', 'You will not be able to recover this settings!</br>Please submit form to see the effect.', this.viewContainerRef).subscribe(res => {
      if (res == true) {
        this.isButtonDisabled = true;
        this.companyFbAry.removeAt(i);
        this.companyIdAry.splice(i, 1);
        let deletedIndex = this.existingCompanyObj[companyId].sequence;
        delete this.existingCompanyObj[companyId];
        for (let key in this.companyIdAry) {
          if (deletedIndex < this.companyIdAry[key].sequence) {
            this.companyIdAry[key].sequence = (this.companyIdAry[key].sequence - 1).toString();
            this.existingCompanyObj[this.companyIdAry[key].company].sequence = (this.existingCompanyObj[this.companyIdAry[key].company].sequence - 1).toString();
          }
        }
        if (this.currentUser['user_id'] == this.userId && this.currentUser['company_id'] == companyId) this.userDeletedFromCurrentCompany = true;
        this.isButtonDisabled = false;
        this.companyAdminIndexAry.push(i.toString());
      }
    });
  }
}

function err(err: any) {
  throw new Error('Function not implemented.');
}

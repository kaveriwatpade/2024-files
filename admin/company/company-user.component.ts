import { Component, OnInit, Inject, ViewContainerRef,ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatSnackBarConfig, MatDialogRef, MAT_DIALOG_DATA, MatSnackBar, MatSelect } from '@angular/material';
import { CustomValidators } from 'ng2-validation';
import { UserService,CommonFunctionService } from '../shared/services';
import { DialogsService } from '../../core/shared/dialog/dialog.service';
import { ProfileService } from 'src/app/admin/shared/services/profile.service';

@Component({
  selector: 'app-company-user',
  styleUrls: ['./company-list.component.scss'],
  templateUrl: './company-user.component.html',
})


export class CompanyUserComponent implements OnInit {
  userForm: FormGroup;
  roles = [{ value: 'Company Admin',name: 'Company Admin'},{ value: 'Company User',name: 'Company User'}];
  isButtonDisabled:boolean = false;
  action: boolean = true;
  actionButtonLabel: string = 'OK';
  currentUser
  language: any;
  languages = []; 
   /* *for adding node list*/
  nodes = [];
  selected_nodes = [];
  selectedNodes: any[];
  selectallnodes : any;
  nodeaccess: boolean;
  isReadonly = false;
  test:boolean= false;
  timezoneAry = [];
  currencies = [];
  currency: any;
  numberFormatAry = [];

  constructor(public fb:FormBuilder, public snackBarConfig:MatSnackBarConfig,public commonFunction: CommonFunctionService,private cd :ChangeDetectorRef, public dialogRef: MatDialogRef<CompanyUserComponent>,@Inject(MAT_DIALOG_DATA) public data: any,public userService: UserService, public matSnackBar:MatSnackBar, public snackBar: MatSnackBar, public profileService: ProfileService, public dialogsService: DialogsService,public viewContainerRef: ViewContainerRef) {
    this.languages = this.commonFunction.getarrOfLanguages();
    this.currencies = this.commonFunction.getCurrenies();
    this.currency = this.commonFunction.getUserCurrency(this.currency); 
    this.numberFormatAry = this.commonFunction.numberFormatAry;
  
  }

  ngOnInit() {
    this.currentUser = this.commonFunction.extractCurrentUser();
    this.getTimezone();
    this.snackBarConfig.duration = 5000;
    // this.nodes = Object.values(this.commonFunction.jsonParser(localStorage.getItem('allNode')));    
    this.selectallnodes = Object.keys(this.commonFunction.jsonParser(localStorage.getItem('node')));
    this.userForm = this.fb.group({
      firstName: new FormControl({value:'', disabled:false}, Validators.compose([Validators.required])),
      lastName:new FormControl({value:'', disabled:false}, Validators.compose([Validators.required])),
      role:[],
      node:[null],
      language:[null, Validators.compose([Validators.required])],
      email:new FormControl({value:'',disabled:false},Validators.compose([Validators.required,CustomValidators.email])),
      mobile:new FormControl({value:'',disabled:false},Validators.compose([Validators.required,Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])),
      timezone:[null, Validators.compose([Validators.required])],
      currency:[null, Validators.compose([Validators.required])],
      numberFormat: [null, Validators.compose([Validators.required])],
    });
    
  }

  getTimezone() {
    this.profileService.getTimzone().subscribe(data => {
      console.log(data,'data""""""""""""""""""""');
      
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

  
  cancel(){
    this.dialogRef.close({success: false});
    console.log(this.dialogRef,'this.dialogRefthis.dialogRefthis.dialogRef');
    
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
  userEmail(form){
    this.isButtonDisabled = true;
    let postData = {email:form.value.email,mobile:form.value.mobile,action:'add',companyId:this.data['requestActionData']['company_id']};    
    this.userService.userAlreadyExists(postData).subscribe(data => {
      this.isButtonDisabled = false;
      this.isReadonly = false;

      if(!data['result'] && data['error'] == true){
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      
      if(data['result'] && data['error'] == true){
        this.test = true;
        this.isReadonly = true;
        this.userForm['controls']['firstName'].setValue(data['result']['firstname']);
        this.userForm['controls']['lastName'].setValue(data['result']['lastname']);
        this.userForm['controls']['email'].setValue(data['result']['email_address']);
        this.userForm['controls']['mobile'].setValue(data['result']['mobile_number']);
        this.userForm['controls']['language'].setValue(data['result']['language']);
        // this.userForm['controls']['timezone'].setValue(data['result']['timezone'] + '|' + data['result']['timezone_offset']);
        // this.userForm['controls']['currency'].setValue(data['result']['currency']);
        // this.userForm['controls']['numberFormat'].setValue(data['result']['number_format']);
        this.currencies = this.commonFunction.getCurrenies();
       // console.log(this.currencies[0].value,'line163.>@@');
             
       this.userForm['controls']['currency'].setValue(('' == data['result'].currency || null == data['result'].currency) ? this.currencies[0].value : data['result'].currency);
// console.log(this.timezoneAry[0].value,'line166');

       this.userForm['controls']['timezone'].setValue(('' == data['result'].timezone + '|' + data['result']['timezone_offset'] || null == data['result'].timezone + '|' + data['result']['timezone_offset']) ? this.timezoneAry[0].value : data['result'].timezone + '|' + data['result']['timezone_offset']);
        // this.userForm['controls']['numberFormat'].setValue(data['result']['number_format']);
        this.numberFormatAry = this.commonFunction.numberFormatAry;
        console.log(this.numberFormatAry[0].value, 'line168..@@');
        

        this.userForm['controls']['numberFormat'].setValue(('' == data['result'].number_format || null == data['result'].number_format) ? this.numberFormatAry[0].value : data['result'].number_format);
        
        this.userForm['controls']['role'].setValue(data['result']['role_name']);
        let targetElem = document.getElementById('input');
        targetElem.focus();

            this.isButtonDisabled = false;
            let sequence = (null != data['result']['companies'] && 'undefined' != typeof data['result']['companies'] && (0 < Object.keys(data['result']['companies']).length)) ? Object.keys(data['result']['companies']).length : 0;
            let dataObj = data['result'];
            dataObj['companyId'] = this.data['requestActionData']['company_id'];
            dataObj['companyName'] = this.data['requestActionData']['company_name'];
            dataObj['role'] = form.value.role;
            dataObj['sequence'] = sequence;
        
     
      }
      this.cd.markForCheck();
    });
  }
  submitUser(form){
   
    let postData = {email:form.value.email,mobile:form.value.mobile,action:'add',companyId:this.data['requestActionData']['company_id']};    
    this.userService.userAlreadyExists(postData).subscribe(data => {
      if(!data['result'] && data['error'] == true){
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if(data['result'] && data['error'] == true){
        this.userForm['controls']['firstName'].setValue(data['result']['firstname']);
        this.userForm['controls']['lastName'].setValue(data['result']['lastname']);
        this.userForm['controls']['email'].setValue(data['result']['email_address']);
        this.userForm['controls']['mobile'].setValue(data['result']['mobile_number']);
        this.userForm['controls']['language'].setValue(data['result']['language']);
        // this.userForm['controls']['timezone'].setValue(data['result']['timezone'] + '|' + data['result']['timezone_offset']);
        // this.userForm['controls']['currency'].setValue(data['result']['currency']);
        // this.userForm['controls']['numberFormat'].setValue(data['result']['number_format']);
        this.currencies = this.commonFunction.getCurrenies();
       // console.log(this.currencies[0].value,'line163.>@@');
             
       this.userForm['controls']['currency'].setValue(('' == data['result'].currency || null == data['result'].currency) ? this.currencies[0].value : data['result'].currency);
// console.log(this.timezoneAry[0].value,'line166');

       this.userForm['controls']['timezone'].setValue(('' == data['result'].timezone + '|' + data['result']['timezone_offset'] || null == data['result'].timezone + '|' + data['result']['timezone_offset']) ? this.timezoneAry[0].value : data['result'].timezone + '|' + data['result']['timezone_offset']);
        // this.userForm['controls']['numberFormat'].setValue(data['result']['number_format']);
        this.numberFormatAry = this.commonFunction.numberFormatAry;
        console.log(this.numberFormatAry[0].value, 'line168..@@');
        

        this.userForm['controls']['numberFormat'].setValue(('' == data['result'].number_format || null == data['result'].number_format) ? this.numberFormatAry[0].value : data['result'].number_format);

        this.dialogsService.confirm('Are you sure?', 'You want to add existing user to this company! \n', this.viewContainerRef).subscribe(res => {
          if(res == true){
            this.isButtonDisabled = true;
            let sequence = (null != data['result']['companies'] && 'undefined' != typeof data['result']['companies'] && (0 < Object.keys(data['result']['companies']).length)) ? Object.keys(data['result']['companies']).length : 0;
            let dataObj = data['result'];
            dataObj['companyId'] = this.data['requestActionData']['company_id'];
            dataObj['companyName'] = this.data['requestActionData']['company_name'];
            dataObj['role'] = form.value.role;
            dataObj['sequence'] = sequence;
            this.userService.updateCompanyIdForExistingUser(dataObj).subscribe(data => {
              this.isButtonDisabled = false;
              if (true == data['error']){
                this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
                return;
              }
              this.dialogRef.close({success : true});
              this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel,this.snackBarConfig);
            },
            error => {
              this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
              return;
            });
          }
        });
        return;
      }
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
      form.value.sequence = '0';
      form.value.companyId = this.data['requestActionData']['company_id'];
      this.userService.addUser(form.value).subscribe(data => {
        this.isButtonDisabled = false;
        if(true == data['error']){
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        this.dialogRef.close({success : true});
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel,this.snackBarConfig);
      },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
      });
    });
  }
  
}

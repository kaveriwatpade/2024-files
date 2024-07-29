import {HostListener, Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MatSnackBarConfig, MAT_DIALOG_DATA, MatTableDataSource, MatPaginator, MatSort, MatSnackBar } from '@angular/material';
import { FormGroup, FormBuilder, Validators, FormControl, AbstractControl } from '@angular/forms';
import { CustomValidators } from 'ng2-validation';
import { CommonFunctionService, CompanyService } from '../shared/services';
import { forkJoin } from 'rxjs';
import * as momentTimezone from 'moment-timezone';
import * as moment from 'moment';

export interface ModuleCategory {
  name: string;
  value: number;
  completed: boolean;
  modules?: ModuleCategory[];
}

@Component({
  selector: 'app-partner-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})

export class CompanyComponent implements OnInit {
  countrySelected: any;	
  countrySelected1: any;	
  errormessage: string = ""
  actionButtonLabel: string = 'OK';
  action: boolean = true;
  isChecked:boolean = false;
  isButtonDisabled :boolean = false;
  companyTypes = [
    { value: 'government',viewValue: 'Government'},
    { value: 'individual',viewValue: 'Individual'}, 
    { value: 'partnership',viewValue: 'Partnership'},
    { value: 'private',viewValue: 'Private'}, 
    { value: 'properioty',viewValue: 'Properioty'}, 
    { value: 'public',viewValue: 'Public'}
  ]
  industryTypes = [
    { value: 'agriculture',viewValue: 'Agriculture'},
    { value: 'alluminium',viewValue: 'Alluminium' }, 
    { value: 'automobile',viewValue: 'Automobile' },
    { value: 'cement',viewValue: 'Cement'},
    { value: 'chemicals',viewValue: 'Chemicals'},
    { value: 'defence',viewValue: 'Defence'}
  ]
  paymentModes = [
    { value: 'bank',viewValue: 'Bank deposit'},
    { value: 'cash',viewValue: 'Cash'},
    { value: 'cheque',viewValue: 'Cheque'}, 
    { value: 'online',viewValue: 'Online'}
  ]
  currencies = [
    { value: 'rupees',viewValue: 'Rupees'},
    { value: 'dollar',viewValue: 'Dollar'}
  ]
  riskCategoryList = [
    { value: 'high',viewValue: 'High'},
    { value: 'medium',viewValue: 'Medium'},
    { value: 'low',viewValue: 'Low'}
  ]
  checkedAry: Array<any> = [];
  countryAry:any = [];
  stateAry:any = [];
  cityAry:any = [];
  billingCountryAry:any = [];
  billingStateAry:any = [];
  billingCityAry:any = [];
  observables:any = [];
  companyForm: FormGroup;
  smsForm: FormGroup;
  companyLicenseForm: FormGroup;
  get companyLicenseFormAry(): AbstractControl | null { return this.companyLicenseForm.get('companyLicenseFormAry'); }
  get companyFormAry(): AbstractControl | null { return this.companyForm.get('companyFormAry'); }
  displayedColumns = ['row.added_datetime','row.sms_count'];
  smsTblList: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  tableConfig = {};
  currentUser;
  moduleCategories:ModuleCategory[];
  companyLogoFileInputObj = {};
  companyLogoUploadPath = '';

  licenseDetailsForm: FormGroup;
  simManageForm: FormGroup;
  duration = [{duration: 7, name: 'One Week'}, {duration: 30, name: 'One Month'}, {duration: 365, name: 'One Year'},
  {duration: 730, name: 'Two Year'}, {duration: 1095, name: 'Three Year'}];
  gatewaysList = [];
  gatewaysType= [{name: '4G Gateway'}, {name: 'LAN Gateway'}, {name: 'SM61'}, {name: 'Radius Solar'}, {name: 'RISH Meter'}]
  networks= [{name: 'Airtel'}, {name: 'BSNL'}, {name: 'Vodafone'}]
  simManage = [];
  displayedColumns1 = ['gateway', 'gatewayId', 'gatewayType', 'network', 'number', 'imei'];
  simManageTblList: MatTableDataSource<any>;
  simtable = false;
  simLabel = "Add New SIM";
  
  constructor(public dialogRef:MatDialogRef<CompanyComponent>, public fb: FormBuilder,  public matSnackBar: MatSnackBar,public snackBarConfig: MatSnackBarConfig, public commonFunction:CommonFunctionService,public companyService: CompanyService,@Inject(MAT_DIALOG_DATA) public data: any,@Inject('staticPath') public staticPath:string) {}

  ngOnInit() {
    this.snackBarConfig.duration = 5000;
    this.countryAry = this.billingCountryAry = this.data['countryAry'];
    this.tableConfig = this.commonFunction.getTableConfig();
    this.currentUser = this.commonFunction.extractCurrentUser();
    this.companyForm = this.fb.group({
      companyFormAry: this.fb.array([
        this.fb.group({
          companyName: [null, Validators.compose([Validators.required,Validators.minLength(3)]),this.uniqueCompanyName.bind(this)],
          companyLogo: ['',null],
          partnerName: [this.currentUser.partner_id],
          companyType: new FormControl('',Validators.required),
          industryType: new FormControl('',Validators.required),
          email: [null, Validators.compose([Validators.required,CustomValidators.email])],
          website: new FormControl('', CustomValidators.url),
          mobile: [null, Validators.compose([Validators.required,Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])],
          landline: [null, Validators.compose([CustomValidators.number,Validators.minLength(11),Validators.maxLength(15)])]
        }),
        this.fb.group({
          addrLine1: new FormControl('',Validators.required),
          addrLine2: new FormControl('',Validators.required),
          pincode: [null, Validators.compose([Validators.required,Validators.minLength(5),Validators.maxLength(10)])],          country: new FormControl('',Validators.required),
          state: new FormControl('',Validators.required),
          city: new FormControl('',Validators.required),
          user_email: [null],
          end_date:[null]
        }),
        this.fb.group({
          isChecked:[],
          billingCntName:[null, Validators.compose([Validators.required,Validators.minLength(3)])],
          billingCntNo: [null, Validators.compose([Validators.required,Validators.pattern(/^\+[1-9][0-9]{7,11}$/)])],
          billingAddrLine1: new FormControl('',Validators.required),
          billingAddrLine2: new FormControl('',Validators.required),
          billingPincode: [null, Validators.compose([Validators.required,Validators.minLength(5),Validators.maxLength(10)])],          billingCountry: new FormControl('',Validators.required),
          billingState: new FormControl('',Validators.required),
          billingCity: new FormControl('',Validators.required),
          paymentMode: new FormControl('',Validators.required),
          currency: new FormControl('',Validators.required)
        })
      ])
    });

    this.companyLicenseForm = this.fb.group({
      companyLicenseFormAry: this.fb.array([
        this.fb.group({
          licenseNo: new FormControl({value:'',disabled: true}),
          validity:[null, Validators.compose([Validators.required,CustomValidators.date])],
          poNo: [],
          poFile:[],
          noOfUsers: [null, Validators.compose([Validators.required,CustomValidators.number])],
          noOfNodes: [null, Validators.compose([Validators.required,CustomValidators.number])],          
          dunningDays: [null, Validators.compose([Validators.required,CustomValidators.number])],
          graceDays: [null, Validators.compose([Validators.required,CustomValidators.number])],
          riskCategory: [],
          noOfSms: [],
          noOfEmails:[]
          // noOfSms: new FormControl('',CustomValidators.number),
          // noOfEmails: new FormControl('',CustomValidators.number)
        }),
        this.fb.group({
          modules: [],
        })
      ])
      
    });

    this.smsForm = this.fb.group({
      smsCount: [null, Validators.compose([Validators.required,CustomValidators.number])],
      companyId:[],
      addedDate:[]
    });

    this.licenseDetailsForm = this.fb.group({
      invoiceDate: [
        null,
        Validators.compose([Validators.required, CustomValidators.date]),
      ],
      activeDate: [
        null,
        Validators.compose([Validators.required, CustomValidators.date]),
      ],
      expiryDate: [
        null,
        Validators.compose([CustomValidators.date]),
      ],
      duration: [
        null,
        Validators.compose([Validators.required]),
      ]
      
    });
    
    this.simManageForm = this.fb.group({
      gateway: [
        null,
        Validators.compose([Validators.required]),
      ],
      network: [
        null,
        Validators.compose([Validators.required]),
      ],
      number: [
        null,
        Validators.compose([
          CustomValidators.number,
          Validators.minLength(11),
          Validators.maxLength(15),
          Validators.required
        ]),
      ],
      imei: [
        null,
        Validators.compose([
          CustomValidators.number,
          Validators.minLength(11),
          Validators.maxLength(17),
          Validators.required
        ]),
      ],
      getwayName: [
        null,
        Validators.compose([Validators.required]),
      ],
      getwayId: [
        null,
        Validators.compose([Validators.required]),
      ]
    });

    if('edit' == this.data['requestAction'] && '' != this.data['requestActionData']['company_id']){
      let fields:string = '';
      fields = 'partner_id,company_name,logo,company_type,industry_type,email_address,website_url,mobile,landline,address,billing_contact_name,billing_contact_number,billing_address,payment_mode,currency,user_email,end_date';
      this.companyService.getCompanyData(fields,this.data['requestActionData']['company_id']).subscribe(data =>{
        if(true == data['error']){
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        this.observables = [];
        this.observables.push(this.commonFunction.getStates(data['result']['address'].country));
        this.observables.push(this.commonFunction.getCities(data['result']['address'].state));
        this.observables.push(this.commonFunction.getStates(data['result']['billing_address'].country));
        this.observables.push(this.commonFunction.getCities(data['result']['billing_address'].state));

        forkJoin(this.observables).subscribe(result =>{
          this.stateAry = result[0];
          this.cityAry = result[1];
          this.billingStateAry = result[2];
          this.billingCityAry = result[3];
          let logoPath = this.staticPath+'/images/company-logo/';
          this.companyLogoUploadPath = (data['result'].logo) ? logoPath+data['result'].logo : logoPath+'marc_logo.png';
          this.companyFormAry.get([0])['controls']['partnerName'].setValue(data['result'].partner_id);
          this.companyFormAry.get([0])['controls']['companyName'].setValue(data['result'].company_name);
          this.companyFormAry.get([0])['controls']['companyLogo'].setValue(data['result'].logo);
          this.companyFormAry.get([0])['controls']['companyType'].setValue(data['result'].company_type);
          this.companyFormAry.get([0])['controls']['industryType'].setValue(data['result'].industry_type)
          this.companyFormAry.get([0])['controls']['email'].setValue(data['result'].email_address);
          this.companyFormAry.get([0])['controls']['website'].setValue(data['result'].website_url);
          this.companyFormAry.get([0])['controls']['mobile'].setValue(data['result'].mobile);
          this.companyFormAry.get([0])['controls']['landline'].setValue(data['result'].landline);
          this.companyFormAry.get([1])['controls']['addrLine1'].setValue(data['result']['address'].address_line1);
          this.companyFormAry.get([1])['controls']['addrLine2'].setValue(data['result']['address'].address_line2);
          this.companyFormAry.get([1])['controls']['pincode'].setValue(data['result']['address'].pincode);
          this.companyFormAry.get([1])['controls']['country'].setValue(data['result']['address'].country);
          this.companyFormAry.get([1])['controls']['state'].setValue(data['result']['address'].state);
          this.companyFormAry.get([1])['controls']['city'].setValue(data['result']['address'].city);
          this.companyFormAry.get([1])['controls']['user_email'].setValue(data['result'].user_email);          
           let datesRange={}   
           datesRange['startDate'] =(data['result'].end_date == null) ? momentTimezone(new Date()): momentTimezone(data['result'].end_date);
           datesRange['endDate'] =(data['result'].end_date == null) ? momentTimezone(new Date()): momentTimezone(data['result'].end_date);
          this.companyFormAry.get([1])['controls']['end_date'].setValue(datesRange);
          this.companyFormAry.get([2])['controls']['billingCntName'].setValue(data['result'].billing_contact_name);
          this.companyFormAry.get([2])['controls']['billingCntNo'].setValue(data['result'].billing_contact_number);
          this.companyFormAry.get([2])['controls']['billingAddrLine1'].setValue(data['result']['billing_address'].address_line1);
          this.companyFormAry.get([2])['controls']['billingAddrLine2'].setValue(data['result']['billing_address'].address_line2);
          this.companyFormAry.get([2])['controls']['billingPincode'].setValue(data['result']['billing_address'].pincode);
          this.companyFormAry.get([2])['controls']['billingCountry'].setValue(data['result']['billing_address'].country);
          this.companyFormAry.get([2])['controls']['billingState'].setValue(data['result']['billing_address'].state);
          this.companyFormAry.get([2])['controls']['billingCity'].setValue(data['result']['billing_address'].city);
          this.companyFormAry.get([2])['controls']['paymentMode'].setValue(data['result'].payment_mode);
          this.companyFormAry.get([2])['controls']['currency'].setValue(data['result'].currency);
        });
      },
      error =>{
        this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      });
    }

    if('license' ==  this.data['requestAction'] && '' != this.data['requestActionData']['company_id']){
      let fields:string='';
      fields = '*';
      this.companyService.getCompanyData(fields,this.data['requestActionData']['company_id']).subscribe(data =>{
        if(true == data['error']){
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        this.companyLicenseFormAry.get([0])['controls']['licenseNo'].setValue(data['result']['license_number']);
        this.companyLicenseFormAry.get([0])['controls']['validity'].setValue(data['result']['validity']);
        this.companyLicenseFormAry.get([0])['controls']['poNo'].setValue(data['result']['po_number']);
        this.companyLicenseFormAry.get([0])['controls']['poFile'].setValue(data['result']['po_file']);
        this.companyLicenseFormAry.get([0])['controls']['noOfUsers'].setValue(data['result']['no_of_users']);
        this.companyLicenseFormAry.get([0])['controls']['noOfNodes'].setValue(data['result']['no_of_nodes']);
        this.companyLicenseFormAry.get([0])['controls']['dunningDays'].setValue(data['result']['dunning_days']);
        this.companyLicenseFormAry.get([0])['controls']['graceDays'].setValue(data['result']['grace_days']);
        this.companyLicenseFormAry.get([0])['controls']['riskCategory'].setValue(data['result']['risk_category']);
        this.companyLicenseFormAry.get([0])['controls']['noOfSms'].setValue(data['result']['no_of_sms']);
        this.companyLicenseFormAry.get([0])['controls']['noOfEmails'].setValue(data['result']['no_of_emails']);
        this.companyLicenseFormAry.get([1])['controls']['modules'].setValue(data['result']['module_name']);
      },
    error =>{
      this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
    });


    /* make Permission sticky(selected) on edit license */
    // let moduleCategories = [];
    // if(undefined != moduleCategories){
    //   let fields:string='';
    //   fields = 'module_name';
    //   this.companyService.getSelectedModuleList(fields,this.data['requestActionData']['company_id']).subscribe(data =>{
    //     this.moduleCategories = data['result']['module_name'];
    //   })
    // }
      /*if(undefined != moduleCategories){
        let fields:string='';
        fields = 'module_name';
        this.companyService.getSelectedModuleList(fields,this['requestActionId'])
        .subscribe(data => {
          if (true == data['error']) {
            this.snackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
          } 
          this.moduleCategories = moduleCategories;
            moduleCategories.forEach((mod,k) => {
              mod.modules.forEach((module1,name) => {
                if(data.result.module_name){
                  data.result.module_name.forEach(t => {
                    if(module1.name == t){
                      this.moduleCategories[k].modules[name].completed = true;
                    }
                  });
                }
              });
            });
          },
          error => {
            this.snackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
            return;
        });
      }*/
    }
    
    if('smsHistory' == this.data['requestAction']){
      let companyId = { companyId:this.data['requestActionData']['company_id'] };
      this.companyService.getSmsHistoryList(companyId).subscribe(data => {
        if (true == data['error']) {
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        for(let i=0;i<data['result'].length;i++){
          data['result'][i].added_datetime = momentTimezone.tz(data['result'][i].added_datetime,'Asia/Kolkata').format('DD-MM-YYYY');
        }
        if(0 < data['result'].length){
          this.smsTblList = new MatTableDataSource(data['result']);
          this.smsTblList.paginator = this.paginator;
          this.smsTblList.sort = this.sort;
        }
      },
      error => {
        this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      });
    }

    if('licenseDetails' == this.data['requestAction']){
      let fields:string = '';
      fields = 'license_details';
      this.companyService.getCompanyData(fields,this.data['requestActionData']['company_id']).subscribe((data:any) =>{
        if(true == data['error']){
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        
        if(data.result.license_details != null){
          var license_details = JSON.parse(data.result.license_details);
        // console.log(this.data["requestActionData"]["added_datetime"]);

          this.licenseDetailsForm.get('invoiceDate').setValue(license_details.invoiceDate == null ? this.data["requestActionData"]["added_datetime"]: license_details.invoiceDate);
          this.licenseDetailsForm.get('activeDate').setValue(license_details.activeDate == null ? this.data["requestActionData"]["added_datetime"]: license_details.activeDate);
          this.licenseDetailsForm.get('expiryDate').setValue(license_details.expiryDate);
          this.licenseDetailsForm.get('duration').setValue(license_details.duration);
        }
        else{
          this.licenseDetailsForm.get('invoiceDate').setValue(moment(this.data["requestActionData"]["added_datetime"]).format("YYYY-MM-DD"));
          this.licenseDetailsForm.get('activeDate').setValue(moment(this.data["requestActionData"]["added_datetime"]).format("YYYY-MM-DD"));
        }
      },
      error =>{
        this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      });
    }
    if('sim' == this.data['requestAction']){
      this.getGetways();
      let fields:string = '';
      fields = 'sim_details';
      this.companyService.getCompanyData(fields,this.data['requestActionData']['company_id']).subscribe((data:any) =>{
        if(true == data['error']){
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        
        if(data.result.sim_details != null){

          console.log(JSON.parse(data.result.sim_details));
          this.simManage = JSON.parse(data.result.sim_details);
          this.simManageTblList = new MatTableDataSource(this.simManage);
          console.log(this.simManageTblList, "simManagesimManagesimManage");
            this.simManageTblList.paginator = this.paginator;
            this.simManageTblList.sort = this.sort;
        }
      },
      error =>{
        this.matSnackBar.open('Error: Something went wrong. Please try again!',this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      });
    }
  }
  OnCountryChange(event: KeyboardEvent) {	
    this.countrySelected =  this.companyFormAry.get([1])['controls']['country'].value  	
    this.countrySelected1 =  this.companyFormAry.get([2])['controls']['billingCountry'].value	
       if (this.countrySelected === 'Poland') {	
        const input = event.target as HTMLInputElement;	
        let trimmed = input.value.replace(/\s+/g, '');	
        if (trimmed.length > 10) {	
          trimmed = trimmed.substr(0, 10);	
        }	
        trimmed = trimmed.replace(/-/g, '');	
        let numbers = [];	
        numbers.push(trimmed.substr(0, 2));	
        if (trimmed.substr(2, 2) !== "")	
          numbers.push(trimmed.substr(2, 4));	
        input.value = numbers.join('-');	
      }	
        
    } 	
    OnBillingCountryChange(event: KeyboardEvent) {	
         this.countrySelected =  this.companyFormAry.get([2])['controls']['billingCountry'].value;	    
           if (this.countrySelected === 'Poland') {	
          const input = event.target as HTMLInputElement;	
            let trimmed = input.value.replace(/\s+/g, '');	
            if (trimmed.length > 10) {	
              trimmed = trimmed.substr(0, 10);	
            }	
            trimmed = trimmed.replace(/-/g, '');	
            let numbers = [];	
            numbers.push(trimmed.substr(0, 2));	
            if (trimmed.substr(2, 2) !== "")	
              numbers.push(trimmed.substr(2, 4));	
            input.value = numbers.join('-');	
          }	
        } 
  sameAsAbove() {
    let sameAsAboveOservables = [];
    if(null == this.companyFormAry.get([2])['controls']['isChecked'].value || false == this.companyFormAry.get([2])['controls']['isChecked'].value){
      this.companyFormAry.get([2])['controls']['billingCntNo'].setValue(this.companyFormAry.get([0])['controls']['mobile'].value);
      this.companyFormAry.get([2])['controls']['billingAddrLine1'].setValue(this.companyFormAry.get([1])['controls']['addrLine1'].value);
      this.companyFormAry.get([2])['controls']['billingAddrLine2'].setValue(this.companyFormAry.get([1])['controls']['addrLine2'].value);
      this.companyFormAry.get([2])['controls']['billingPincode'].setValue(this.companyFormAry.get([1])['controls']['pincode'].value);
      this.companyFormAry.get([2])['controls']['billingCountry'].setValue(this.companyFormAry.get([1])['controls']['country'].value);
      sameAsAboveOservables.push(this.commonFunction.getStates(this.companyFormAry.get([1])['controls']['country'].value));
      sameAsAboveOservables.push(this.commonFunction.getCities(this.companyFormAry.get([1])['controls']['state'].value));
      forkJoin(sameAsAboveOservables).subscribe(result => {
        this.billingStateAry = result[0];
        this.billingCityAry = result[1];
        this.companyFormAry.get([2])['controls']['billingState'].setValue(this.companyFormAry.get([1])['controls']['state'].value);
        this.companyFormAry.get([2])['controls']['billingCity'].setValue(this.companyFormAry.get([1])['controls']['city'].value);    
      });
      return;
    }
    this.companyFormAry.get([2])['controls']['billingCntNo'].setValue('');
    this.companyFormAry.get([2])['controls']['billingAddrLine1'].setValue('');
    this.companyFormAry.get([2])['controls']['billingAddrLine2'].setValue('');
    this.companyFormAry.get([2])['controls']['billingPincode'].setValue('');
    this.companyFormAry.get([2])['controls']['billingCountry'].setValue('');
    this.companyFormAry.get([2])['controls']['billingState'].setValue('');
    this.companyFormAry.get([2])['controls']['billingCity'].setValue('');
  }  

  uniqueCompanyName(control: FormControl) {
    let companyName = control.value.replace(/\b\w/g, l => l.toUpperCase());
    const q = new Promise((resolve, reject) => {
      setTimeout(() => {
        this.companyService.uniqueName(companyName.trim(),this.data['requestActionData']['company_id']).subscribe((data) => {
          if(data['result'] > 0){
            resolve({ 'uniqueCompanyName': true });
            return;
          }
          resolve(null);
        });
      }, 10);
    });
    return q;
  }

  cancel(){
    this.dialogRef.close({success : false}); 
  }

  getState(countryName,billingEvent=0){
    if(billingEvent){
      this.companyFormAry.get([2])['controls']['billingState'].setValue('');
      this.commonFunction.getStates(countryName).subscribe(data => { this.billingStateAry = data;});
      return;
    }
    this.companyFormAry.get([1])['controls']['state'].setValue('');
    this.commonFunction.getStates(countryName).subscribe(data => {this.stateAry = data;});
  }

  getCity(stateName,billingEvent=0){
    if(billingEvent){
      this.companyFormAry.get([2])['controls']['billingCity'].setValue('');
      this.commonFunction.getCities(stateName).subscribe(data => { this.billingCityAry = data;});
      return;
    }
    this.companyFormAry.get([1])['controls']['city'].setValue('');
    this.commonFunction.getCities(stateName).subscribe(data => { this.cityAry = data; });
  }

  onCompanyLogoChange(fileInput: any) {
		let filesToUpload: Array<File> = [];
    filesToUpload = <Array<File>>fileInput['target']['files'];
		if (0 === Object.keys(filesToUpload).length) return;
		let allowedExtensions = ["png"];
		let fileExtension = filesToUpload[0].name.split('.').pop();
		if (-1 === allowedExtensions.indexOf(fileExtension.toLowerCase())) {
      this.matSnackBar.open('Error: Invalid file type! Only '+allowedExtensions.toString()+' allowled.', this.action && this.actionButtonLabel, this.snackBarConfig);
			return;
    }
    let reader = new FileReader();
    reader.readAsDataURL(filesToUpload[0]);
    reader.onload = (image) => {
      let img = new Image;
   //   img.src = image.target['result'];
      img.onload = () => {
        if(img.width > 320 || img.height > 132){
          this.matSnackBar.open('Error: Invalid file dimension! Maximum dimensions: 320 x 132 pixels.', this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
        let fileSize = 0;
        if (filesToUpload[0].size > 1024 * 1024) {
          fileSize = (Math.round(filesToUpload[0].size * 100 / (1024 * 1024)) / 100);
          fileSize = fileSize * 1000;
        }
        else {
          fileSize = (Math.round(filesToUpload[0].size * 100 / 1024) / 100);
        }
        if(fileSize > 30){
          this.matSnackBar.open('Error: Invalid file size! Maximum file size: 30KB.', this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        }
      //  this.companyLogoUploadPath = image.target['result'];
      }; 
    }
    this.companyLogoFileInputObj = {};
    this.companyLogoFileInputObj[0] = filesToUpload;
    if('edit' == this.data['requestAction']){
      this.companyFormAry.get([0])['controls']['companyLogo'].setValue(this.data['requestActionData']['company_id']+'.'+fileExtension);
    }
  }

  submitCompanyForm(form) {
    let id = ('add' == this.data['requestAction'])? '': this.data['requestActionData']['company_id'];
    let finalObj = Object.assign(form['companyFormAry'][0], form['companyFormAry'][1],form['companyFormAry'][2]);
     //start code by kaveri   
     if(!finalObj.end_date ){      
    } else{
    finalObj.end_date = momentTimezone(finalObj.end_date.endDate).format('YYYY-MM-DD');
    }  
     //end code by kaveri
    this.companyService.submitCompany(finalObj,id,this.data['requestAction']).subscribe(data => { 
      this.isButtonDisabled = false;
      if(Object.keys(this.companyLogoFileInputObj).length == 0){
        this.dialogRef.close({success : true});
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      if(!data['result']){
        this.matSnackBar.open('Error! Company Logo not uploaded.',this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      let formData: any = new FormData();
      let files: Array<File> = this.companyLogoFileInputObj[0];
      let fileExtension = files[0].name.split('.').pop();
      formData.append("svg", files[0], data['result'] + '.' + fileExtension);
      this.companyService.uploadCompanyLogo(formData).subscribe(data => { 
        this.isButtonDisabled = false;
        if (true == data['error']) {
          this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
          return;
        } 
        this.dialogRef.close({success : true});
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
      },
      error => {
        this.matSnackBar.open('Error! Something went wrong.',this.action && this.actionButtonLabel, this.snackBarConfig);
      });
    },
    error => {
      this.matSnackBar.open('Error! Something went wrong.',this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  submitCompanyLicenseForm(form){
    this.isButtonDisabled = true;    
    let finalObj = Object.assign(form['companyLicenseFormAry'][0],form['companyLicenseFormAry'][1]);
    let checkedAry=[];
    this.companyService.submitCompanyLicense(finalObj,this.data['requestActionData']['company_id'],checkedAry).subscribe(data => { 
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      } 
      this.dialogRef.close({success : true});
      this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
    },
    error => {
     this.matSnackBar.open('Error! Something went wrong.',this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  submitSmsForm(form) {
    this.isButtonDisabled = true;
    form.value.companyId = this.data['requestActionData']['company_id'];
    this.companyService.submitSms(form.value).subscribe(data => { 
      this.isButtonDisabled = false;
      if (true == data['error']) {
        this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
        return;
      }
      this.dialogRef.close({success : true});
      this.matSnackBar.open(data['reason'],this.action && this.actionButtonLabel, this.snackBarConfig);
    },
    error => {
      this.matSnackBar.open('Error! Something went wrong.',this.action && this.actionButtonLabel, this.snackBarConfig);
    });
  }

  submitLicenseDetailsForm(form) {
    console.log('test');
    
    // this.isButtonDisabled = true;
    form.value.companyId = this.data["requestActionData"]["company_id"];

    form.value.expiryDate = moment(form.value.activeDate).add(form.value.duration, 'month').format('YYYY-MM-DD');
    

    this.companyService.updateLicenceDetails(form.value).subscribe(
      (data) => {
        this.isButtonDisabled = false;
        if (true == data["error"]) {
          this.matSnackBar.open(
            data["reason"],
            this.action && this.actionButtonLabel,
            this.snackBarConfig
          );
          return;
        }
        this.dialogRef.close({ success: true });
        this.matSnackBar.open(
          data["reason"],
          this.action && this.actionButtonLabel,
          this.snackBarConfig
        );
      },
      (error) => {
        this.matSnackBar.open(
          "Error! Something went wrong.",
          this.action && this.actionButtonLabel,
          this.snackBarConfig
        );
      }
    );
  }

  submitSimDetailsForm(form) {
    var array = [...this.simManage, form.value];
    console.log('test', array);
    // console.log('test', array.push(form.value));
   
    // return
    var obj = {
      companyId: this.data["requestActionData"]["company_id"],
      sim_details: array
    }

    // console.log(obj);
    // return
    this.companyService.updateSIMDetails(obj).subscribe(
      (data) => {
        this.isButtonDisabled = false;
        if (true == data["error"]) {
          this.matSnackBar.open(
            data["reason"],
            this.action && this.actionButtonLabel,
            this.snackBarConfig
          );
          return;
        }
        this.dialogRef.close({ success: true });
        this.simtable = false;
        this.matSnackBar.open(
          data["reason"],
          this.action && this.actionButtonLabel,
          this.snackBarConfig
        );
      },
      (error) => {
        this.matSnackBar.open(
          "Error! Something went wrong.",
          this.action && this.actionButtonLabel,
          this.snackBarConfig
        );
      }
    );
  }

  getGetways(){
    this.companyService.getGetwaysList(this.data["requestActionData"]["company_id"]).subscribe(
      (data) => {
        if (true == data["error"]) {
          this.matSnackBar.open(
            data["reason"],
            this.action && this.actionButtonLabel,
            this.snackBarConfig
          );
          return;
        }
        this.gatewaysList = data['result'];
        console.log(data);
      },
      (error) => {
        this.matSnackBar.open(
          "Error! Something went wrong.",
          this.action && this.actionButtonLabel,
          this.snackBarConfig
        );
      }
    );
  }

  checkId(data){
    console.log(data);
    this.simManageForm.get('getwayId').setValue(this.gatewaysList.find(gl => gl.device_name == data.value).device_id);
    
  }

  checkType(data){
    console.log(data.value);
    [{name: '4G Gateway'}, {name: 'LAN Gateway'}, {name: 'SM61'}, {name: 'Radius Solar'}, {name: 'RISH Meter'}]
    if(data.value == 'LAN Gateway' || data.value == 'SM61'){
      this.simManageForm.get('network').setValidators([Validators.required]);
      this.simManageForm.get('number').setValidators([Validators.required]);
      this.simManageForm.get('network').updateValueAndValidity();
      this.simManageForm.get('number').updateValueAndValidity();
    }
    else{
      this.simManageForm.get('network').clearValidators();
      this.simManageForm.get('number').clearValidators();
      this.simManageForm.get('network').updateValueAndValidity();
      this.simManageForm.get('number').updateValueAndValidity();
    }

  }

  simTableOpen(){
    this.simtable = this.simtable == true ? false : true;
    this.simLabel = this.simtable == true ? "Back To Tabel": "Add New SIM";
    this.simManageForm.reset();
  }
}
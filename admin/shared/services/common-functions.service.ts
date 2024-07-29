import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })

export class CommonFunctionService {

  public datePipe: DatePipe;
  public decimalPipe: DecimalPipe;

  localizationSettingsSubject = new BehaviorSubject<any>({})
  public localizationSettingsData = this.localizationSettingsSubject.asObservable();
  localizationSetting;

  dateFormatAry = [
    { value: 'dd-MM-yyyy', name: 'dd-MM-yyyy' },
    { value: 'dd.MM.yyyy', name: 'dd.MM.yyyy' },
    { value: 'dd.MM.yyyy.', name: 'dd.MM.yyyy.' },
    { value: 'dd/MM/yyyy', name: 'dd/MM/yyyy' },
    { value: 'd-M-yyyy', name: 'd-M-yyyy' },
    { value: 'd.M.yyyy', name: 'd.M.yyyy' },
    { value: 'd.M.yyyy.', name: 'd.M.yyyy.' },
    { value: 'd.MM.yyyy', name: 'd.MM.yyyy' },
    { value: 'd/MM/yyyy', name: 'd/MM/yyyy' },
    { value: 'd/M/yyyy', name: 'd/M/yyyy' },
    { value: 'MM-dd-yyyy', name: 'MM-dd-yyyy' },
    { value: 'MM/dd/yyyy', name: 'MM/dd/yyyy' },
    { value: 'M/d/yyyy', name: 'M/d/yyyy' },
    { value: 'yyyy-MM-dd', name: 'yyyy-MM-dd' },
    { value: 'yyyy.MM.dd.', name: 'yyyy.MM.dd.' },
    { value: 'yyyy/MM/dd', name: 'yyyy/MM/dd' },
    { value: 'yyyy-M-d', name: 'yyyy-M-d' },
    { value: 'yyyy. M. d', name: 'yyyy. M. d' },
    { value: 'yyyy.M.d', name: 'yyyy.M.d' },
    { value: 'yyyy.d.M', name: 'yyyy.d.M' },
    { value: 'yyyy/M/d', name: 'yyyy/M/d' }
  ];

  numberFormatAry = [
    { value: 'en-US', name: '9,999,999,999.99', thousandSeparator: ',', decimalSeparator: '.' },
    { value: 'de-DE', name: '9.999.999.999,99', thousandSeparator: '.', decimalSeparator: ',' },
    { value: 'pl-PL', name: '9 999 999 999,99', thousandSeparator: ' ', decimalSeparator: ',' },
    { value: 'it-CH', name: "9'999'999'999.99", thousandSeparator: '\'', decimalSeparator: '.' },
    { value: 'en-IN', name: '9,99,99,99,999.99', thousandSeparator: ',', decimalSeparator: '.' }
  ];

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  /*********** Added By Arjun : Partner Dashboard display**********/
  extractUserTimezone() {
    let currentUserSession = JSON.parse(localStorage.getItem('currentUser'));
    let obj = { timezone: '', timezoneOffset: '' };
    if (currentUserSession['timezone'] && currentUserSession['timezone_offset']) {
      obj.timezone = currentUserSession['timezone'];
      obj.timezoneOffset = currentUserSession['timezone_offset'];
      return obj;
    }
    obj.timezone = 'Africa/Freetown';
    obj.timezoneOffset = '+0000';
    return obj;
  }
  /**************************************/

  getCountries() {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/countryList', {}, { withCredentials: true }).pipe(map(response => {
      var countryAry = [];
      if (response['error']) {
        return countryAry;
      }
      response['result'].forEach(country => {
        countryAry.push({ name: country.country_name });
      });
      countryAry = this.sortAry(countryAry, 'name');
      return countryAry;
    }));
  }

  getStates(countryName: any) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/stateList', { countryName }, { withCredentials: true }).pipe(map(response => {
      var stateAry = [];
      if (response['error']) {
        return stateAry;
      }
      response['result'].forEach(state => {
        stateAry.push({ name: state.state_name });
      });
      stateAry = this.sortAry(stateAry, 'name');
      return stateAry;
    }));
  }

  getCities(stateName: any) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/cityList', { stateName }, { withCredentials: true }).pipe(map(response => {
      var cityAry = [];
      if (response['error']) {
        return cityAry;
      }
      response['result'].forEach(city => {
        cityAry.push({ name: city.city_name });
      });
      cityAry = this.sortAry(cityAry, 'name');
      return cityAry;
    }));
  }

  extractCurrentUser() {
    let currentUser = localStorage.getItem('currentUser');
    let currentUserSession = (currentUser) ? JSON.parse(localStorage.getItem('currentUser')) : {};
    return currentUserSession;
  }
  jsonParser(data) {
    return (data) ? JSON.parse(data) : {};
  }

  // validMobileNumber(control) {
  //   const q = new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       let re = /^\+[1-9]{1}[0-9]{6,14}$/;
  //       if (!re.test(control.value)) {
  //         resolve({ 'notValidMobileNumber': true });
  //         return;
  //       }
  //       resolve(null);
  //     }, 10);
  //   });
  //   return q;
  // }

  validMobileNumber(control) {
    const q = new Promise((resolve, reject) => {
      setTimeout(() => {
        let re = /^\+[1-9]{1}[0-9]{6,14}$/;
        let inputString = control.value;
        if (inputString.includes('+91')) {
          let indianNum = /^\+91[0-9]{10}$/;
          if (!indianNum.test(control.value)) {
            resolve({ 'notValidMobileNumber': true });
            return;
          }
          resolve(null);
        }
        else if (!re.test(control.value)) {
          resolve({ 'notValidMobileNumber': true });
          return;
        }
        resolve(null);
      }, 10);
    });
    return q;
  }

  validAndUniqueMobileNumber(userId, control) {
    const q = new Promise((resolve, reject) => {
      setTimeout(() => {
        let re = /^\+[1-9]{1}[0-9]{6,14}$/; //less than 7 and greater than 15 numbers are not allowed.
        if (!re.test(control.value)) {
          resolve({ 'invalidMobileNumber': true });
          return;
        }
        this.checkUniqueMobile(control.value.trim(), userId).subscribe((data) => {
          if (data['error'] || data['result'] > 0) {
            resolve({ 'uniqueMobile': true });
            return;
          }
          resolve(null);
        });
      }, 10);
    });
    return q;
  }

  sortAry(ary, sortKey) {
    let sortedAry = [];
    sortedAry = ary.sort(function (a, b) {
      if (a[sortKey] < b[sortKey]) { return -1; }
      else if (a[sortKey] > b[sortKey]) { return 1; }
      else { return 0; }
    });
    return sortedAry;
  }

  uniqueEmail(userId, control) {
    const q = new Promise((resolve, reject) => {
      setTimeout(() => {
        this.checkUniqueEmail(control.value.trim(), userId).subscribe((data) => {
          if (data['error'] || data['result'] > 0) {
            resolve({ 'uniqueEmail': true });
          } else {
            resolve(null);
          }
        });
      }, 10);
    });
    return q;
  }

  getlocalizationSettings() {
    return this.localizationSetting;
  }

  setlocalizationSettings() {
    let currentUserSession = this.extractCurrentUser();
    if (!currentUserSession) return;
    let thousandSeparator = (null != currentUserSession["thousand_separator"]) ? currentUserSession["thousand_separator"] : this.numberFormatAry[0].thousandSeparator;
    let decimalSeparator = (null != currentUserSession["decimal_separator"]) ? currentUserSession["decimal_separator"] : this.numberFormatAry[0].decimalSeparator;
    this.localizationSettingsSubject.next({ "language": currentUserSession["language"], "timezone": currentUserSession["timezone"], "timezone_offset": currentUserSession["timezone_offset"], "timezone_setting": currentUserSession["timezone_setting"], "date_format": (null != currentUserSession["date_format"]) ? currentUserSession["date_format"] : this.dateFormatAry[0].value, "number_format": (null != currentUserSession["number_format"]) ? currentUserSession["number_format"] : this.numberFormatAry[0].value, "thousand_separator": thousandSeparator, "decimal_separator": decimalSeparator });
    this.localizationSettingsData.subscribe((data) => this.localizationSetting = data);
  }

  checkUniqueEmail(email: any, userId: string) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/uniqueEmail', { email, userId }, { withCredentials: true });
  }

  checkUniqueMobile(mobile: any, userId: string) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/uniqueMobile', { mobile, userId }, { withCredentials: true });
  }

  getTableConfig() {
    return { pageSizeOptions: [10, 20, 30, 100] };
  }

  getarrOfLanguages() {
    return [{ value: 'en', name: 'English', countryCode: 'US' }, { value: 'de', name: 'German', countryCode: 'DE' }, { value: 'pl', name: 'Polish', countryCode: 'PL' }, { value: 'ru', name: 'Russian', countryCode: 'RU' }, { value: 'fr', name: 'French', countryCode: 'FR' }, { value: 'es', name: 'Spanish', countryCode: 'ES' }, { value: 'ar', name: 'Arabic', countryCode: 'SA' }, { value: 'hi', name: 'Hindi', countryCode: 'IN' }, { value: 'ja', name: 'Japanese', countryCode: 'JP' }, { value: 'num', name: 'Number', countryCode: 'US' }];
  }

  getLanguageDetails(language = '') {
    let arrOfLanguages = this.getarrOfLanguages();
    let objLanguage = {};
    for (let i = 0; i < arrOfLanguages.length; i++) {
      objLanguage[arrOfLanguages[i].value] = arrOfLanguages[i];
    }
    if ('' == language) {
      return objLanguage;
    }
    return ('undefined' == typeof objLanguage[language]) ? '' : objLanguage[language];
  }

  setDecimalPipe() {
    this.decimalPipe = new DecimalPipe(this.localizationSetting["number_format"]);
  }

  setDatePipe() {
    this.datePipe = new DatePipe('en-US');
  }

  getPartnerInfo() {
    return this.httpClient.post(this.adminApiBase + '/partner/find', '', { withCredentials: true });
  }

  validPassword() {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~])[A-Za-z\d!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{8,20}$/;
    // return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/;
  }

  submitAppSettings(postDataObj: any) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/submitAppSettings', postDataObj, { withCredentials: true });
  }

  checkPartnerAppExists() {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/checkPartnerAppExists', '', { withCredentials: true });
  }

  resendEmail(postData: any) {
    return this.httpClient.post(this.adminApiBase + '/commonfunction/resendEmail', postData, { withCredentials: true });
  }
  getCurrenies() {
    return [{ value: 'rupees', name: 'Rupees' }, { value: 'dollar', name: 'Dollar' }, { value: 'euro', name: 'Euro' }, { value: 'gbp', name: 'GBP' }, { value: 'pln', name: 'PLN' }];
  }

  getUserCurrency(currency) {
    var currencyObj = { 'rupees': 'INR', 'dollar': 'USD', 'euro': 'EUR', 'gbp': 'GBP', 'pln': 'PLN' };
    return (currency) ? currencyObj[currency] : 'INR';
  }
}
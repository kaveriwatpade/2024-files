import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({providedIn: 'root'})

export class CompanyService {

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  getPartnerCompanyList() {
    return this.httpClient.post(this.adminApiBase + '/company/partnerCompanyList', {}, { withCredentials: true });
  }

  getModuleList() {
    return this.httpClient.post(this.adminApiBase + '/company/moduleList', {}, { withCredentials: true });
  }

  getLicense() {
    return this.httpClient.post(this.adminApiBase + '/company/license', {}, { withCredentials: true });
  }

  getSelectedModuleList(fields: string, id: string) {
    return this.httpClient.post(this.adminApiBase + '/company/find', { fields, id }, { withCredentials: true });
  }

  getCompanyData(fields: any, id: string) {
    return this.httpClient.post(this.adminApiBase + '/company/find', { fields, id }, { withCredentials: true });
  }

  uniqueName(companyName: string, id: string) {
    return this.httpClient.post(this.adminApiBase + '/company/uniqueName', { companyName, id }, { withCredentials: true });
  }

  submitCompany(data: any, id: string, action: string) {
    return this.httpClient.post(this.adminApiBase + '/company/submit', { data, id, action }, { withCredentials: true });
  }

  uploadCompanyLogo(formData:any){
    return this.httpClient.post(this.adminApiBase+'/company/uploadCompanyLogo',formData,{withCredentials:true});
  }

  submitCompanyLicense(data: any,id: string,modules: any){
    return this.httpClient.post(this.adminApiBase+'/company/submitLicense', {data,id,modules},{withCredentials: true});
  }

  deleteCompany(id: string) {
    return this.httpClient.post(this.adminApiBase + '/company/delete', { id }, { withCredentials: true });
  }

  getSmsHistoryList(data){
    return this.httpClient.post(this.adminApiBase+'/company/findSmsHistory', data,{withCredentials: true});
  }
  
  submitSms(data: any) {
    return this.httpClient.post(this.adminApiBase + '/company/recharge', data , { withCredentials: true });
  }

  getCompanyShareStatus(id: any) {
    return this.httpClient.post(this.adminApiBase + '/company/getCompanyShareStatus', { id }, { withCredentials: true });
  }
  getPartnerUserList(id:any) {
    return this.httpClient.post(this.adminApiBase + '/company/getPartnerList', {id},{ withCredentials: true });
  }

  //start salim
  updateLicenceDetails(data: any){
    return this.httpClient.post(this.adminApiBase+'/company/updateLicenseDetails', data,{withCredentials: true});
  }
  
  updateSIMDetails(data: any){
    return this.httpClient.post(this.adminApiBase+'/company/simManage', data,{withCredentials: true});
  }

  getGetwaysList(id: any){
    return this.httpClient.post(this.adminApiBase+'/company/getwayList', {company_id: id},{withCredentials: true});
  }
  //end salim
}

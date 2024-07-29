import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({providedIn: 'root'})

export class UserService {

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  getPartnerCompanyUserList(companyId:any) {
    return this.httpClient.post(this.adminApiBase + '/user/partnerCompanyUserList',{companyId} ,{ withCredentials: true });
  }

  getPartnerCompanyList() {
    return this.httpClient.post(this.adminApiBase + '/user/companyList', {}, { withCredentials: true });
  }

  submitUser(data: any, id: string, action: string, companiesPartnersObj: any) {
		return this.httpClient.post(this.adminApiBase + '/user/submitUser', { data, id, action, companiesPartnersObj }, { withCredentials: true });
	}
  getUserData(fields: string, id: string) {
    return this.httpClient.post(this.adminApiBase + '/user/userData', { fields, id }, { withCredentials: true });
  }

  userUpdate(data: any,companiesPartnersObj: any,id: string,action: string){    
    return this.httpClient.post(this.adminApiBase+'/user/userUpdate', {data,companiesPartnersObj,id,action},{withCredentials: true});
  }

  submitChangePwd(data: any,id: string){
    return this.httpClient.post(this.adminApiBase+'/user/changePwd', {data,id},{withCredentials: true});
  }

  deleteUser(id: string) {
    return this.httpClient.post(this.adminApiBase + '/user/deleteUser', { id }, { withCredentials: true });
  }

  companyNamesFromIds(companyIds: any) {
    return this.httpClient.post(this.adminApiBase + '/user/companyNamesFromIds', { companyIds }, { withCredentials: true });
  }

  addUser(data: any){
		return this.httpClient.post(this.adminApiBase+'/user/addUser', {data}, {withCredentials: true});
  }
  
  updateCompanyIdForExistingUser(data: any){
		return this.httpClient.post(this.adminApiBase+'/user/updateCompanyIdForExistingUser', data, {withCredentials: true});
  }
  
  userAlreadyExists(postData:any){
		return this.httpClient.post(this.adminApiBase+'/user/userAlreadyExists',postData, {withCredentials: true});
	}
  
  getSingleUser(id:any) {
		return this.httpClient.post(this.adminApiBase + '/user/singleUserList', {id}, { withCredentials: true });
	}
}
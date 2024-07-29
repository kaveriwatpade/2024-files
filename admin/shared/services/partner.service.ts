import { Injectable,Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
@Injectable({providedIn: 'root'})
export class PartnerService {

  constructor(public httpClient: HttpClient,@Inject('adminApiBase') public adminApiBase: string) {}

  uniqueName(partnerName,id){
    return this.httpClient.post(this.adminApiBase+'/partner/uniqueName',{partnerName,id},{withCredentials: true});
  }

 
  submitPartners(data: any,id: string,action: string){
    console.log(data,'data',id,'id',action)
    return this.httpClient.post(this.adminApiBase+'/partner/submitPartners',{data,id,action},{withCredentials: true});
  }
  deletePartner(id: string){
    return this.httpClient.post(this.adminApiBase+'/partner/delete',  {'id': id},{withCredentials: true});
  }
  getPartnersList(partner_id: string){
    console.log(partner_id,'partner_id')
    return this.httpClient.post(this.adminApiBase+'/partner/partnersList',{partner_id},{withCredentials: true});
  }
  deletePartners(id: string){
    return this.httpClient.post(this.adminApiBase+'/partner/deletePartners',  { id},{withCredentials: true});
  } 
  getPartnersData(id: string){
    return this.httpClient.post(this.adminApiBase+'/partner/findPartners', {id},{withCredentials: true});
  }
  

}

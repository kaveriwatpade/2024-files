import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })

export class DashboardService {

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  getPartnerCompanyList() {
    return this.httpClient.post(this.adminApiBase + '/company/partnerCompanyList', '', { withCredentials: true });
  }

  getPartnerCompanyUserCount() {
    return this.httpClient.post(this.adminApiBase + '/dashboard/partnerCompanyUserCount', '', { withCredentials: true });
  }

  getPartnerCompanyRenewalCount() {
    return this.httpClient.post(this.adminApiBase + '/dashboard/partnerCompanyRenewalCount', '', { withCredentials: true });
  }

  /******* Added by Arjun - : Partner Dashboard display *******/
  getPartnerNodeData(dataObj) {
    console.log(' Service function: ', dataObj)
    return this.httpClient.post(this.adminApiBase + '/company/getNodeData', { dataObj }, { withCredentials: true });
  }
  /****************************/
}
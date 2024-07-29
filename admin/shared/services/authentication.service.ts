import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({providedIn: 'root'})

export class AuthenticationService {

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  login(email: string, password: string) {
    let headers = new Headers();
    headers.append('Content-Type', 'application/json');
    return this.httpClient.post(this.adminApiBase + '/login', { email: email, password: password }, { withCredentials: true }).pipe(map(response => {
      localStorage.removeItem('currentUser');
      if (response && response['is_authenticated']) {
        localStorage.setItem('currentUser', JSON.stringify(response['current_user']));
        return true;
      }
      return false;
    }));
  }

  forgotPassword(email: string) {
    return this.httpClient.post(this.adminApiBase + '/forgotPassword', { email: email }, { withCredentials: true });
  }

  logout() {
    localStorage.removeItem('currentUser');
    return this.httpClient.get(this.adminApiBase + '/logout', { withCredentials: true });
  }

  resetPassword(data: any, id: any) {
    return this.httpClient.post(this.adminApiBase + '/resetPassword', { data, id }, { withCredentials: true });
  }

  getResetPasswordToken(fields: string, id: string) {
    return this.httpClient.post(this.adminApiBase + '/getResetPasswordToken', { fields, id }, { withCredentials: true });
  }

  authenticated() {
    return this.httpClient.get(this.adminApiBase + '/authenticated', { withCredentials: true });
  }

  switchToUser(companyId:any,companyName:any,companyLogo:any,email_address:any){
   return this.httpClient.post(this.adminApiBase+'/switchToUser',{ companyId,companyName,companyLogo,email_address},{withCredentials: true}).pipe(map(response => {
      if(response['error']){
        return response;
      }
      localStorage.removeItem('currentUser');
      localStorage.removeItem('loc');
      localStorage.removeItem('locNode');
      localStorage.removeItem('node');
      localStorage.removeItem('favorites');
      localStorage.removeItem('groupNode');
      localStorage.removeItem('group');
      localStorage.removeItem('meterModel');
      localStorage.removeItem('tokenId');
      localStorage.removeItem('allNode');
      if (response && response['is_authenticated']) {
        localStorage.setItem('currentUser', JSON.stringify(response['current_user']));
        localStorage.setItem('favorites', JSON.stringify(response['current_user']['favorite_node_ids']));
        return true;
      }
      return false;
    }));
  }
 
}
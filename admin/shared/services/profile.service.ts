import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({providedIn: 'root'})

export class ProfileService {

  constructor(public httpClient: HttpClient, @Inject('adminApiBase') public adminApiBase: string) { }

  getUserData(fields: string) {
    return this.httpClient.post(this.adminApiBase + '/profile/find', { fields }, { withCredentials: true });
  }

  submitBasic(data: any, id: string) {
    return this.httpClient.post(this.adminApiBase + '/profile/submitBasic', { data, id }, { withCredentials: true });
  }

  submitSecurity(data: any, id: string) {
    return this.httpClient.post(this.adminApiBase + '/profile/submitSecurity', { data, id }, { withCredentials: true });
  }

  submitRegional(data: any, id: string) {
    return this.httpClient.post(this.adminApiBase + '/profile/submitRegional', { data, id }, { withCredentials: true }).pipe(map(response => {
      if (false == response['error']) {
        var currentUser = JSON.parse(localStorage.getItem('currentUser'));
        currentUser.language = data.language;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      return response;
    }));
  }

  getTimzone() {
    return this.httpClient.post(this.adminApiBase + '/profile/timezone', {}, { withCredentials: true });
  }
}

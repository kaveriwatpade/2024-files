import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthenticationService } from '../services';
import { Observable,of } from 'rxjs';
import { map,catchError } from 'rxjs/operators'; 

@Injectable()
export class AdminUnauthenticatedGuard implements CanActivate {

  constructor(public router: Router, public _authenticationService: AuthenticationService) {}
  
  canActivate(): Observable<boolean> | boolean {
    let currentUserSession = JSON.parse(localStorage.getItem('currentUser'));
    if(currentUserSession == null){
      return true;
    }
    if(currentUserSession != null && currentUserSession.loginFrom != 'admin'){
      this.router.navigate(['/summary']);
      return false;
    }
    return this._authenticationService.authenticated().pipe(map(result => {
      if (result['authenticated']){
        this.router.navigate(['/admin/dashboard']);
        return false;
      }
      return true;
    })).pipe(catchError(error => {
      return of(true);
    }));
  }
}
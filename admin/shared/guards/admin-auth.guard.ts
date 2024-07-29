import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../services';
import { Observable,of } from 'rxjs';
import { map,catchError } from 'rxjs/operators'; 

@Injectable()

export class AdminAuthGuard implements CanActivate {
 
  constructor(public router: Router, public _authenticationService: AuthenticationService){}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    let currentUserSession = JSON.parse(localStorage.getItem('currentUser'));
    if(currentUserSession == null){
      this.router.navigate(['/admin/login'], { queryParams: { url: state.url }});
      return false;
    }
    if(currentUserSession != null && currentUserSession.loginFrom != 'admin'){
      this.router.navigate(['/summary']);
      return false;
    }
    return this._authenticationService.authenticated().pipe(map(result => {
        if (result['authenticated']){
          return true;
        } 
        this.router.navigate(['/admin/login'], { queryParams: { url: state.url }});
        return false;
      }
    )).pipe(catchError(error => {
      this.router.navigate(['/admin/login'], { queryParams: { url: state.url }});
      return of(false);
    }));
  }
}
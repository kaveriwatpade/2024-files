import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../shared/services';
import { LoginRoutes } from './login.routing';
import { LoginComponent } from './login.component';
import { AdminSharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule,RouterModule.forChild(LoginRoutes),AdminSharedModule],
  declarations: [LoginComponent],
  providers: [AuthenticationService]
})

export class AdminLoginModule {}
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ResetPasswordRoutes } from './reset-password.routing';
import { ResetPasswordComponent } from './reset-password.component';
import { SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(ResetPasswordRoutes),SharedModule],
  declarations: [ResetPasswordComponent],
  entryComponents: []
})

export class ResetPasswordModule {}
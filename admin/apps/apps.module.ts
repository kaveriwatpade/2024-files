import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppsRoutes } from './apps.routing';
import { AppListComponent } from './app-list.component';
import { AppDialogComponent } from './app-dialog.component';
import { AdminSharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule,RouterModule.forChild(AppsRoutes),AdminSharedModule],
  declarations: [AppListComponent, AppDialogComponent],
  entryComponents: [AppDialogComponent]
})

export class AppsModule {}
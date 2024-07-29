import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { CompanyListRoutes } from './company.routing';
import { CompanyListComponent } from './company-list.component';
import { CompanyComponent } from './company.component';
import { CompanyUserComponent } from './company-user.component';
import { AdminSharedModule } from '../shared/shared.module';

@NgModule({
	imports:[AdminSharedModule,CommonModule,RouterModule.forChild(CompanyListRoutes),],
	declarations:[CompanyListComponent,CompanyComponent, CompanyUserComponent],
	entryComponents:[CompanyComponent,CompanyUserComponent]
})

export class AdminCompanyListModule{}
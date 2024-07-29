import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { SettingsRoutes } from './settings.routing';
import { UserComponent } from './user/user.component';
import { UserListComponent } from './user/user-list.component';
import { AdminSharedModule } from '../shared/shared.module';

@NgModule({
	imports: [AdminSharedModule,CommonModule,RouterModule.forChild(SettingsRoutes)],
	declarations: [UserComponent, UserListComponent],
	entryComponents: [UserComponent]
})

export class AdminSettingsModule {}
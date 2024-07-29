import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ProfileRoutes } from "./profile.routing";
import { ProfileComponent } from "./profile.component";
import { ProfileBasicComponent } from "./profile-basic.component";
import { ProfileSecurityComponent } from "./profile-security.component";
import { ProfileRegionalComponent } from "./profile-regional.component";
import { AdminSharedModule } from "../shared/shared.module";

@NgModule({
	imports: [CommonModule,RouterModule.forChild(ProfileRoutes),AdminSharedModule],
	providers: [],
	declarations: [ProfileComponent, ProfileBasicComponent, ProfileSecurityComponent, ProfileRegionalComponent],
})

export class AdminProfileModule {}
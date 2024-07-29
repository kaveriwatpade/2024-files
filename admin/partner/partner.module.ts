import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { PartnerRoutes } from "./partner.routing";
import { PartnerComponent } from "./partner.component";
import { AdminSharedModule } from "../shared/shared.module";

@NgModule({
  imports: [CommonModule,RouterModule.forChild(PartnerRoutes),AdminSharedModule],
  declarations: [PartnerComponent],
  entryComponents: [PartnerComponent],
})

export class AdminPartnerModule { }
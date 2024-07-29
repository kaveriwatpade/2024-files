import { Routes } from "@angular/router";
import { UserListComponent } from "./user/user-list.component";

export const SettingsRoutes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  { path: 'users', component: UserListComponent },
  { path: 'company-users/:id', component: UserListComponent }
]
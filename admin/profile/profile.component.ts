import { Component, OnInit, ViewChild } from '@angular/core';
import { ProfileBasicComponent } from './profile-basic.component';
import { ProfileSecurityComponent } from './profile-security.component';
import { ProfileRegionalComponent } from './profile-regional.component';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
  @ViewChild('profilebasic') ProfileBasicComponent: ProfileBasicComponent;
  @ViewChild('profilesecurity') ProfileSecurityComponent: ProfileSecurityComponent;
  @ViewChild('profileregional') ProfileRegionalComponent: ProfileRegionalComponent;

  ngOnInit() {
  }
}
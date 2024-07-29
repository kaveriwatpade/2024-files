import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatSidenavModule, MatToolbarModule, MatListModule, MatTabsModule, MatSlideToggleModule, MatProgressBarModule, MatSnackBar, MatSnackBarConfig, MatDialogConfig, MatStepperModule, MatCheckboxModule, MatTooltipModule, MatRadioModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { AdminAuthGuard, AdminUnauthenticatedGuard } from './guards';
import { SearchPipe, CapitalizeFirstPipe, TruncatePipe } from './pipes';
import { AppSettingDialog } from './dialog/app-setting-dialog.component';
import{SwitchToPartnerDialog} from './dialog/SwitchToPartnerDialog';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';

@NgModule({
  declarations: [SearchPipe, CapitalizeFirstPipe, TruncatePipe, AppSettingDialog,SwitchToPartnerDialog],
  exports: [FormsModule, ReactiveFormsModule, TranslateModule, MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatSidenavModule, MatToolbarModule, MatListModule, MatTabsModule, MatSlideToggleModule, MatProgressBarModule, FlexLayoutModule, SearchPipe, MatStepperModule, MatCheckboxModule, NgxMatSelectSearchModule, CapitalizeFirstPipe, TruncatePipe, MatTooltipModule, MatRadioModule,NgxDaterangepickerMd],
  imports: [FormsModule, ReactiveFormsModule, CommonModule, TranslateModule, MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatSidenavModule, MatToolbarModule, MatListModule, MatTabsModule, MatSlideToggleModule, MatProgressBarModule, FlexLayoutModule, MatStepperModule, MatCheckboxModule, NgxMatSelectSearchModule, MatTooltipModule, MatRadioModule,NgxDaterangepickerMd],
  providers: [AdminAuthGuard, AdminUnauthenticatedGuard, MatSnackBar, MatSnackBarConfig, MatDialogConfig],
  entryComponents: [AppSettingDialog,SwitchToPartnerDialog],
})

export class AdminSharedModule { }
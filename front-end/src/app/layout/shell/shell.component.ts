import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SlicePipe,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly bp = inject(BreakpointObserver);

  protected readonly user = this.auth.currentUser;

  readonly isHandset = toSignal(
    this.bp.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly drawerOpen = signal(true);

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  onNavClick(): void {
    if (this.isHandset()) {
      this.drawerOpen.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}

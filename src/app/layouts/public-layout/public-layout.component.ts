import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {
  isHeaderCompact = false;
  isMenuOpen = false;

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollY = window.scrollY;

    if (!this.isHeaderCompact && scrollY > 8) {
      this.isHeaderCompact = true;
      return;
    }

    if (this.isHeaderCompact && scrollY <= 1) {
      this.isHeaderCompact = false;
      this.isMenuOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }
}

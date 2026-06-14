import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-file-field',
  standalone: true,
  imports: [],
  templateUrl: './file-field.component.html',
  styleUrl: './file-field.component.scss'
})
export class FileFieldComponent {
  @Input() label = '';
  @Input() name = '';
  @Input() accept = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() ariaDescribedby: string | null = null;
}

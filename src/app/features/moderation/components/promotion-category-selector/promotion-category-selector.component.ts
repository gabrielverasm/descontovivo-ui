import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModerationCategory, ModerationCategoryService } from '../../../../core/services/moderation-category.service';

@Component({
  selector: 'app-promotion-category-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './promotion-category-selector.component.html',
  styleUrl: './promotion-category-selector.component.scss',
})
export class PromotionCategorySelectorComponent implements OnInit {
  private readonly service = inject(ModerationCategoryService);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) selectorId!: string;

  @Input() selected: string[] = [];
  @Input() disabled = false;
  @Output() selectedChange = new EventEmitter<string[]>();

  categories: ModerationCategory[] = [];
  open = false;
  search = '';
  loading = false;
  error = '';
  editing: string | null = null;
  editingName = '';
  renaming = false;

  get labelId(): string { return `${this.selectorId}-label`; }
  get panelId(): string { return `${this.selectorId}-panel`; }

  get filtered(): ModerationCategory[] {
    const query = this.search.trim().toLocaleLowerCase();
    return query ? this.categories.filter(category => category.name.toLocaleLowerCase().includes(query)) : this.categories;
  }

  ngOnInit(): void { this.load(); }

  @HostListener('document:click', ['$event'])
  closeOutside(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('keydown.escape')
  close(): void { this.open = false; this.cancelEdit(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.list().subscribe({
      next: categories => { this.categories = categories; this.loading = false; },
      error: () => { this.error = 'Não foi possível carregar as categorias.'; this.loading = false; },
    });
  }

  togglePanel(): void { if (!this.disabled) this.open = !this.open; }
  isSelected(name: string): boolean { return this.selected.includes(name); }

  toggle(name: string): void {
    const next = this.isSelected(name) ? this.selected.filter(value => value !== name) : [...this.selected, name];
    this.selectedChange.emit(next);
  }

  remove(name: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.selectedChange.emit(this.selected.filter(value => value !== name));
  }

  startEdit(name: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.renaming) return;
    this.error = '';
    this.editing = name;
    this.editingName = name;
  }

  cancelEdit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.renaming) return;
    this.editing = null;
    this.editingName = '';
    this.error = '';
  }

  saveEdit(oldName: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.renaming) return;
    const newName = this.editingName.trim();
    if (!newName) { this.error = 'O nome da categoria não pode ficar vazio.'; return; }
    if (newName === oldName) { this.cancelEdit(); return; }
    this.error = '';
    this.renaming = true;
    this.service.rename(oldName, newName).subscribe({
      next: () => {
        if (this.isSelected(oldName)) {
          this.selectedChange.emit(this.selected.map(value => value === oldName ? newName : value));
        }
        this.categories = this.categories.map(category => category.name === oldName ? { ...category, name: newName } : category);
        this.renaming = false;
        this.cancelEdit();
      },
      error: response => {
        this.renaming = false;
        this.error = response?.error?.message || 'Não foi possível renomear a categoria.';
      },
    });
  }
}

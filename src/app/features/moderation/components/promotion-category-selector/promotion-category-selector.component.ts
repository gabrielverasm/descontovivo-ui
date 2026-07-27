import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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

  @Input() selected: string[] = [];
  @Input() disabled = false;
  @Output() selectedChange = new EventEmitter<string[]>();

  categories: ModerationCategory[] = [];
  loading = false;
  error = '';
  editing: string | null = null;
  editingName = '';
  renaming = false;

  get orderedCategories(): ModerationCategory[] {
    const byName = new Map(this.categories.map(category => [category.name, category]));
    const selectedCategories = this.selected
      .map(name => byName.get(name))
      .filter((category): category is ModerationCategory => !!category);
    const selectedNames = new Set(this.selected);
    const unselectedCategories = this.categories
      .filter(category => !selectedNames.has(category.name))
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' }));
    return [...selectedCategories, ...unselectedCategories];
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.list().subscribe({
      next: categories => { this.categories = categories; this.loading = false; },
      error: () => { this.error = 'Não foi possível carregar as categorias.'; this.loading = false; },
    });
  }

  isSelected(name: string): boolean { return this.selected.includes(name); }

  toggle(name: string): void {
    if (this.disabled || this.renaming) return;
    const next = this.isSelected(name) ? this.selected.filter(value => value !== name) : [...this.selected, name];
    this.selectedChange.emit(next);
  }

  startEdit(name: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled || this.renaming) return;
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

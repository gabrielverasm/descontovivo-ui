import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
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
  private readonly localCategoryNames = new Set<string>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  @Input() selected: string[] = [];
  @Input() disabled = false;
  @Output() selectedChange = new EventEmitter<string[]>();

  categories: ModerationCategory[] = [];
  loading = false;
  error = '';
  editing: string | null = null;
  editingName = '';
  renaming = false;
  search = '';
  announcement = '';

  get orderedCategories(): ModerationCategory[] {
    const matching = this.categories.filter(category =>
      this.normalizeForComparison(category.name).includes(this.normalizeForComparison(this.search)),
    );
    const byName = new Map(matching.map(category => [category.name, category]));
    const selectedCategories = this.selected
      .map(name => byName.get(name))
      .filter((category): category is ModerationCategory => !!category);
    const selectedNames = new Set(this.selected);
    const unselectedCategories = matching
      .filter(category => !selectedNames.has(category.name))
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' }));
    return [...selectedCategories, ...unselectedCategories];
  }

  get normalizedSearch(): string {
    return this.search.trim().replace(/\s+/g, ' ');
  }

  get matchingCategory(): ModerationCategory | undefined {
    const normalized = this.normalizeForComparison(this.normalizedSearch);
    return this.categories.find(category => this.normalizeForComparison(category.name) === normalized);
  }

  get addDisabled(): boolean {
    return this.disabled || this.renaming || !this.normalizedSearch || this.normalizedSearch.length > 50
      || (!!this.matchingCategory && this.isSelected(this.matchingCategory.name));
  }

  get addLabel(): string {
    if (!this.normalizedSearch) return 'Digite uma categoria para adicionar';
    if (this.matchingCategory && this.isSelected(this.matchingCategory.name)) return 'Categoria já selecionada';
    return this.matchingCategory
      ? `Selecionar categoria ${this.matchingCategory.name}`
      : `Adicionar categoria ${this.normalizedSearch}`;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.list().subscribe({
      next: categories => {
        const returnedNames = new Set(categories.map(category => this.normalizeForComparison(category.name)));
        this.localCategoryNames.forEach(name => {
          if (returnedNames.has(this.normalizeForComparison(name))) this.localCategoryNames.delete(name);
        });
        const pendingLocal = this.categories.filter(category =>
          this.localCategoryNames.has(category.name)
          && !returnedNames.has(this.normalizeForComparison(category.name)),
        );
        this.categories = [...categories, ...pendingLocal];
        this.loading = false;
      },
      error: () => { this.error = 'Não foi possível carregar as categorias.'; this.loading = false; },
    });
  }

  isSelected(name: string): boolean { return this.selected.includes(name); }

  toggle(name: string): void {
    if (this.disabled || this.renaming) return;
    const next = this.isSelected(name) ? this.selected.filter(value => value !== name) : [...this.selected, name];
    this.selectedChange.emit(next);
  }

  addOrSelect(event?: Event): void {
    event?.preventDefault();
    if (this.addDisabled) return;

    const existing = this.matchingCategory;
    if (existing) {
      this.selectedChange.emit([...this.selected, existing.name]);
      this.announcement = `Categoria ${existing.name} selecionada.`;
      return;
    }

    const name = this.normalizedSearch;
    this.categories = [...this.categories, { name, promotionCount: 0 }];
    this.localCategoryNames.add(name);
    this.selectedChange.emit([...this.selected, name]);
    this.search = '';
    this.announcement = `Categoria ${name} adicionada localmente e selecionada.`;
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addOrSelect();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.search = '';
      (event.currentTarget as HTMLInputElement).value = '';
      this.announcement = 'Pesquisa de categorias limpa.';
    }
  }

  resetAfterSuccessfulSave(): void {
    this.search = '';
    this.announcement = '';
    this.load();
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

  private normalizeForComparison(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }
}

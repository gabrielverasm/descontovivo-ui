import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommentResponse } from '../../../../core/models/comment.model';
import { FloatingFieldComponent } from '../../../../shared/components/floating-field/floating-field.component';

@Component({
  selector: 'app-promotion-detail-comments',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, FloatingFieldComponent],
  templateUrl: './promotion-detail-comments.component.html',
  styleUrl: './promotion-detail-comments.component.scss',
})
export class PromotionDetailCommentsComponent {
  @Input() comments: CommentResponse[] = [];
  @Input() visibleCommentsCount = 5;
  @Input() totalCommentsCount = 0;
  @Input() isAuthenticated = false;
  @Input() isSubmittingComment = false;
  @Input() commentError = '';
  @Input() newCommentContent = '';
  @Output() newCommentContentChange = new EventEmitter<string>();
  @Output() submitComment = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();

  get visibleComments() {
    return this.comments.slice(0, this.visibleCommentsCount);
  }

  get shownCommentsCount() {
    return Math.min(this.visibleCommentsCount, this.comments.length);
  }

  get hasMoreComments() {
    return this.visibleCommentsCount < this.comments.length;
  }

  getAvatarColor(_name: string): string {
    return 'linear-gradient(135deg, #0ea5e9, #2563eb)';
  }

  onContentChange(value: string): void {
    this.newCommentContentChange.emit(value);
  }
}
